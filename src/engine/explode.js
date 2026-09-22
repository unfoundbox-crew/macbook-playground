/**
 * src/engine/explode.js — the explode engine.
 *
 * Slider t ∈ [0, 1]. Stage k of registry.EXPLODE_STAGES plays over [k/8, (k+1)/8], widened by a small
 * OVERLAP so consecutive stages hand over without a dead stop, eased with easeInOutCubic. Every tagged
 * node whose userData.explode names a stage is displaced by offset × progress(stage) from the rest pose
 * main.js recorded in ctx.rest. The offset comes from the owning scene module's explodeOffsets: the
 * nearest ancestor-or-self whose name is a module NAME is asked first (node name, then registry key,
 * function form gets (instanceIndex, instanceCount, chip)), then every module in build order.
 * The Display group's own 'lid' stage is a rotation from state.lidAngleDeg toward LID.explodeAngleDeg.
 *
 * Installs: ctx.actions.setExplode(t) (immediate), tweenExplode(t, ms) → Promise, toggleExplode(),
 * setLid(deg). Key E toggles 0 ↔ 1 over TOGGLE_MS. Emits 'explode' (detail = t) and 'lid' (detail = deg).
 * The per-frame path (apply) allocates nothing; items are collected once and again after 'chip'.
 */

import * as THREE from 'three';
import { LID } from '../dims.js';
import { EXPLODE_STAGES, stageIndex, instanceCount } from '../parts/registry.js';
import { init as initTween, tween, easeInOutCubic } from './tween.js';
import { shortcutKey } from './interaction.js';

const DEG = Math.PI / 180;
const STAGE_COUNT = EXPLODE_STAGES.length;
const STAGE_WIDTH = 1 / STAGE_COUNT;
/** Fraction of a stage width shared with each neighbour, so the sequence reads as one motion. */
export const OVERLAP = 0.2;
export const TOGGLE_MS = 900;
const LID_STAGE = stageIndex('lid');

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Eased progress (0..1) of stage k at slider value t. Stage 0 starts at t = 0, the last ends at t = 1. */
export function stageProgress(t, k) {
  const start = Math.max(0, (k - OVERLAP) * STAGE_WIDTH);
  const end = Math.min(1, (k + 1 + OVERLAP) * STAGE_WIDTH);
  return easeInOutCubic(clamp01((t - start) / (end - start)));
}

function readOffset(offsets, node, chip) {
  if (!offsets) return null;
  let off = offsets[node.name];
  if (off == null) off = offsets[node.userData.part];
  if (typeof off === 'function') {
    off = off(node.userData.instance ?? 0, instanceCount(node.userData.part, chip) ?? 1, chip);
  }
  if (off?.isVector3) return [off.x, off.y, off.z];
  return Array.isArray(off) && off.length >= 3 ? off : null;
}

export function init(ctx) {
  initTween(ctx);
  const { state } = ctx;
  const moduleByName = new Map();
  let items = [];
  let display = null;
  let running = null;
  let runningTo = 0;

  function offsetFor(node) {
    for (let n = node; n && n !== ctx.root.parent; n = n.parent) {
      const m = moduleByName.get(n.name);
      const off = m && readOffset(m.explodeOffsets, node, ctx.chip);
      if (off) return off;
    }
    for (const m of ctx.modules) {
      const off = readOffset(m.explodeOffsets, node, ctx.chip);
      if (off) return off;
    }
    return null;
  }

  function collect() {
    moduleByName.clear();
    for (const m of ctx.modules) if (m?.NAME) moduleByName.set(m.NAME, m);
    items = [];
    display = ctx.byKey.get('Display')?.[0] ?? null;
    ctx.root.traverse((o) => {
      const stage = o.userData.explode;
      if (!stage || !o.userData.part) return;
      const k = stageIndex(stage);
      const rest = ctx.rest.get(o);
      if (k < 0 || !rest) return;
      const off = offsetFor(o);
      if (!off) return;
      items.push({ node: o, rest, offset: new THREE.Vector3().fromArray(off), stage: k });
    });
  }

  /** Pose every exploding node and the lid for slider value t. Zero allocations. */
  function apply(t) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      it.node.position.copy(it.rest).addScaledVector(it.offset, stageProgress(t, it.stage));
    }
    if (display) {
      const deg = state.lidAngleDeg + (LID.explodeAngleDeg - state.lidAngleDeg) * stageProgress(t, LID_STAGE);
      display.rotation.x = -deg * DEG;
    }
    ctx.requestRender?.();
  }

  function cancelRunning() {
    if (running) {
      const tw = running;
      running = null;
      tw.cancel();
    }
  }

  function setExplode(t) {
    cancelRunning();
    state.explode = clamp01(Number(t) || 0);
    apply(state.explode);
    ctx.emit('explode', state.explode);
  }

  function tweenExplode(t, ms = TOGGLE_MS) {
    cancelRunning();
    const to = clamp01(Number(t) || 0);
    if (!(ms > 0) || Math.abs(to - state.explode) < 1e-6) {
      setExplode(to);
      return Promise.resolve();
    }
    const tw = tween({
      from: state.explode,
      to,
      duration: ms,
      ease: easeInOutCubic,
      onUpdate(v) {
        state.explode = v;
        apply(v);
        ctx.emit('explode', v);
      },
      onComplete() {
        if (running === tw) running = null;
      },
    });
    running = tw;
    runningTo = to;
    return tw.promise;
  }

  /** The slider value the current tween is heading for (or the resting value). */
  function target() {
    return running ? runningTo : state.explode;
  }

  ctx.actions.setExplode = setExplode;
  ctx.actions.tweenExplode = tweenExplode;
  ctx.actions.toggleExplode = () => tweenExplode(target() > 0.5 ? 0 : 1, TOGGLE_MS);
  ctx.actions.setLid = (deg) => {
    const d = Number(deg);
    if (!Number.isFinite(d)) return;
    state.lidAngleDeg = d;
    apply(state.explode);
    ctx.emit('lid', state.lidAngleDeg);
  };

  ctx.events.addEventListener('chip', () => {
    collect();
    apply(state.explode);
  });

  window.addEventListener('keydown', (e) => {
    if (shortcutKey(e) === 'e') {
      e.preventDefault();
      ctx.actions.toggleExplode();
    }
  });

  collect();
  apply(state.explode);
}
