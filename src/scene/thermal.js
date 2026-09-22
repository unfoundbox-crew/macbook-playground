/** src/scene/thermal.js — stub. Fans as cylinders, pipe/plate/sheet as boxes. The thermal lane replaces this file. */

import * as THREE from 'three';
import { FAN, HEAT_PIPE, HEATSINK_PLATE, GRAPHITE_SHEET, EXPLODE } from '../dims.js';

export const NAME = 'Thermal';
const AIR_HIDES = ['FanL', 'FanR', 'HeatPipe'];

function box(ctx, parent, key, mat, [w, h, d], [x, y, z]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(ctx.tag(m, key));
  return m;
}

export function build(parent, chip, ctx) {
  const { mats } = ctx;
  const g = ctx.tag(new THREE.Group(), NAME);
  parent.add(g);

  for (const [key, x] of [['FanL', FAN.xL], ['FanR', FAN.xR]]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(FAN.radius, FAN.radius, FAN.h, 48), mats.plastic);
    m.position.set(x, FAN.y + FAN.h / 2, FAN.z);
    g.add(ctx.tag(m, key));
  }
  const P = HEAT_PIPE;
  box(ctx, g, 'HeatPipe', mats.copper, [P.x1 - P.x0, P.t, P.w], [(P.x0 + P.x1) / 2, P.y, P.z]);
  const H = HEATSINK_PLATE;
  box(ctx, g, 'HeatsinkPlate', mats.aluminiumInner, [H.w, H.t, H.d], [H.cx, H.y, H.cz]);
  const G = GRAPHITE_SHEET;
  box(ctx, g, 'GraphiteSheet', mats.rubber, [G.w, G.t, G.d], [G.cx, G.y, G.cz]);

  applyChip(g, chip, ctx);
  return g;
}

/** 'air' chassis has no fans or heat pipe. userData.chipHidden is honoured by the dial. */
export function applyChip(group, chip, ctx) {
  const air = chip.chassis === 'air';
  for (const name of AIR_HIDES) {
    const m = group.getObjectByName(name);
    m.userData.chipHidden = air;
    m.visible = !air && m.userData.level <= ctx.state.dial;
  }
}

export const explodeOffsets = {
  HeatPipe: [0, EXPLODE.thermal, 0],
  HeatsinkPlate: [0, EXPLODE.thermal, 0],
  FanL: [0, EXPLODE.thermal, 0],
  FanR: [0, EXPLODE.thermal, 0],
  GraphiteSheet: [0, EXPLODE.thermal, 0],
};
