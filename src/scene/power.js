/** src/scene/power.js — stub. Six battery pouches and the BMS flex as boxes. The power lane replaces this file. */

import * as THREE from 'three';
import { BATTERY, EXPLODE } from '../dims.js';

export const NAME = 'Power';

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
  BATTERY.cells.forEach(([cx, cz, w, d], i) => {
    box(ctx, g, 'BatteryCell', mats.batteryFoil, [w, BATTERY.cellT, d], [cx, BATTERY.y + BATTERY.cellT / 2, cz], i);
  });
  const F = BATTERY.bmsFlex;
  box(ctx, g, 'BatteryManagementFlex', mats.flex, [F.w, F.t, F.d], [F.cx, BATTERY.y + BATTERY.cellT / 2, F.cz]);
  return g;
}

export const explodeOffsets = {
  BatteryCell: [0, EXPLODE.battery, 0],
  BatteryManagementFlex: [0, EXPLODE.battery, 0],
};
