/**
 * src/scene/soc.js — stub. SoCPackage on the PCB top face: Substrate, Die group (Die[i] slabs +
 * the seven unit plates on Die[0]), HeatSpreader, LPDDR[i] left/right of the die.
 * applyChip rebuilds the chip-dependent children in place. The soc lane replaces this file.
 */

import * as THREE from 'three';
import { MM, LOGIC_BOARD, SOC, DIE_UNITS, EXPLODE } from '../dims.js';
import { instanceCount, DIE_UNITS as UNIT_KEYS } from '../parts/registry.js';

export const NAME = 'SoCPackage';

function dieSide(chip) {
  const s = chip.die_mm2 != null ? SOC.dieSideFromMm2(chip.die_mm2) : SOC.dieSideFromGpuCores(chip.gpu_cores ?? 10);
  return Math.min(SOC.dieSideMax, Math.max(SOC.dieSideMin, s));
}

function layout(chip) {
  const side = dieSide(chip);
  const count = instanceCount('Die', chip);
  const cols = count === 4 ? 2 : count;
  const rows = count === 4 ? 2 : 1;
  const n = instanceCount('LPDDR', chip);
  return { side, count, cols, rows, footW: cols * side, footD: rows * side, lpddrN: n, lpddrRows: Math.ceil(n / 2) };
}

function lpddrXZ(i, lay) {
  const sx = i % 2 ? 1 : -1;
  const row = Math.floor(i / 2);
  const x = sx * (lay.footW / 2 + SOC.lpddr.gapFromDie + SOC.lpddr.w / 2);
  const z = (row - (lay.lpddrRows - 1) / 2) * (SOC.lpddr.d + SOC.lpddr.gapFromDie);
  return [x, z];
}

function box(ctx, parent, key, mat, [w, h, d], [x, y, z], index = null) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(ctx.tag(m, key, index));
  return m;
}

function clear(group) {
  for (const c of [...group.children]) {
    c.traverse((o) => o.geometry?.dispose());
    group.remove(c);
  }
}

/** (Re)builds every chip-dependent child. Substrate and the Die group are created once by build(). */
function populate(g, chip, ctx) {
  const { mats } = ctx;
  const lay = layout(chip);
  const S = SOC.substrate;
  const m = SOC.spreaderMargin;

  const substrate = g.getObjectByName('Substrate');
  substrate.geometry.dispose();
  const subW = Math.max(S.w, lay.footW + 2 * (SOC.lpddr.gapFromDie + SOC.lpddr.w + m));
  const subD = Math.max(S.d, lay.footD + 2 * m, lay.lpddrRows * (SOC.lpddr.d + SOC.lpddr.gapFromDie) + 2 * m);
  substrate.geometry = new THREE.BoxGeometry(subW, S.t, subD);
  substrate.position.set(0, S.t / 2, 0);

  const die = g.getObjectByName('Die');
  clear(die);
  for (const c of [...g.children]) if (c.userData.part === 'HeatSpreader' || c.userData.part === 'LPDDR') { c.geometry.dispose(); g.remove(c); }

  const slabs = [];
  for (let i = 0; i < lay.count; i++) {
    const x = ((i % lay.cols) - (lay.cols - 1) / 2) * lay.side;
    const z = (Math.floor(i / lay.cols) - (lay.rows - 1) / 2) * lay.side;
    slabs.push(box(ctx, die, 'Die', mats.silicon, [lay.side, SOC.dieT, lay.side], [x, SOC.dieT / 2, z], i));
  }
  const d0 = slabs[0].position;
  for (const key of UNIT_KEYS) {
    const [fx, fz, fw, fd] = DIE_UNITS[key];
    box(ctx, die, key, mats.siliconUnit, [fw * lay.side, DIE_UNITS.unitT, fd * lay.side],
      [d0.x - lay.side / 2 + (fx + fw / 2) * lay.side, SOC.dieT + DIE_UNITS.unitT / 2, d0.z - lay.side / 2 + (fz + fd / 2) * lay.side]);
  }

  box(ctx, g, 'HeatSpreader', mats.steel, [lay.footW + 2 * m, SOC.spreaderT, lay.footD + 2 * m], [0, S.t + SOC.dieT + SOC.spreaderT / 2, 0]);

  for (let i = 0; i < lay.lpddrN; i++) {
    const [x, z] = lpddrXZ(i, lay);
    box(ctx, g, 'LPDDR', mats.packageBlack, [SOC.lpddr.w, SOC.lpddr.t, SOC.lpddr.d], [x, S.t + SOC.lpddr.t / 2, z], i);
  }

  ctx.state.chipDerived = {
    dieSideMm: lay.side / MM,
    dieCount: lay.count,
    lpddrCount: lay.lpddrN,
    gpuTiles: chip.gpu_cores ?? 10,
    cpuBlocks: { super: chip.cpu_super_cores ?? 4, p: chip.cpu_p_cores ?? 0, e: chip.cpu_e_cores ?? 4 },
    streamSpeed: chip.bandwidth_gbs ?? 100,
  };
}

export function build(parent, chip, ctx) {
  const g = ctx.tag(new THREE.Group(), NAME);
  g.position.set(SOC.cx, LOGIC_BOARD.y + LOGIC_BOARD.t / 2, SOC.cz);
  parent.add(g);
  g.add(ctx.tag(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ctx.mats.pcb), 'Substrate'));
  const die = ctx.tag(new THREE.Group(), 'Die');
  die.position.y = SOC.substrate.t;
  g.add(die);
  populate(g, chip, ctx);
  return g;
}

export function applyChip(group, chip, ctx) {
  populate(group, chip, ctx);
}

export const explodeOffsets = {
  SoCPackage: [0, EXPLODE.soc, 0],
  HeatSpreader: [0, EXPLODE.spreader, 0],
  LPDDR: (i, count) => {
    const rows = Math.ceil(count / 2);
    const zSign = rows > 1 ? Math.sign(Math.floor(i / 2) - (rows - 1) / 2) : 0;
    return [(i % 2 ? 1 : -1) * EXPLODE.lpddrSpread, 0, zSign * EXPLODE.lpddrSpread / 2];
  },
};
