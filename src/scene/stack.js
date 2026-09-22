/** src/scene/stack.js — stub. Fifteen translucent layer slabs above the SoC, hidden until state.stack. The stack lane replaces this file. */

import * as THREE from 'three';
import { STACK } from '../dims.js';
import { STACK_LAYERS } from '../parts/registry.js';

export const NAME = 'Stack';

export function build(parent, chip, ctx) {
  const g = ctx.tag(new THREE.Group(), NAME);
  g.position.set(STACK.cx, 0, STACK.cz);
  g.visible = ctx.state.stack;
  parent.add(g);
  STACK_LAYERS.forEach((key, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(STACK.w, STACK.layerT, STACK.d), ctx.mats.layerTranslucent);
    m.position.y = STACK.y0 + i * (STACK.layerT + STACK.gap) + STACK.layerT / 2;
    g.add(ctx.tag(m, key));
  });
  return g;
}

export const explodeOffsets = {};
