/** src/scene/chassis.js — stub. Every Chassis node as a box/cylinder; the chassis lane replaces this file. */

import * as THREE from 'three';
import { BASE, FEET, HINGE, VENT_ANTENNA_BAR, EXPLODE } from '../dims.js';

export const NAME = 'Chassis';

function box(ctx, parent, key, mat, [w, h, d], [x, y, z], index = null) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(ctx.tag(m, key, index));
  return m;
}

export function build(parent, chip, ctx) {
  const { mats } = ctx;
  const g = ctx.tag(new THREE.Group(), NAME);
  parent.add(g);

  // TopCase is the deck plate only; the unibody walls arrive with the real chassis module.
  box(ctx, g, 'TopCase', mats.aluminium, [BASE.w, BASE.deckT, BASE.d], [0, BASE.h - BASE.deckT / 2, 0]);
  box(ctx, g, 'BottomCase', mats.aluminium, [BASE.w, BASE.bottomPlateT, BASE.d], [0, BASE.bottomPlateT / 2, 0]);
  box(ctx, g, 'VentAntennaBar', mats.plastic, [VENT_ANTENNA_BAR.w, VENT_ANTENNA_BAR.h, VENT_ANTENNA_BAR.d], [0, VENT_ANTENNA_BAR.y, VENT_ANTENNA_BAR.z]);

  for (const [key, x] of [['HingeL', HINGE.xL], ['HingeR', HINGE.xR]]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(HINGE.radius, HINGE.radius, HINGE.length, 24), mats.aluminiumInner);
    m.rotation.z = Math.PI / 2;
    m.position.set(x, HINGE.y, HINGE.z);
    g.add(ctx.tag(m, key));
  }

  FEET.positions.forEach(([x, z], i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(FEET.radius, FEET.radius, FEET.h, 24), mats.rubber);
    m.position.set(x, -FEET.h / 2, z);
    g.add(ctx.tag(m, 'Feet', i));
  });
  return g;
}

export const explodeOffsets = {
  BottomCase: [0, EXPLODE.bottomCase, 0],
  Feet: [0, EXPLODE.feet, 0],
};
