/**
 * src/scene/soc.js — SoCPackage (soc lane; with soc-die.js and soc-stream.js).
 *
 * The package sits on the PCB top face at SOC.cx/cz (parent: the LogicBoard group). Children:
 *   Substrate     dark green BGA substrate (RoundedBox) with a drawn solder-mask top (fan-out traces, via
 *                 ring, baked contact AO under every part), a hemisphere-only solder-ball grid underneath
 *                 (InstancedMesh, ≤ BALL_CAP) and a ring of MLCC decoupling caps under the lid overhang.
 *   Die           group from soc-die.js: Die[i] slabs, the seven unit plates on Die[0], floorplan detail.
 *   HeatSpreader  brushed-steel lid (anisotropic PBR) over every die + spreaderMargin, with an etched marking.
 *   LPDDR[i]      packageBlack modules with a laser-marked label, flanking the dies (left/right stacked
 *                 along Z; n = 1 right only; n ≥ 6 adds rear/front rows).
 *   BandwidthStream (effect) from soc-stream.js.
 *   contact shadow (effect): a soft plane on the PCB that stays put and fades as the package lifts.
 * applyChip rebuilds everything chip-dependent in place, disposes every replaced geometry, and merges
 * ctx.state.chipDerived. update() advances the stream and the shadow with zero allocations.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MM, LOGIC_BOARD, SOC, EXPLODE } from '../dims.js';
import { instanceCount, get as registryGet } from '../parts/registry.js';
import { DIE_GAP, dieSide, dieGrid, buildDie, clearDie } from './soc-die.js';
import { createStream, layoutStream, updateStream, FALLBACK_BANDWIDTH_GBS } from './soc-stream.js';

export const NAME = 'SoCPackage';

/* ---------------------------------------------------------------- derived dimensions (never bare numbers) */

const S = SOC.substrate;
const L = SOC.lpddr;
/** Rest height of the package group in LogicBoard space: the PCB top face. */
const REST_Y = LOGIC_BOARD.y + LOGIC_BOARD.t / 2;
/** Dial level at which the package (and so the stream) first shows. */
const SOC_LEVEL = registryGet(NAME).level;
/** Pad ring between the outermost part and the substrate edge. */
const SUB_MARGIN = SOC.spreaderMargin;
const SUB_EDGE_RADIUS = S.t * 0.4;
/** Gap between LPDDR modules stacked along one side. */
const LPDDR_STACK_GAP = L.gapFromDie / 2;
const LPDDR_EDGE_RADIUS = L.t * 0.18;
const LPDDR_LABEL_FILL = 0.78;
const SPREADER_EDGE_RADIUS = SOC.spreaderT * 0.45;
/** Etched marking: fixed 2:1 plane, sized to the lid. */
const ETCH_FILL_W = 0.8;
const ETCH_ASPECT = 2;
/** Solder balls: instance cap (20 tris each → 40k, leaving room for a 4-die cap ring inside the 60k budget) and edge inset. */
const BALL_CAP = 2000;
const BALL_EDGE_INSET = SOC.ballPitch + SOC.ballRadius;
/** MLCC decoupling caps around the die, under the lid's overhang (height < dieT so the lid clears them). */
const CAP = Object.freeze({
  w: 0.6 * MM, d: 0.3 * MM, h: 0.3 * MM,
  pitch: 0.9 * MM,
  inset: SOC.spreaderMargin * 0.55,   // centre distance outside the die footprint edge
  termW: 0.12 * MM,                   // metal termination at each end
  max: 240,                           // bodies (each adds two terminations): ≤ 8.7k tris
});
/** Contact shadow on the PCB. */
const SHADOW = Object.freeze({
  lift: 0.05 * MM,
  pad: 6 * MM,
  opacity: 0.55,
  fade: EXPLODE.soc * 0.6,            // fully gone once the package has lifted this far
});
/** Particle baseline above the LPDDR module tops. */
const STREAM_LIFT = 0.2 * MM;
/** Planes floating just above a face (well above 24-bit depth precision at these distances). */
const EPS = 0.02 * MM;

/* ---------------------------------------------------------------- textures and materials, created once */

const TOP_PX = 1024;
const ETCH_PX = [512, 256];
const LABEL_PX = 256;
const SHADOW_PX = 256;
const FONT = 'ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

/** Small deterministic PRNG (mulberry32): the substrate traces never change between runs. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, g: canvas.getContext('2d') };
}

let M = null;
function mats() {
  if (M) return M;
  const Std = THREE.MeshStandardMaterial;
  const Phys = THREE.MeshPhysicalMaterial;
  const top = canvasTex(TOP_PX, TOP_PX);
  const etch = canvasTex(ETCH_PX[0], ETCH_PX[1]);
  const label = canvasTex(LABEL_PX, LABEL_PX);
  const shadow = canvasTex(SHADOW_PX, SHADOW_PX);
  const floating = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 };
  M = {
    substrate: new Std({ color: 0x102019, roughness: 0.6, metalness: 0.05 }),
    substrateTop: new Std({ map: top.tex, roughness: 0.5, metalness: 0.08, ...floating }),
    cap: new Std({ color: 0x9c8a62, roughness: 0.55, metalness: 0.2 }),
    brushed: new Phys({ color: 0x8f9398, metalness: 1, roughness: 0.32, anisotropy: 0.75 }),
    etch: new Std({ map: etch.tex, transparent: true, metalness: 0.9, roughness: 0.7, depthWrite: false, ...floating }),
    lpddrLabel: new Std({ map: label.tex, transparent: true, roughness: 0.6, metalness: 0.1, depthWrite: false, ...floating }),
    shadow: new THREE.MeshBasicMaterial({ map: shadow.tex, transparent: true, opacity: SHADOW.opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    ctx: { top: top.g, etch: etch.g, label: label.g, shadow: shadow.g },
    tex: { top: top.tex, etch: etch.tex, label: label.tex, shadow: shadow.tex },
  };
  for (const [name, m] of Object.entries(M)) if (m?.isMaterial) m.name = `soc.${name}`;
  return M;
}

/** One unit cube shared by every instanced cap; never disposed. */
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

/** Solder ball: a 20-triangle icosahedron with sphere normals (reads round, costs nothing). Never disposed. */
const BALL_GEO = (() => {
  const geo = new THREE.IcosahedronGeometry(SOC.ballRadius, 0);
  const p = geo.attributes.position;
  const n = new Float32Array(p.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    n[i * 3] = v.x;
    n[i * 3 + 1] = v.y;
    n[i * 3 + 2] = v.z;
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return geo;
})();

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

function setInstance(inst, k, x, y, z, sx, sy, sz) {
  _p.set(x, y, z);
  _s.set(sx, sy, sz);
  _m.compose(_p, _q, _s);
  inst.setMatrixAt(k, _m);
}

/* ---------------------------------------------------------------- layout */

/** How many LPDDR modules go on each side: halves left/right up to 5; 6+ keeps 2+2 and spills to rear/front. */
function lpddrCounts(n) {
  if (n <= 5) {
    const left = Math.floor(n / 2);
    return { left, right: n - left, rear: 0, front: 0 };
  }
  const rem = n - 4;
  const rear = Math.floor(rem / 2);
  return { left: 2, right: 2, rear, front: rem - rear };
}

/** Module slots in package space: { x, z, dx, dz (outward unit vector), rot (about Y) }, index order L, R, rear, front. */
function lpddrSlots(n, footW, footD) {
  const c = lpddrCounts(n);
  const slots = [];
  const stack = (k, i) => (i - (k - 1) / 2) * (L.d + LPDDR_STACK_GAP);
  const xFlank = footW / 2 + L.gapFromDie + L.w / 2;
  const zFlank = footD / 2 + L.gapFromDie + L.w / 2;
  for (let i = 0; i < c.left; i++) slots.push({ x: -xFlank, z: stack(c.left, i), dx: -1, dz: 0, rot: 0 });
  for (let i = 0; i < c.right; i++) slots.push({ x: xFlank, z: stack(c.right, i), dx: 1, dz: 0, rot: 0 });
  for (let i = 0; i < c.rear; i++) slots.push({ x: stack(c.rear, i), z: -zFlank, dx: 0, dz: -1, rot: Math.PI / 2 });
  for (let i = 0; i < c.front; i++) slots.push({ x: stack(c.front, i), z: zFlank, dx: 0, dz: 1, rot: Math.PI / 2 });
  return slots;
}

/** Everything the builders need for a chip, in package-local metres. */
function layout(chip) {
  const side = dieSide(chip);
  const count = instanceCount('Die', chip);
  const { cols, rows } = dieGrid(count);
  const footW = cols * side + (cols - 1) * DIE_GAP;
  const footD = rows * side + (rows - 1) * DIE_GAP;
  const lpddrN = instanceCount('LPDDR', chip);
  const modules = lpddrSlots(lpddrN, footW, footD);
  const c = lpddrCounts(lpddrN);
  const run = (k) => (k > 0 ? k * L.d + (k - 1) * LPDDR_STACK_GAP : 0);
  const flank = L.gapFromDie + L.w + SUB_MARGIN;
  let needW = footW + 2 * flank;
  let needD = Math.max(footD + 2 * SUB_MARGIN, run(Math.max(c.left, c.right)) + 2 * SUB_MARGIN);
  if (c.rear || c.front) {
    needD = Math.max(needD, footD + 2 * flank);
    needW = Math.max(needW, run(Math.max(c.rear, c.front)) + 2 * SUB_MARGIN);
  }
  return {
    side, count, cols, rows, footW, footD, lpddrN, modules,
    subW: Math.max(S.w, needW), subD: Math.max(S.d, needD),
    lidW: footW + 2 * SOC.spreaderMargin, lidD: footD + 2 * SOC.spreaderMargin,
  };
}

/* ---------------------------------------------------------------- texture painters (per chip, into the module-scope canvases) */

/** Solder-mask top: mottle, fan-out traces module → die, power traces die → edge, via ring, contact AO. */
function drawSubstrateTop(lay) {
  const g = mats().ctx.top;
  const W = TOP_PX, H = TOP_PX;
  const X = (x) => (x / lay.subW + 0.5) * W;
  const Z = (z) => (z / lay.subD + 0.5) * H;
  const rnd = seeded(23);
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#0f1c15';
  g.fillRect(0, 0, W, H);

  g.fillStyle = 'rgba(255,255,255,0.028)';
  for (let i = 0; i < 700; i++) g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 9, 2 + rnd() * 9);

  // Fan-out traces from each module's inner edge to the nearest die edge.
  g.lineWidth = 1.2;
  g.strokeStyle = '#1d3d2b';
  g.lineCap = 'round';
  for (const s of lay.modules) {
    const link = streamLink(lay, s);
    const lines = 22;
    for (let k = 0; k < lines; k++) {
      const j = ((k + 0.5) / lines - 0.5) * 2 * link.half * 0.9;
      const je = Math.min(link.hi, Math.max(link.lo, j));
      g.beginPath();
      g.moveTo(X(link.sx + link.px * j), Z(link.sz + link.pz * j));
      g.lineTo(X(link.ex + link.px * je), Z(link.ez + link.pz * je));
      g.stroke();
    }
  }

  // Power-delivery traces from the die footprint out to the substrate edge on every side.
  g.strokeStyle = '#173222';
  g.lineWidth = 1;
  for (let k = 0; k < 48; k++) {
    const side = k % 4;
    const t = rnd() * 2 - 1;
    const sx = side < 2 ? (side ? 1 : -1) * lay.footW / 2 : t * lay.footW / 2;
    const sz = side < 2 ? t * lay.footD / 2 : (side === 2 ? -1 : 1) * lay.footD / 2;
    const ex = side < 2 ? (side ? 1 : -1) * lay.subW / 2 : sx + (rnd() - 0.5) * 4 * MM;
    const ez = side < 2 ? sz + (rnd() - 0.5) * 4 * MM : (side === 2 ? -1 : 1) * lay.subD / 2;
    g.beginPath();
    g.moveTo(X(sx), Z(sz));
    g.lineTo(X(ex), Z(ez));
    g.stroke();
  }

  // Via ring just outside the lid footprint.
  g.fillStyle = '#3d5c47';
  const ringW = lay.lidW / 2 + 0.8 * MM;
  const ringD = lay.lidD / 2 + 0.8 * MM;
  const viaPitch = 0.7 * MM;
  const r = 1.6;
  for (let x = -ringW; x <= ringW; x += viaPitch) {
    for (const z of [-ringD, ringD]) { g.beginPath(); g.arc(X(x), Z(z), r, 0, Math.PI * 2); g.fill(); }
  }
  for (let z = -ringD + viaPitch; z < ringD; z += viaPitch) {
    for (const x of [-ringW, ringW]) { g.beginPath(); g.arc(X(x), Z(z), r, 0, Math.PI * 2); g.fill(); }
  }

  // Baked contact AO: a soft dark halo around every footprint that touches the substrate.
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.85)';
  g.shadowBlur = 22;
  g.fillStyle = '#0c1810';
  const rect = (cx, cz, w, d) => g.fillRect(X(cx - w / 2), Z(cz - d / 2), (w / lay.subW) * W, (d / lay.subD) * H);
  rect(0, 0, lay.lidW, lay.lidD);
  for (const s of lay.modules) rect(s.x, s.z, s.rot ? L.d : L.w, s.rot ? L.w : L.d);
  g.restore();
  mats().tex.top.needsUpdate = true;
}

/** Lid marking: the chip id in a laser-etched grey plus a seeded 2D-code square. */
function drawEtch(chip) {
  const g = mats().ctx.etch;
  const [W, H] = ETCH_PX;
  const rnd = seeded(5);
  g.clearRect(0, 0, W, H);
  const ink = 'rgba(28,30,34,0.82)';
  g.fillStyle = ink;
  const code = 10;
  const cell = 9;
  for (let r = 0; r < code; r++) for (let c = 0; c < code; c++) if (rnd() > 0.5) g.fillRect(30 + c * cell, 60 + r * cell, cell - 1, cell - 1);
  const name = String(chip?.id ?? 'SoC').toUpperCase().replace(/-/g, ' ');
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.font = `600 ${name.length > 7 ? 78 : 100}px ${FONT}`;
  g.fillText(name, 140, 104, W - 160);
  g.font = `500 26px ${FONT}`;
  g.fillStyle = 'rgba(28,30,34,0.6)';
  g.fillText('SYSTEM ON A CHIP', 142, 178);
  mats().tex.etch.needsUpdate = true;
}

/** LPDDR module marking: generation label (from chip.lpddr_generation when known) plus a barcode. */
function drawLpddrLabel(chip) {
  const g = mats().ctx.label;
  const W = LABEL_PX, H = LABEL_PX;
  const rnd = seeded(9);
  g.clearRect(0, 0, W, H);
  const gen = chip?.lpddr_generation;
  let text = 'LPDDR';
  if (typeof gen === 'number' && Number.isFinite(gen)) text = `LPDDR${gen}`;
  else if (typeof gen === 'string' && gen.trim()) text = /^lpddr/i.test(gen) ? gen.toUpperCase() : `LPDDR${gen.toUpperCase()}`;
  g.fillStyle = 'rgba(200,203,208,0.72)';
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.font = `600 40px ${FONT}`;
  g.fillText(text, W / 2, 92, W - 40);
  let x = 40;
  while (x < W - 40) {
    const w = 2 + Math.floor(rnd() * 5);
    if (rnd() > 0.45) g.fillRect(x, 140, w, 44);
    x += w + 2;
  }
  g.font = `500 18px ${FONT}`;
  g.fillStyle = 'rgba(200,203,208,0.5)';
  g.fillText('DRAM', W / 2, 212);
  mats().tex.label.needsUpdate = true;
}

/** Soft rounded-rect blob: the substrate footprint blurred outward across the shadow plane. */
function drawShadow(lay) {
  const g = mats().ctx.shadow;
  const W = SHADOW_PX, H = SHADOW_PX;
  g.clearRect(0, 0, W, H);
  const ix = (SHADOW.pad / (lay.subW + 2 * SHADOW.pad)) * W;
  const iz = (SHADOW.pad / (lay.subD + 2 * SHADOW.pad)) * H;
  g.save();
  g.shadowColor = 'rgba(0,0,0,1)';
  g.shadowBlur = 30;
  g.fillStyle = 'rgba(0,0,0,0.9)';
  g.beginPath();
  g.roundRect(ix, iz, W - 2 * ix, H - 2 * iz, 6);
  g.fill();
  g.restore();
  mats().tex.shadow.needsUpdate = true;
}

/* ---------------------------------------------------------------- builders */

/** Hemisphere-visible ball grid under the substrate (centres on the PCB plane: invisible at rest, a BGA when lifted). */
function buildBalls(lay, ctx) {
  let pitch = SOC.ballPitch;
  const count = () => {
    const nx = Math.floor((lay.subW - 2 * BALL_EDGE_INSET) / pitch) + 1;
    const nz = Math.floor((lay.subD - 2 * BALL_EDGE_INSET) / pitch) + 1;
    return { nx: Math.max(1, nx), nz: Math.max(1, nz) };
  };
  let { nx, nz } = count();
  if (nx * nz > BALL_CAP) {
    pitch *= Math.sqrt((nx * nz) / BALL_CAP);
    ({ nx, nz } = count());
    while (nx * nz > BALL_CAP) { pitch *= 1.02; ({ nx, nz } = count()); }
  }
  const inst = new THREE.InstancedMesh(BALL_GEO, ctx.mats.solderBall, nx * nz);
  let k = 0;
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      setInstance(inst, k++, (ix - (nx - 1) / 2) * pitch, -S.t / 2, (iz - (nz - 1) / 2) * pitch, 1, 1, 1);
    }
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.frustumCulled = false;
  return inst;
}

/** MLCC ring around the die footprint: tan bodies plus metal terminations, all under the lid overhang. */
function buildCaps(lay, ctx) {
  const spots = [];
  const hw = lay.footW / 2 + CAP.inset;
  const hd = lay.footD / 2 + CAP.inset;
  for (let x = -hw + CAP.w; x <= hw - CAP.w && spots.length < CAP.max; x += CAP.pitch) {
    spots.push({ x, z: -hd, alongX: true }, { x, z: hd, alongX: true });
  }
  for (let z = -hd + CAP.w; z <= hd - CAP.w && spots.length < CAP.max; z += CAP.pitch) {
    spots.push({ x: -hw, z, alongX: false }, { x: hw, z, alongX: false });
  }
  const n = Math.min(CAP.max, spots.length);
  const body = new THREE.InstancedMesh(UNIT_BOX, mats().cap, n);
  const term = new THREE.InstancedMesh(UNIT_BOX, ctx.mats.solderBall, n * 2);
  const y = S.t / 2 + CAP.h / 2;
  const half = CAP.w / 2 - CAP.termW / 2;
  for (let k = 0; k < n; k++) {
    const s = spots[k];
    if (s.alongX) {
      setInstance(body, k, s.x, y, s.z, CAP.w, CAP.h, CAP.d);
      setInstance(term, 2 * k, s.x - half, y, s.z, CAP.termW, CAP.h * 1.06, CAP.d * 1.06);
      setInstance(term, 2 * k + 1, s.x + half, y, s.z, CAP.termW, CAP.h * 1.06, CAP.d * 1.06);
    } else {
      setInstance(body, k, s.x, y, s.z, CAP.d, CAP.h, CAP.w);
      setInstance(term, 2 * k, s.x, y, s.z - half, CAP.d * 1.06, CAP.h * 1.06, CAP.termW);
      setInstance(term, 2 * k + 1, s.x, y, s.z + half, CAP.d * 1.06, CAP.h * 1.06, CAP.termW);
    }
  }
  body.instanceMatrix.needsUpdate = true;
  term.instanceMatrix.needsUpdate = true;
  body.frustumCulled = false;
  term.frustumCulled = false;
  const group = new THREE.Group();
  group.add(body, term);
  return group;
}

/** Stream endpoints for one module slot (also drives the fan-out trace painter). */
function streamLink(lay, s) {
  const sx = s.x - s.dx * L.w / 2;
  const sz = s.z - s.dz * L.w / 2;
  const clamp = (v, h) => Math.min(h, Math.max(-h, v));
  const ex = s.dx ? s.dx * lay.footW / 2 : clamp(s.x, lay.footW / 2);
  const ez = s.dz ? s.dz * lay.footD / 2 : clamp(s.z, lay.footD / 2);
  const px = s.dx ? 0 : 1;
  const pz = s.dx ? 1 : 0;
  const edgeHalf = (s.dx ? lay.footD / 2 : lay.footW / 2) - DIE_GAP * 0.3;
  const along = s.dx ? ez : ex;
  return { sx, sz, ex, ez, px, pz, half: L.d / 2, lo: -edgeHalf - along, hi: edgeHalf - along, y: S.t + L.t + STREAM_LIFT };
}

/** (Re)build every chip-dependent child. */
function populate(g, chip, ctx) {
  const R = g.userData.soc;
  const { tag } = ctx;
  const M = mats();
  const lay = layout(chip);

  // Tear down what the last chip built.
  for (const geo of R.geoms) geo.dispose();
  R.geoms.length = 0;
  for (const c of [...g.children]) {
    if (c.userData.part === 'HeatSpreader' || c.userData.part === 'LPDDR') g.remove(c);
  }
  clearDie(R.die);
  for (const key of ['balls', 'caps', 'top']) {
    const o = R[key];
    if (!o) continue;
    o.traverse((x) => { if (x.isInstancedMesh) x.dispose(); });
    o.parent?.remove(o);
    R[key] = null;
  }

  // Substrate body, painted top, balls, caps.
  R.substrate.geometry.dispose();
  R.substrate.geometry = new RoundedBoxGeometry(lay.subW, S.t, lay.subD, 3, SUB_EDGE_RADIUS);
  R.substrate.position.set(0, S.t / 2, 0);
  const topGeo = new THREE.PlaneGeometry(lay.subW - 2 * SUB_EDGE_RADIUS, lay.subD - 2 * SUB_EDGE_RADIUS);
  R.geoms.push(topGeo);
  R.top = new THREE.Mesh(topGeo, M.substrateTop);
  R.top.rotation.x = -Math.PI / 2;
  R.top.position.y = S.t / 2 + EPS;
  R.substrate.add(R.top);
  drawSubstrateTop(lay);
  R.balls = buildBalls(lay, ctx);
  R.substrate.add(R.balls);
  R.caps = buildCaps(lay, ctx);
  R.substrate.add(R.caps);

  // Dies and their floorplan.
  const dieInfo = buildDie(R.die, chip, lay, ctx, R.geoms);

  // Brushed lid with its etched marking.
  const lidGeo = new RoundedBoxGeometry(lay.lidW, SOC.spreaderT, lay.lidD, 4, SPREADER_EDGE_RADIUS);
  R.geoms.push(lidGeo);
  const lid = tag(new THREE.Mesh(lidGeo, M.brushed), 'HeatSpreader');
  lid.position.set(0, S.t + SOC.dieT + SOC.spreaderT / 2, 0);
  const etchW = Math.min(lay.lidW * ETCH_FILL_W, lay.lidD * ETCH_FILL_W * ETCH_ASPECT);
  const etchGeo = new THREE.PlaneGeometry(etchW, etchW / ETCH_ASPECT);
  R.geoms.push(etchGeo);
  const etch = new THREE.Mesh(etchGeo, M.etch);
  etch.rotation.x = -Math.PI / 2;
  etch.position.y = SOC.spreaderT / 2 + EPS;
  lid.add(etch);
  drawEtch(chip);
  g.add(lid);

  // LPDDR modules with labels.
  const modGeo = new RoundedBoxGeometry(L.w, L.t, L.d, 3, LPDDR_EDGE_RADIUS);
  const labelGeo = new THREE.PlaneGeometry(L.w * LPDDR_LABEL_FILL, L.d * LPDDR_LABEL_FILL);
  R.geoms.push(modGeo, labelGeo);
  drawLpddrLabel(chip);
  lay.modules.forEach((s, i) => {
    const mod = tag(new THREE.Mesh(modGeo, ctx.mats.packageBlack), 'LPDDR', i);
    mod.position.set(s.x, S.t + L.t / 2, s.z);
    mod.rotation.y = s.rot;
    const label = new THREE.Mesh(labelGeo, M.lpddrLabel);
    label.rotation.x = -Math.PI / 2;
    label.position.y = L.t / 2 + EPS;
    mod.add(label);
    g.add(mod);
  });

  // Contact shadow on the PCB.
  R.shadow.geometry.dispose();
  R.shadow.geometry = new THREE.PlaneGeometry(lay.subW + 2 * SHADOW.pad, lay.subD + 2 * SHADOW.pad);
  R.shadow.position.set(0, SHADOW.lift, 0);
  drawShadow(lay);

  // Bandwidth stream.
  layoutStream(R.stream, lay.modules.map((s) => streamLink(lay, s)), chip?.bandwidth_gbs);

  // Courtesy: new tagged meshes respect the current dial until the dial engine re-applies it.
  g.traverse((o) => { if (o.isMesh && o.userData.part) o.visible = o.userData.level <= ctx.state.dial; });

  ctx.state.chipDerived = Object.assign(ctx.state.chipDerived || {}, {
    dieSideMm: lay.side / MM,
    dieCount: lay.count,
    lpddrCount: lay.lpddrN,
    gpuTiles: dieInfo.gpuTiles,
    cpuBlocks: dieInfo.cpuBlocks,
    streamSpeed: Number.isFinite(chip?.bandwidth_gbs) && chip.bandwidth_gbs > 0 ? chip.bandwidth_gbs : FALLBACK_BANDWIDTH_GBS,
  });
}

/* ---------------------------------------------------------------- module interface */

export function build(parent, chip, ctx) {
  const g = ctx.tag(new THREE.Group(), NAME);
  g.position.set(SOC.cx, REST_Y, SOC.cz);
  parent.add(g);

  const substrate = ctx.tag(new THREE.Mesh(new THREE.BufferGeometry(), mats().substrate), 'Substrate');
  g.add(substrate);
  const die = ctx.tag(new THREE.Group(), 'Die');
  die.position.y = S.t;
  g.add(die);

  const shadow = new THREE.Mesh(new THREE.BufferGeometry(), mats().shadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.userData.effect = true;
  g.add(shadow);
  const stream = createStream();
  g.add(stream);

  g.userData.soc = { substrate, die, shadow, stream, top: null, balls: null, caps: null, geoms: [] };
  populate(g, chip, ctx);
  return g;
}

export function applyChip(group, chip, ctx) {
  if (!group.userData.soc) return;
  populate(group, chip, ctx);
}

/** Per frame: keep the contact shadow on the PCB (fading as the package lifts) and advance the stream. */
export function update(group, state, dt) {
  const R = group.userData.soc;
  if (!R) return;
  const lift = group.position.y - REST_Y;
  const k = lift > 0 ? Math.max(0, 1 - lift / SHADOW.fade) : 1;
  R.shadow.position.y = SHADOW.lift - lift;
  R.shadow.material.opacity = SHADOW.opacity * k;
  R.shadow.visible = R.substrate.visible && k > 0;
  updateStream(R.stream, dt, state.dial >= SOC_LEVEL && R.substrate.visible);
}

export const explodeOffsets = {
  SoCPackage: [0, EXPLODE.soc, 0],
  HeatSpreader: [0, EXPLODE.spreader, 0],
  /** Outward from the die centre: left −X, right +X, rear −Z, front +Z (same slot order as lpddrSlots). */
  LPDDR: (i, count) => {
    const c = lpddrCounts(count);
    const d = EXPLODE.lpddrSpread;
    let k = i;
    if (k < c.left) return [-d, 0, 0];
    k -= c.left;
    if (k < c.right) return [d, 0, 0];
    k -= c.right;
    if (k < c.rear) return [0, 0, -d];
    return [0, 0, d];
  },
};
