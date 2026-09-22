/**
 * src/scene/logicboard.js — the LogicBoard subassembly. Everything on the board except the SoC package,
 * which the soc lane attaches under this group after build().
 *
 *   LogicBoard (group, world origin; explodes +Y as one piece)
 *     PCB                      extruded plan-view outline (rounded rectangle with a scallop around each
 *                              fan), hi-res procedural solder-mask texture top and bottom (gold pads,
 *                              copper traces, vias, silkscreen, baked contact shadows), dark FR4 edge.
 *                              One untagged InstancedMesh child of ≤ 300 passives on the top face.
 *     NAND[i] PMIC[i] ThunderboltRetimer[i] WirelessModule NORFlash
 *                              filleted black packages with a lighter laser-marked top plate; one mesh
 *                              each (material groups), on the top face at BOARD_PARTS.
 *     USBCBoardL/R MagSafeBoard AudioBoard
 *                              small pcb plates at the main board's Y with one or two packages merged in.
 *     Ports (group)            TB5[i] HDMI SDXC HeadphoneJack MagSafe3 — steel receptacles whose rim face
 *                              sits on the side wall, a dark inside-out cavity behind the opening, and
 *                              contacts (USB-C/HDMI tongue, MagSafe pins).
 *
 * Every dimension comes from src/dims.js; the few this module needs beyond dims are named constants
 * below. Materials beyond ctx.mats are created once (lazily, first build) at module scope, as is the
 * seeded passive layout so the texture's pads and the 3D bodies agree. Nothing animates (no update)
 * and nothing depends on the chip (no applyChip).
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MM, BASE, LOGIC_BOARD, BOARD_PARTS, SMALL_BOARDS, PORTS, PORT_Y, EXPLODE, FAN, SOC } from '../dims.js';
import { parseNodeName } from '../parts/registry.js';

export const NAME = 'LogicBoard';

/* ---------------------------------------------------------------- derived dimensions (named, from dims) */

const B = LOGIC_BOARD;
const BOARD_W = B.x1 - B.x0;
const BOARD_D = B.z1 - B.z0;
const BOARD_CX = (B.x0 + B.x1) / 2;
const BOARD_CZ = (B.z0 + B.z1) / 2;
const BOARD_TOP = B.y + B.t / 2;

/** Fan scallops: the plate edge keeps this much air beyond the fan blade radius. */
const PCB_FAN_CLEARANCE = 5 * MM;
const PCB_BITE_R = FAN.radius + PCB_FAN_CLEARANCE;
const PCB_EDGE_MARGIN = 1.5 * MM; // passives stay this far inside the outline
const CURVE_SEGMENTS = 16;

const PACKAGE_EDGE_R = 0.18 * MM; // moulded package edge fillet
const PACKAGE_TOP_INSET = 0.4 * MM; // the lighter marked plate sits inside the fillet
const PACKAGE_TOP_T = 0.04 * MM;
const PACKAGE_KEEPOUT = 1.2 * MM; // passives stay this far from a package edge
const SOC_KEEPOUT_W = 2 * SOC.dieSideMax + 2 * (SOC.lpddr.gapFromDie + SOC.lpddr.w + SOC.spreaderMargin) + 6 * MM;
const SOC_KEEPOUT_D = Math.max(2 * SOC.dieSideMax, 2 * (SOC.lpddr.d + SOC.lpddr.gapFromDie)) + 2 * SOC.spreaderMargin + 6 * MM;
const MOUNT_HOLE_R = 1.6 * MM;
const MOUNT_HOLE_INSET = 4.5 * MM; // hole centre from the board corner edges

const SMALL_BOARD_R = 1.5 * MM;

const PORT_RIM = 0.7 * MM; // steel rim around the opening
const PORT_LIP = 0.12 * MM; // rim face sits this far proud of the wall (no z-fight with a solid wall)
const PORT_BEVEL = 0.25 * MM; // rolled entry edge
const PORT_CAVITY_INSET = PORT_BEVEL + 0.03 * MM;
const PORT_TONGUE_START = 1.8 * MM; // contact tongue begins this far behind the face
const PORT_PIN_PITCH = 1.7 * MM; // MagSafe pogo pins

/** [w along x, d along z, h, weight] mm — 0402, 0603, 0805, 1210 chip parts, a QFN and a board-to-board connector. */
const PASSIVE_TYPES = [
  [1.0, 0.5, 0.5, 34], [1.6, 0.8, 0.8, 30], [2.0, 1.25, 1.0, 18], [3.2, 2.5, 1.6, 6], [3.0, 3.0, 0.8, 5], [6.0, 2.2, 0.9, 4],
].map(([w, d, h, weight]) => ({ w: w * MM, d: d * MM, h: h * MM, weight }));
const PASSIVE_TINTS = [[0.80, 0.72, 0.60], [0.60, 0.56, 0.52], [0.26, 0.26, 0.28], [0.44, 0.40, 0.36], [0.70, 0.70, 0.74]];
const PASSIVE_COUNT = 280;
const PASSIVE_GAP = 0.3 * MM;
const PASSIVE_BODY = 0x6e6e6e; // × instance tint = body colour

const PORT_KIND = Object.freeze({ TB5: 'pill', MagSafe3: 'pill', HDMI: 'hdmi', SDXC: 'slot', HeadphoneJack: 'round' });
const PORT_DETAIL = Object.freeze({ TB5: 'tongue', HDMI: 'tongue', MagSafe3: 'pins' });
/** Cavity floor depth as a fraction of PORTS.depth. */
const PORT_FLOOR = Object.freeze({ TB5: 0.62, HDMI: 0.7, SDXC: 0.85, HeadphoneJack: 0.85, MagSafe3: 0.22 });

/* ---------------------------------------------------------------- small helpers */

/** mulberry32 — the layout and textures must be identical on every boot. */
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

/** Rounded rectangle centred at (cx, cy) appended to a Shape or Path. */
function roundedRect(path, cx, cy, w, h, r) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  r = Math.min(r, w / 2, h / 2);
  path.moveTo(x0 + r, y0);
  path.lineTo(x1 - r, y0);
  path.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x1, y1 - r);
  path.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  path.lineTo(x0 + r, y1);
  path.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(x0, y0 + r);
  path.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  path.closePath();
  return path;
}

/** Polygon with every corner rounded by a quadratic fillet of radius ≈ r. */
function roundedPolygon(path, pts, r) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [px, py] = pts[i];
    const [ax, ay] = pts[(i + n - 1) % n];
    const [bx, by] = pts[(i + 1) % n];
    const la = Math.hypot(ax - px, ay - py), lb = Math.hypot(bx - px, by - py);
    const ra = Math.min(r, la / 2, lb / 2);
    const sx = px + ((ax - px) / la) * ra, sy = py + ((ay - py) / la) * ra;
    const ex = px + ((bx - px) / lb) * ra, ey = py + ((by - py) / lb) * ra;
    if (i === 0) path.moveTo(sx, sy);
    else path.lineTo(sx, sy);
    path.quadraticCurveTo(px, py, ex, ey);
  }
  path.closePath();
  return path;
}

/**
 * Extrude a plan-view shape (shape x = world x, shape y = −world z) into a horizontal plate of thickness t
 * with its local origin at world (cx, 0, cz). Caps are material group 0, walls group 1.
 */
function plate(shape, t, cx, cz) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: CURVE_SEGMENTS });
  g.rotateX(-Math.PI / 2); // (x, y, z) → (x, z, −y)
  g.translate(-cx, -t / 2, -cz);
  return g;
}

/** Planar UVs from local x/z for a cap group: u = x·su + ou, v = −z·sv + ov. */
function planarUV(g, su, ou, sv, ov, groupIndex = 0) {
  const grp = g.groups[groupIndex] ?? { start: 0, count: g.attributes.position.count };
  const p = g.attributes.position, uv = g.attributes.uv;
  const end = grp.count === Infinity ? p.count : grp.start + grp.count;
  for (let i = grp.start; i < end; i++) uv.setXY(i, p.getX(i) * su + ou, -p.getZ(i) * sv + ov);
  uv.needsUpdate = true;
}

/**
 * Concatenate geometries into one non-indexed geometry with material groups. parts: [{ g, mat }] where
 * mat is one material index for the whole geometry, or an array mapping the geometry's own group
 * materialIndex → index. Consecutive groups with the same index coalesce. Inputs are disposed.
 */
function mergeParts(parts) {
  const chunks = parts.map(({ g, mat }) => {
    const ng = g.index ? g.toNonIndexed() : g;
    if (ng !== g) g.dispose();
    return { ng, mat };
  });
  let total = 0;
  for (const c of chunks) total += c.ng.attributes.position.count;
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2);
  const out = new THREE.BufferGeometry();
  let off = 0;
  let last = null;
  for (const { ng, mat } of chunks) {
    const n = ng.attributes.position.count;
    pos.set(ng.attributes.position.array, off * 3);
    nor.set(ng.attributes.normal.array, off * 3);
    if (ng.attributes.uv) uv.set(ng.attributes.uv.array, off * 2);
    const groups = ng.groups.length ? ng.groups : [{ start: 0, count: n, materialIndex: 0 }];
    for (const grp of groups) {
      const count = grp.count === Infinity ? n - grp.start : grp.count;
      const materialIndex = Array.isArray(mat) ? mat[grp.materialIndex] : mat;
      if (last && last.materialIndex === materialIndex && last.start + last.count === off + grp.start) last.count += count;
      else {
        out.addGroup(off + grp.start, count, materialIndex);
        last = out.groups[out.groups.length - 1];
      }
    }
    off += n;
    ng.dispose();
  }
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

/** Turn a closed geometry inside out (swap winding, negate normals): only its far walls render — a cavity. */
function flipInside(g) {
  const ng = g.index ? g.toNonIndexed() : g;
  if (ng !== g) g.dispose();
  const p = ng.attributes.position.array, n = ng.attributes.normal.array, uv = ng.attributes.uv?.array;
  for (let i = 0; i < p.length; i += 9) {
    for (let k = 0; k < 3; k++) {
      let t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t;
      t = n[i + 3 + k]; n[i + 3 + k] = n[i + 6 + k]; n[i + 6 + k] = t;
    }
    if (uv) {
      const j = (i / 9) * 6;
      for (let k = 0; k < 2; k++) { const t = uv[j + 2 + k]; uv[j + 2 + k] = uv[j + 4 + k]; uv[j + 4 + k] = t; }
    }
  }
  for (let i = 0; i < n.length; i++) n[i] = -n[i];
  return ng;
}

/* ---------------------------------------------------------------- textures and materials, created once */

const TEX_W = 2048; // main board colour map width; every board texture shares its texel density
const PX_PER_M = TEX_W / BOARD_W;
const ORM_SCALE = 0.5; // roughness/metalness map at half resolution
const MAIN_BOX = Object.freeze({ x0: B.x0, z0: B.z0, w: BOARD_W, d: BOARD_D });
/** One generic face region shared by the four small boards, sized to the largest of them. */
const SMALL_BOX = (() => {
  const specs = Object.values(SMALL_BOARDS).filter(Array.isArray);
  return Object.freeze({ x0: 0, z0: 0, w: Math.max(...specs.map((s) => s[2])), d: Math.max(...specs.map((s) => s[3])) });
})();
const MARK_PX = 256;
const FONT = 'ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

/** Paint palette: colour for the colour map, roughness (G) and metalness (B) for the ORM map. */
const INK = Object.freeze({
  mask: { c: [13, 15, 18], rough: 0.62, metal: 0 },
  maskLight: { c: [24, 27, 31], rough: 0.56, metal: 0 },
  trace: { c: [96, 66, 40], rough: 0.5, metal: 0.05 },
  pad: { c: [216, 178, 86], rough: 0.28, metal: 1 },
  padDim: { c: [150, 118, 54], rough: 0.36, metal: 1 },
  silk: { c: [226, 227, 221], rough: 0.85, metal: 0 },
  hole: { c: [7, 7, 8], rough: 0.8, metal: 0 },
});

function ink(mode, key, alpha = 1) {
  const e = INK[key];
  if (mode === 'color') return `rgba(${e.c[0]},${e.c[1]},${e.c[2]},${alpha})`;
  return `rgba(0,${Math.round(e.rough * 255)},${Math.round(e.metal * 255)},${alpha})`;
}

/** Draw the board face into a 2D context (board mm → px via PX_PER_M). Same routine paints both maps. */
function paintBoard(g, mode, lay, box) {
  const X = (x) => (x - box.x0) * PX_PER_M;
  const Y = (z) => (z - box.z0) * PX_PER_M;
  const S = (m) => m * PX_PER_M;
  const W = box.w * PX_PER_M, H = box.d * PX_PER_M;
  const density = (perMainBoard) => Math.round((perMainBoard * box.w * box.d) / (BOARD_W * BOARD_D));
  const rnd = seeded(41);
  const color = mode === 'color';
  const bigParts = lay.soc ? [...lay.footprints, lay.soc] : lay.footprints;

  g.fillStyle = ink(mode, 'mask');
  g.fillRect(0, 0, W, H);

  // Mottling: the mask is not one flat tone (also drives roughness variation in the ORM map).
  for (let i = 0, n = density(900); i < n; i++) {
    const r = S(0.5 * MM) + rnd() * S(2.5 * MM);
    g.fillStyle = ink(mode, rnd() > 0.5 ? 'maskLight' : 'mask', 0.06);
    g.beginPath();
    g.arc(rnd() * W, rnd() * H, r, 0, Math.PI * 2);
    g.fill();
  }

  // Copper routing under the mask: 45°/90° polylines, faint.
  g.strokeStyle = ink(mode, 'trace', color ? 0.34 : 0.5);
  g.lineWidth = S(0.13 * MM);
  g.lineCap = 'round';
  for (let i = 0, n = density(460); i < n; i++) {
    let x = rnd() * W, y = rnd() * H;
    g.beginPath();
    g.moveTo(x, y);
    const segs = 2 + Math.floor(rnd() * 4);
    for (let s = 0; s < segs; s++) {
      const a = Math.floor(rnd() * 8) * (Math.PI / 4);
      const len = S(3 * MM) + rnd() * S(24 * MM);
      x += Math.cos(a) * len;
      y += Math.sin(a) * len;
      g.lineTo(x, y);
    }
    g.stroke();
  }

  // Vias.
  for (let i = 0, n = density(700); i < n; i++) {
    const x = rnd() * W, y = rnd() * H;
    g.fillStyle = ink(mode, 'padDim', 0.9);
    g.beginPath();
    g.arc(x, y, S(0.2 * MM), 0, Math.PI * 2);
    g.fill();
    g.fillStyle = ink(mode, 'hole');
    g.beginPath();
    g.arc(x, y, S(0.09 * MM), 0, Math.PI * 2);
    g.fill();
  }

  // Package footprints: BGA grid (its rim peeks out beside the body), silkscreen outline, pin-1 dot.
  const grid = (f, pitch, inset, r, key) => {
    g.fillStyle = ink(mode, key, 0.95);
    const nx = Math.floor((f.w - 2 * inset) / pitch), nz = Math.floor((f.d - 2 * inset) / pitch);
    for (let i = 0; i <= nx; i++) {
      for (let j = 0; j <= nz; j++) {
        g.beginPath();
        g.arc(X(f.x - f.w / 2 + inset + i * pitch), Y(f.z - f.d / 2 + inset + j * pitch), S(r), 0, Math.PI * 2);
        g.fill();
      }
    }
  };
  for (const f of bigParts) {
    grid(f, SOC.ballPitch, 0.5 * MM, SOC.ballRadius * 0.9, 'padDim');
    const o = 0.6 * MM;
    g.strokeStyle = ink(mode, 'silk', 0.75);
    g.lineWidth = S(0.15 * MM);
    g.strokeRect(X(f.x - f.w / 2 - o), Y(f.z - f.d / 2 - o), S(f.w + 2 * o), S(f.d + 2 * o));
    g.fillStyle = ink(mode, 'silk', 0.85);
    g.beginPath();
    g.arc(X(f.x - f.w / 2 - o - 0.5 * MM), Y(f.z - f.d / 2 - o - 0.5 * MM), S(0.25 * MM), 0, Math.PI * 2);
    g.fill();
  }

  // Pads under every passive: two end pads, a QFN perimeter, or two rows for a connector.
  g.fillStyle = ink(mode, 'pad');
  for (const p of lay.passives) {
    g.save();
    g.translate(X(p.x), Y(p.z));
    g.rotate(-p.rot);
    if (p.type === 4) {
      const n = Math.max(3, Math.round(p.w / (0.5 * MM)));
      for (let i = 0; i < n; i++) {
        const t = -p.w / 2 + 0.3 * MM + (i * (p.w - 0.6 * MM)) / (n - 1);
        g.fillRect(S(t) - S(0.12 * MM), -S(p.d / 2 + 0.25 * MM), S(0.24 * MM), S(0.5 * MM));
        g.fillRect(S(t) - S(0.12 * MM), S(p.d / 2 - 0.25 * MM), S(0.24 * MM), S(0.5 * MM));
        g.fillRect(-S(p.w / 2 + 0.25 * MM), S(t) - S(0.12 * MM), S(0.5 * MM), S(0.24 * MM));
        g.fillRect(S(p.w / 2 - 0.25 * MM), S(t) - S(0.12 * MM), S(0.5 * MM), S(0.24 * MM));
      }
    } else if (p.type === 5) {
      const n = Math.round(p.w / (0.4 * MM));
      for (let i = 0; i < n; i++) {
        const t = -p.w / 2 + 0.2 * MM + i * 0.4 * MM;
        g.fillRect(S(t) - S(0.09 * MM), -S(p.d / 2 + 0.35 * MM), S(0.18 * MM), S(0.6 * MM));
        g.fillRect(S(t) - S(0.09 * MM), S(p.d / 2 - 0.25 * MM), S(0.18 * MM), S(0.6 * MM));
      }
    } else {
      const pw = Math.max(0.35 * MM, p.w * 0.3), pd = p.d + 0.2 * MM;
      g.fillRect(-S(p.w / 2 + 0.12 * MM), -S(pd / 2), S(pw), S(pd));
      g.fillRect(S(p.w / 2 + 0.12 * MM - pw), -S(pd / 2), S(pw), S(pd));
    }
    g.restore();
  }

  // Plated mounting holes at the corners.
  for (const h of lay.holes) {
    g.fillStyle = ink(mode, 'pad');
    g.beginPath();
    g.arc(X(h.x), Y(h.z), S(h.r), 0, Math.PI * 2);
    g.fill();
    g.fillStyle = ink(mode, 'hole');
    g.beginPath();
    g.arc(X(h.x), Y(h.z), S(h.r * 0.68), 0, Math.PI * 2);
    g.fill();
  }

  // Baked contact shadows so parts sit on the mask instead of floating (colour map only).
  if (color) {
    g.shadowColor = 'rgba(0,0,0,0.7)';
    g.fillStyle = 'rgba(0,0,0,0.5)';
    for (const f of bigParts) {
      g.shadowBlur = S(0.9 * MM);
      g.fillRect(X(f.x - f.w / 2), Y(f.z - f.d / 2), S(f.w), S(f.d));
    }
    g.shadowBlur = S(0.25 * MM);
    g.fillStyle = 'rgba(0,0,0,0.4)';
    for (const p of lay.passives) {
      g.save();
      g.translate(X(p.x), Y(p.z));
      g.rotate(-p.rot);
      g.fillRect(-S(p.w / 2), -S(p.d / 2), S(p.w), S(p.d));
      g.restore();
    }
    g.shadowBlur = 0;
  }
}

/** Generic face for the small boards: unpopulated pad pairs, vias and traces, same texel density as the main board. */
function smallBoardLayout() {
  const rnd = seeded(7);
  const passives = [];
  for (let i = 0; i < 10; i++) {
    const type = i % 3, t = PASSIVE_TYPES[type];
    passives.push({ x: SMALL_BOX.w * (0.1 + 0.8 * rnd()), z: SMALL_BOX.d * (0.1 + 0.8 * rnd()), rot: rnd() < 0.5 ? 0 : Math.PI / 2, type, w: t.w, d: t.d });
  }
  return { footprints: [], soc: null, holes: [], passives };
}

function boardTextures(lay, box) {
  const w = Math.ceil(box.w * PX_PER_M), h = Math.ceil(box.d * PX_PER_M);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  paintBoard(canvas.getContext('2d'), 'color', lay, box);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;

  const orm = document.createElement('canvas');
  orm.width = Math.round(w * ORM_SCALE);
  orm.height = Math.round(h * ORM_SCALE);
  const g = orm.getContext('2d');
  g.scale(ORM_SCALE, ORM_SCALE);
  paintBoard(g, 'orm', lay, box);
  const ormTex = new THREE.CanvasTexture(orm);
  ormTex.colorSpace = THREE.NoColorSpace;
  return { map, orm: ormTex };
}

/** Laser marking for package tops: three code lines and a pin-1 dimple. */
function markingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = MARK_PX;
  canvas.height = MARK_PX;
  const g = canvas.getContext('2d');
  g.fillStyle = '#25262a';
  g.fillRect(0, 0, MARK_PX, MARK_PX);
  const v = g.createRadialGradient(MARK_PX * 0.5, MARK_PX * 0.45, MARK_PX * 0.1, MARK_PX * 0.5, MARK_PX * 0.5, MARK_PX * 0.75);
  v.addColorStop(0, 'rgba(255,255,255,0.05)');
  v.addColorStop(1, 'rgba(0,0,0,0.18)');
  g.fillStyle = v;
  g.fillRect(0, 0, MARK_PX, MARK_PX);
  g.fillStyle = '#a3a4a8';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `600 ${MARK_PX * 0.13}px ${FONT}`;
  g.fillText('APL1W48', MARK_PX / 2, MARK_PX * 0.36);
  g.font = `500 ${MARK_PX * 0.1}px ${FONT}`;
  g.fillText('339S00821', MARK_PX / 2, MARK_PX * 0.52);
  g.fillText('TWN 2519', MARK_PX / 2, MARK_PX * 0.66);
  g.fillStyle = '#141416';
  g.beginPath();
  g.arc(MARK_PX * 0.12, MARK_PX * 0.86, MARK_PX * 0.035, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let MATS = null;
function materialsOnce(ctx) {
  if (MATS) return MATS;
  const aniso = Math.min(8, ctx.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
  const main = boardTextures(layoutOnce(), MAIN_BOX);
  const small = boardTextures(smallBoardLayout(), SMALL_BOX);
  const mark = markingTexture();
  for (const t of [main.map, main.orm, small.map, small.orm, mark]) t.anisotropy = aniso;
  const Std = THREE.MeshStandardMaterial;
  const face = ({ map, orm }) => new Std({ color: 0xffffff, map, roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1 });
  MATS = {
    boardFace: face(main),
    smallBoardFace: face(small),
    packageTop: new Std({ map: mark, roughness: 0.42, metalness: 0.08 }),
    passiveBody: new Std({ color: PASSIVE_BODY, roughness: 0.55, metalness: 0.05 }),
    portCavity: new Std({ color: 0x08090a, roughness: 0.9, metalness: 0.2 }),
  };
  for (const [name, m] of Object.entries(MATS)) m.name = `logicboard.${name}`;
  return MATS;
}

/* ---------------------------------------------------------------- layout (seeded, generated once) */

let LAYOUT = null;

function insideBoard(x, z, margin) {
  if (x < B.x0 + margin || x > B.x1 - margin || z < B.z0 + margin || z > B.z1 - margin) return false;
  const rr = (PCB_BITE_R + margin) ** 2;
  return (x - FAN.xL) ** 2 + (z - FAN.z) ** 2 >= rr && (x - FAN.xR) ** 2 + (z - FAN.z) ** 2 >= rr;
}

function overlaps(a, b, gap) {
  return Math.abs(a.x - b.x) < (a.fw + b.fw) / 2 + gap && Math.abs(a.z - b.z) < (a.fd + b.fd) / 2 + gap;
}

/** Package footprints, keep-outs, mounting holes and every passive's pose. Texture and meshes both read this. */
function layoutOnce() {
  if (LAYOUT) return LAYOUT;
  const rnd = seeded(2026);

  const footprints = [];
  for (const [key, spec] of Object.entries(BOARD_PARTS)) {
    const list = Array.isArray(spec[0]) ? spec : [spec];
    list.forEach(([cx, cz, w, d, t], i) => footprints.push({ key, index: list === spec ? i : null, x: cx, z: cz, w, d, t }));
  }
  const soc = { x: SOC.cx, z: SOC.cz, w: SOC.substrate.w, d: SOC.substrate.d };
  const socKeep = { x: SOC.cx, z: SOC.cz, fw: SOC_KEEPOUT_W, fd: SOC_KEEPOUT_D };
  const holes = [
    [B.x0 + MOUNT_HOLE_INSET, B.z0 + MOUNT_HOLE_INSET], [B.x1 - MOUNT_HOLE_INSET, B.z0 + MOUNT_HOLE_INSET],
    [B.x0 + MOUNT_HOLE_INSET, B.z1 - MOUNT_HOLE_INSET], [B.x1 - MOUNT_HOLE_INSET, B.z1 - MOUNT_HOLE_INSET],
  ].map(([x, z]) => ({ x, z, r: MOUNT_HOLE_R }));

  const keep = [
    socKeep,
    ...footprints.map((f) => ({ x: f.x, z: f.z, fw: f.w + 2 * PACKAGE_KEEPOUT, fd: f.d + 2 * PACKAGE_KEEPOUT })),
    ...holes.map((h) => ({ x: h.x, z: h.z, fw: 2 * (h.r + PACKAGE_KEEPOUT), fd: 2 * (h.r + PACKAGE_KEEPOUT) })),
  ];
  const passives = [];
  const totalWeight = PASSIVE_TYPES.reduce((s, t) => s + t.weight, 0);
  const pickType = (maxType) => {
    let r = rnd() * totalWeight;
    for (let i = 0; i < PASSIVE_TYPES.length; i++) {
      r -= PASSIVE_TYPES[i].weight;
      if (r <= 0) return Math.min(i, maxType);
    }
    return 0;
  };
  const tryPlace = (x, z, type, rot) => {
    const t = PASSIVE_TYPES[type];
    const p = { x, z, rot, type, w: t.w, d: t.d, h: t.h, fw: rot ? t.d : t.w, fd: rot ? t.w : t.d, tint: PASSIVE_TINTS[Math.floor(rnd() * PASSIVE_TINTS.length)] };
    if (!insideBoard(x - p.fw / 2, z - p.fd / 2, PCB_EDGE_MARGIN) || !insideBoard(x + p.fw / 2, z + p.fd / 2, PCB_EDGE_MARGIN)) return false;
    for (const k of keep) if (overlaps(p, k, 0)) return false;
    for (const q of passives) if (overlaps(p, q, PASSIVE_GAP)) return false;
    passives.push(p);
    return true;
  };

  // Board-to-board connectors along the front edge, then decoupling rings, then a sparse fill.
  for (let i = 0; i < 6 && passives.length < PASSIVE_COUNT; i++) {
    tryPlace(B.x0 + BOARD_W * (0.12 + 0.152 * i), B.z1 - PCB_EDGE_MARGIN - PASSIVE_TYPES[5].d / 2 - 0.5 * MM, 5, 0);
  }
  const ring = (cx, cz, fw, fd, count, near, far, maxType) => {
    for (let n = 0, tries = 0; n < count && tries < count * 12 && passives.length < PASSIVE_COUNT; tries++) {
      const side = Math.floor(rnd() * 4);
      const t = rnd() * 2 - 1;
      const off = near + rnd() * (far - near);
      const x = side < 2 ? cx + t * (fw / 2) : cx + (side === 2 ? -1 : 1) * (fw / 2 + off);
      const z = side < 2 ? cz + (side === 0 ? -1 : 1) * (fd / 2 + off) : cz + t * (fd / 2);
      if (tryPlace(x, z, pickType(maxType), side < 2 ? 0 : Math.PI / 2)) n++;
    }
  };
  ring(SOC.cx, SOC.cz, SOC_KEEPOUT_W, SOC_KEEPOUT_D, 96, 0.4 * MM, 5 * MM, 2);
  for (const f of footprints) if (f.key === 'PMIC') ring(f.x, f.z, f.w + 2 * PACKAGE_KEEPOUT, f.d + 2 * PACKAGE_KEEPOUT, 14, 0.3 * MM, 3.5 * MM, 1);
  for (let tries = 0; passives.length < PASSIVE_COUNT && tries < 6000; tries++) {
    tryPlace(B.x0 + rnd() * BOARD_W, B.z0 + rnd() * BOARD_D, pickType(4), rnd() < 0.5 ? 0 : Math.PI / 2);
  }

  LAYOUT = { footprints, soc, holes, passives };
  return LAYOUT;
}

/* ---------------------------------------------------------------- PCB */

function pcbShape() {
  const r = B.cornerRadius;
  const x0 = B.x0, x1 = B.x1, y0 = -B.z1, y1 = -B.z0; // shape y = −z: front edge at y0, rear edge at y1
  const cy = -FAN.z;
  const dx = FAN.xR - x1;
  const half = PCB_BITE_R > dx ? Math.sqrt(PCB_BITE_R ** 2 - dx ** 2) : 0;
  const phi = Math.atan2(half, dx);
  const s = new THREE.Shape();
  s.moveTo(x0 + r, y0);
  s.lineTo(x1 - r, y0);
  s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  if (half > 0) {
    s.lineTo(x1, cy - half);
    s.absarc(FAN.xR, cy, PCB_BITE_R, Math.PI + phi, Math.PI - phi, true);
  }
  s.lineTo(x1, y1 - r);
  s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  s.lineTo(x0 + r, y1);
  s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  if (half > 0) {
    s.lineTo(x0, cy + half);
    s.absarc(FAN.xL, cy, PCB_BITE_R, phi, -phi, true);
  }
  s.lineTo(x0, y0 + r);
  s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  s.closePath();
  return s;
}

const _m4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _col = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);

/** Untagged InstancedMesh of passives in PCB-local space; ±X faces are the metal terminations. */
function buildPassives(ctx, m) {
  const lay = layoutOnce();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const term = ctx.mats.solderBall;
  const mesh = new THREE.InstancedMesh(geo, [term, term, m.passiveBody, m.passiveBody, m.passiveBody, m.passiveBody], lay.passives.length);
  lay.passives.forEach((p, i) => {
    _quat.setFromAxisAngle(_up, p.rot);
    _pos.set(p.x - BOARD_CX, B.t / 2 + p.h / 2, p.z - BOARD_CZ);
    _scl.set(p.w, p.h, p.d);
    mesh.setMatrixAt(i, _m4.compose(_pos, _quat, _scl));
    mesh.setColorAt(i, _col.setRGB(p.tint[0], p.tint[1], p.tint[2]));
  });
  mesh.userData.decoration = 'passives';
  return mesh;
}

function buildPCB(ctx, group, m) {
  const geo = plate(pcbShape(), B.t, BOARD_CX, BOARD_CZ);
  planarUV(geo, 1 / BOARD_W, 0.5, 1 / BOARD_D, 0.5);
  const pcb = new THREE.Mesh(geo, [m.boardFace, ctx.mats.plastic]);
  pcb.position.set(BOARD_CX, B.y, BOARD_CZ);
  group.add(ctx.tag(pcb, 'PCB'));
  pcb.add(buildPassives(ctx, m));
  return pcb;
}

/* ---------------------------------------------------------------- packages and small boards */

/** Filleted black body with a lighter marked top plate; groups 0 = body, 1 = plate. Origin at the base centre. */
function packageGeometry(w, d, t) {
  const body = new RoundedBoxGeometry(w, t, d, 2, Math.min(PACKAGE_EDGE_R, t / 3));
  body.translate(0, t / 2, 0);
  const top = new THREE.BoxGeometry(w - 2 * PACKAGE_TOP_INSET, PACKAGE_TOP_T, d - 2 * PACKAGE_TOP_INSET);
  top.translate(0, t + PACKAGE_TOP_T / 2 - PACKAGE_TOP_T / 4, 0);
  return mergeParts([{ g: body, mat: 0 }, { g: top, mat: 1 }]);
}

function buildPackages(ctx, group, m) {
  for (const f of layoutOnce().footprints) {
    const mesh = new THREE.Mesh(packageGeometry(f.w, f.d, f.t), [ctx.mats.packageBlack, m.packageTop]);
    mesh.position.set(f.x, BOARD_TOP, f.z);
    group.add(ctx.tag(mesh, f.key, f.index));
  }
}

/** Small pcb plate with one or two packages merged in; groups 0 = pcb caps, 1 = edge, 2 = packages. */
function buildSmallBoard(ctx, group, m, key, [cx, cz, w, d]) {
  const t = SMALL_BOARDS.t;
  const g = plate(roundedRect(new THREE.Shape(), 0, 0, w, d, SMALL_BOARD_R), t, 0, 0);
  planarUV(g, 1 / SMALL_BOX.w, 0.5, 1 / SMALL_BOX.d, 0.5); // crops the shared small-board face, texel density preserved
  const parts = [{ g, mat: [0, 1] }];
  const chips = [[-w * 0.18, d * 0.12, w * 0.34, d * 0.38, 0.7 * MM]];
  if (key === 'USBCBoardL' || key === 'USBCBoardR' || key === 'AudioBoard') chips.push([w * 0.24, -d * 0.22, w * 0.2, d * 0.24, 0.6 * MM]);
  for (const [px, pz, pw, pd, pt] of chips) {
    const body = new RoundedBoxGeometry(pw, pt, pd, 2, Math.min(PACKAGE_EDGE_R, pt / 3));
    body.translate(px, t / 2 + pt / 2, pz);
    parts.push({ g: body, mat: 2 });
  }
  const mesh = new THREE.Mesh(mergeParts(parts), [m.smallBoardFace, ctx.mats.plastic, ctx.mats.packageBlack]);
  mesh.position.set(cx, B.y, cz);
  group.add(ctx.tag(mesh, key));
}

/* ---------------------------------------------------------------- ports */

/** Opening outline in the wall plane: x along the wall, y up, centred; inset shrinks it uniformly. */
function openingShape(kind, w, h, inset = 0) {
  const s = new THREE.Shape();
  const W = w - 2 * inset, H = h - 2 * inset;
  if (kind === 'pill') roundedRect(s, 0, 0, W, H, H / 2);
  else if (kind === 'slot') roundedRect(s, 0, 0, W, H, Math.min(H / 2, PORT_BEVEL * 2.4));
  else if (kind === 'round') s.absarc(0, 0, W / 2, 0, Math.PI * 2, false);
  else {
    const c = H * 0.3;
    roundedPolygon(s, [[-W / 2, H / 2], [W / 2, H / 2], [W / 2, -H / 2 + c], [W / 2 - c, -H / 2], [-W / 2 + c, -H / 2], [-W / 2, -H / 2 + c]], H * 0.16);
  }
  return s;
}

function rimRadius(kind, w, h) {
  if (kind === 'pill') return h / 2 + PORT_RIM;
  if (kind === 'round') return w / 2 + PORT_RIM;
  if (kind === 'slot') return Math.min(h / 2, PORT_BEVEL * 2.4) + PORT_RIM;
  return h * 0.16 + PORT_RIM;
}

/**
 * Receptacle in port-local space: face at x = 0 looking outward (−X), body reaching +X inward.
 * Groups: 0 steel rim/shell, 1 dark cavity (inside-out), 2 contacts. Built along +Z then turned.
 */
function portGeometry(base, w, h) {
  const kind = PORT_KIND[base];
  const depth = PORTS.depth;
  const outer = roundedRect(new THREE.Shape(), 0, 0, w + 2 * PORT_RIM, h + 2 * PORT_RIM, rimRadius(kind, w, h));
  outer.holes.push(openingShape(kind, w, h));
  const tube = new THREE.ExtrudeGeometry(outer, {
    depth: depth - 2 * PORT_BEVEL, bevelEnabled: true, bevelThickness: PORT_BEVEL, bevelSize: PORT_BEVEL, bevelSegments: 3, curveSegments: 12,
  });
  tube.translate(0, 0, PORT_BEVEL); // face at z = 0
  const parts = [{ g: tube, mat: 0 }];

  const floor = depth * PORT_FLOOR[base];
  const cavity = new THREE.ExtrudeGeometry(openingShape(kind, w, h, PORT_CAVITY_INSET), { depth: floor - PORT_BEVEL, bevelEnabled: false, curveSegments: 12 });
  cavity.translate(0, 0, PORT_BEVEL);
  parts.push({ g: flipInside(cavity), mat: 1 });

  const detail = PORT_DETAIL[base];
  if (detail === 'tongue') {
    const len = floor - PORT_TONGUE_START;
    const tongue = new THREE.BoxGeometry(w * 0.68, h * 0.2, len);
    tongue.translate(0, 0, PORT_TONGUE_START + len / 2);
    parts.push({ g: tongue, mat: 2 });
  } else if (detail === 'pins') {
    const r = h * 0.12, len = floor * 0.5;
    for (let i = -2; i <= 2; i++) {
      const pin = new THREE.CylinderGeometry(r, r, len, 10);
      pin.rotateX(Math.PI / 2);
      pin.translate(i * PORT_PIN_PITCH, 0, floor - len / 2);
      parts.push({ g: pin, mat: 2 });
    }
  }
  return mergeParts(parts);
}

function buildPorts(ctx, group, m) {
  const ports = ctx.tag(new THREE.Group(), 'Ports');
  group.add(ports);
  for (const side of ['left', 'right']) {
    const sign = side === 'left' ? -1 : 1;
    for (const [name, [z, w, h]] of Object.entries(PORTS[side])) {
      const { base, index } = parseNodeName(name);
      const geo = portGeometry(base, w, h);
      geo.rotateY(sign * -Math.PI / 2); // +Z (inward along the tube) → −sign·X, i.e. into the chassis
      const mesh = new THREE.Mesh(geo, [ctx.mats.steel, m.portCavity, ctx.mats.copperPad]);
      mesh.position.set(sign * (BASE.w / 2 + PORT_LIP), PORT_Y, z);
      ports.add(ctx.tag(mesh, base, index));
    }
  }
  return ports;
}

/* ---------------------------------------------------------------- module interface */

export function build(parent, chip, ctx) {
  const m = materialsOnce(ctx);
  const g = ctx.tag(new THREE.Group(), NAME);
  parent.add(g);
  buildPCB(ctx, g, m);
  buildPackages(ctx, g, m);
  for (const [key, spec] of Object.entries(SMALL_BOARDS)) if (Array.isArray(spec)) buildSmallBoard(ctx, g, m, key, spec);
  buildPorts(ctx, g, m);
  return g;
}

export const explodeOffsets = {
  LogicBoard: [0, EXPLODE.board, 0],
};
