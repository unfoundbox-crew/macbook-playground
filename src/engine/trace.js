/**
 * src/engine/trace.js — the trace animator (trace lane).
 *
 * init(ctx) installs three actions:
 *   ctx.actions.playTrace(name)   → Promise that resolves when the path finishes (or is cancelled).
 *                                   It never rejects. A second call cancels the running trace first.
 *   ctx.actions.stopTrace()       → cancels the running trace (no-op when idle).
 *   ctx.actions.setTraceSpeed(m)  → step durations divide by m (tests use a large m); takes effect at once.
 *
 * Playing a trace (paths come from src/data/traces.js):
 *   1. If any step targets a stack layer, the stack view opens (ctx.actions.setStack(true), else the api,
 *      else state + Stack group + 'stack' event). If any step targets a die unit and the dial is below
 *      Silicon, the dial goes to 3 so the unit can be seen at all.
 *   2. Each step: every mesh of the target (ctx.byKey.get(key) and its non-effect descendants) swaps to
 *      ctx.mats.highlight for the step's duration and is restored at step end or cancel. Originals are
 *      remembered in one reused Map; nothing is cloned. A mesh already wearing the highlight is left
 *      alone, and a mesh someone else re-materialised meanwhile is not clobbered on restore.
 *   3. A glowing bead (an untagged effect: emissive sphere + additive halo, created once, drawn on top
 *      through depthTest: false) tweens from the previous target's world centre to the current one with
 *      a cubic ease over the first TRAVEL_FRACTION of the step, then dwells. Centres come from a Box3
 *      over the target's non-effect meshes, recomputed each frame into preallocated objects, so the
 *      bead follows a bobbing stack or an exploding SoC. prefers-reduced-motion jumps instead of tweening.
 *   4. ctx.state.trace = { playing, name, step, total, path, label, target } is kept current and
 *      ctx.emit('trace', state.trace) fires on start, every step change, finish and cancel.
 *      `step` is 1-based while playing (matches the caption's "step i / n"); 0 before the first play;
 *      equal to `total` after a finished trace.
 *
 * The per-frame hook allocates nothing. The trace bar (src/ui/trace-bar.js) is mounted from here so the
 * buttons exist whether or not the ui lane wires it; mounting is idempotent.
 */

import * as THREE from 'three';
import { STACK } from '../dims.js';
import { KIND, get as registryGet } from '../parts/registry.js';
import { ORANGE } from '../materials.js';
import { TRACES } from '../data/traces.js';
import { mount as mountTraceBar } from '../ui/trace-bar.js';

/* ---------------------------------------------------------------- derived dimensions (never bare numbers) */

/** Bead radius: a third of the gap between stack plates reads on a 120 mm plate and on a 10 mm die. */
const MARKER_RADIUS = STACK.gap * 0.35;
/** Halo radius as a multiple of the bead. */
const HALO_SCALE = 2.4;
const MARKER_SEGMENTS = Object.freeze({ w: 24, h: 16 });
const HALO_SEGMENTS = Object.freeze({ w: 16, h: 12 });
/** Drawn after everything else so the bead stays visible through translucent plates and the package lid. */
const MARKER_RENDER_ORDER = 999;

/** Share of a step the bead spends travelling; the remainder it dwells on the lit target. */
const TRAVEL_FRACTION = 0.55;
/** Fade-out of the bead after the last step, in seconds (not scaled by the speed multiplier). */
const FADE_S = 0.35;
const HALO_OPACITY = 0.22;
const HALO_PULSE_HZ = 1.2;
const HALO_PULSE_AMOUNT = 0.18;
const TWO_PI = Math.PI * 2;
const SILICON_DIAL = 3;

/* ---------------------------------------------------------------- materials, created once at module scope */

let MATS = null;
function markerMaterials() {
  if (MATS) return MATS;
  MATS = {
    core: new THREE.MeshStandardMaterial({
      color: ORANGE, emissive: ORANGE, emissiveIntensity: 2.2, roughness: 0.35, metalness: 0,
      transparent: true, opacity: 1, depthTest: false, depthWrite: false,
    }),
    halo: new THREE.MeshBasicMaterial({
      color: ORANGE, transparent: true, opacity: HALO_OPACITY, blending: THREE.AdditiveBlending,
      depthTest: false, depthWrite: false, toneMapped: false,
    }),
  };
  MATS.core.name = 'trace.marker';
  MATS.halo.name = 'trace.halo';
  return MATS;
}

/* ---------------------------------------------------------------- preallocated scratch (per-frame code allocates nothing) */

const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _box = new THREE.Box3();
const _one = new THREE.Box3();

function easeInOutCubic(p) {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

/** Union `o`'s own bounds into _box, skipping effect subtrees (labels, beams, streams). */
function expandInto(o) {
  if (o.userData.effect) return;
  const geometry = o.geometry;
  if (geometry) {
    o.updateWorldMatrix(true, false);
    if (o.boundingBox !== undefined) {
      if (o.boundingBox === null) o.computeBoundingBox(); // InstancedMesh: once, then cached
      _one.copy(o.boundingBox);
    } else {
      if (geometry.boundingBox === null) geometry.computeBoundingBox();
      _one.copy(geometry.boundingBox);
    }
    _one.applyMatrix4(o.matrixWorld);
    _box.union(_one);
  }
  const children = o.children;
  for (let i = 0; i < children.length; i++) expandInto(children[i]);
}

/** World centre of a key's nodes into `out`; falls back to the first node's world position; false when no node. */
function centreOf(nodes, out) {
  if (!nodes || !nodes.length) return false;
  _box.makeEmpty();
  for (let i = 0; i < nodes.length; i++) expandInto(nodes[i]);
  if (_box.isEmpty()) nodes[0].getWorldPosition(out);
  else _box.getCenter(out);
  return true;
}

/* ---------------------------------------------------------------- init */

export function init(ctx) {
  const { state } = ctx;
  const highlight = ctx.mats.highlight;
  const saved = new Map(); // mesh → original material, for the current step only

  state.trace = { playing: false, name: null, step: 0, total: 0, path: null, label: null, target: null };

  // The bead: one sphere plus one halo, world-space children of the scene (not of MacBook, so neither
  // the GLB export nor sceneNames() ever sees them). Effects, untagged.
  const mats = markerMaterials();
  const marker = new THREE.Mesh(new THREE.SphereGeometry(MARKER_RADIUS, MARKER_SEGMENTS.w, MARKER_SEGMENTS.h), mats.core);
  marker.name = 'TraceMarker';
  marker.userData.effect = true;
  marker.renderOrder = MARKER_RENDER_ORDER;
  marker.frustumCulled = false;
  marker.visible = false;
  const halo = new THREE.Mesh(new THREE.SphereGeometry(MARKER_RADIUS * HALO_SCALE, HALO_SEGMENTS.w, HALO_SEGMENTS.h), mats.halo);
  halo.name = 'TraceHalo';
  halo.userData.effect = true;
  halo.renderOrder = MARKER_RENDER_ORDER;
  halo.frustumCulled = false;
  marker.add(halo);
  ctx.scene.add(marker);

  const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reduceMotion = Boolean(motionQuery?.matches);
  motionQuery?.addEventListener?.('change', (e) => {
    reduceMotion = Boolean(e.matches);
  });

  let run = null;   // { name, steps, nodes, index, progress (0..1 of the current step), resolve }
  let fade = 0;     // seconds of bead fade-out left after a trace ends

  /* ---- materials */

  function swapIn(nodes) {
    if (!nodes) return;
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].traverse((o) => {
        if (!o.isMesh || !o.material || o.userData.effect || o.material === highlight) return;
        saved.set(o, o.material);
        o.material = highlight;
      });
    }
  }

  function restore() {
    for (const [o, m] of saved) if (o.material === highlight) o.material = m;
    saved.clear();
  }

  /* ---- scene prerequisites */

  function openStack() {
    if (state.stack) return;
    if (typeof ctx.actions.setStack === 'function') ctx.actions.setStack(true);
    else if (typeof ctx.api?.setStack === 'function') ctx.api.setStack(true);
    else {
      state.stack = true;
      const stack = ctx.byKey.get('Stack')?.[0];
      if (stack) stack.visible = true;
      ctx.emit('stack', true);
    }
  }

  function showSilicon() {
    if (state.dial >= SILICON_DIAL) return;
    if (typeof ctx.actions.setDial === 'function') ctx.actions.setDial(SILICON_DIAL);
    else if (typeof ctx.api?.setDial === 'function') ctx.api.setDial(SILICON_DIAL);
  }

  function prepare(steps) {
    let layer = false;
    let unit = false;
    for (const s of steps) {
      const kind = registryGet(s.target)?.kind;
      if (kind === KIND.LAYER) layer = true;
      else if (kind === KIND.UNIT) unit = true;
    }
    if (layer) openStack();
    if (unit) showSilicon();
  }

  /* ---- steps */

  function publish() {
    ctx.emit('trace', state.trace);
  }

  function beginStep(i) {
    const step = run.steps[i];
    run.index = i;
    run.progress = 0;
    restore();
    run.nodes = ctx.byKey.get(step.target) ?? null;
    swapIn(run.nodes);
    // Depart from wherever the bead is; the first step spawns on its target.
    _from.copy(marker.position);
    if (centreOf(run.nodes, _to) && i === 0) {
      _from.copy(_to);
      marker.position.copy(_to);
    }
    state.trace.step = i + 1;
    state.trace.label = step.label;
    state.trace.target = step.target;
    publish();
  }

  function end(finished) {
    if (!run) return;
    const { resolve } = run;
    restore();
    run = null;
    state.trace.playing = false;
    if (!finished) state.trace.label = null;
    fade = FADE_S;
    publish();
    resolve();
  }

  /* ---- per frame: no allocations */

  function update(dt, t) {
    if (run) {
      // Progress is a fraction of the step, so a speed change mid-step alters the rate, never the position.
      const speed = state.traceSpeed > 0 && Number.isFinite(state.traceSpeed) ? state.traceSpeed : 1;
      const step = run.steps[run.index];
      const dur = step.duration / 1000 / speed;
      run.progress += dt / dur;

      centreOf(run.nodes, _to);
      const p = reduceMotion ? 1 : Math.min(1, run.progress / TRAVEL_FRACTION);
      const e = easeInOutCubic(p);
      marker.position.lerpVectors(_from, _to, e);
      marker.scale.setScalar(run.index === 0 ? Math.max(e, 0.001) : 1);
      halo.scale.setScalar(1 + HALO_PULSE_AMOUNT * Math.sin(t * TWO_PI * HALO_PULSE_HZ));
      mats.core.opacity = 1;
      mats.halo.opacity = HALO_OPACITY;
      marker.visible = true;
      ctx.requestRender();

      // One step boundary per frame, so every step is drawn at least once even at a large speed multiplier.
      if (run.progress >= 1) {
        if (run.index + 1 < run.steps.length) beginStep(run.index + 1);
        else end(true);
      }
    } else if (fade > 0) {
      fade = Math.max(0, fade - dt);
      const k = fade / FADE_S;
      mats.core.opacity = k;
      mats.halo.opacity = HALO_OPACITY * k;
      marker.scale.setScalar(Math.max(k, 0.001));
      if (fade === 0) marker.visible = false;
      ctx.requestRender();
    }
  }
  ctx.onFrame(update);

  /* ---- actions */

  function playTrace(name) {
    const trace = TRACES[name];
    if (!trace) return Promise.resolve();
    end(false);
    let resolve;
    const promise = new Promise((res) => {
      resolve = res;
    });
    run = { name, steps: trace.steps, nodes: null, index: -1, progress: 0, resolve };
    state.trace = { playing: true, name, step: 0, total: trace.steps.length, path: trace.path, label: null, target: null };
    prepare(trace.steps);
    fade = 0;
    beginStep(0);
    return promise;
  }

  function stopTrace() {
    end(false);
  }

  function setTraceSpeed(mult) {
    const m = Number(mult);
    state.traceSpeed = Number.isFinite(m) && m > 0 ? m : 1;
    ctx.emit('traceSpeed', state.traceSpeed);
  }

  ctx.actions.playTrace = playTrace;
  ctx.actions.stopTrace = stopTrace;
  ctx.actions.setTraceSpeed = setTraceSpeed;

  // A chip switch rebuilds the die: re-point the highlight at the fresh unit meshes.
  ctx.events.addEventListener('chip', () => {
    if (!run) return;
    restore();
    run.nodes = ctx.byKey.get(run.steps[run.index].target) ?? null;
    swapIn(run.nodes);
  });

  mountTraceBar(ctx);
}
