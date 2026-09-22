/**
 * src/engine/explode.js — stub. Installs ctx.actions.setExplode and ctx.actions.setLid.
 * Moves every tagged node with an explode stage by its module's explodeOffsets × the stage's eased
 * progress, and rotates the Display group from state.lidAngleDeg toward LID.explodeAngleDeg.
 * The interaction lane replaces this file wholesale.
 */

import * as THREE from 'three';
import { LID } from '../dims.js';
import { EXPLODE_STAGES, stageIndex, instanceCount } from '../parts/registry.js';

const DEG = Math.PI / 180;

function ease(p) {
  return p * p * (3 - 2 * p);
}

/** Stage k plays over slider t ∈ [k/n, (k+1)/n]. */
function stageProgress(t, k) {
  const n = EXPLODE_STAGES.length;
  return ease(Math.min(1, Math.max(0, t * n - k)));
}

export function init(ctx) {
  let items = [];

  function collect() {
    items = [];
    const offsets = Object.assign({}, ...ctx.modules.map((m) => m.explodeOffsets || {}));
    ctx.root.traverse((o) => {
      const stage = o.userData.explode;
      if (!stage || !o.userData.part) return;
      const k = stageIndex(stage);
      const rest = ctx.rest.get(o);
      if (k < 0 || !rest) return;
      let off = offsets[o.name] ?? offsets[o.userData.part];
      if (typeof off === 'function') off = off(o.userData.instance ?? 0, instanceCount(o.userData.part, ctx.chip) ?? 1, ctx.chip);
      if (!off) return;
      items.push({ node: o, rest, offset: new THREE.Vector3().fromArray(off), stage: k });
    });
  }

  function apply(t) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      it.node.position.copy(it.rest).addScaledVector(it.offset, stageProgress(t, it.stage));
    }
    const display = ctx.byKey.get('Display')?.[0];
    if (display) {
      const p = stageProgress(t, stageIndex('lid'));
      const deg = ctx.state.lidAngleDeg + (LID.explodeAngleDeg - ctx.state.lidAngleDeg) * p;
      display.rotation.x = -deg * DEG;
    }
  }

  ctx.actions.setExplode = (t) => {
    ctx.state.explode = Math.min(1, Math.max(0, Number(t) || 0));
    apply(ctx.state.explode);
    ctx.emit('explode', ctx.state.explode);
  };
  ctx.actions.setLid = (deg) => {
    ctx.state.lidAngleDeg = Number(deg);
    apply(ctx.state.explode);
    ctx.emit('lid', ctx.state.lidAngleDeg);
  };
  ctx.events.addEventListener('chip', () => {
    collect();
    apply(ctx.state.explode);
  });
  collect();
  apply(ctx.state.explode);
}
