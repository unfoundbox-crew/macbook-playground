/**
 * src/scene/thermal.js — the cooling system: FanL/FanR, HeatPipe, HeatsinkPlate, GraphiteSheet.
 *
 * Fans are centrifugal blowers: a scroll housing (spiral wall, rear outlet mouth, bevelled top plate
 * with a circular intake), a lathed motor hub, three mounting tabs with screws — all merged into the
 * tagged housing mesh — plus FAN.bladeCount forward-curved blades as one untagged InstancedMesh child
 * that spins in update(). FanR is a mirror image of FanL and counter-rotates.
 * HeatPipe is a flattened copper pipe (stadium cross-section swept along a CatmullRom curve) from
 * FanL's inner edge to FanR's inner edge, rising to rest on the HeatsinkPlate over the SoC.
 * HeatsinkPlate is brushed aluminium with raised fins either side of the pipe and corner screws.
 * GraphiteSheet is a thin matte sheet under the board.
 *
 * Every dimension derives from dims.js. Geometry is procedural; every tagged mesh has one material.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BASE, HINGE, FAN, HEAT_PIPE, HEATSINK_PLATE, GRAPHITE_SHEET, LOGIC_BOARD, EXPLODE } from '../dims.js';
import { LEVEL } from '../parts/registry.js';

export const NAME = 'Thermal';

/** Hidden when chip.chassis === 'air' (a fanless chassis). GraphiteSheet stays. */
const AIR_HIDES = ['FanL', 'FanR', 'HeatPipe', 'HeatsinkPlate'];

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/* ---------------------------------------------------------------- derived dimensions (all from dims) */

const R = FAN.radius;
const WALL_T = BASE.wallT * 0.5;                 // moulded housing wall
const FLOOR_T = BASE.bottomPlateT * 0.5;         // housing floor plate
const TOP_T = FLOOR_T;                           // housing top plate
const TOP_BEVEL = TOP_T * 0.4;                   // rounded edge of the top plate and intake lip
const TONGUE_R = R * 0.86;                       // scroll radius at the tongue (cutwater)
const TONGUE_ANGLE = 120 * DEG;                  // where the spiral starts, measured CCW from +u
const OUTLET_S = Math.min(R * 1.1, -HINGE.z - HINGE.radius + FAN.z - BASE.wallT * 0.3); // rearward reach of the mouth, clear of the hinge
const MOUTH_CORNER_R = WALL_T * 0.7;
const SCROLL_SEGS = 120;
const INTAKE_R = R * 0.74;
const HUB_R = R * 0.4;
const HUB_FILLET = HUB_R * 0.12;
const ROTOR_GAP = FLOOR_T * 0.5;                 // clearance under and over the blades
const BLADE_H = FAN.h - FLOOR_T - TOP_T - 2 * ROTOR_GAP;
const HUB_H = BLADE_H * 0.8;
const BLADE_T = FAN.h * 0.05;
const BLADE_R0 = HUB_R - WALL_T * 0.25;          // root buried slightly in the hub
const BLADE_R1 = TONGUE_R - WALL_T * 1.5;        // tip clears the wall at the tongue
const BLADE_SWEEP = 32 * DEG;                    // forward curve, root → tip
const BLADE_SAMPLES = 10;
const TAB_R = R * 0.09;
const TAB_H = FLOOR_T * 1.5;
const TAB_ANGLES = [150 * DEG, 240 * DEG, 330 * DEG];
const SCREW_R = TAB_R * 0.55;
const SCREW_H = FLOOR_T * 0.8;
const FAN_SPEED = 0.9;                           // rad/s, a slow idle
const MAX_STEP = 0.02;                           // rad per frame, hard cap

const PIPE_L = HEAT_PIPE.x1 - HEAT_PIPE.x0;
const PIPE_END_Y = HEAT_PIPE.y;
const PIPE_MID_Y = HEATSINK_PLATE.y + HEATSINK_PLATE.t / 2 + HEAT_PIPE.t / 2;   // rests on the plate
const PIPE_SAMPLES = 72;
const PIPE_RING_SEGS = 8;                        // per semicircle of the stadium section

const PLATE_R = HEATSINK_PLATE.t * 0.45;
const FIN_T = HEATSINK_PLATE.t * 0.3;
const FIN_H = HEATSINK_PLATE.t * 1.2;
const FIN_MARGIN = HEATSINK_PLATE.t * 1.6;
const FINS_PER_SIDE = 3;
const FIN_L = HEATSINK_PLATE.w - 4 * FIN_MARGIN;
const FIN_ZONE = (HEATSINK_PLATE.d - HEAT_PIPE.w) / 2 - FIN_MARGIN;
const FIN_PITCH = FIN_ZONE / FINS_PER_SIDE;
const PLATE_SCREW_INSET = HEATSINK_PLATE.t * 2.2;
const PLATE_SCREW_R = HEATSINK_PLATE.t * 0.9;
const PLATE_SCREW_H = HEATSINK_PLATE.t * 0.5;

const SHEET_CORNER_R = LOGIC_BOARD.cornerRadius;

/* ---------------------------------------------------------------- materials the shared set lacks (created once) */

let rotorMat = null;
let plateMat = null;

/** Brushed-metal roughness variation: fine streaks along u. Linear data texture, seeded so builds match. */
function brushedRoughnessTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  g.fillStyle = 'rgb(112,112,112)';
  g.fillRect(0, 0, size, size);
  let seed = 0x9e3779b9;
  const rnd = () => {
    seed = (Math.imul(seed ^ (seed >>> 15), seed | 1) + 0x6d2b79f5) >>> 0;
    return (seed >>> 8) / 16777216;
  };
  for (let i = 0; i < 2600; i++) {
    const y = rnd() * size;
    const x = rnd() * size;
    const len = 40 + rnd() * 400;
    const v = Math.round(70 + rnd() * 90);
    g.strokeStyle = `rgba(${v},${v},${v},${(0.25 + rnd() * 0.5).toFixed(2)})`;
    g.lineWidth = rnd() < 0.8 ? 1 : 2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + len, y);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function getRotorMat() {
  if (!rotorMat) rotorMat = new THREE.MeshStandardMaterial({ color: 0x26282c, roughness: 0.5, metalness: 0.05, name: 'fanRotor' });
  return rotorMat;
}

function getPlateMat() {
  if (!plateMat) {
    plateMat = new THREE.MeshPhysicalMaterial({
      color: 0xbfc3c8, metalness: 1, roughness: 1, roughnessMap: brushedRoughnessTexture(),
      anisotropy: 0.55, name: 'brushedAluminium',
    });
  }
  return plateMat;
}

/* ---------------------------------------------------------------- 2D helpers (u = local x, v = local −z = rear) */

/** Quadratic-Bezier fillet at `corner` between prev→corner→next, tangent length ≤ r. Returns sampled points. */
function fillet(prev, corner, next, r, segs = 4) {
  const d1 = Math.hypot(corner[0] - prev[0], corner[1] - prev[1]);
  const d2 = Math.hypot(next[0] - corner[0], next[1] - corner[1]);
  const t = Math.min(r, d1 / 2, d2 / 2);
  const p0 = [corner[0] + ((prev[0] - corner[0]) * t) / d1, corner[1] + ((prev[1] - corner[1]) * t) / d1];
  const p1 = [corner[0] + ((next[0] - corner[0]) * t) / d2, corner[1] + ((next[1] - corner[1]) * t) / d2];
  const out = [];
  for (let i = 0; i <= segs; i++) {
    const s = i / segs, a = (1 - s) * (1 - s), b = 2 * s * (1 - s), c = s * s;
    out.push([a * p0[0] + b * corner[0] + c * p1[0], a * p0[1] + b * corner[1] + c * p1[1]]);
  }
  return out;
}

function mirrorPts(pts) {
  return pts.map(([u, v]) => [-u, v]).reverse();
}

function toShape(pts) {
  const clean = [];
  for (const p of pts) {
    const q = clean[clean.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-7) clean.push(p);
  }
  return new THREE.Shape(clean.map(([u, v]) => new THREE.Vector2(u, v)));
}

function circlePts(r, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push([r * Math.cos((TAU * i) / n), r * Math.sin((TAU * i) / n)]);
  return out;
}

/** Spiral from the tongue (TONGUE_ANGLE, TONGUE_R) CCW to (R, 0), radius growing linearly, inset inward. */
function scrollPts(inset) {
  const out = [];
  for (let i = 0; i <= SCROLL_SEGS; i++) {
    const th = TONGUE_ANGLE + ((TAU - TONGUE_ANGLE) * i) / SCROLL_SEGS;
    const r = TONGUE_R + ((R - TONGUE_R) * i) / SCROLL_SEGS - inset;
    out.push([r * Math.cos(th), r * Math.sin(th)]);
  }
  return out;
}

/** Closed housing outline, CCW: spiral, up the outer duct wall, across the mouth, down the inner duct wall. */
function housingOutline() {
  const sp = scrollPts(0);
  const uT = TONGUE_R * Math.cos(TONGUE_ANGLE);
  const A = [R, OUTLET_S];
  const B = [uT, OUTLET_S];
  const fA = fillet(sp[sp.length - 1], A, B, MOUTH_CORNER_R);
  const fB = fillet(A, B, sp[0], MOUTH_CORNER_R);
  return { outline: [...sp, ...fA, ...fB], sp, fA, fB, uT };
}

/** The wall as a C-shaped polygon: the outline minus the mouth edge, with an inset return path. Open at the mouth. */
function wallOutline() {
  const { sp, fA, fB, uT } = housingOutline();
  const spIn = scrollPts(WALL_T);
  const uIn = uT + WALL_T;
  const A2 = [R - WALL_T, OUTLET_S];
  const B2 = [uIn, OUTLET_S];
  const tongue2 = [uIn, spIn[0][1]];
  return [...fB, ...sp, ...fA, A2, ...[...spIn].reverse(), tongue2, B2];
}

/** One forward-curved blade as a thin strip about a spiral camber line, root on +u. */
function bladeOutline() {
  const cam = [];
  for (let i = 0; i <= BLADE_SAMPLES; i++) {
    const s = i / BLADE_SAMPLES;
    const r = BLADE_R0 + (BLADE_R1 - BLADE_R0) * s;
    const a = BLADE_SWEEP * Math.pow(s, 1.35);
    cam.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  const side = [], back = [];
  for (let i = 0; i <= BLADE_SAMPLES; i++) {
    const p = cam[Math.max(0, i - 1)], q = cam[Math.min(BLADE_SAMPLES, i + 1)];
    const tx = q[0] - p[0], ty = q[1] - p[1], l = Math.hypot(tx, ty);
    const nx = -ty / l, ny = tx / l;
    side.push([cam[i][0] + (nx * BLADE_T) / 2, cam[i][1] + (ny * BLADE_T) / 2]);
    back.push([cam[i][0] - (nx * BLADE_T) / 2, cam[i][1] - (ny * BLADE_T) / 2]);
  }
  return [...side, ...back.reverse()];
}

/* ---------------------------------------------------------------- geometry helpers */

/** Extrude a (u, v) outline `depth` along +y, with local −z = v. Optional holes and symmetric bevel. */
function extrudeUp(pts, depth, { holes = [], bevel = 0, segments = 2 } = {}) {
  const shape = toShape(pts);
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([u, v]) => new THREE.Vector2(u, v))));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: bevel ? depth - 2 * bevel : depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: segments,
    curveSegments: 4,
  });
  geo.rotateX(-Math.PI / 2);
  if (bevel) geo.translate(0, bevel, 0);
  return geo;
}

function lathe(profile, segments = 48) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

/** Quarter-circle fillet points from (r, y) going up-and-inward, for lathe profiles that climb the outside. */
function latheFillet(r, y, f, n = 5) {
  const out = [];
  for (let i = 1; i < n; i++) {
    const a = (Math.PI / 2) * (i / n);
    out.push([r - f + f * Math.cos(a), y + f * Math.sin(a)]);
  }
  return out;
}

function screwHead(r, h) {
  return lathe([[r, 0], [r, h * 0.5], [r * 0.82, h * 0.85], [r * 0.5, h], [0, h]], 32);
}

function merged(geos) {
  const flat = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const out = mergeGeometries(flat, false);
  for (const g of geos) g.dispose();
  for (const g of flat) if (!geos.includes(g)) g.dispose();
  return out;
}

/** Stadium (rounded-rectangle) section w × t, flat [s, n, ns, nn] around the loop, CCW, seam duplicated. */
function stadiumProfile(w, t, segs) {
  const r = t / 2, c = w / 2 - r;
  const out = [];
  for (let i = 0; i <= segs; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / segs;
    out.push(c + r * Math.cos(a), r * Math.sin(a), Math.cos(a), Math.sin(a));
  }
  for (let i = 0; i <= segs; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / segs;
    out.push(-c + r * Math.cos(a), r * Math.sin(a), Math.cos(a), Math.sin(a));
  }
  out.push(out[0], out[1], out[2], out[3]);
  return out;
}

/**
 * Sweep a 2D profile along a planar curve (constant z). Profile s runs along +z, n along the in-plane
 * normal (z × tangent, i.e. up for a curve heading +x). Closed with flat caps.
 */
function sweepProfile(curve, samples, prof) {
  const ringN = prof.length / 4;
  const pos = [], nrm = [], uv = [], idx = [];
  const S = new THREE.Vector3(0, 0, 1);
  const P = new THREE.Vector3(), T = new THREE.Vector3(), U = new THREE.Vector3();
  for (let j = 0; j <= samples; j++) {
    const t = j / samples;
    curve.getPointAt(t, P);
    curve.getTangentAt(t, T).normalize();
    U.crossVectors(S, T).normalize();
    for (let k = 0; k < ringN; k++) {
      const s = prof[4 * k], n = prof[4 * k + 1], ns = prof[4 * k + 2], nn = prof[4 * k + 3];
      pos.push(P.x + S.x * s + U.x * n, P.y + S.y * s + U.y * n, P.z + S.z * s + U.z * n);
      nrm.push(S.x * ns + U.x * nn, S.y * ns + U.y * nn, S.z * ns + U.z * nn);
      uv.push(t, k / (ringN - 1));
    }
  }
  for (let j = 0; j < samples; j++) {
    for (let k = 0; k < ringN - 1; k++) {
      const a = j * ringN + k, b = (j + 1) * ringN + k, c = b + 1, d = a + 1;
      idx.push(a, b, c, a, c, d);
    }
  }
  const cap = (t, sign) => {
    curve.getPointAt(t, P);
    curve.getTangentAt(t, T).normalize();
    U.crossVectors(S, T).normalize();
    const base = pos.length / 3;
    pos.push(P.x, P.y, P.z);
    nrm.push(sign * T.x, sign * T.y, sign * T.z);
    uv.push(0.5, 0.5);
    for (let k = 0; k < ringN; k++) {
      const s = prof[4 * k], n = prof[4 * k + 1];
      pos.push(P.x + S.x * s + U.x * n, P.y + S.y * s + U.y * n, P.z + S.z * s + U.z * n);
      nrm.push(sign * T.x, sign * T.y, sign * T.z);
      uv.push(0.5 + s / HEAT_PIPE.w, 0.5 + n / HEAT_PIPE.w);
    }
    for (let k = 0; k < ringN - 1; k++) {
      if (sign < 0) idx.push(base, base + 1 + k, base + 2 + k);
      else idx.push(base, base + 2 + k, base + 1 + k);
    }
  };
  cap(0, -1);
  cap(1, 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

function roundedRectPts(w, d, r, segs = 8) {
  const hw = w / 2, hd = d / 2;
  const out = [];
  const corner = (cx, cz, a0) => {
    for (let i = 0; i <= segs; i++) {
      const a = a0 + (Math.PI / 2) * (i / segs);
      out.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
    }
  };
  corner(hw - r, hd - r, 0);
  corner(-hw + r, hd - r, Math.PI / 2);
  corner(-hw + r, -hd + r, Math.PI);
  corner(hw - r, -hd + r, Math.PI * 1.5);
  return out;
}

/* ---------------------------------------------------------------- fan */

/** Housing geometry in fan-local space: floor at y = 0, axis at the origin, +u toward `sign` × x. */
function housingGeometry(sign) {
  const m = (pts) => (sign < 0 ? mirrorPts(pts) : pts);
  const { outline } = housingOutline();
  const outer = m(outline);
  const floor = extrudeUp(outer, FLOOR_T);
  const wall = extrudeUp(m(wallOutline()), FAN.h - FLOOR_T - TOP_T + TOP_BEVEL);
  wall.translate(0, FLOOR_T, 0);
  const top = extrudeUp(outer, TOP_T, { holes: [circlePts(INTAKE_R, 96)], bevel: TOP_BEVEL, segments: 3 });
  top.translate(0, FAN.h - TOP_T, 0);

  const hub = lathe([
    [HUB_R, 0],
    [HUB_R, HUB_H - HUB_FILLET],
    ...latheFillet(HUB_R, HUB_H - HUB_FILLET, HUB_FILLET),
    [HUB_R - HUB_FILLET, HUB_H],
    [HUB_R * 0.55, HUB_H],
    [HUB_R * 0.5, HUB_H - HUB_FILLET * 0.4],
    [0, HUB_H - HUB_FILLET * 0.4],
  ], 64);
  hub.translate(0, FLOOR_T, 0);

  const parts = [floor, wall, top, hub];
  for (const th of TAB_ANGLES) {
    const i = Math.min(SCROLL_SEGS, Math.max(0, Math.round(((th - TONGUE_ANGLE) / (TAU - TONGUE_ANGLE)) * SCROLL_SEGS)));
    const rWall = TONGUE_R + ((R - TONGUE_R) * i) / SCROLL_SEGS;
    const rc = rWall + TAB_R * 0.4;
    const u = sign * rc * Math.cos(th), z = -rc * Math.sin(th);
    const tab = new THREE.CylinderGeometry(TAB_R, TAB_R, TAB_H, 32);
    tab.translate(u, FLOOR_T * 0.1 + TAB_H / 2, z);
    const screw = screwHead(SCREW_R, SCREW_H);
    screw.translate(u, FLOOR_T * 0.1 + TAB_H, z);
    parts.push(tab, screw);
  }
  return merged(parts);
}

function bladeGeometry(sign) {
  const pts = sign < 0 ? mirrorPts(bladeOutline()) : bladeOutline();
  return extrudeUp(pts, BLADE_H);
}

const _m = new THREE.Matrix4();
/** Spinning blade meshes: { mesh, dir, angle }. Filled by build(), read by update(). */
const rotors = [];

function setRotorMatrices(rotor, angle) {
  const n = rotor.count;
  for (let i = 0; i < n; i++) {
    _m.makeRotationY(angle + (TAU * i) / n);
    rotor.setMatrixAt(i, _m);
  }
  rotor.instanceMatrix.needsUpdate = true;
}

function buildFan(ctx, parent, key, x, sign) {
  const housing = new THREE.Mesh(housingGeometry(sign), ctx.mats.plastic);
  housing.position.set(x, FAN.y, FAN.z);
  parent.add(ctx.tag(housing, key));

  const rotor = new THREE.InstancedMesh(bladeGeometry(sign), getRotorMat(), FAN.bladeCount);
  rotor.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  rotor.position.y = FLOOR_T + ROTOR_GAP;
  setRotorMatrices(rotor, 0);
  rotor.computeBoundingSphere();
  housing.add(rotor);
  rotors.push({ mesh: rotor, dir: sign, angle: 0 });
  return housing;
}

/* ---------------------------------------------------------------- heat pipe, plate, sheet */

function heatPipeGeometry() {
  const arch = PIPE_MID_Y - PIPE_END_Y;
  const half = PIPE_L / 2;
  const over = HEATSINK_PLATE.w * 0.45;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-half, 0, 0),
    new THREE.Vector3(-half + PIPE_L * 0.15, 0, 0),
    new THREE.Vector3(-over, arch, 0),
    new THREE.Vector3(0, arch, 0),
    new THREE.Vector3(over, arch, 0),
    new THREE.Vector3(half - PIPE_L * 0.15, 0, 0),
    new THREE.Vector3(half, 0, 0),
  ], false, 'centripetal');
  return sweepProfile(curve, PIPE_SAMPLES, stadiumProfile(HEAT_PIPE.w, HEAT_PIPE.t, PIPE_RING_SEGS));
}

function heatsinkGeometry() {
  const H = HEATSINK_PLATE;
  const parts = [new RoundedBoxGeometry(H.w, H.t, H.d, 3, PLATE_R)];
  for (let k = 0; k < FINS_PER_SIDE; k++) {
    const dz = HEAT_PIPE.w / 2 + FIN_MARGIN * 0.5 + (k + 0.5) * FIN_PITCH;
    for (const s of [-1, 1]) {
      const fin = new RoundedBoxGeometry(FIN_L, FIN_H, FIN_T, 2, FIN_T * 0.45);
      fin.translate(0, H.t / 2 + FIN_H / 2 - PLATE_R * 0.5, s * dz);
      parts.push(fin);
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const screw = screwHead(PLATE_SCREW_R, PLATE_SCREW_H);
      screw.translate(sx * (H.w / 2 - PLATE_SCREW_INSET), H.t / 2 - PLATE_R * 0.3, sz * (H.d / 2 - PLATE_SCREW_INSET));
      parts.push(screw);
    }
  }
  return merged(parts);
}

function graphiteGeometry() {
  const G = GRAPHITE_SHEET;
  const geo = extrudeUp(roundedRectPts(G.w, G.d, SHEET_CORNER_R), G.t);
  geo.translate(0, -G.t / 2, 0);
  return geo;
}

/* ---------------------------------------------------------------- module interface */

export function build(parent, chip, ctx) {
  const { mats } = ctx;
  const g = ctx.tag(new THREE.Group(), NAME);
  parent.add(g);
  rotors.length = 0;

  buildFan(ctx, g, 'FanL', FAN.xL, 1);
  buildFan(ctx, g, 'FanR', FAN.xR, -1);

  const pipe = new THREE.Mesh(heatPipeGeometry(), mats.copper);
  pipe.position.set((HEAT_PIPE.x0 + HEAT_PIPE.x1) / 2, PIPE_END_Y, HEAT_PIPE.z);
  g.add(ctx.tag(pipe, 'HeatPipe'));

  const plate = new THREE.Mesh(heatsinkGeometry(), getPlateMat());
  plate.position.set(HEATSINK_PLATE.cx, HEATSINK_PLATE.y, HEATSINK_PLATE.cz);
  g.add(ctx.tag(plate, 'HeatsinkPlate'));

  const sheet = new THREE.Mesh(graphiteGeometry(), mats.plastic);
  sheet.position.set(GRAPHITE_SHEET.cx, GRAPHITE_SHEET.y, GRAPHITE_SHEET.cz);
  g.add(ctx.tag(sheet, 'GraphiteSheet'));

  applyChip(g, chip, ctx);
  return g;
}

/** 'air' chassis has no fans, pipe or plate. userData.chipHidden is honoured by the dial engine. */
export function applyChip(group, chip, ctx) {
  const air = chip?.chassis === 'air';
  const dial = ctx.state?.dial ?? LEVEL.ENGINEER;
  for (const name of AIR_HIDES) {
    const m = group.getObjectByName(name);
    if (!m) continue;
    m.userData.chipHidden = air;
    m.visible = !air && m.userData.level <= dial;
  }
  if (!ctx.state.chipDerived) ctx.state.chipDerived = {};
  Object.assign(ctx.state.chipDerived, { fansVisible: !air });
}

/** Spin the blades (per-instance rotation, capped at MAX_STEP per frame). No allocations. */
export function update(group, state, dt) {
  const step = Math.min(MAX_STEP, FAN_SPEED * dt);
  if (!(step > 0)) return;
  for (let k = 0; k < rotors.length; k++) {
    const r = rotors[k];
    if (!r.mesh.parent || !r.mesh.parent.visible) continue;
    r.angle += step * r.dir;
    if (r.angle > TAU || r.angle < -TAU) r.angle %= TAU;
    setRotorMatrices(r.mesh, r.angle);
  }
}

export const explodeOffsets = {
  HeatPipe: [0, EXPLODE.thermal, 0],
  HeatsinkPlate: [0, EXPLODE.thermal, 0],
  FanL: [0, EXPLODE.thermal, 0],
  FanR: [0, EXPLODE.thermal, 0],
  GraphiteSheet: [0, EXPLODE.thermal, 0],
};
