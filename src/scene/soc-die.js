/**
 * src/scene/soc-die.js — the Die group of the SoC package (soc lane; see soc.js and soc-stream.js).
 *
 * Die[i] silicon slabs (1 / 2 side by side / 2×2), the seven tagged unit plates from dims.DIE_UNITS on
 * Die[0], and the chip-reactive floorplan detail that sits on those plates:
 *   GPUCores         gpu_cores raised tiles in a near-square grid            (InstancedMesh, untagged)
 *   CPUCluster       super / P / E core blocks, largest → smallest            (three InstancedMeshes)
 *   NeuralEngine     neural_engine_cores tiles                                (InstancedMesh)
 *   SLC              a fixed SRAM macro array                                 (InstancedMesh)
 *   MemoryController one channel lane per LPDDR module                        (InstancedMesh)
 * Extra slabs (die_count > 1) carry only the faint metal grid of the silicon material.
 * Every detail mesh is an untagged child of its tagged plate, so it explodes, hides and exports with it.
 * Materials are created once (lazily) at module scope; geometry that changes per chip is returned in
 * `geoms` so soc.js can dispose it on the next applyChip.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MM, SOC, DIE_UNITS } from '../dims.js';
import { instanceCount, DIE_UNITS as UNIT_KEYS } from '../parts/registry.js';
import { ORANGE, BLUE } from '../materials.js';

/* ---------------------------------------------------------------- derived dimensions (never bare numbers) */

/** Gap between the slabs of a multi-die package. */
export const DIE_GAP = 1 * MM;
/** Diced silicon is near-sharp; a hair of fillet stops the edge aliasing at 2× DPR. */
const DIE_EDGE_RADIUS = SOC.dieT * 0.12;
/** Height of the tiles/blocks that sit on a unit plate. */
const TILE_T = DIE_UNITS.unitT * 0.75;
/** Tile side as a fraction of its grid cell (the rest is the gutter between tiles). */
const TILE_FILL = 0.8;
/** CPU block sides as fractions of the CPUCluster plate width. */
const CORE_FRAC = Object.freeze({ super: 0.30, p: 0.22, e: 0.15 });
const CORE_GUTTER_FRAC = 0.035;
/** SLC SRAM macro array (decorative, fixed). */
const SLC_GRID = Object.freeze({ cols: 4, rows: 8 });
/** Hard caps so a malformed chip entry can never allocate unbounded instances. */
const MAX_TILES = 256;
const MAX_BLOCKS_PER_KIND = 64;
const MAX_LANES = 16;

/** Chip fallbacks (docs/CONTRACT.md). */
const FALLBACK = Object.freeze({ gpu: 10, super: 4, p: 0, e: 4, neural: 16 });

/* ---------------------------------------------------------------- materials, created once */

let M = null;
function mats() {
  if (M) return M;
  const Std = THREE.MeshStandardMaterial;
  const Phys = THREE.MeshPhysicalMaterial;
  const neutral = new THREE.Color(0x33363c);
  const tint = (hex, k) => neutral.clone().lerp(new THREE.Color(hex), k);
  M = {
    // GPU tiles: a faint thin-film shimmer, the way a real die photographs under a lamp.
    gpuTile: new Phys({ color: 0x323846, roughness: 0.3, metalness: 0.45, iridescence: 0.35, iridescenceIOR: 1.3, iridescenceThicknessRange: [120, 420] }),
    superCore: new Std({ color: tint(ORANGE, 0.18), roughness: 0.35, metalness: 0.4 }),
    pCore: new Std({ color: tint(BLUE, 0.18), roughness: 0.35, metalness: 0.4 }),
    eCore: new Std({ color: 0x3a3c40, roughness: 0.4, metalness: 0.35 }),
    neuralTile: new Std({ color: 0x3b3742, roughness: 0.32, metalness: 0.45 }),
    sram: new Std({ color: 0x2c3340, roughness: 0.28, metalness: 0.5 }),
    lane: new Std({ color: 0x3c3f45, roughness: 0.38, metalness: 0.4 }),
  };
  for (const [name, m] of Object.entries(M)) m.name = `soc.die.${name}`;
  return M;
}

/** One unit cube shared by every instanced tile/block; per-instance matrices carry the size. Never disposed. */
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

/* ---------------------------------------------------------------- sizing */

/** Die side length in metres: from die_mm2, else from the GPU core count; clamped. */
export function dieSide(chip) {
  const mm2 = chip?.die_mm2;
  const s = Number.isFinite(mm2) && mm2 > 0 ? SOC.dieSideFromMm2(mm2) : SOC.dieSideFromGpuCores(chip?.gpu_cores ?? FALLBACK.gpu);
  return Math.min(SOC.dieSideMax, Math.max(SOC.dieSideMin, s));
}

/** Slab grid: 1 → 1×1, 2 → 2 side by side along X, 4 → 2×2; anything else → a row. */
export function dieGrid(count) {
  const cols = count === 4 ? 2 : count;
  const rows = count === 4 ? 2 : 1;
  return { cols, rows };
}

function clampInt(v, fallback, max) {
  const n = Number.isInteger(v) && v >= 0 ? v : fallback;
  return Math.min(max, n);
}

/* ---------------------------------------------------------------- detail builders (all untagged children of a plate) */

function setInstance(inst, k, x, y, z, sx, sy, sz) {
  _p.set(x, y, z);
  _s.set(sx, sy, sz);
  _m.compose(_p, _q, _s);
  inst.setMatrixAt(k, _m);
}

function finish(inst, parent) {
  inst.instanceMatrix.needsUpdate = true;
  inst.frustumCulled = false; // bounds of the shared unit cube are meaningless; the parent plate is tiny anyway
  parent.add(inst);
  return inst;
}

/** n tiles in a near-square grid filling a uw × ud plate. Returns the tile count actually drawn. */
function gridTiles(plate, uw, ud, n, material) {
  const count = Math.max(1, Math.min(MAX_TILES, n));
  let cols = Math.max(1, Math.round(Math.sqrt(count * (uw / ud))));
  const rows = Math.ceil(count / cols);
  cols = Math.ceil(count / rows);
  const cellW = uw / cols;
  const cellD = ud / rows;
  const inst = new THREE.InstancedMesh(UNIT_BOX, material, count);
  for (let k = 0; k < count; k++) {
    const c = k % cols;
    const r = Math.floor(k / cols);
    setInstance(inst, k, -uw / 2 + (c + 0.5) * cellW, DIE_UNITS.unitT / 2 + TILE_T / 2, -ud / 2 + (r + 0.5) * cellD,
      cellW * TILE_FILL, TILE_T, cellD * TILE_FILL);
  }
  finish(inst, plate);
  return count;
}

/**
 * CPU floorplan: row-packed blocks, super cores first (largest), then P, then E. When the rows overflow
 * the plate depth every block shrinks uniformly until they fit.
 */
function cpuBlocks(plate, uw, ud, counts) {
  const items = [];
  for (const kind of ['super', 'p', 'e']) for (let i = 0; i < counts[kind]; i++) items.push(kind);
  const gutter = uw * CORE_GUTTER_FRAC;
  const availW = uw - 2 * gutter;
  const availD = ud - 2 * gutter;

  function pack(scale) {
    const rows = [];
    let row = null;
    let usedD = 0;
    for (const kind of items) {
      const side = uw * CORE_FRAC[kind] * scale;
      if (!row || row.w + gutter + side > availW) {
        if (row) usedD += row.h + gutter;
        row = { items: [], w: 0, h: 0 };
        rows.push(row);
      }
      if (row.items.length) row.w += gutter;
      row.items.push({ kind, side, x: row.w });
      row.w += side;
      row.h = Math.max(row.h, side);
    }
    if (row) usedD += row.h;
    return { rows, usedD };
  }

  let scale = 1;
  let packed = pack(scale);
  for (let i = 0; i < 8 && packed.usedD > availD; i++) {
    scale *= (availD / packed.usedD) * 0.98;
    packed = pack(scale);
  }

  const perKind = { super: [], p: [], e: [] };
  let z = -ud / 2 + gutter + (availD - packed.usedD) / 2;
  for (const row of packed.rows) {
    for (const it of row.items) {
      perKind[it.kind].push({ x: -uw / 2 + gutter + it.x + it.side / 2, z: z + row.h / 2, side: it.side });
    }
    z += row.h + gutter;
  }

  const material = { super: mats().superCore, p: mats().pCore, e: mats().eCore };
  for (const kind of ['super', 'p', 'e']) {
    const list = perKind[kind];
    if (!list.length) continue;
    const inst = new THREE.InstancedMesh(UNIT_BOX, material[kind], list.length);
    list.forEach((b, k) => setInstance(inst, k, b.x, DIE_UNITS.unitT / 2 + TILE_T / 2, b.z, b.side, TILE_T, b.side * 0.92));
    finish(inst, plate);
  }
}

/** SLC: a fixed array of SRAM macros. */
function sramArray(plate, uw, ud) {
  const { cols, rows } = SLC_GRID;
  const cellW = uw / cols;
  const cellD = ud / rows;
  const inst = new THREE.InstancedMesh(UNIT_BOX, mats().sram, cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      setInstance(inst, r * cols + c, -uw / 2 + (c + 0.5) * cellW, DIE_UNITS.unitT / 2 + TILE_T / 2, -ud / 2 + (r + 0.5) * cellD,
        cellW * 0.86, TILE_T, cellD * 0.7);
    }
  }
  finish(inst, plate);
}

/** MemoryController: one lane per LPDDR module, side by side along X, running the plate's depth. */
function channelLanes(plate, uw, ud, n) {
  const count = Math.max(1, Math.min(MAX_LANES, n));
  const cellW = uw / count;
  const inst = new THREE.InstancedMesh(UNIT_BOX, mats().lane, count);
  for (let k = 0; k < count; k++) {
    setInstance(inst, k, -uw / 2 + (k + 0.5) * cellW, DIE_UNITS.unitT / 2 + TILE_T / 2, 0, cellW * 0.6, TILE_T, ud * 0.82);
  }
  finish(inst, plate);
}

/* ---------------------------------------------------------------- public: build the Die group's children */

/**
 * Fill `die` (the tagged Die group, already emptied by the caller) for `chip`.
 * `lay` comes from soc.js: { side, count, cols, rows, lpddrN }.
 * Per-chip geometries are pushed into `geoms` for disposal on the next rebuild.
 * Returns { gpuTiles, cpuBlocks: { super, p, e } } for ctx.state.chipDerived.
 */
export function buildDie(die, chip, lay, ctx, geoms) {
  const { mats: shared, tag } = ctx;
  const { side, count, cols, rows } = lay;

  const slabGeo = new RoundedBoxGeometry(side, SOC.dieT, side, 2, DIE_EDGE_RADIUS);
  geoms.push(slabGeo);
  const slabs = [];
  for (let i = 0; i < count; i++) {
    const slab = new THREE.Mesh(slabGeo, shared.silicon);
    slab.position.set(
      ((i % cols) - (cols - 1) / 2) * (side + DIE_GAP),
      SOC.dieT / 2,
      (Math.floor(i / cols) - (rows - 1) / 2) * (side + DIE_GAP),
    );
    die.add(tag(slab, 'Die', i));
    slabs.push(slab);
  }

  const gpu = clampInt(chip?.gpu_cores, FALLBACK.gpu, MAX_TILES) || FALLBACK.gpu;
  const cpu = {
    super: clampInt(chip?.cpu_super_cores, FALLBACK.super, MAX_BLOCKS_PER_KIND),
    p: clampInt(chip?.cpu_p_cores, FALLBACK.p, MAX_BLOCKS_PER_KIND),
    e: clampInt(chip?.cpu_e_cores, FALLBACK.e, MAX_BLOCKS_PER_KIND),
  };
  const neural = clampInt(chip?.neural_engine_cores, FALLBACK.neural, MAX_TILES) || FALLBACK.neural;
  const lpddrN = lay.lpddrN ?? instanceCount('LPDDR', chip);

  const d0 = slabs[0].position;
  let gpuTiles = 0;
  for (const key of UNIT_KEYS) {
    const [fx, fz, fw, fd] = DIE_UNITS[key];
    const uw = fw * side;
    const ud = fd * side;
    const geo = new THREE.BoxGeometry(uw, DIE_UNITS.unitT, ud);
    geoms.push(geo);
    const plate = new THREE.Mesh(geo, shared.siliconUnit);
    plate.position.set(
      d0.x - side / 2 + (fx + fw / 2) * side,
      SOC.dieT + DIE_UNITS.unitT / 2,
      d0.z - side / 2 + (fz + fd / 2) * side,
    );
    die.add(tag(plate, key));

    switch (key) {
      case 'GPUCores': gpuTiles = gridTiles(plate, uw, ud, gpu, mats().gpuTile); break;
      case 'CPUCluster': cpuBlocks(plate, uw, ud, cpu); break;
      case 'NeuralEngine': gridTiles(plate, uw, ud, neural, mats().neuralTile); break;
      case 'SLC': sramArray(plate, uw, ud); break;
      case 'MemoryController': channelLanes(plate, uw, ud, lpddrN); break;
      default: break; // MediaEngine, SecureEnclave: plain plates
    }
  }

  return { gpuTiles, cpuBlocks: cpu };
}

/** Remove every child of the Die group, freeing instance buffers (geometries are disposed by soc.js via `geoms`). */
export function clearDie(die) {
  for (const c of [...die.children]) {
    c.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
    die.remove(c);
  }
}
