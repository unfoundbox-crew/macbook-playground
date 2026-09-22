/** src/scene/logicboard.js — stub. PCB, board packages, small boards and ports as boxes. The logicboard lane replaces this file. */

import * as THREE from 'three';
import { BASE, LOGIC_BOARD, BOARD_PARTS, SMALL_BOARDS, PORTS, PORT_Y, EXPLODE } from '../dims.js';
import { parseNodeName } from '../parts/registry.js';

export const NAME = 'LogicBoard';

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

  const B = LOGIC_BOARD;
  box(ctx, g, 'PCB', mats.pcb, [B.x1 - B.x0, B.t, B.z1 - B.z0], [(B.x0 + B.x1) / 2, B.y, (B.z0 + B.z1) / 2]);

  const top = B.y + B.t / 2;
  for (const [key, spec] of Object.entries(BOARD_PARTS)) {
    const list = Array.isArray(spec[0]) ? spec : [spec];
    list.forEach(([cx, cz, w, d, t], i) => {
      box(ctx, g, key, mats.packageBlack, [w, t, d], [cx, top + t / 2, cz], list === spec ? i : null);
    });
  }

  for (const [key, spec] of Object.entries(SMALL_BOARDS)) {
    if (!Array.isArray(spec)) continue; // `t` is the shared thickness, not a board
    const [cx, cz, w, d] = spec;
    box(ctx, g, key, mats.pcb, [w, SMALL_BOARDS.t, d], [cx, B.y, cz]);
  }

  const ports = ctx.tag(new THREE.Group(), 'Ports');
  g.add(ports);
  for (const side of ['left', 'right']) {
    const x = (side === 'left' ? -1 : 1) * (BASE.w / 2 - PORTS.depth / 2);
    for (const [name, [z, w, h]] of Object.entries(PORTS[side])) {
      const { base, index } = parseNodeName(name);
      box(ctx, ports, base, mats.steel, [PORTS.depth, h, w], [x, PORT_Y, z], index);
    }
  }
  return g;
}

export const explodeOffsets = {
  LogicBoard: [0, EXPLODE.board, 0],
};
