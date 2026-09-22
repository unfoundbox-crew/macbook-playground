/**
 * src/engine/interaction.js — picking, outline highlight and the image-quality chain.
 *
 * Picking: a Raycaster over ctx.root, run at most once per frame on pointermove. A hit resolves to the
 * nearest ancestor-or-self with userData.part (an InstancedMesh hit is the mesh's own part, e.g. KeyGrid);
 * effect nodes and invisible chains are skipped. Hover → ctx.actions.hover(key), click (down + up without
 * a drag > CLICK_SLOP px) → ctx.actions.select(key), click on nothing → select(null). The ui lane installs
 * those actions; the fallback sets ctx.state and emits 'hover' / 'select'.
 *
 * Rendering: EffectComposer on a 4× multisampled HalfFloat target so antialiasing survives the passes:
 *   RenderPass (clears to transparent) → GTAOPass (radius ~1 cm, so parts sit on each other) →
 *   OutlinePass hovered (#1C64F2) → OutlinePass selected (#E8590C) → UnrealBloomPass (subtle, emissive
 *   surfaces only) → OutputPass (tone mapping + sRGB) → background composite.
 * The page background is composited after tone mapping so the theme's exact --bg colour shows (ACES
 * would otherwise turn pure white into grey); scene.background is the live Color the api mutates.
 * Shadows: PCFSoft 2048² from the scene's directional light, frustum tight around the ENVELOPE; every
 * non-effect mesh casts (except transmissive or faint materials) and receives; refreshed after 'chip'.
 *
 * Exposes ctx.composer and ctx.postFx = { gtao, outlineHover, outlineSelect, bloom, output, composite }.
 * Exports shortcutKey(event) for the other engines' keyboard handlers. Nothing here allocates per frame.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { ENVELOPE, EXPLODE, LID } from '../dims.js';
import { ORANGE, BLUE } from '../materials.js';

/* ---------------------------------------------------------------- tunables */

const CLICK_SLOP_PX = 4;
const MSAA_SAMPLES = 4;
/** scale 2 (A/B against 1 and 2.5 in headless snaps): parts visibly sit on the board without dirty halos. */
const GTAO = Object.freeze({ radius: 0.01, thickness: 0.01, distanceExponent: 1, distanceFallOff: 1, scale: 2, samples: 16, blend: 1 });
const OUTLINE = Object.freeze({ edgeStrength: 4, edgeThickness: 1, edgeGlow: 0, pulsePeriod: 0 });
const BLOOM = Object.freeze({ threshold: 0.85, strength: 0.18, radius: 0.4 });
/**
 * Linear-HDR ceiling on the bloom input only (patched into the pass's luminosity high-pass; the main
 * image keeps its full range for ACES). Light-panel reflections on the lid glass are far brighter than
 * any emissive surface; without a ceiling the bloom (×3 internally) spreads them into a white patch
 * over the desktop. 1.5 is the camera LED's level, so no surface glows more than an LED.
 */
const BLOOM_CEILING = 1.5;
const HIGH_PASS_SAMPLE = 'vec4 texel = texture2D( tDiffuse, vUv );';
const SHADOW = Object.freeze({
  mapSize: 2048,
  /** Half-extent of the light's orthographic frustum: the open lid plus the tallest explode lift. */
  radius: Math.hypot(ENVELOPE.w / 2, LID.d) + EXPLODE.thermal,
  bias: -0.0001,
  normalBias: 0.0004,
});
/** Materials that should not print a solid shadow: transmissive glass and faint translucent layers. */
const SHADOW_MIN_OPACITY = 0.5;

/* ---------------------------------------------------------------- preallocated */

const _raycaster = new THREE.Raycaster();
_raycaster.params.Points.threshold = 0;
_raycaster.params.Line.threshold = 0;
const _pointer = new THREE.Vector2();
const _hits = [];
const _size = new THREE.Vector2();
const _bgOut = new THREE.Color();

/** Cap the bloom high-pass input at BLOOM_CEILING. Leaves the pass untouched if three's shader text moved. */
function capBloomInput(bloomPass) {
  const mat = bloomPass.materialHighPassFilter;
  if (!mat?.fragmentShader?.includes(HIGH_PASS_SAMPLE)) {
    console.warn('interaction: bloom high-pass shader changed; bloom input is not capped');
    return;
  }
  mat.fragmentShader = mat.fragmentShader.replace(
    HIGH_PASS_SAMPLE,
    `vec4 texel = min( texture2D( tDiffuse, vUv ), vec4( ${BLOOM_CEILING.toFixed(3)} ) );`,
  );
  mat.needsUpdate = true;
}

const CompositeShader = {
  uniforms: { tDiffuse: { value: null }, bg: { value: new THREE.Color(1, 1, 1) } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec3 bg;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // Additive passes (bloom, outline) push alpha past 1 in the HalfFloat target: clamp, or the
      // background term goes negative and punches a black hole where the glow is strongest.
      float coverage = clamp(c.a, 0.0, 1.0);
      gl_FragColor = vec4(c.rgb + bg * (1.0 - coverage), 1.0);
    }`,
};

/* ---------------------------------------------------------------- helpers */

/** The lower-case key of a shortcut keydown, or null when the event should be left alone. */
export function shortcutKey(e) {
  if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return null;
  const el = e.target;
  if (el && el !== document.body && el !== document.documentElement) {
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON' || el.isContentEditable) return null;
  }
  return typeof e.key === 'string' && e.key.length === 1 ? e.key.toLowerCase() : e.key;
}

function chainVisible(o) {
  for (let n = o; n; n = n.parent) if (!n.visible) return false;
  return true;
}

function isEffect(o) {
  for (let n = o; n; n = n.parent) if (n.userData.effect) return true;
  return false;
}

function partKeyOf(o) {
  for (let n = o; n; n = n.parent) if (n.userData.part) return n.userData.part;
  return null;
}

function castsShadow(material) {
  const mats = Array.isArray(material) ? material : [material];
  for (const m of mats) {
    if (!m) continue;
    if (m.transmission > 0) return false;
    if (m.transparent && m.opacity < SHADOW_MIN_OPACITY) return false;
  }
  return true;
}

/* ---------------------------------------------------------------- init */

export function init(ctx) {
  const { renderer, scene, camera, state } = ctx;
  const canvas = renderer.domElement;

  /* ---- shadows */
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  let sun = null;
  scene.traverse((o) => {
    if (!sun && o.isDirectionalLight) sun = o;
  });
  if (sun) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(SHADOW.mapSize, SHADOW.mapSize);
    sun.shadow.bias = SHADOW.bias;
    sun.shadow.normalBias = SHADOW.normalBias;
    const cam = sun.shadow.camera;
    const dist = sun.position.length();
    cam.left = -SHADOW.radius;
    cam.right = SHADOW.radius;
    cam.top = SHADOW.radius;
    cam.bottom = -SHADOW.radius;
    cam.near = Math.max(0.01, dist - SHADOW.radius);
    cam.far = dist + SHADOW.radius;
    cam.updateProjectionMatrix();
  }
  function applyShadowFlags() {
    ctx.root.traverse((o) => {
      if (!o.isMesh || isEffect(o)) return;
      o.receiveShadow = true;
      o.castShadow = castsShadow(o.material);
    });
  }
  applyShadowFlags();

  /* ---- composer */
  renderer.getSize(_size);
  const pixelRatio = renderer.getPixelRatio();
  const target = new THREE.WebGLRenderTarget(_size.x * pixelRatio, _size.y * pixelRatio, {
    samples: MSAA_SAMPLES,
    type: THREE.HalfFloatType,
  });
  target.texture.name = 'interaction.msaa';
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(pixelRatio);

  const bgColor = scene.background?.isColor ? scene.background : new THREE.Color('#ffffff');
  scene.background = null; // composited after tone mapping, see the header
  const renderPass = new RenderPass(scene, camera);
  renderPass.clearColor = new THREE.Color(0, 0, 0);
  renderPass.clearAlpha = 0;

  const gtao = new GTAOPass(scene, camera, _size.x * pixelRatio, _size.y * pixelRatio);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = GTAO.blend;
  gtao.updateGtaoMaterial({
    radius: GTAO.radius,
    thickness: GTAO.thickness,
    distanceExponent: GTAO.distanceExponent,
    distanceFallOff: GTAO.distanceFallOff,
    scale: GTAO.scale,
    samples: GTAO.samples,
    screenSpaceRadius: false,
  });

  function outline(color) {
    const pass = new OutlinePass(_size.clone(), scene, camera);
    pass.visibleEdgeColor.set(color);
    pass.hiddenEdgeColor.set(color);
    pass.edgeStrength = OUTLINE.edgeStrength;
    pass.edgeThickness = OUTLINE.edgeThickness;
    pass.edgeGlow = OUTLINE.edgeGlow;
    pass.pulsePeriod = OUTLINE.pulsePeriod;
    return pass;
  }
  const outlineHover = outline(BLUE);
  const outlineSelect = outline(ORANGE);

  const bloom = new UnrealBloomPass(_size.clone(), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
  capBloomInput(bloom);
  const output = new OutputPass();
  const composite = new ShaderPass(CompositeShader);

  for (const p of [renderPass, gtao, outlineHover, outlineSelect, bloom, output, composite]) composer.addPass(p);
  composer.setSize(_size.x, _size.y);

  ctx.composer = composer;
  ctx.postFx = { gtao, outlineHover, outlineSelect, bloom, output, composite, renderPass };

  ctx.setRenderFn(() => {
    bgColor.getRGB(_bgOut, THREE.SRGBColorSpace);
    composite.uniforms.bg.value.copy(_bgOut);
    composer.render();
  });

  window.addEventListener('resize', () => {
    const pr = renderer.getPixelRatio();
    composer.setPixelRatio(pr);
    composer.setSize(window.innerWidth, window.innerHeight); // sizes every pass, GTAO included
  });

  /* ---- outline targets follow state */
  function fillList(list, key) {
    list.length = 0;
    const nodes = key ? ctx.byKey.get(key) : null;
    if (nodes) for (let i = 0; i < nodes.length; i++) list.push(nodes[i]);
  }
  function syncOutlines() {
    fillList(outlineSelect.selectedObjects, state.selected);
    fillList(outlineHover.selectedObjects, state.hovered && state.hovered !== state.selected ? state.hovered : null);
    canvas.style.cursor = state.hovered ? 'pointer' : '';
    ctx.requestRender?.();
  }
  ctx.events.addEventListener('hover', syncOutlines);
  ctx.events.addEventListener('select', syncOutlines);
  ctx.events.addEventListener('chip', () => {
    applyShadowFlags();
    syncOutlines();
  });

  /* ---- picking */
  function act(name, key) {
    if (ctx.actions[name]) return ctx.actions[name](key);
    state[name === 'hover' ? 'hovered' : 'selected'] = key ?? null;
    ctx.emit(name, key ?? null);
    return undefined;
  }

  function setPointer(e) {
    const r = canvas.getBoundingClientRect();
    _pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    _pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }

  /** Registry key under the pointer, or null. Allocation-free on our side; three fills _hits. */
  function pick() {
    _raycaster.setFromCamera(_pointer, camera);
    _hits.length = 0;
    _raycaster.intersectObject(ctx.root, true, _hits);
    for (let i = 0; i < _hits.length; i++) {
      const o = _hits[i].object;
      if (!chainVisible(o) || isEffect(o)) continue;
      const key = partKeyOf(o);
      if (key) return key;
    }
    return null;
  }

  let pointerDirty = false;
  let pointerInside = false;
  let downX = 0;
  let downY = 0;
  let downButton = -1;
  let dragged = false;

  canvas.addEventListener('pointermove', (e) => {
    setPointer(e);
    pointerDirty = true;
    pointerInside = true;
    if (downButton === 0 && Math.hypot(e.clientX - downX, e.clientY - downY) > CLICK_SLOP_PX) dragged = true;
  });
  canvas.addEventListener('pointerdown', (e) => {
    downButton = e.button;
    downX = e.clientX;
    downY = e.clientY;
    dragged = false;
  });
  canvas.addEventListener('pointerup', (e) => {
    const wasClick = downButton === 0 && e.button === 0 && !dragged
      && Math.hypot(e.clientX - downX, e.clientY - downY) <= CLICK_SLOP_PX;
    downButton = -1;
    if (!wasClick) return;
    setPointer(e);
    act('select', pick());
  });
  canvas.addEventListener('pointercancel', () => {
    downButton = -1;
  });
  canvas.addEventListener('pointerleave', () => {
    pointerInside = false;
    pointerDirty = false;
    if (state.hovered) act('hover', null);
  });

  ctx.onFrame(() => {
    if (!pointerDirty || !pointerInside) return;
    pointerDirty = false;
    const key = pick();
    if (key !== state.hovered) act('hover', key);
  });

  syncOutlines();
}
