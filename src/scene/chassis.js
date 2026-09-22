/**
 * src/scene/chassis.js — the aluminium unibody.
 *
 * TopCase   one merged geometry: a swept 2.2 mm fillet "crown" around the rim (own sweep so the
 *           fillet is a true quarter-round, not a bevel), four side walls (left/right/rear as
 *           extruded Shapes with real port holes / the vent-bar notch, front plain), swept corner
 *           quadrants, the bevelled deck with the keyboard well and trackpad holes, the well floor,
 *           and the walls that close the rear hinge/vent notch.
 * BottomCase bevelled rounded plate with eight pentalobe screw heads merged in (material groups).
 * HingeL/R  dark steel capsule barrels with an anodized cover block joining each to the notch floor.
 * VentAntennaBar rounded black plastic bar with an InstancedMesh of vent slots on its rear face.
 * Feet[0..3] lathed rubber discs protruding below y = 0.
 * Plus an untagged contact-shadow plane (userData.effect) that fades as the explode slider grows.
 *
 * Every dimension derives from dims.js; the named constants below are the only new numbers.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MM, BASE, INTERIOR, FEET, HINGE, VENT_ANTENNA_BAR, KEYBOARD, TRACKPAD, PORTS, PORT_Y, EXPLODE } from '../dims.js';

export const NAME = 'Chassis';

/* ---------------------------------------------------------------- derived dimensions */

const HW = BASE.w / 2;
const HD = BASE.d / 2;
const CORNER_R = BASE.cornerRadius;
const FILLET_R = BASE.edgeRadius;
const WALL_Y0 = INTERIOR.y0;                 // walls stand on the bottom plate
const CROWN_Y0 = BASE.h - FILLET_R;          // where the top fillet band starts
const TANGENT_X = HW - CORNER_R;             // straight-edge extents (corner arcs beyond)
const TANGENT_Z = HD - CORNER_R;

const CURVE_SEGS = 12;                       // Shape arc subdivision
const ARC_SEGS = 16;                         // sweep samples per corner quadrant
const FILLET_SEGS = 8;                       // sweep samples across the fillet quarter-round
const BEVEL_SEGS = 4;

const SEAM = 0.05 * MM;                      // offset that keeps abutting coplanar faces apart
const DECK_DROP = 0.02 * MM;                 // deck top sits a hair under the crown top (no z-fight)
const DECK_BEVEL = 0.3 * MM;                 // deck edge / keyboard-well lip / trackpad lip fillet
const DECK_INSET = FILLET_R - 0.4 * MM;      // deck contour tucked 0.4 mm inside the crown
const DECK_TOP = BASE.h - DECK_DROP;
const DECK_BOTTOM = DECK_TOP - BASE.deckT;

const NOTCH_X = HINGE.xR + HINGE.length / 2 + 2 * MM;                  // rear cut-out half width
const DECK_NOTCH_X = NOTCH_X + SEAM;
const NOTCH_FRONT = VENT_ANTENNA_BAR.z + VENT_ANTENNA_BAR.d / 2;        // deck resumes here
const NOTCH_FLOOR_TOP = VENT_ANTENNA_BAR.y - VENT_ANTENNA_BAR.h / 2;    // vent bar sits on the floor

const WELL_MARGIN = 0.6 * MM;                // clearance around the key zone
const WELL_LIP = 1.0 * MM;                   // deck strip between the notch and the well
const WELL_R = 2 * MM;
const WELL = Object.freeze({
  x0: KEYBOARD.x0 - WELL_MARGIN, x1: KEYBOARD.x1 + WELL_MARGIN,
  z0: NOTCH_FRONT + WELL_LIP, z1: KEYBOARD.z1 + WELL_MARGIN,
});
const WELL_FLOOR_T = 0.6 * MM;
const WELL_FLOOR_OVERLAP = 0.6 * MM;         // floor plate runs under the deck edge

const PAD_CLEAR = 0.25 * MM;
const PAD_R = 2.5 * MM;
const PORT_CLEAR = 0.3 * MM;
const PORT_R = 1 * MM;

const BOTTOM_BEVEL = 0.4 * MM;
const SCREW_R = 1.7 * MM;
const SCREW_H = 0.3 * MM;
const SCREW_PROUD = 0.15 * MM;
const SCREW_STAR_R = 0.9 * MM;
const SCREW_STAR_T = 0.12 * MM;
const SCREW_EDGE = 9 * MM;
const SCREW_SIDE = 7 * MM;
const SCREWS = Object.freeze([
  [-(HW - SCREW_EDGE), -(HD - SCREW_EDGE)], [HW - SCREW_EDGE, -(HD - SCREW_EDGE)],
  [-(HW - SCREW_EDGE), HD - SCREW_EDGE], [HW - SCREW_EDGE, HD - SCREW_EDGE],
  [-(HW - SCREW_SIDE), -20 * MM], [HW - SCREW_SIDE, -20 * MM],
  [-(HW - SCREW_SIDE), 45 * MM], [HW - SCREW_SIDE, 45 * MM],
]);

const FOOT_EDGE_R = 0.5 * MM;
const FOOT_SINK = 0.1 * MM;                  // foot top buried in the plate

const HINGE_COVER_LEN = HINGE.length * 0.7;
const HINGE_COVER_D = HINGE.radius * 1.5;
const HINGE_COVER_R = 0.7 * MM;

const VENT_R = 0.8 * MM;
const SLOT_W = 0.8 * MM;
const SLOT_H = 3.6 * MM;
const SLOT_D = 0.3 * MM;
const SLOT_PITCH = 2.4 * MM;
const SLOT_MARGIN = 8 * MM;

const GRAIN_REPEAT = 24;                     // UVs are metres; 256 px / 24 → ~0.16 mm grain
const SHADOW_SPREAD = 1.5;
const SHADOW_Y = -0.5 * MM;
const SHADOW_OPACITY = 0.55;
const SHADOW_FADE_START = 0.1;               // explode t where the shadow starts to fade
const SHADOW_FADE_SPAN = 0.15;

/* ---------------------------------------------------------------- module-scope materials */

let anodized = null;
let hingeSteel = null;
let ventSlotMat = null;
let shadowMat = null;
let shadowMesh = null;

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

/** Fine anodizing grain: linear roughness multiplier in [0.8, 1]. */
function grainTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  const img = g.createImageData(size, size);
  const rnd = seeded(41);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 205 + Math.floor(rnd() * 51);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(GRAIN_REPEAT, GRAIN_REPEAT);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Soft rounded-rect blob, black with alpha falloff, for the contact shadow. */
function shadowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  const inset = size / (2 * SHADOW_SPREAD);
  const x0 = size / 2 - inset, y0 = size / 2 - inset, w = inset * 2, h = inset * 2, r = inset * 0.12;
  g.filter = 'blur(14px)';
  g.fillStyle = 'rgba(0,0,0,1)';
  g.beginPath();
  g.roundRect(x0 + 2, y0 + 2, w - 4, h - 4, r);
  g.fill();
  g.filter = 'blur(4px)';
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.beginPath();
  g.roundRect(x0 + 6, y0 + 6, w - 12, h - 12, r);
  g.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function ensureMaterials(mats) {
  if (anodized) return;
  anodized = new THREE.MeshPhysicalMaterial({
    name: 'anodizedSpaceBlack',
    color: mats.aluminium.color.clone(),
    metalness: 0.85,
    roughness: 0.42,
    roughnessMap: grainTexture(),
    anisotropy: 0.35,
    anisotropyRotation: Math.PI / 2,
    clearcoat: 0.05,
    clearcoatRoughness: 0.4,
  });
  // Gunmetal, not chrome: the visible hinge barrel on a Space Black machine is dark. Same finish as mats.steel otherwise.
  hingeSteel = new THREE.MeshStandardMaterial({ name: 'hingeSteel', color: 0x3d3f44, metalness: 1, roughness: mats.steel.roughness });
  ventSlotMat = new THREE.MeshStandardMaterial({ name: 'ventSlot', color: 0x000000, roughness: 1, metalness: 0 });
  shadowMat = new THREE.MeshBasicMaterial({
    name: 'contactShadow', color: 0x000000, map: shadowTexture(), transparent: true, opacity: SHADOW_OPACITY, depthWrite: false,
  });
}

/* ---------------------------------------------------------------- 2D helpers (Shape / Path) */

/** Rounded rectangle drawn into a Shape or Path. An optional rear notch cuts in from the z0 edge. */
function drawRoundedRect(target, x0, z0, x1, z1, r, notch = null) {
  target.moveTo(x0 + r, z0);
  if (notch) {
    target.lineTo(-notch.x, z0);
    target.lineTo(-notch.x, notch.zFront);
    target.lineTo(notch.x, notch.zFront);
    target.lineTo(notch.x, z0);
  }
  target.lineTo(x1 - r, z0);
  target.absarc(x1 - r, z0 + r, r, -Math.PI / 2, 0, false);
  target.lineTo(x1, z1 - r);
  target.absarc(x1 - r, z1 - r, r, 0, Math.PI / 2, false);
  target.lineTo(x0 + r, z1);
  target.absarc(x0 + r, z1 - r, r, Math.PI / 2, Math.PI, false);
  target.lineTo(x0, z0 + r);
  target.absarc(x0 + r, z0 + r, r, Math.PI, Math.PI * 1.5, false);
  target.closePath();
  return target;
}

function roundedRectShape(x0, z0, x1, z1, r, notch = null) {
  return drawRoundedRect(new THREE.Shape(), x0, z0, x1, z1, r, notch);
}

function roundedRectPath(x0, z0, x1, z1, r) {
  return drawRoundedRect(new THREE.Path(), x0, z0, x1, z1, r);
}

function polygonShape(points) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) s.lineTo(points[i][0], points[i][1]);
  s.closePath();
  return s;
}

/** Five-lobe pentalobe recess outline (a rounded star). */
function pentalobeShape(rOuter) {
  const s = new THREE.Shape();
  const rInner = rOuter * 0.55;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}

/* ---------------------------------------------------------------- extrude helpers */

function extrudeOptions(depth, bevel) {
  return {
    depth, curveSegments: CURVE_SEGS, bevelEnabled: bevel > 0,
    bevelThickness: bevel, bevelSize: bevel, bevelOffset: 0, bevelSegments: BEVEL_SEGS,
  };
}

/** Shape in (x, z) extruded downward: top face at yTop, total height depth + 2·bevel. */
function extrudeY(shape, depth, yTop, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shape, extrudeOptions(depth, bevel));
  g.rotateX(Math.PI / 2);           // shape y → world z, extrusion +z → world −y
  g.translate(0, yTop - bevel, 0);
  return g;
}

/** Shape in (z, y) extruded along −x by t; xOuter is the face at the larger x. */
function extrudeX(shape, t, xOuter) {
  const g = new THREE.ExtrudeGeometry(shape, extrudeOptions(t, 0));
  g.rotateY(-Math.PI / 2);          // shape x → world z, extrusion +z → world −x
  g.translate(xOuter, 0, 0);
  return g;
}

/** Shape in (x, y) extruded along +z by t starting at zStart. */
function extrudeZ(shape, t, zStart) {
  const g = new THREE.ExtrudeGeometry(shape, extrudeOptions(t, 0));
  g.translate(0, 0, zStart);
  return g;
}

function box(w, h, d, x, y, z, radius = 0) {
  const g = radius > 0 ? new RoundedBoxGeometry(w, h, d, 3, radius) : new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g.index ? g.toNonIndexed() : g;
}

/* ---------------------------------------------------------------- rim outline + profile sweep */

function linePiece(x0, z0, x1, z1, nx, nz) {
  return { arc: false, x0, z0, x1, z1, nx, nz };
}
function arcPiece(cx, cz, r, a0, a1) {
  return { arc: true, cx, cz, r, a0, a1 };
}

/**
 * The rim of the base as pieces, starting on the rear edge at xStart heading +x, around the
 * right, front and left edges, ending on the rear edge at xEnd. Index 1/3/5/7 are the corners.
 */
function rimPieces(xStart, xEnd) {
  const sx = TANGENT_X, sz = TANGENT_Z, r = CORNER_R;
  return [
    linePiece(xStart, -HD, sx, -HD, 0, -1),
    arcPiece(sx, -sz, r, -Math.PI / 2, 0),
    linePiece(HW, -sz, HW, sz, 1, 0),
    arcPiece(sx, sz, r, 0, Math.PI / 2),
    linePiece(sx, HD, -sx, HD, 0, 1),
    arcPiece(-sx, sz, r, Math.PI / 2, Math.PI),
    linePiece(-HW, sz, -HW, -sz, -1, 0),
    arcPiece(-sx, -sz, r, Math.PI, Math.PI * 1.5),
    linePiece(-sx, -HD, xEnd, -HD, 0, -1),
  ];
}

/** Sample pieces into path points { x, z, nx, nz, u } (outward normal, arc length). */
function samplePath(pieces) {
  const pts = [];
  const push = (x, z, nx, nz) => {
    const last = pts[pts.length - 1];
    if (last && Math.abs(last.x - x) < 1e-9 && Math.abs(last.z - z) < 1e-9) return;
    const u = last ? last.u + Math.hypot(x - last.x, z - last.z) : 0;
    pts.push({ x, z, nx, nz, u });
  };
  for (const p of pieces) {
    if (!p.arc) {
      push(p.x0, p.z0, p.nx, p.nz);
      push(p.x1, p.z1, p.nx, p.nz);
    } else {
      for (let k = 0; k <= ARC_SEGS; k++) {
        const a = p.a0 + (p.a1 - p.a0) * (k / ARC_SEGS);
        push(p.cx + p.r * Math.cos(a), p.cz + p.r * Math.sin(a), Math.cos(a), Math.sin(a));
      }
    }
  }
  return pts;
}

/** Profile point: s = inward offset from the rim, y = height, (ns, ny) = section normal. */
function pt(s, y, ns, ny) {
  return { s, y, ns, ny };
}

/** Fillet crown: quarter-round from the wall top to the deck top, with a lip under the deck edge. */
function crownProfile() {
  const r = FILLET_R, h = BASE.h, y0 = CROWN_Y0, t = BASE.wallT, lip = h - BASE.deckT;
  const pts = [];
  for (let k = 0; k <= FILLET_SEGS; k++) {
    const a = Math.PI - (Math.PI / 2) * (k / FILLET_SEGS);
    pts.push(pt(r + r * Math.cos(a), y0 + r * Math.sin(a), Math.cos(a), Math.sin(a)));
  }
  pts.push(pt(r, h, 1, 0), pt(r, lip, 1, 0));
  pts.push(pt(r, lip, 0, -1), pt(t, lip, 0, -1));
  pts.push(pt(t, lip, 1, 0), pt(t, y0, 1, 0));
  pts.push(pt(t, y0, 0, -1), pt(0, y0, 0, -1));
  return pts;
}

/** Plain wall section between y0 and y1, thickness t. */
function wallProfile(y0, y1, t) {
  return [
    pt(0, y0, -1, 0), pt(0, y1, -1, 0), pt(0, y1, 0, 1), pt(t, y1, 0, 1),
    pt(t, y1, 1, 0), pt(t, y0, 1, 0), pt(t, y0, 0, -1), pt(0, y0, 0, -1),
  ];
}

/** Flip any triangle whose geometric normal disagrees with its vertex normals. */
function fixWinding(pos, nrm, uv) {
  for (let i = 0; i < pos.length; i += 9) {
    const ax = pos[i + 3] - pos[i], ay = pos[i + 4] - pos[i + 1], az = pos[i + 5] - pos[i + 2];
    const bx = pos[i + 6] - pos[i], by = pos[i + 7] - pos[i + 1], bz = pos[i + 8] - pos[i + 2];
    const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    const dot = cx * (nrm[i] + nrm[i + 3] + nrm[i + 6]) + cy * (nrm[i + 1] + nrm[i + 4] + nrm[i + 7]) + cz * (nrm[i + 2] + nrm[i + 5] + nrm[i + 8]);
    if (dot >= 0) continue;
    for (let k = 0; k < 3; k++) {
      const a = i + 3 + k, b = i + 6 + k;
      [pos[a], pos[b]] = [pos[b], pos[a]];
      [nrm[a], nrm[b]] = [nrm[b], nrm[a]];
    }
    const t = (i / 9) * 6;
    for (let k = 0; k < 2; k++) {
      const a = t + 2 + k, b = t + 4 + k;
      [uv[a], uv[b]] = [uv[b], uv[a]];
    }
  }
}

/** Sweep a closed section profile along a sampled path; open ends get flat caps. */
function sweep(path, profile, caps = true) {
  const pos = [], nrm = [], uv = [];
  const segs = [];
  let v = 0;
  for (let j = 0; j < profile.length; j++) {
    const a = profile[j], b = profile[(j + 1) % profile.length];
    const len = Math.hypot(b.s - a.s, b.y - a.y);
    if (len < 1e-9) continue;
    segs.push({ a, b, v0: v, v1: v + len });
    v += len;
  }
  const vert = (p, q, vv, n) => {
    pos.push(p.x - q.s * p.nx, q.y, p.z - q.s * p.nz);
    if (n) nrm.push(n[0], n[1], n[2]);
    else {
      const x = -q.ns * p.nx, y = q.ny, z = -q.ns * p.nz;
      const l = Math.hypot(x, y, z) || 1;
      nrm.push(x / l, y / l, z / l);
    }
    uv.push(n ? q.s : p.u, n ? q.y : vv);
  };
  for (let i = 0; i < path.length - 1; i++) {
    const p = path[i], q = path[i + 1];
    for (const { a, b, v0, v1 } of segs) {
      vert(p, a, v0); vert(q, a, v0); vert(q, b, v1);
      vert(p, a, v0); vert(q, b, v1); vert(p, b, v1);
    }
  }
  if (caps && path.length > 1) {
    const poly = [];
    for (const q of profile) {
      const last = poly[poly.length - 1];
      if (last && Math.abs(last.s - q.s) < 1e-9 && Math.abs(last.y - q.y) < 1e-9) continue;
      poly.push(q);
    }
    if (poly.length > 2 && Math.abs(poly[0].s - poly[poly.length - 1].s) < 1e-9 && Math.abs(poly[0].y - poly[poly.length - 1].y) < 1e-9) poly.pop();
    const tris = THREE.ShapeUtils.triangulateShape(poly.map((q) => new THREE.Vector2(q.s, q.y)), []);
    const capAt = (p, o) => {                       // cap normal points from the neighbour out through the end
      const tx = p.x - o.x, tz = p.z - o.z, l = Math.hypot(tx, tz) || 1;
      const n = [tx / l, 0, tz / l];
      for (const [i0, i1, i2] of tris) {
        vert(p, poly[i0], 0, n); vert(p, poly[i1], 0, n); vert(p, poly[i2], 0, n);
      }
    };
    capAt(path[0], path[1]);
    capAt(path[path.length - 1], path[path.length - 2]);
  }
  fixWinding(pos, nrm, uv);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/* ---------------------------------------------------------------- part geometry */

function merged(parts, useGroups) {
  const g = mergeGeometries(parts, useGroups);
  if (!g) throw new Error('chassis: mergeGeometries failed (attribute mismatch)');
  for (const p of parts) p.dispose();
  return g;
}

/** Left/right wall: a (z, y) rectangle with rounded port holes, extruded through the wall thickness. */
function sideWall(ports, xOuter) {
  const s = polygonShape([[-TANGENT_Z, WALL_Y0], [TANGENT_Z, WALL_Y0], [TANGENT_Z, CROWN_Y0], [-TANGENT_Z, CROWN_Y0]]);
  for (const [z, w, h] of Object.values(ports)) {
    const hw = w / 2 + PORT_CLEAR, hh = h / 2 + PORT_CLEAR;
    s.holes.push(roundedRectPath(z - hw, PORT_Y - hh, z + hw, PORT_Y + hh, Math.min(PORT_R, hh - SEAM)));
  }
  return extrudeX(s, BASE.wallT, xOuter);
}

function topCaseGeometry() {
  const parts = [];
  const rim = rimPieces(NOTCH_X, -NOTCH_X);
  parts.push(sweep(samplePath(rim), crownProfile(), true));
  const wall = wallProfile(WALL_Y0, CROWN_Y0, BASE.wallT);
  for (const i of [1, 3, 5, 7]) parts.push(sweep(samplePath([rim[i]]), wall, false));

  parts.push(sideWall(PORTS.left, -HW + BASE.wallT));
  parts.push(sideWall(PORTS.right, HW));
  parts.push(extrudeZ(polygonShape([
    [-TANGENT_X, WALL_Y0], [TANGENT_X, WALL_Y0], [TANGENT_X, CROWN_Y0], [NOTCH_X, CROWN_Y0],
    [NOTCH_X, NOTCH_FLOOR_TOP], [-NOTCH_X, NOTCH_FLOOR_TOP], [-NOTCH_X, CROWN_Y0], [-TANGENT_X, CROWN_Y0],
  ]), BASE.wallT, -HD));
  parts.push(extrudeZ(polygonShape([
    [-TANGENT_X, WALL_Y0], [TANGENT_X, WALL_Y0], [TANGENT_X, CROWN_Y0], [-TANGENT_X, CROWN_Y0],
  ]), BASE.wallT, HD - BASE.wallT));

  // Rear notch enclosure: inner wall behind the deck edge, side plates under the corner posts, floor.
  const t = BASE.wallT;
  const innerTop = DECK_BOTTOM + 2 * SEAM;
  const zRearInner = -HD + t;
  const yMid = (innerTop + WALL_Y0) / 2, hWall = innerTop - WALL_Y0;
  parts.push(box(NOTCH_X * 2, hWall, t, 0, yMid, NOTCH_FRONT - t / 2 - SEAM));
  for (const sx of [-1, 1]) {
    parts.push(box(t, hWall, NOTCH_FRONT - zRearInner, sx * (NOTCH_X + 2 * SEAM + t / 2), yMid, (NOTCH_FRONT + zRearInner) / 2));
  }
  const floorTop = NOTCH_FLOOR_TOP - SEAM;
  parts.push(box((NOTCH_X + t) * 2, floorTop - WALL_Y0, NOTCH_FRONT - zRearInner, 0, (floorTop + WALL_Y0) / 2, (NOTCH_FRONT + zRearInner) / 2));

  // Deck with the keyboard well and trackpad openings; every edge (outer, notch, lips) bevelled.
  const deck = roundedRectShape(-HW + DECK_INSET, -HD + DECK_INSET, HW - DECK_INSET, HD - DECK_INSET, CORNER_R - DECK_INSET, { x: DECK_NOTCH_X, zFront: NOTCH_FRONT });
  deck.holes.push(roundedRectPath(WELL.x0, WELL.z0, WELL.x1, WELL.z1, WELL_R));
  const px0 = TRACKPAD.cx - TRACKPAD.w / 2 - PAD_CLEAR, px1 = TRACKPAD.cx + TRACKPAD.w / 2 + PAD_CLEAR;
  const pz0 = TRACKPAD.cz - TRACKPAD.d / 2 - PAD_CLEAR, pz1 = TRACKPAD.cz + TRACKPAD.d / 2 + PAD_CLEAR;
  deck.holes.push(roundedRectPath(px0, pz0, px1, pz1, PAD_R));
  parts.push(extrudeY(deck, BASE.deckT - 2 * DECK_BEVEL, DECK_TOP, DECK_BEVEL));

  const o = WELL_FLOOR_OVERLAP;
  parts.push(extrudeY(roundedRectShape(WELL.x0 - o, WELL.z0 - o, WELL.x1 + o, WELL.z1 + o, WELL_R + o), WELL_FLOOR_T, BASE.h - KEYBOARD.wellDepth, 0));
  return merged(parts, false);
}

/** Plate + screw heads + pentalobe recesses as three material groups: [anodized, steel, packageBlack]. */
function bottomCaseGeometry() {
  const plate = extrudeY(roundedRectShape(-HW, -HD, HW, HD, CORNER_R), BASE.bottomPlateT - 2 * BOTTOM_BEVEL, BASE.bottomPlateT, BOTTOM_BEVEL);
  const heads = [], stars = [];
  const headBottom = SCREW_PROUD - SCREW_H;
  const starSink = 0.03 * MM;
  for (const [x, z] of SCREWS) {
    const head = new THREE.CylinderGeometry(SCREW_R, SCREW_R, SCREW_H, 20).toNonIndexed();
    head.translate(x, headBottom + SCREW_H / 2, z);
    heads.push(head);
    const star = new THREE.ExtrudeGeometry(pentalobeShape(SCREW_STAR_R), extrudeOptions(SCREW_STAR_T, 0));
    star.rotateX(Math.PI / 2);
    star.translate(x, headBottom - starSink + SCREW_STAR_T, z);
    stars.push(star);
  }
  return merged([plate, merged(heads, false), merged(stars, false)], true);
}

/** Steel capsule barrel along X plus an anodized pedestal down to the notch floor: groups [hingeSteel, anodized]. */
function hingeGeometry() {
  const barrel = new THREE.CapsuleGeometry(HINGE.radius, HINGE.length - 2 * HINGE.radius, 6, 24).toNonIndexed();
  barrel.rotateZ(Math.PI / 2);
  const coverH = HINGE.y - NOTCH_FLOOR_TOP + 2 * SEAM;
  const cover = box(HINGE_COVER_LEN, coverH, HINGE_COVER_D, 0, -coverH / 2, 0, HINGE_COVER_R);
  return merged([barrel, cover], true);
}

function ventBar(mats) {
  const V = VENT_ANTENNA_BAR;
  const bar = new THREE.Mesh(new RoundedBoxGeometry(V.w, V.h, V.d, 3, VENT_R), mats.plastic);
  bar.position.set(0, V.y, V.z);
  const n = Math.floor((V.w - 2 * SLOT_MARGIN) / SLOT_PITCH) + 1;
  const slots = new THREE.InstancedMesh(new THREE.BoxGeometry(SLOT_W, SLOT_H, SLOT_D), ventSlotMat, n);
  const m = new THREE.Matrix4();
  const x0 = -((n - 1) * SLOT_PITCH) / 2;
  for (let i = 0; i < n; i++) {
    m.makeTranslation(x0 + i * SLOT_PITCH, 0, -V.d / 2);
    slots.setMatrixAt(i, m);
  }
  slots.instanceMatrix.needsUpdate = true;
  bar.add(slots);                              // untagged, unnamed child: part geometry, not an effect
  return bar;
}

/** Rubber disc with a rounded bottom edge, y ∈ [−FEET.h, FOOT_SINK]. */
function footGeometry() {
  const R = FEET.radius, h = FEET.h, f = FOOT_EDGE_R;
  const pts = [new THREE.Vector2(0, -h), new THREE.Vector2(R - f, -h)];
  for (let k = 1; k <= 6; k++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (k / 6);
    pts.push(new THREE.Vector2(R - f + f * Math.cos(a), -h + f + f * Math.sin(a)));
  }
  pts.push(new THREE.Vector2(R, FOOT_SINK), new THREE.Vector2(0, FOOT_SINK));
  return new THREE.LatheGeometry(pts, 40);
}

function contactShadow() {
  const geo = new THREE.PlaneGeometry(BASE.w * SHADOW_SPREAD, BASE.d * SHADOW_SPREAD);
  geo.rotateX(-Math.PI / 2);
  shadowMesh = new THREE.Mesh(geo, shadowMat);
  shadowMesh.position.y = SHADOW_Y;
  shadowMesh.userData.effect = true;
  shadowMesh.raycast = () => {};
  return shadowMesh;
}

/* ---------------------------------------------------------------- module interface */

export function build(parent, chip, ctx) {
  const { mats, registry } = ctx;
  ensureMaterials(mats);
  const g = ctx.tag(new THREE.Group(), NAME);
  parent.add(g);

  g.add(ctx.tag(new THREE.Mesh(topCaseGeometry(), anodized), 'TopCase'));
  g.add(ctx.tag(new THREE.Mesh(bottomCaseGeometry(), [anodized, mats.steel, mats.packageBlack]), 'BottomCase'));

  const hinge = hingeGeometry();
  for (const [key, x] of [['HingeL', HINGE.xL], ['HingeR', HINGE.xR]]) {
    const m = new THREE.Mesh(hinge, [hingeSteel, anodized]);
    m.position.set(x, HINGE.y, HINGE.z);
    g.add(ctx.tag(m, key));
  }

  g.add(ctx.tag(ventBar(mats), 'VentAntennaBar'));

  const foot = footGeometry();
  const n = registry.instanceCount('Feet', chip) ?? FEET.positions.length;
  for (let i = 0; i < n; i++) {
    const [x, z] = FEET.positions[i % FEET.positions.length];
    const m = new THREE.Mesh(foot, mats.rubber);
    m.position.set(x, 0, z);
    g.add(ctx.tag(m, 'Feet', i));
  }

  g.add(contactShadow());
  return g;
}

/** Contact shadow fades once the bottom case starts to drop. Zero allocations. */
export function update(group, state) {
  if (!shadowMat) return;
  const t = state.explode || 0;
  const k = t <= SHADOW_FADE_START ? 1 : Math.max(0, 1 - (t - SHADOW_FADE_START) / SHADOW_FADE_SPAN);
  const o = SHADOW_OPACITY * k;
  if (o !== shadowMat.opacity) {
    shadowMat.opacity = o;
    shadowMesh.visible = o > 0.002;
  }
}

export const explodeOffsets = {
  BottomCase: [0, EXPLODE.bottomCase, 0],
  Feet: (i) => [0, EXPLODE.feet, 0],
};
