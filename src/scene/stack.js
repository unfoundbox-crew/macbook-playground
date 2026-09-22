/**
 * src/scene/stack.js — the software stack (stack lane).
 *
 * Fifteen translucent plates hover above the SoC, bottom → top in registry order (STACK_LAYERS).
 * Each plate is a rounded, bevelled extrude (plan-view corners from BASE.cornerRadius, edge fillet
 * from the plate thickness) sharing one geometry and ctx.mats.layerTranslucent. The trace lane swaps
 * that material to highlight a layer, so nothing here depends on which material a plate carries.
 *
 * Every plate carries a label: a small plane standing on its front-left edge, facing +Z and tilted
 * back so a camera above reads it. All fifteen labels come from one CanvasTexture atlas (bold sans on
 * transparent, one row per layer, each plane UV-mapped to its row and sized to its text). The atlas is
 * redrawn when the theme flips so the text stays legible on both page backgrounds. Labels are untagged
 * children of their plate with userData.effect = userData.label = true, so the dial hides them with it.
 *
 * A faint guide beam (effect) runs from the SoC lid up to the first plate and follows the SoC as the
 * board explodes, with a small ring where it lands, so the stack reads as "above the SoC".
 *
 * update(): keeps group.visible in step with state.stack, bobs the whole group ±1 mm slowly, stretches
 * the guide to the SoC. Zero allocations per frame. No explode offsets.
 */

import * as THREE from 'three';
import { MM, BASE, STACK, SOC, LOGIC_BOARD, EXPLODE } from '../dims.js';
import { STACK_LAYERS } from '../parts/registry.js';

export const NAME = 'Stack';

/* ---------------------------------------------------------------- derived dimensions (never bare numbers) */

/** Vertical pitch between consecutive plate undersides. */
const PITCH = STACK.layerT + STACK.gap;
/** Edge fillet on each face of a plate: 30 % of the thickness, leaving a flat band of 40 %. */
const BEVEL = STACK.layerT * 0.3;
const BEVEL_SEGMENTS = 3;
/** Arc divisions per plan-view corner (ExtrudeGeometry doubles this for arcs). */
const CORNER_SEGMENTS = 6;

/** Labels: fill most of the gap, tilted back so a camera above reads them. */
const LABEL_H = STACK.gap * 0.85;
const LABEL_TILT = THREE.MathUtils.degToRad(22);
const LABEL_INSET_X = BASE.cornerRadius; // from the plate's left edge, past the corner arc
const LABEL_INSET_Z = BEVEL;             // from the front edge: the label stands behind the fillet
const LABEL_LIFT = 0.05 * MM;            // above the top face, well past 24-bit depth precision

/** Guide beam from the SoC lid to the first plate. */
const GUIDE_R = 0.5 * MM;
const GUIDE_SEGMENTS = 12;
const GUIDE_MIN_LEN = 2 * MM;
const GUIDE_ALPHA = Object.freeze({ bottom: 0.08, top: 0.55 });
const RING = Object.freeze({ inner: 2.4 * MM, outer: 3.2 * MM, segments: 32, opacity: 0.45, lift: 0.05 * MM });
/** Top of the SoC package above its group origin (substrate + die + lid). */
const SOC_TOP = SOC.substrate.t + SOC.dieT + SOC.spreaderT;
/** Where the beam lands when no SoC node exists: the lid top with the board lifted (the Stack preset). */
const GUIDE_FALLBACK_BOTTOM = LOGIC_BOARD.y + LOGIC_BOARD.t / 2 + SOC_TOP + EXPLODE.board;

/** Bob: ±1 mm over a slow period. */
const BOB_AMP = 1 * MM;
const BOB_PERIOD_S = 7;
const BOB_RATE = (2 * Math.PI) / BOB_PERIOD_S;
const TWO_PI = 2 * Math.PI;

/* ---------------------------------------------------------------- label atlas */

const ATLAS_W = 1024;
const ROW_H = 120;
/** Power of two ≥ rows × ROW_H so the atlas mipmaps. */
const ATLAS_H = 2 ** Math.ceil(Math.log2(STACK_LAYERS.length * ROW_H));
const ATLAS_PAD = 24;
const FONT_PX = 88;
const HALO_PX = 8;
const FONT_FAMILY = 'ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const INK = Object.freeze({
  light: { fill: '#18181b', halo: 'rgba(255, 255, 255, 0.85)' },
  dark: { fill: '#fafafa', halo: 'rgba(9, 9, 11, 0.7)' },
});

/** Brand names whose inner capital must not split. */
const DISPLAY_OVERRIDES = Object.freeze({ PyTorchMPS: 'PyTorch MPS' });

/** Registry key → display name: 'XNUKernel' → 'XNU Kernel', 'Metal4' → 'Metal 4', 'CoreML' → 'Core ML'. */
export function displayName(key) {
  if (DISPLAY_OVERRIDES[key]) return DISPLAY_OVERRIDES[key];
  return key
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2');
}

const LABELS = Object.freeze(STACK_LAYERS.map(displayName));

function isDark() {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)')?.matches);
}

function drawAtlas(g, dark) {
  const ink = dark ? INK.dark : INK.light;
  g.clearRect(0, 0, ATLAS_W, ATLAS_H);
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.lineJoin = 'round';
  g.lineWidth = HALO_PX;
  g.strokeStyle = ink.halo;
  g.fillStyle = ink.fill;
  LABELS.forEach((text, r) => {
    g.font = `700 ${FONT_PX}px ${FONT_FAMILY}`;
    const y = r * ROW_H + ROW_H / 2;
    g.strokeText(text, ATLAS_PAD, y);
    g.fillText(text, ATLAS_PAD, y);
  });
}

/** Text advance per row in atlas pixels (independent of the ink colour). */
function measureRows(g) {
  g.font = `700 ${FONT_PX}px ${FONT_FAMILY}`;
  return LABELS.map((text) => Math.min(ATLAS_W - 2 * ATLAS_PAD, Math.ceil(g.measureText(text).width)));
}

/* ---------------------------------------------------------------- materials and shared geometry, created once */

let M = null;
function materials(blue) {
  if (M) return M;
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_W;
  canvas.height = ATLAS_H;
  const g = canvas.getContext('2d');
  const atlas = new THREE.CanvasTexture(canvas);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 8;
  drawAtlas(g, isDark());
  M = {
    g,
    atlas,
    widths: measureRows(g),
    label: new THREE.MeshBasicMaterial({ map: atlas, transparent: true, depthWrite: false, toneMapped: false }),
    guide: new THREE.MeshBasicMaterial({ color: blue, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false }),
    ring: new THREE.MeshBasicMaterial({ color: blue, transparent: true, opacity: RING.opacity, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
  };
  for (const [name, m] of Object.entries(M)) if (m?.isMaterial) m.name = `stack.${name}`;
  return M;
}

function roundedRect(w, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + d - r);
  s.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + d);
  s.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, 1.5 * Math.PI, false);
  s.closePath();
  return s;
}

let PLATE = null;
/** One plate geometry shared by all fifteen layers: STACK.w × layerT × d, centred, fillets on both faces. */
function plateGeometry() {
  if (PLATE) return PLATE;
  // The bevel grows the outline by BEVEL on every side, so the shape is inset to keep the footprint exact.
  const shape = roundedRect(STACK.w - 2 * BEVEL, STACK.d - 2 * BEVEL, BASE.cornerRadius - BEVEL);
  const depth = STACK.layerT - 2 * BEVEL;
  PLATE = new THREE.ExtrudeGeometry(shape, {
    depth, curveSegments: CORNER_SEGMENTS,
    bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelOffset: 0, bevelSegments: BEVEL_SEGMENTS,
  });
  PLATE.rotateX(-Math.PI / 2);   // extrusion axis → +Y, so the caps face up and down
  PLATE.translate(0, -depth / 2, 0); // centre the slab: y ∈ [−layerT/2, +layerT/2]
  return PLATE;
}

/** Label plane for row r: origin at its bottom-left corner, UVs on the atlas row, width from the text. */
function labelGeometry(r, widths) {
  const rectW = widths[r] + 2 * ATLAS_PAD;
  const w = LABEL_H * (rectW / ROW_H);
  const geo = new THREE.PlaneGeometry(w, LABEL_H);
  geo.translate(w / 2, LABEL_H / 2, 0);
  const u1 = rectW / ATLAS_W;
  const v1 = 1 - (r * ROW_H) / ATLAS_H;
  const v0 = 1 - ((r + 1) * ROW_H) / ATLAS_H;
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, v1, u1, v1, 0, v0, u1, v0], 2));
  return geo;
}

/** Unit-length beam hanging from its origin (y ∈ [−1, 0]) with alpha fading toward the bottom. */
function guideGeometry() {
  const geo = new THREE.CylinderGeometry(GUIDE_R, GUIDE_R, 1, GUIDE_SEGMENTS, 1, true);
  geo.translate(0, -0.5, 0);
  const pos = geo.attributes.position;
  const rgba = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    const k = pos.getY(i) + 1; // 0 at the bottom, 1 at the top
    rgba[i * 4] = 1;
    rgba[i * 4 + 1] = 1;
    rgba[i * 4 + 2] = 1;
    rgba[i * 4 + 3] = GUIDE_ALPHA.bottom + (GUIDE_ALPHA.top - GUIDE_ALPHA.bottom) * k;
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(rgba, 4));
  return geo;
}

/* ---------------------------------------------------------------- build */

let CTX = null;
let beam = null;
let ring = null;
let themeDirty = false;
let phase = 0;
const V = new THREE.Vector3();

export function build(parent, chip, ctx) {
  CTX = ctx;
  const mats = materials(ctx.mats.BLUE);
  const g = ctx.tag(new THREE.Group(), NAME);
  g.position.set(STACK.cx, 0, STACK.cz);
  g.visible = ctx.state.stack;
  parent.add(g);

  const plate = plateGeometry();
  STACK_LAYERS.forEach((key, i) => {
    const m = new THREE.Mesh(plate, ctx.mats.layerTranslucent);
    m.position.y = STACK.y0 + i * PITCH + STACK.layerT / 2;
    g.add(ctx.tag(m, key));

    const label = new THREE.Mesh(labelGeometry(i, mats.widths), mats.label);
    label.position.set(-STACK.w / 2 + LABEL_INSET_X, STACK.layerT / 2 + LABEL_LIFT, STACK.d / 2 - LABEL_INSET_Z);
    label.rotation.x = -LABEL_TILT; // top edge leans back over the plate; normal points +Z and up
    label.renderOrder = 2;          // after the translucent plates, whatever the depth sort says
    label.userData.effect = true;
    label.userData.label = true;
    m.add(label);
  });

  beam = new THREE.Mesh(guideGeometry(), mats.guide);
  beam.position.y = STACK.y0;
  beam.scale.y = STACK.y0 - GUIDE_FALLBACK_BOTTOM;
  beam.userData.effect = true;
  g.add(beam);

  ring = new THREE.Mesh(new THREE.RingGeometry(RING.inner, RING.outer, RING.segments).rotateX(-Math.PI / 2), mats.ring);
  ring.position.y = GUIDE_FALLBACK_BOTTOM + RING.lift;
  ring.userData.effect = true;
  g.add(ring);

  ctx.events.addEventListener('stack', (e) => {
    g.visible = Boolean(e.detail);
  });
  ctx.events.addEventListener('theme', () => {
    themeDirty = true;
  });
  window.matchMedia?.('(prefers-color-scheme: dark)')?.addEventListener?.('change', () => {
    themeDirty = true;
  });
  return g;
}

export const explodeOffsets = {};

/* ---------------------------------------------------------------- per frame (no allocations) */

export function update(group, state, dt) {
  group.visible = Boolean(state.stack);
  if (!group.visible) return;

  if (themeDirty && M) {
    themeDirty = false;
    drawAtlas(M.g, isDark());
    M.atlas.needsUpdate = true;
  }

  phase += dt * BOB_RATE;
  if (phase > TWO_PI) phase -= TWO_PI;
  const bob = BOB_AMP * Math.sin(phase);
  group.position.y = bob;

  // The guide hangs from the first plate down to the SoC lid, wherever the explode has put it.
  let bottom = GUIDE_FALLBACK_BOTTOM;
  const soc = CTX?.byKey.get('SoCPackage')?.[0];
  if (soc) {
    soc.getWorldPosition(V);
    bottom = V.y + SOC_TOP;
  }
  const len = Math.max(GUIDE_MIN_LEN, STACK.y0 - (bottom - bob));
  if (beam) beam.scale.y = len;
  if (ring) ring.position.y = STACK.y0 - len + RING.lift;
}
