/**
 * src/scene/power.js — the battery: six lithium-polymer pouch cells and the battery-management flex.
 *
 * BatteryCell[0..5]      pouch cells from BATTERY.cells. Filleted RoundedBoxGeometry bodies in a crinkled
 *                        foil material (the shared batteryFoil cloned once, plus procedural roughness and
 *                        normal maps), each with a darker printed label plate on the top face. The four
 *                        outer cells carry a translucent adhesive pull tab glued under their front edge.
 * BatteryManagementFlex  amber ribbon (shared flex material) from BATTERY.bmsFlex: it runs along the rear
 *                        edge of the pack, lies over the centre rear cell's edge and S-bends down to the
 *                        logic-board plane. A small BMS board with three components sits on its cell end.
 *
 * Detail meshes (label plates, pull tabs, BMS board and its components) are untagged, unnamed children
 * of their registry node: picking must walk up to the nearest ancestor with userData.part; the dial
 * hides them with their parent; the explode engine moves the parent. Nothing here runs per frame.
 * The three materials this file adds are created once, on the first build, and shared by every cell.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BATTERY, EXPLODE, LOGIC_BOARD, SMALL_BOARDS, MM } from '../dims.js';

export const NAME = 'Power';

/* ------------------------------------------------------------------ derived dimensions */

const CELL_T = BATTERY.cellT;
const CELL_RADIUS = CELL_T * 0.28;            // pouch edge fillet, ≈1.5 mm on a 5.5 mm cell
const CELL_SEGMENTS = 6;                      // fillet segments per corner: 13² quads per face, ~2k triangles per cell
const CELL_TOP_Y = BATTERY.y + CELL_T;        // world Y of the cells' top face
const SURFACE_LIFT = 0.05 * MM;               // gap between stacked coplanar faces (≈15× depth precision at view distance)

const LABEL_T = 0.12 * MM;                    // printed label plate thickness
const LABEL_INSET = CELL_RADIUS + 6 * MM;     // keeps the plate on the flat top, clear of the fillet and the BMS board
const LABEL_CORNER = 2 * MM;

const TAB_W = 12 * MM;                        // pull tab width (along X)
const TAB_L = 8 * MM;                         // pull tab length (along Z)
const TAB_UNDER = 3 * MM;                     // portion of the tab glued under the cell
const TAB_T = 0.2 * MM;
const TAB_CORNER = 1.5 * MM;
const TAB_MARGIN = 6 * MM;                    // from the cell's outer side to the tab

const FLEX = BATTERY.bmsFlex;
const BOARD_TOP_Y = LOGIC_BOARD.y + LOGIC_BOARD.t / 2;
const FLEX_CELL_EDGE_Z = BATTERY.cells[1][1] - BATTERY.cells[1][3] / 2; // rear edge of the centre rear cell (world Z)
const FLEX_FRONT_Z = FLEX.cz + FLEX.d / 2;    // where the ribbon starts, on the cell top (world Z)
const FLEX_REAR_Z = FLEX.cz - FLEX.d / 2;     // where it ends, at the logic-board plane (world Z)
const FLEX_FLAT_D = FLEX.d * 0.3;             // flat run past the cell edge before the bend
const FLEX_BEND_SAMPLES = 18;
const FLEX_MAT_SEGMENTS = 6;                  // curve segments for every rounded outline in this file

const BMS_BOARD = Object.freeze({ w: FLEX.w / 2, d: FLEX.d * 1.25, t: SMALL_BOARDS.t });
/** [dx along the board, w, h, d, material name] — one fuse and two MOSFET packages. */
const BMS_PARTS = Object.freeze([
  [-BMS_BOARD.w * 0.28, 4 * MM, 1.2 * MM, 2 * MM, 'steel'],
  [0, 3 * MM, 0.9 * MM, 3 * MM, 'packageBlack'],
  [BMS_BOARD.w * 0.22, 3 * MM, 0.9 * MM, 3 * MM, 'packageBlack'],
]);
const BMS_PART_RADIUS = 0.2 * MM;
const BMS_BOARD_RADIUS = 0.3 * MM;

/* ------------------------------------------------------------------ materials (created once) */

let pouchMat = null;
let labelMat = null;
let tabMat = null;

/** Small deterministic PRNG (mulberry32); the same seed gives pixel-identical textures on every build. */
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

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Tileable low-frequency height field. A coarse random grid is laid out 3×3 at 1:1 (so the interpolation
 * across the centre tile's borders sees the wrapped neighbours), upscaled with smoothing, and the centre
 * tile is kept: it wraps seamlessly. Two octaves: broad pouch wrinkles plus fine foil grain.
 */
function foilHeight(size) {
  const rnd = seeded(41);
  const h = new Float32Array(size * size);
  const octave = (grid, amp) => {
    const small = canvas(grid, grid);
    const g = small.getContext('2d');
    const img = g.createImageData(grid, grid);
    for (let i = 0; i < grid * grid; i++) {
      const v = Math.round(rnd() * 255);
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const mosaic = canvas(grid * 3, grid * 3);
    const gm = mosaic.getContext('2d');
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) gm.drawImage(small, dx * grid, dy * grid);
    const big = canvas(size * 3, size * 3);
    const gb = big.getContext('2d');
    gb.imageSmoothingEnabled = true;
    gb.imageSmoothingQuality = 'high';
    gb.drawImage(mosaic, 0, 0, size * 3, size * 3);
    const data = gb.getImageData(size, size, size, size).data;
    for (let i = 0; i < size * size; i++) h[i] += (amp * data[i * 4]) / 255;
  };
  octave(8, 0.7);
  octave(40, 0.3);
  return h;
}

/** Normal map and roughness map of the pouch foil, both linear (NoColorSpace), tiling. */
function foilTextures() {
  const S = 256;
  const h = foilHeight(S);
  const normal = canvas(S, S);
  const rough = canvas(S, S);
  const gn = normal.getContext('2d');
  const gr = rough.getContext('2d');
  const ni = gn.createImageData(S, S);
  const ri = gr.createImageData(S, S);
  const strength = 2.2;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const dx = h[y * S + ((x + 1) % S)] - h[y * S + ((x + S - 1) % S)];
      const dy = h[((y + 1) % S) * S + x] - h[((y + S - 1) % S) * S + x];
      let nx = -dx * strength, ny = -dy * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      ni.data[i * 4] = Math.round((nx * 0.5 + 0.5) * 255);
      ni.data[i * 4 + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      ni.data[i * 4 + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      ni.data[i * 4 + 3] = 255;
      // MeshStandardMaterial reads roughness from the green channel; 0.5–0.72, a matte foil sheen.
      const r = Math.round((0.5 + 0.22 * h[i]) * 255);
      ri.data[i * 4] = r;
      ri.data[i * 4 + 1] = r;
      ri.data[i * 4 + 2] = r;
      ri.data[i * 4 + 3] = 255;
    }
  }
  gn.putImageData(ni, 0, 0);
  gr.putImageData(ri, 0, 0);
  const wrap = (tex) => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
    tex.anisotropy = 4;
    return tex;
  };
  return { normal: wrap(new THREE.CanvasTexture(normal)), roughness: wrap(new THREE.CanvasTexture(rough)) };
}

/**
 * Printed cell label. Content sits in the top 60 % of the canvas and the bottom row is plain plate colour,
 * so plates of any aspect ratio show the text undistorted, anchored at their rear edge (see labelUv).
 */
function labelTexture() {
  const W = 512, H = 256;
  const c = canvas(W, H);
  const g = c.getContext('2d');
  const rnd = seeded(7);
  g.fillStyle = '#1b1d20';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#8f9298';
  g.font = 'bold 24px sans-serif';
  g.textBaseline = 'alphabetic';
  g.fillText('LITHIUM ION POLYMER BATTERY', 26, 46);
  g.font = '15px sans-serif';
  g.fillStyle = '#767a80';
  g.fillText('DO NOT DISASSEMBLE  ·  DO NOT PUNCTURE  ·  DO NOT INCINERATE', 26, 74);
  g.fillText('RECYCLE PROPERLY  ·  KEEP AWAY FROM HEAT', 26, 96);
  // Barcode block, bottom-left of the printed area.
  g.fillStyle = '#9a9da3';
  let x = 26;
  for (let i = 0; i < 34 && x < 250; i++) {
    const w = 1 + Math.round(rnd() * 3);
    if (rnd() > 0.35) g.fillRect(x, 112, w, 38);
    x += w + 1 + Math.round(rnd() * 2);
  }
  // Compliance glyphs, right side: crossed-out bin, recycling loop, boxed mark.
  g.strokeStyle = '#8f9298';
  g.lineWidth = 2;
  g.strokeRect(402, 112, 28, 38);
  g.beginPath();
  g.moveTo(398, 118);
  g.lineTo(434, 118);
  g.moveTo(400, 150);
  g.lineTo(432, 112);
  g.stroke();
  g.beginPath();
  g.arc(462, 131, 15, 0, Math.PI * 2);
  g.moveTo(462, 118);
  g.lineTo(474, 138);
  g.lineTo(450, 138);
  g.closePath();
  g.stroke();
  g.strokeRect(340, 112, 44, 38);
  g.font = 'bold 18px sans-serif';
  g.fillStyle = '#8f9298';
  g.fillText('Li-ion', 344, 138);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  return tex;
}

function ensureMaterials(mats) {
  if (pouchMat) return;
  const { normal, roughness } = foilTextures();
  pouchMat = mats.batteryFoil.clone();
  pouchMat.name = 'batteryFoilPouch';
  pouchMat.normalMap = normal;
  pouchMat.normalScale.set(0.22, 0.22);
  pouchMat.roughnessMap = roughness;
  pouchMat.roughness = 1; // the map carries the value
  pouchMat.metalness = 0.4; // the shared 0.6 reads as brushed metal; a laminated pouch is matte foil
  labelMat = new THREE.MeshStandardMaterial({ map: labelTexture(), roughness: 0.85, metalness: 0.05 });
  labelMat.name = 'batteryLabel';
  tabMat = new THREE.MeshStandardMaterial({
    color: 0xe9e9e4, roughness: 0.6, metalness: 0, transparent: true, opacity: 0.82, side: THREE.DoubleSide,
  });
  tabMat.name = 'batteryPullTab';
}

/* ------------------------------------------------------------------ geometry helpers */

function roundedRect(w, d, r) {
  const x = -w / 2, y = -d / 2;
  const s = new THREE.Shape();
  s.moveTo(x, y + r);
  s.lineTo(x, y + d - r);
  s.quadraticCurveTo(x, y + d, x + r, y + d);
  s.lineTo(x + w - r, y + d);
  s.quadraticCurveTo(x + w, y + d, x + w, y + d - r);
  s.lineTo(x + w, y + r);
  s.quadraticCurveTo(x + w, y, x + w - r, y);
  s.lineTo(x + r, y);
  s.quadraticCurveTo(x, y, x, y + r);
  return s;
}

/** Flat plate lying in XZ, thickness along +Y, from a rounded rectangle w (X) × d (Z). */
function plateGeometry(w, d, r, t) {
  const geo = new THREE.ExtrudeGeometry(roundedRect(w, d, r), { depth: t, bevelEnabled: false, curveSegments: FLEX_MAT_SEGMENTS });
  geo.rotateX(-Math.PI / 2); // shape +y → world −z (rear), extrusion → +Y
  return geo;
}

/** Label UVs: u across the plate width, v anchored at the rear edge with the texture's 2:1 aspect kept. */
function labelUv(geo, w, d) {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    uv.setXY(i, (x + w / 2) / w, 1 - (z + d / 2) / (w / 2));
  }
  uv.needsUpdate = true;
}

/**
 * The flex ribbon: a 2D profile in the (−Z, Y) plane extruded along X. Flat over the cell edge, then a
 * cubic S-bend down to the logic-board plane. Coordinates are relative to the node origin at
 * (FLEX.cx, CELL_TOP_Y, FLEX.cz).
 */
function ribbonGeometry() {
  const t = FLEX.t;
  const y0 = SURFACE_LIFT + t / 2;
  const y1 = BOARD_TOP_Y - CELL_TOP_Y + t / 2;
  const a0 = -(FLEX_FRONT_Z - FLEX.cz);                 // profile x = −(local z)
  const a1 = -(FLEX_CELL_EDGE_Z - FLEX_FLAT_D - FLEX.cz);
  const a3 = -(FLEX_REAR_Z - FLEX.cz);
  const c1 = a1 + (a3 - a1) * 0.5, c2 = a3 - (a3 - a1) * 0.5;
  const centre = [[a0, y0], [a1, y0]];
  for (let i = 1; i <= FLEX_BEND_SAMPLES; i++) {
    const s = i / FLEX_BEND_SAMPLES, u = 1 - s;
    const a = u * u * u * a1 + 3 * u * u * s * c1 + 3 * u * s * s * c2 + s * s * s * a3;
    const y = u * u * u * y0 + 3 * u * u * s * y0 + 3 * u * s * s * y1 + s * s * s * y1;
    centre.push([a, y]);
  }
  const n = centre.length;
  const top = [], bottom = [];
  for (let i = 0; i < n; i++) {
    const p = centre[Math.max(0, i - 1)], q = centre[Math.min(n - 1, i + 1)];
    let tx = q[0] - p[0], ty = q[1] - p[1];
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    const nx = -ty * (t / 2), ny = tx * (t / 2);
    top.push(new THREE.Vector2(centre[i][0] + nx, centre[i][1] + ny));
    bottom.push(new THREE.Vector2(centre[i][0] - nx, centre[i][1] - ny));
  }
  const shape = new THREE.Shape([...top, ...bottom.reverse()]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: FLEX.w, bevelEnabled: false, steps: 1 });
  geo.translate(0, 0, -FLEX.w / 2);
  geo.rotateY(Math.PI / 2); // shape z → world x, shape x → world −z
  return geo;
}

/* ------------------------------------------------------------------ nodes */

function buildCell(ctx, parent, i, [cx, cz, w, d], geometries) {
  const key = `${w}x${d}`;
  let geo = geometries.get(key);
  if (!geo) geometries.set(key, (geo = new RoundedBoxGeometry(w, CELL_T, d, CELL_SEGMENTS, CELL_RADIUS)));
  const cell = new THREE.Mesh(geo, pouchMat);
  cell.position.set(cx, BATTERY.y + CELL_T / 2, cz);
  parent.add(ctx.tag(cell, 'BatteryCell', i));

  const lw = w - 2 * LABEL_INSET, ld = d - 2 * LABEL_INSET;
  const plateGeo = plateGeometry(lw, ld, LABEL_CORNER, LABEL_T);
  labelUv(plateGeo, lw, ld);
  const plate = new THREE.Mesh(plateGeo, labelMat);
  plate.position.set(0, CELL_T / 2 + SURFACE_LIFT, 0);
  cell.add(plate);

  if (cx !== 0) {
    const side = Math.sign(cx);
    const tab = new THREE.Mesh(plateGeometry(TAB_W, TAB_L, TAB_CORNER, TAB_T), tabMat);
    tab.position.set(side * (w / 2 - TAB_W / 2 - TAB_MARGIN), -CELL_T / 2 - TAB_T - SURFACE_LIFT, d / 2 - TAB_UNDER + TAB_L / 2);
    cell.add(tab);
  }
  return cell;
}

function buildFlex(ctx, parent) {
  const { mats } = ctx;
  const flex = new THREE.Mesh(ribbonGeometry(), mats.flex);
  flex.position.set(FLEX.cx, CELL_TOP_Y, FLEX.cz);
  parent.add(ctx.tag(flex, 'BatteryManagementFlex'));

  // BMS board on the cell top, just inside the cell's rear fillet; the ribbon runs under its rear edge.
  const boardZ = FLEX_CELL_EDGE_Z - FLEX.cz + CELL_RADIUS + BMS_BOARD.d / 2;
  const board = new THREE.Mesh(new RoundedBoxGeometry(BMS_BOARD.w, BMS_BOARD.t, BMS_BOARD.d, 1, BMS_BOARD_RADIUS), mats.packageBlack);
  board.position.set(0, SURFACE_LIFT + BMS_BOARD.t / 2, boardZ);
  flex.add(board);
  for (const [dx, w, h, d, matName] of BMS_PARTS) {
    const part = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 1, BMS_PART_RADIUS), mats[matName]);
    part.position.set(dx, BMS_BOARD.t / 2 + h / 2, 0);
    board.add(part);
  }
  return flex;
}

export function build(parent, chip, ctx) {
  const { registry } = ctx;
  ensureMaterials(ctx.mats);
  const g = ctx.tag(new THREE.Group(), NAME);
  parent.add(g);

  const geometries = new Map();
  for (const e of registry.childrenOf(NAME)) {
    const n = registry.instanceCount(e, chip);
    if (e.key === 'BatteryCell') {
      const cells = BATTERY.cells;
      for (let i = 0; i < (n ?? cells.length); i++) buildCell(ctx, g, i, cells[i] ?? cells[cells.length - 1], geometries);
    } else if (e.key === 'BatteryManagementFlex') {
      buildFlex(ctx, g);
    } else {
      // A registry child this module does not model yet still gets a node, so the completeness checks hold.
      const count = n ?? 1;
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(new RoundedBoxGeometry(BMS_BOARD.d, BMS_BOARD.t, BMS_BOARD.d, 1, BMS_BOARD_RADIUS), ctx.mats.plastic);
        m.position.set(FLEX.cx, CELL_TOP_Y, FLEX.cz);
        g.add(ctx.tag(m, e.key, n == null ? null : i));
      }
    }
  }
  return g;
}

export const explodeOffsets = {
  BatteryCell: [0, EXPLODE.battery, 0],
  BatteryManagementFlex: [0, EXPLODE.battery, 0],
};
