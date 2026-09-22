/**
 * src/scene/display.js — the lid: aluminium tray, glass, bezel with notch, lit LCD, mini-LED
 * backlight, the notch module, the lid-angle sensor and the two display flex ribbons.
 *
 * Built in lid-local space (docs/CONTRACT.md): the Display group sits on the hinge axis with
 * rotation.x = -lidAngle. Local +Z runs hinge → free edge (top of the screen), local −Y is the
 * glass side (faces the user when open), local +Y is the aluminium back. Layer heights come from
 * LID.layers offset by LID.gap; every other number here is derived from a dims.js constant.
 *
 * All geometry is procedural: the shell is a filleted profile swept around the rounded rectangle
 * plus a back plate, the bezel and screen plates are extruded Shapes (rounded top corners, notch),
 * the desktop and the dimming-zone grid are CanvasTextures drawn in code. ~10k triangles.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MM, HINGE, LID, SCREEN, EXPLODE } from '../dims.js';
import { ORANGE, BLUE } from '../materials.js';

export const NAME = 'Display';

const DEG = Math.PI / 180;
const HALF_PI = Math.PI / 2;

/* ------------------------------------------------------------------ derived dimensions */

const RIM_WALL = 1.6 * MM;                 // aluminium lip wrapping the glass edge
const EDGE_FILLET = 1.1 * MM;              // radius of both outer edges of the lid slab (< LID.t / 2)
const PLATE_T = LID.layers.shell[1] - LID.layers.shell[0];
const FACE_INSET = RIM_WALL + 0.1 * MM;    // glass and bezel sit inside the lip with a hair of clearance
const GLASS_EDGE_BEVEL = 0.12 * MM;
const LAYER_CLEARANCE = 0.02 * MM;         // between stacked plates so no two faces are coplanar
const SCREEN_CORNER_R = 5 * MM;            // rounded top corners of the active area
const NOTCH_CORNER_R = 2.4 * MM;           // notch bottom corners
const NOTCH_FILLET_R = 1.6 * MM;           // where the notch walls meet the screen's top edge
const WINDOW_CLEARANCE = 0.08 * MM;        // bezel windows around the camera, LED and sensor
const LENS_RING_W = 0.7 * MM;
const LENS_RECESS = 0.1 * MM;
const LENS_DEPTH = LID.layers.lcd[1] - LID.layers.bezel[0];
const LED_R = 0.6 * MM;
const LED_DEPTH = 0.4 * MM;
const SENSOR_DX = SCREEN.cameraRadius + 4.5 * MM;   // LED (+X) and ambient light sensor (−X) offsets
const ALS_SIZE = 1.6 * MM;
const ALS_T = 0.6 * MM;
const ANGLE_SENSOR = Object.freeze({
  w: 3 * MM, h: 0.9 * MM, d: 3 * MM, r: 0.25 * MM,
  x: HINGE.xL + HINGE.length / 2 + 5 * MM,   // just inboard of HingeL
  z: LID.zRear + 5.5 * MM,                   // in the chin, behind the bezel
});
const FLEX = Object.freeze({ w: 14 * MM, t: 0.15 * MM, x: 55 * MM, steps: 48 });
const LOGO = Object.freeze({ h: 38 * MM, relief: 0.06 * MM });
const CORNER_SEGMENTS = 12;
const FILLET_SEGMENTS = 6;
const CIRCLE_SEGMENTS = 32;
const TEX = Object.freeze({ w: 2048, h: 1332 });
const ZONES = Object.freeze({ x: 60, y: 40, cell: 16 });

const Z_LID = LID.zRear + LID.d / 2;                     // lid centre (local z)
const Z_NOTCH = SCREEN.zTop - SCREEN.notch.h / 2;       // notch module centre (local z)
const layerY0 = (name) => LID.gap + LID.layers[name][0];
const layerT = (name) => LID.layers[name][1] - LID.layers[name][0];

const FONT = 'system-ui, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';

/* ------------------------------------------------------------------ 2D paths (shared by Shapes and the canvas) */

/** Rounded rectangle, centred, drawn CCW with true circular corners. Works on THREE.Path and CanvasRenderingContext2D. */
function roundedRect(p, cx, cy, w, h, r) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  const arc = p.absarc ? (x, y, a0, a1) => p.absarc(x, y, r, a0, a1, false) : (x, y, a0, a1) => p.arc(x, y, r, a0, a1, false);
  p.moveTo(x0 + r, y0);
  p.lineTo(x1 - r, y0);
  arc(x1 - r, y0 + r, -HALF_PI, 0);
  p.lineTo(x1, y1 - r);
  arc(x1 - r, y1 - r, 0, HALF_PI);
  p.lineTo(x0 + r, y1);
  arc(x0 + r, y1 - r, HALF_PI, Math.PI);
  p.lineTo(x0, y0 + r);
  arc(x0 + r, y0 + r, Math.PI, 3 * HALF_PI);
  p.closePath();
}

/** Outline of the active area in lid-local (x, z): square bottom corners, rounded top corners, notch at the top centre. */
function screenOutline(p) {
  const W = SCREEN.w / 2, zB = SCREEN.zBottom, zT = SCREEN.zTop;
  const rc = SCREEN_CORNER_R, nw = SCREEN.notch.w / 2, nh = SCREEN.notch.h, rn = NOTCH_CORNER_R, rf = NOTCH_FILLET_R;
  p.moveTo(-W, zB);
  p.lineTo(W, zB);
  p.lineTo(W, zT - rc);
  p.absarc(W - rc, zT - rc, rc, 0, HALF_PI, false);
  p.lineTo(nw + rf, zT);
  p.absarc(nw + rf, zT - rf, rf, HALF_PI, Math.PI, false);
  p.lineTo(nw, zT - nh + rn);
  p.absarc(nw - rn, zT - nh + rn, rn, 0, -HALF_PI, true);
  p.lineTo(-nw + rn, zT - nh);
  p.absarc(-nw + rn, zT - nh + rn, rn, -HALF_PI, -Math.PI, true);
  p.lineTo(-nw, zT - rf);
  p.absarc(-nw - rf, zT - rf, rf, 0, HALF_PI, false);
  p.lineTo(-W + rc, zT);
  p.absarc(-W + rc, zT - rc, rc, HALF_PI, Math.PI, false);
  p.lineTo(-W, zB);
  p.closePath();
}

/** Apple silhouette in unit coordinates (y up, bite on +x): [body, leaf] as M/C command lists. */
const APPLE = Object.freeze([
  [['M', 0, 0.30], ['C', 0.10, 0.40, 0.30, 0.42, 0.40, 0.30], ['C', 0.31, 0.27, 0.29, 0.05, 0.40, 0.01],
    ['C', 0.52, -0.05, 0.44, -0.36, 0.22, -0.47], ['C', 0.13, -0.52, 0.06, -0.45, 0, -0.43],
    ['C', -0.06, -0.45, -0.13, -0.52, -0.22, -0.47], ['C', -0.48, -0.36, -0.50, 0.02, -0.40, 0.22],
    ['C', -0.33, 0.40, -0.12, 0.42, 0, 0.30]],
  [['M', 0.03, 0.34], ['C', 0.04, 0.50, 0.17, 0.58, 0.28, 0.56], ['C', 0.27, 0.44, 0.15, 0.35, 0.03, 0.34]],
]);

/** Trace one APPLE sub-path onto a Path or canvas context at (cx, cy), scale s, axis signs sx/sy. */
function traceApple(p, cmds, cx, cy, s, sx, sy) {
  const X = (x) => cx + s * sx * x, Y = (y) => cy + s * sy * y;
  for (const c of cmds) {
    if (c[0] === 'M') p.moveTo(X(c[1]), Y(c[2]));
    else p.bezierCurveTo(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]), X(c[5]), Y(c[6]));
  }
  p.closePath();
}

/* ------------------------------------------------------------------ geometry helpers */

/**
 * Extrude a Shape drawn in lid-local (x, z) along local +Y so it occupies y ∈ [yStart, yStart + thickness].
 * `bevel` > 0 fillets both faces: draw the shape inset by `bevel` (ExtrudeGeometry grows the body by it).
 */
function extrudeXZ(shapes, yStart, thickness, bevel = 0, curveSegments = CORNER_SEGMENTS) {
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: thickness - 2 * bevel,
    curveSegments,
    steps: 1,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: FILLET_SEGMENTS,
    bevelOffset: 0,
  });
  geo.rotateX(HALF_PI);                                  // shape y → local z; extrusion → −y
  geo.translate(0, yStart + thickness - bevel, 0);
  return geo;
}

/** Closed outline of a rounded rectangle in the XZ plane, each point with its outward normal. */
function roundedRectOutline(w, d, r, cz) {
  const pts = [];
  const hx = w / 2 - r, hz = d / 2 - r;
  const corners = [[hx, hz, 0], [-hx, hz, HALF_PI], [-hx, -hz, Math.PI], [hx, -hz, 3 * HALF_PI]];
  for (const [cx, ccz, a0] of corners) {
    for (let i = 0; i <= CORNER_SEGMENTS; i++) {
      const a = a0 + (i / CORNER_SEGMENTS) * HALF_PI;
      const nx = Math.cos(a), nz = Math.sin(a);
      pts.push({ x: cx + r * nx, z: cz + ccz + r * nz, nx, nz });
    }
  }
  return pts;
}

/**
 * Cross-section of the lid's rim in (u, y): u = distance inward from the outer edge, y = height above the
 * glass plane. Both outer corners are filleted (radius r); the inner corners are sharp (duplicated points
 * so the normals split there).
 */
function rimProfile(wall, r, t) {
  const p = [];
  const push = (u, y, nu, ny) => p.push({ u, y, nu, ny });
  push(wall, 0, 0, -1);
  push(r, 0, 0, -1);
  for (let i = 1; i <= FILLET_SEGMENTS; i++) {           // bottom fillet, centre (r, r)
    const a = -HALF_PI - (i / FILLET_SEGMENTS) * HALF_PI;
    push(r + r * Math.cos(a), r + r * Math.sin(a), Math.cos(a), Math.sin(a));
  }
  push(0, t - r, -1, 0);
  for (let i = 1; i <= FILLET_SEGMENTS; i++) {           // top fillet, centre (r, t − r)
    const a = Math.PI - (i / FILLET_SEGMENTS) * HALF_PI;
    push(r + r * Math.cos(a), t - r + r * Math.sin(a), Math.cos(a), Math.sin(a));
  }
  push(wall, t, 0, 1);
  push(wall, t, 1, 0);
  push(wall, 0, 1, 0);
  return p;
}

/** Sweep a (u, y) profile around an outline with normals → closed, non-indexed geometry with real fillet normals. */
function sweep(outline, profile) {
  const N = outline.length, M = profile.length;
  const pos = [], nrm = [], uv = [];
  for (let i = 0; i < N; i++) {
    const o = outline[i];
    for (let j = 0; j < M; j++) {
      const p = profile[j];
      pos.push(o.x - o.nx * p.u, p.y, o.z - o.nz * p.u);
      nrm.push(-p.nu * o.nx, p.ny, -p.nu * o.nz);
      uv.push(i / N, j / (M - 1));
    }
  }
  const idx = [];
  for (let i = 0; i < N; i++) {
    const i1 = (i + 1) % N;
    for (let j = 0; j < M - 1; j++) {
      const p = profile[j], q = profile[j + 1];
      if (p.u === q.u && p.y === q.y) continue;          // duplicated corner point: no degenerate quad
      const a = i * M + j, b = i1 * M + j, c = b + 1, d = a + 1;
      idx.push(a, c, b, a, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  // Guard the winding: the first triangle's geometric normal must agree with its stored normal.
  const P = geo.getAttribute('position');
  const A = new THREE.Vector3().fromBufferAttribute(P, idx[0]);
  const B = new THREE.Vector3().fromBufferAttribute(P, idx[1]).sub(A);
  const C = new THREE.Vector3().fromBufferAttribute(P, idx[2]).sub(A);
  const n0 = new THREE.Vector3().fromBufferAttribute(geo.getAttribute('normal'), idx[0]);
  if (B.cross(C).dot(n0) < 0) {
    for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
    geo.setIndex(idx);
  }
  return geo.toNonIndexed();
}

/** The whole shell: swept rim + back plate (aluminium) and the polished logo (second material group). */
function shellGeometry() {
  const rim = sweep(roundedRectOutline(LID.w, LID.d, LID.cornerRadius, Z_LID), rimProfile(RIM_WALL, EDGE_FILLET, LID.t));
  rim.translate(0, LID.gap, 0);

  const plateShape = new THREE.Shape();
  roundedRect(plateShape, 0, Z_LID, LID.w - 2 * RIM_WALL, LID.d - 2 * RIM_WALL, LID.cornerRadius - RIM_WALL);
  const plate = extrudeXZ(plateShape, LID.gap + LID.t - PLATE_T, PLATE_T);

  const logoScale = LOGO.h / 1.03;                       // APPLE spans y ∈ [−0.47, 0.56]
  const logoShapes = APPLE.map((cmds) => {
    const s = new THREE.Shape();
    traceApple(s, cmds, 0, Z_LID - 0.045 * logoScale, logoScale, -1, 1);   // mirrored: seen from behind, bite on the viewer's right
    return s;
  });
  const logo = extrudeXZ(logoShapes, LID.gap + LID.t, LOGO.relief, 0, 16);

  return mergeGeometries([mergeGeometries([rim, plate]), logo], true);
}

/** Camera: dark lens cylinder inside a steel ring, flush with the bezel window. Groups: 0 lens, 1 ring. */
function cameraGeometry() {
  const rOuter = SCREEN.cameraRadius, rLens = rOuter - LENS_RING_W;
  const lens = new THREE.CylinderGeometry(rLens, rLens, LENS_DEPTH, CIRCLE_SEGMENTS);
  lens.translate(0, LENS_RECESS + LENS_DEPTH / 2, 0);
  const ring = new THREE.RingGeometry(rLens, rOuter, CIRCLE_SEGMENTS);
  ring.rotateX(HALF_PI);                                 // face −Y (toward the user)
  ring.translate(0, LENS_RECESS / 2, 0);
  const wall = new THREE.CylinderGeometry(rOuter, rOuter, LENS_DEPTH, CIRCLE_SEGMENTS, 1, true);
  wall.translate(0, LENS_RECESS / 2 + LENS_DEPTH / 2, 0);
  return mergeGeometries([lens, mergeGeometries([ring, wall])], true);
}

/**
 * A flat ribbon swept along a curve with its width pinned to local X (no Frenet frames: they seed
 * from the smallest tangent component and can put the width along Y). Closed, non-indexed.
 */
function ribbonGeometry(curve, width, thickness, steps) {
  const centres = curve.getSpacedPoints(steps);
  const X = new THREE.Vector3(1, 0, 0);
  const t = new THREE.Vector3(), n = new THREE.Vector3();
  const corners = [];                                    // per step: q0..q3 around the section
  for (let s = 0; s <= steps; s++) {
    curve.getTangentAt(s / steps, t).normalize();
    n.crossVectors(t, X).normalize();                    // thickness direction, in the curve's plane
    const c = centres[s];
    const q = (sw, sn) => c.clone().addScaledVector(X, (sw * width) / 2).addScaledVector(n, (sn * thickness) / 2);
    corners.push({ q: [q(1, 1), q(-1, 1), q(-1, -1), q(1, -1)], n: n.clone(), t: t.clone() });
  }
  const pos = [], nrm = [], uv = [];
  const tri = (a, b, c, normal) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    for (let k = 0; k < 3; k++) nrm.push(normal.x, normal.y, normal.z);
    uv.push(0, 0, 1, 0, 1, 1);
  };
  const sideNormal = (k, c) => (k === 0 ? c.n : k === 1 ? X.clone().negate() : k === 2 ? c.n.clone().negate() : X);
  for (let s = 0; s < steps; s++) {
    const A = corners[s], B = corners[s + 1];
    for (let k = 0; k < 4; k++) {
      const k1 = (k + 1) % 4;
      tri(A.q[k], A.q[k1], B.q[k1], sideNormal(k, A));
      tri(A.q[k], B.q[k1], B.q[k], sideNormal(k, B));
    }
  }
  const first = corners[0], last = corners[steps];
  const back = first.t.clone().negate();
  tri(first.q[0], first.q[2], first.q[1], back);
  tri(first.q[0], first.q[3], first.q[2], back);
  tri(last.q[0], last.q[1], last.q[2], last.t);
  tri(last.q[0], last.q[2], last.q[3], last.t);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

/** A display flex ribbon at lid-local x: leaves the LCD's bottom edge, curls behind the hinge, drops into the base. */
function flexRibbon(x) {
  const y = layerY0('lcd') + layerT('lcd') / 2;
  const pts = [
    [x, y, 13 * MM], [x, y, 2 * MM], [x, y - 0.3 * MM, -3.2 * MM],
    [x, 1.4 * MM, -5.2 * MM], [x, -2.6 * MM, -4.6 * MM], [x, -5.0 * MM, -2.4 * MM],
    [x, -8.5 * MM, -5.2 * MM], [x, -12 * MM, -9 * MM],
  ].map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  return ribbonGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), FLEX.w, FLEX.t, FLEX.steps);
}

/**
 * A plate cut to the screen outline (notch and rounded top corners included) with planar UVs so a
 * CanvasTexture with flipY = false lands upright: canvas left → −X, canvas top → +Z (free edge).
 * Materials: [front (−Y, the lit face), sides, back (+Y)].
 */
function screenPlate(yStart, thickness, frontMat, sideMat, backMat) {
  const shape = new THREE.Shape();
  screenOutline(shape);
  const geo = extrudeXZ(shape, yStart, thickness);
  const p = geo.getAttribute('position'), uv = geo.getAttribute('uv');
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + SCREEN.w / 2) / SCREEN.w, (SCREEN.zTop - p.getZ(i)) / SCREEN.h);
  const [caps, sides] = geo.groups;                      // ExtrudeGeometry: caps = back half then front half
  const half = caps.count / 2;
  geo.clearGroups();
  geo.addGroup(caps.start, half, 2);
  geo.addGroup(caps.start + half, half, 0);
  geo.addGroup(sides.start, sides.count, 1);
  return new THREE.Mesh(geo, [frontMat, sideMat, backMat]);
}

/* ------------------------------------------------------------------ canvas: the desktop */

/** mulberry32 — the same seeded PRNG materials.js uses, so two builds draw the same pixels. */
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

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Elliptical radial gradient (rx × ry) filled at (cx, cy). */
function glow(g, cx, cy, rx, ry, stops) {
  g.save();
  g.translate(cx, cy);
  g.scale(1, ry / rx);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  for (const [t, c] of stops) grad.addColorStop(t, c);
  g.fillStyle = grad;
  g.fillRect(-rx, -rx, 2 * rx, 2 * rx);
  g.restore();
}

/** Golden Gate in fog: grey-blue gradients, one warm orange band, the bridge in silhouette, fog, grain. */
function drawWallpaper(g, W, H, rnd) {
  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, mix('#aeb9ca', BLUE, 0.12));
  base.addColorStop(0.38, mix('#8d9db4', BLUE, 0.18));
  base.addColorStop(0.68, mix('#5f6d87', BLUE, 0.24));
  base.addColorStop(1, mix('#1e2331', BLUE, 0.28));
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);

  glow(g, 0.58 * W, 0.58 * H, 0.80 * W, 0.16 * H, [[0, rgba(ORANGE, 0.50)], [0.5, rgba(ORANGE, 0.20)], [1, rgba(ORANGE, 0)]]);
  glow(g, 0.62 * W, 0.55 * H, 0.22 * W, 0.10 * H, [[0, rgba(mix(ORANGE, '#ffffff', 0.55), 0.6)], [1, rgba(ORANGE, 0)]]);

  // distant headland
  g.fillStyle = rgba(mix('#4a5470', BLUE, 0.18), 0.85);
  g.beginPath();
  g.moveTo(0, 0.74 * H);
  g.bezierCurveTo(0.18 * W, 0.70 * H, 0.30 * W, 0.71 * H, 0.42 * W, 0.745 * H);
  g.bezierCurveTo(0.60 * W, 0.78 * H, 0.80 * W, 0.72 * H, W, 0.76 * H);
  g.lineTo(W, H);
  g.lineTo(0, H);
  g.closePath();
  g.fill();

  drawBridge(g, W, H);

  // fog banks
  glow(g, 0.50 * W, 0.47 * H, 0.90 * W, 0.09 * H, [[0, 'rgba(255,255,255,0.22)'], [1, 'rgba(255,255,255,0)']]);
  glow(g, 0.30 * W, 0.60 * H, 0.70 * W, 0.07 * H, [[0, 'rgba(255,255,255,0.16)'], [1, 'rgba(255,255,255,0)']]);
  glow(g, 0.72 * W, 0.71 * H, 0.80 * W, 0.06 * H, [[0, 'rgba(255,255,255,0.14)'], [1, 'rgba(255,255,255,0)']]);

  // near water
  const water = g.createLinearGradient(0, 0.78 * H, 0, H);
  water.addColorStop(0, rgba(mix('#3a4358', BLUE, 0.2), 0));
  water.addColorStop(1, rgba(mix('#1d2230', BLUE, 0.2), 0.9));
  g.fillStyle = water;
  g.fillRect(0, 0.78 * H, W, 0.22 * H);

  const vig = g.createRadialGradient(0.5 * W, 0.5 * H, 0.35 * W, 0.5 * W, 0.5 * H, 0.85 * W);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.22)');
  g.fillStyle = vig;
  g.fillRect(0, 0, W, H);

  grain(g, W, H, rnd, 0.07);
}

function drawBridge(g, W, H) {
  const deckY = 0.735 * H, towerTop = 0.47 * H, xL = 0.34 * W, xR = 0.66 * W, tw = 0.007 * W;
  const cableY = (x, x0, x1, y0, y1, cy) => {              // quadratic bezier with control x at the span midpoint
    const t = (x - x0) / (x1 - x0);
    return (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
  };
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = rgba(ORANGE, 0.78);
  g.fillStyle = rgba(ORANGE, 0.78);
  for (const x of [xL, xR]) {
    for (const dx of [-1.1 * tw, 1.1 * tw]) g.fillRect(x + dx - tw / 2, towerTop, tw, deckY + 0.05 * H - towerTop);
    g.lineWidth = 0.8 * tw;
    for (const f of [0.02, 0.30, 0.58]) {
      const y = towerTop + f * (deckY - towerTop);
      g.beginPath();
      g.moveTo(x - 1.6 * tw, y);
      g.lineTo(x + 1.6 * tw, y);
      g.stroke();
    }
  }
  const sag = deckY - 0.035 * H;
  const cyMain = 2 * sag - towerTop;
  const spans = [
    [0.05 * W, xL, deckY - 0.012 * H, towerTop, 2 * (deckY - 0.02 * H) - towerTop - (deckY - 0.012 * H) + towerTop],
    [xL, xR, towerTop, towerTop, cyMain],
    [xR, 0.95 * W, towerTop, deckY - 0.012 * H, 2 * (deckY - 0.02 * H) - towerTop - (deckY - 0.012 * H) + towerTop],
  ];
  g.lineWidth = 0.55 * tw;
  for (const [x0, x1, y0, y1, cy] of spans) {
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2, cy, x1, y1);
    g.stroke();
  }
  g.lineWidth = 0.22 * tw;
  g.strokeStyle = rgba(ORANGE, 0.6);
  for (let x = 0.07 * W; x <= 0.93 * W; x += 0.016 * W) {
    const span = spans.find(([x0, x1]) => x >= x0 && x <= x1);
    if (!span) continue;
    g.beginPath();
    g.moveTo(x, cableY(x, ...span));
    g.lineTo(x, deckY);
    g.stroke();
  }
  g.fillStyle = rgba(ORANGE, 0.8);
  g.fillRect(0.04 * W, deckY - 0.6 * tw, 0.92 * W, 1.2 * tw);
  g.fillStyle = rgba(ORANGE, 0.45);
  g.fillRect(0.04 * W, deckY - 1.3 * tw, 0.92 * W, 0.25 * tw);
  // fog swallows the lower half of the bridge
  const fog = g.createLinearGradient(0, towerTop, 0, deckY + 0.06 * H);
  fog.addColorStop(0, 'rgba(255,255,255,0)');
  fog.addColorStop(1, 'rgba(255,255,255,0.35)');
  g.fillStyle = fog;
  g.fillRect(0, towerTop, W, deckY + 0.06 * H - towerTop);
  g.restore();
}

/** Film grain: half-resolution seeded noise composited with 'overlay' at low alpha. */
function grain(g, W, H, rnd, alpha) {
  const w = W >> 1, h = H >> 1;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const gc = c.getContext('2d');
  const img = gc.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (96 + rnd() * 64) | 0;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  gc.putImageData(img, 0, 0);
  g.save();
  g.globalAlpha = alpha;
  g.globalCompositeOperation = 'overlay';
  g.drawImage(c, 0, 0, W, H);
  g.restore();
}

/** Frosted strip: blur what is already drawn under the rect, then tint it. */
function frost(g, canvas, x, y, w, h, r, tint) {
  g.save();
  g.beginPath();
  roundedRect(g, x + w / 2, y + h / 2, w, h, r);
  g.clip();
  g.filter = 'blur(18px)';
  const m = 48;
  g.drawImage(canvas, x - m, y - m, w + 2 * m, h + 2 * m, x - m, y - m, w + 2 * m, h + 2 * m);
  g.filter = 'none';
  g.fillStyle = tint;
  g.fillRect(x, y, w, h);
  g.restore();
}

function drawMenuBar(g, canvas, W, menuH) {
  frost(g, canvas, 0, 0, W, menuH, 0, 'rgba(18, 21, 28, 0.50)');
  g.fillStyle = 'rgba(255,255,255,0.10)';
  g.fillRect(0, menuH - 1, W, 1);
  const cy = menuH / 2;
  g.fillStyle = '#ffffff';
  g.textBaseline = 'middle';
  g.textAlign = 'left';

  g.beginPath();
  for (const cmds of APPLE) traceApple(g, cmds, 40, cy + 1, 20, 1, -1);
  g.fill();

  let x = 66;
  g.font = `700 22px ${FONT}`;
  g.fillText('unfoundbox', x, cy);
  x += g.measureText('unfoundbox').width + 28;
  g.font = `600 22px ${FONT}`;
  for (const item of ['File', 'Edit', 'View', 'Go', 'Window', 'Help']) {
    g.fillText(item, x, cy);
    x += g.measureText(item).width + 28;
  }

  g.textAlign = 'right';
  const clock = 'Tue 22 Sep  9:41';
  g.fillText(clock, W - 34, cy);
  let rx = W - 34 - g.measureText(clock).width - 32;
  g.strokeStyle = '#ffffff';
  g.lineCap = 'round';
  // battery
  g.lineWidth = 2;
  roundedRect(g, rx - 15, cy, 30, 14, 3.5);
  g.stroke();
  g.fillRect(rx - 12, cy - 4, 20, 8);
  g.fillRect(rx + 16, cy - 2.5, 2.5, 5);
  rx -= 52;
  // wi-fi
  g.lineWidth = 2.6;
  for (const [r, a] of [[16, 1], [10.5, 1], [5, 1]]) {
    g.globalAlpha = a;
    g.beginPath();
    g.arc(rx, cy + 7, r, -Math.PI * 0.77, -Math.PI * 0.23);
    g.stroke();
  }
  g.beginPath();
  g.arc(rx, cy + 7, 1.6, 0, 2 * Math.PI);
  g.fill();
  rx -= 48;
  // control centre (two toggles)
  g.lineWidth = 2;
  for (const [dy, on] of [[-5, 1], [5, 0]]) {
    roundedRect(g, rx, cy + dy, 22, 8, 4);
    g.stroke();
    g.beginPath();
    g.arc(rx + (on ? 7 : -7), cy + dy, 2.6, 0, 2 * Math.PI);
    g.fill();
  }
  rx -= 46;
  // search
  g.lineWidth = 2.4;
  g.beginPath();
  g.arc(rx, cy - 2, 7, 0, 2 * Math.PI);
  g.stroke();
  g.beginPath();
  g.moveTo(rx + 5, cy + 3);
  g.lineTo(rx + 10, cy + 8);
  g.stroke();
  g.textAlign = 'left';
}

/** Twelve tiles: muted neutrals, one orange, one blue; a few simple white or dark marks; dots under running apps. */
const TILE_TINTS = Object.freeze(['#eef0f3', '#c9ced6', '#5b6270', ORANGE, '#f4f5f7', '#8d949f', '#2f343d', BLUE, '#d5d9df', '#767d88', '#3e434c', '#b6bcc5']);
const RUNNING = Object.freeze([0, 3, 7, 9]);

function drawTileMark(g, i, cx, cy, size) {
  const s = size / 2;
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  switch (i) {
    case 0: // window
      g.fillStyle = '#3a3f48';
      roundedRect(g, cx, cy, 0.62 * size, 0.46 * size, 5);
      g.fill();
      g.fillStyle = '#e6e8ec';
      g.fillRect(cx - 0.31 * size + 4, cy - 0.23 * size + 4, 0.62 * size - 8, 7);
      break;
    case 2: // ring
      g.strokeStyle = '#ffffff';
      g.lineWidth = 5;
      g.beginPath();
      g.arc(cx, cy, 0.30 * size, 0, 2 * Math.PI);
      g.stroke();
      break;
    case 3: // target
      g.strokeStyle = '#ffffff';
      g.fillStyle = '#ffffff';
      g.lineWidth = 4.5;
      g.beginPath();
      g.arc(cx, cy, 0.30 * size, 0, 2 * Math.PI);
      g.stroke();
      g.beginPath();
      g.arc(cx, cy, 0.10 * size, 0, 2 * Math.PI);
      g.fill();
      break;
    case 5: // list
      g.fillStyle = '#ffffff';
      for (const dy of [-0.22, 0, 0.22]) g.fillRect(cx - 0.28 * size, cy + dy * size - 3, 0.56 * size, 6);
      break;
    case 7: // paper plane
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(cx - 0.30 * s, cy + 0.02 * s);
      g.lineTo(cx + 0.62 * s, cy - 0.58 * s);
      g.lineTo(cx + 0.12 * s, cy + 0.62 * s);
      g.lineTo(cx - 0.02 * s, cy + 0.12 * s);
      g.closePath();
      g.fill();
      break;
    case 9: // rounded square outline
      g.strokeStyle = '#ffffff';
      g.lineWidth = 4.5;
      roundedRect(g, cx, cy, 0.52 * size, 0.52 * size, 8);
      g.stroke();
      break;
    case 11: // bin
      g.fillStyle = '#4a4f58';
      g.beginPath();
      g.moveTo(cx - 0.26 * size, cy - 0.16 * size);
      g.lineTo(cx + 0.26 * size, cy - 0.16 * size);
      g.lineTo(cx + 0.20 * size, cy + 0.30 * size);
      g.lineTo(cx - 0.20 * size, cy + 0.30 * size);
      g.closePath();
      g.fill();
      g.fillRect(cx - 0.30 * size, cy - 0.26 * size, 0.60 * size, 5);
      break;
    default:
      break;
  }
  g.restore();
}

function drawDock(g, canvas, W, H) {
  const n = TILE_TINTS.length, size = 66, gap = 12, pad = 16, r = 15, divider = 14;
  const inner = n * size + (n - 1) * gap + divider;
  const dw = inner + 2 * pad, dh = size + 2 * pad, dx = (W - dw) / 2, dy = H - 18 - dh;

  g.save();
  g.shadowColor = 'rgba(0,0,0,0.30)';
  g.shadowBlur = 40;
  g.shadowOffsetY = 12;
  g.fillStyle = 'rgba(0,0,0,0.01)';
  roundedRect(g, dx + dw / 2, dy + dh / 2, dw, dh, 24);
  g.fill();
  g.restore();
  frost(g, canvas, dx, dy, dw, dh, 24, 'rgba(255,255,255,0.30)');
  g.strokeStyle = 'rgba(255,255,255,0.45)';
  g.lineWidth = 1.5;
  roundedRect(g, dx + dw / 2, dy + dh / 2, dw, dh, 24);
  g.stroke();

  let x = dx + pad;
  for (let i = 0; i < n; i++) {
    if (i === n - 1) {
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.fillRect(x + divider / 2 - 1, dy + pad + 8, 2, size - 16);
      x += divider;
    }
    const tint = TILE_TINTS[i];
    const grad = g.createLinearGradient(0, dy + pad, 0, dy + pad + size);
    grad.addColorStop(0, mix(tint, '#ffffff', 0.14));
    grad.addColorStop(1, mix(tint, '#000000', 0.10));
    g.fillStyle = grad;
    roundedRect(g, x + size / 2, dy + pad + size / 2, size, size, r);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 1;
    roundedRect(g, x + size / 2, dy + pad + size / 2, size - 1, size - 1, r);
    g.stroke();
    drawTileMark(g, i, x + size / 2, dy + pad + size / 2, size);
    if (RUNNING.includes(i)) {
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.beginPath();
      g.arc(x + size / 2, dy + pad + size + 8, 3, 0, 2 * Math.PI);
      g.fill();
    }
    x += size + gap;
  }
}

function drawDesktop(canvas) {
  const W = canvas.width, H = canvas.height;
  const g = canvas.getContext('2d');
  const rnd = seeded(2026);
  drawWallpaper(g, W, H, rnd);
  drawMenuBar(g, canvas, W, Math.round((H * SCREEN.notch.h) / SCREEN.h));
  drawDock(g, canvas, W, H);
}

/** Per-zone luminance of the desktop (row-major, top row first) — the backlight dims to the picture. */
function zoneLuminance(desktop) {
  const c = document.createElement('canvas');
  c.width = ZONES.x;
  c.height = ZONES.y;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(desktop, 0, 0, ZONES.x, ZONES.y);
  const d = g.getImageData(0, 0, ZONES.x, ZONES.y).data;
  const lum = new Float32Array(ZONES.x * ZONES.y);
  for (let i = 0; i < lum.length; i++) lum[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
  return lum;
}

function drawZones(canvas, lum) {
  const W = canvas.width, H = canvas.height;
  const g = canvas.getContext('2d');
  g.fillStyle = '#0d0e10';
  g.fillRect(0, 0, W, H);
  const cw = W / ZONES.x, ch = H / ZONES.y, pad = 1.5;
  for (let j = 0; j < ZONES.y; j++) {
    for (let i = 0; i < ZONES.x; i++) {
      const b = 0.10 + 0.90 * Math.pow(lum[j * ZONES.x + i], 0.75);
      g.fillStyle = mix('#1b1d21', '#f7f3ea', b);
      roundedRect(g, (i + 0.5) * cw, (j + 0.5) * ch, cw - 2 * pad, ch - 2 * pad, 2);
      g.fill();
      g.fillStyle = mix('#2a2c30', '#fffaf0', Math.min(1, b + 0.25));
      for (const [ox, oy] of [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]]) g.fillRect((i + ox) * cw - 1, (j + oy) * ch - 1, 2, 2);
    }
  }
  g.strokeStyle = '#26282c';
  g.lineWidth = 6;
  g.strokeRect(0, 0, W, H);
}

/* ------------------------------------------------------------------ materials this module adds (created once) */

let screenMats = null;

function getScreenMats() {
  if (screenMats) return screenMats;
  const desktop = document.createElement('canvas');
  desktop.width = TEX.w;
  desktop.height = TEX.h;
  drawDesktop(desktop);
  const lcdTex = new THREE.CanvasTexture(desktop);
  lcdTex.colorSpace = THREE.SRGBColorSpace;
  lcdTex.anisotropy = 8;
  lcdTex.flipY = false;

  const zones = document.createElement('canvas');
  zones.width = ZONES.x * ZONES.cell;
  zones.height = ZONES.y * ZONES.cell;
  drawZones(zones, zoneLuminance(desktop));
  const zoneTex = new THREE.CanvasTexture(zones);
  zoneTex.colorSpace = THREE.SRGBColorSpace;
  zoneTex.anisotropy = 4;
  zoneTex.flipY = false;

  screenMats = {
    // The picture is emissive; diffuse and environment terms are kept small so room light does not wash it out.
    lcd: new THREE.MeshStandardMaterial({ color: 0x404040, map: lcdTex, emissive: 0xffffff, emissiveMap: lcdTex, emissiveIntensity: 0.9, roughness: 0.25, metalness: 0, envMapIntensity: 0.25 }),
    zones: new THREE.MeshStandardMaterial({ map: zoneTex, emissive: 0xffffff, emissiveMap: zoneTex, emissiveIntensity: 0.55, roughness: 0.6, metalness: 0 }),
    panelBack: new THREE.MeshPhysicalMaterial({ color: 0x9a9da3, metalness: 1, roughness: 0.42, anisotropy: 0.7 }),
    // Cover glass: fully transmissive with a faint sheen. The shared mats.glass reflects the room's area
    // lights (radiance 50–100) at full strength, which tone-maps the black bezel to light grey.
    coverGlass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, metalness: 0, transmission: 1, ior: 1.5, thickness: 0.0004, transparent: true, envMapIntensity: 0.12, specularIntensity: 0.5 }),
    // Camera lens: near-black with a soft clearcoat highlight; the shared mirror-black cameraLens reflects
    // the room's area lights as a white disc.
    lens: new THREE.MeshPhysicalMaterial({ color: 0x06070a, roughness: 0.4, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.5, envMapIntensity: 0.06 }),
  };
  for (const [name, m] of Object.entries(screenMats)) m.name = `display.${name}`;
  return screenMats;
}

/* ------------------------------------------------------------------ build */

function addMesh(ctx, parent, key, geometry, material, position) {
  const m = new THREE.Mesh(geometry, material);
  if (position) m.position.set(position[0], position[1], position[2]);
  parent.add(ctx.tag(m, key));
  return m;
}

export function build(parent, chip, ctx) {
  const { mats } = ctx;
  const sm = getScreenMats();
  const g = ctx.tag(new THREE.Group(), NAME);
  g.position.set(0, HINGE.y, HINGE.z);
  g.rotation.x = -ctx.state.lidAngleDeg * DEG;
  parent.add(g);

  // Glass: full face inside the aluminium lip, tiny edge bevel to catch highlights.
  const glassShape = new THREE.Shape();
  const glassInset = FACE_INSET + GLASS_EDGE_BEVEL;
  roundedRect(glassShape, 0, Z_LID, LID.w - 2 * glassInset, LID.d - 2 * glassInset, LID.cornerRadius - glassInset);
  addMesh(ctx, g, 'Display.Glass', extrudeXZ(glassShape, layerY0('glass'), layerT('glass') - LAYER_CLEARANCE, GLASS_EDGE_BEVEL), sm.coverGlass);

  // Bezel: black frame = face minus the screen outline (notch included), with windows for the notch module.
  const bezelShape = new THREE.Shape();
  roundedRect(bezelShape, 0, Z_LID, LID.w - 2 * FACE_INSET, LID.d - 2 * FACE_INSET, LID.cornerRadius - FACE_INSET);
  const screenHole = new THREE.Path();
  screenOutline(screenHole);
  const cameraWindow = new THREE.Path().absarc(0, Z_NOTCH, SCREEN.cameraRadius + WINDOW_CLEARANCE, 0, 2 * Math.PI, false);
  const ledWindow = new THREE.Path().absarc(SENSOR_DX, Z_NOTCH, LED_R + WINDOW_CLEARANCE, 0, 2 * Math.PI, false);
  const alsWindow = new THREE.Path();
  roundedRect(alsWindow, -SENSOR_DX, Z_NOTCH, ALS_SIZE + 2 * WINDOW_CLEARANCE, ALS_SIZE + 2 * WINDOW_CLEARANCE, 0.3 * MM);
  bezelShape.holes.push(screenHole, cameraWindow, ledWindow, alsWindow);
  addMesh(ctx, g, 'Bezel', extrudeXZ(bezelShape, layerY0('bezel'), layerT('bezel') - LAYER_CLEARANCE, 0, 24), mats.bezel);

  // LCD panel (lit desktop) and the mini-LED backlight (dimming zones), both cut to the screen outline.
  const lcd = screenPlate(layerY0('lcd'), layerT('lcd') - LAYER_CLEARANCE, sm.lcd, mats.packageBlack, sm.panelBack);
  g.add(ctx.tag(lcd, 'LCDPanel'));
  const backlight = screenPlate(layerY0('backlight'), layerT('backlight') - LAYER_CLEARANCE, sm.zones, mats.aluminiumInner, mats.aluminiumInner);
  g.add(ctx.tag(backlight, 'MiniLEDBacklight'));

  // Shell: swept-fillet rim + back plate + polished logo.
  addMesh(ctx, g, 'LidShell', shellGeometry(), [mats.aluminium, mats.cameraLens]);

  // Notch module: origin on the bezel's front plane at the notch centre; parts extend into +Y (behind).
  const notch = ctx.tag(new THREE.Group(), 'NotchModule');
  notch.position.set(0, layerY0('bezel'), Z_NOTCH);
  g.add(notch);
  addMesh(ctx, notch, 'Camera', cameraGeometry(), [sm.lens, mats.aluminiumInner]);
  const led = new THREE.CylinderGeometry(LED_R, LED_R, LED_DEPTH, 16);
  addMesh(ctx, notch, 'CameraLED', led, mats.ledLens, [SENSOR_DX, LENS_RECESS + LED_DEPTH / 2, 0]);
  const als = new RoundedBoxGeometry(ALS_SIZE, ALS_T, ALS_SIZE, 2, 0.25 * MM);
  addMesh(ctx, notch, 'AmbientLightSensor', als, mats.packageBlack, [-SENSOR_DX, LENS_RECESS + 0.1 * MM + ALS_T / 2, 0]);

  // Lid-angle sensor: a small package in the chin next to HingeL.
  const sensor = new RoundedBoxGeometry(ANGLE_SENSOR.w, ANGLE_SENSOR.h, ANGLE_SENSOR.d, 2, ANGLE_SENSOR.r);
  addMesh(ctx, g, 'LidAngleSensor', sensor, mats.packageBlack, [ANGLE_SENSOR.x, layerY0('lcd') + ANGLE_SENSOR.h / 2, ANGLE_SENSOR.z]);

  // Display flex: two ribbons, one mesh.
  addMesh(ctx, g, 'DisplayFlex', mergeGeometries([flexRibbon(-FLEX.x), flexRibbon(FLEX.x)]), mats.flex);

  return g;
}

/** Lid layers fan along the lid normal (local +Y = away from the user when open); glass and flex stay. */
const gap = EXPLODE.displayLayerGap;
export const explodeOffsets = {
  Bezel: [0, gap, 0],
  NotchModule: [0, gap, 0],
  LCDPanel: [0, gap * 2, 0],
  MiniLEDBacklight: [0, gap * 3, 0],
  LidShell: [0, gap * 4, 0],
  LidAngleSensor: [0, gap * 4, 0],
};
