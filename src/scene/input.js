/**
 * src/scene/input.js — keyboard, Touch ID and trackpad.
 *
 * Keyboard (group 'Keyboard'):
 *   KeyGrid     ONE merged BufferGeometry of 77 rounded keycaps (RoundedBoxGeometry, bottom face
 *               dropped) laid out as the 78-key MacBook layout; the 78th slot is the Touch ID key.
 *               Every cap's vertices are planar-projected into its own cell of one 2048² CanvasTexture
 *               atlas that carries the legends (map + emissiveMap of one module-scope material).
 *   Backlight   thin emissive plane on the well floor under the caps (Engineer level).
 * TouchIDButton  separate rounded cap with a sapphire-like sensor disc (two material groups).
 * Trackpad (group, explode stage 'battery'):
 *   Glass, StrainGaugePlate, TapticEngine, TrackpadFlex.
 *
 * Layout facts: every row of the MacBook keyboard spans 14.5 key units (280 mm zone / 19 mm pitch),
 * so the last key of a row takes whatever is left (backslash 1u, return 1.75u, right shift 2.25u);
 * ANSI 15u widths would overflow KEYBOARD.x1. Positions are computed, never typed.
 *
 * No per-frame hook, nothing chip-dependent: build() is the whole module.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BASE, BATTERY, KEYBOARD, LOGIC_BOARD, TRACKPAD, EXPLODE, MM } from '../dims.js';

export const NAME = 'Input';

const K = KEYBOARD;
const T = TRACKPAD;

/* ---------------------------------------------------------------- derived dimensions */

const KEY_GAP = K.pitch - K.keyW;                                  // 2.5 mm between adjacent caps
const ROW_UNITS = 14.5;                                            // key units per MacBook row
const FULL_ROWS = 5;                                               // rows below the function row
const ROW_X0 = (K.x0 + K.x1) / 2 - (ROW_UNITS * K.pitch) / 2;      // left edge of the first slot
const FN_ROW_PITCH = K.z1 - K.z0 - FULL_ROWS * K.pitch;            // slot depth of the half-height row
const ARROW_D = (K.keyD - KEY_GAP) / 2;                            // half-height arrow caps
const KEY_BODY_H = K.keyH + K.wellDepth;                           // cap body: well floor → cap top
const KEY_TOP_Y = BASE.h + K.keyH;
const KEY_RADIUS = K.keyH;                                         // 1.2 mm edge fillet on every cap
const KEY_SEGMENTS = 2;                                            // 250 tris per cap without its bottom
const KEY_CENTRE = Object.freeze({ x: (K.x0 + K.x1) / 2, y: KEY_TOP_Y - KEY_BODY_H / 2, z: (K.z0 + K.z1) / 2 });
const BACKLIGHT_LIFT = K.wellDepth * 0.05;                         // above the well floor, no z-fight
const TOUCH_DISC_R = K.fnRowD * 0.4;
const TOUCH_DISC_T = K.keyH * 0.15;

const TRACKPAD_PROUD = T.glassT * 0.06;                            // glass top just above the deck
const TRACKPAD_CORNER_R = BASE.cornerRadius * 0.4;                 // plan-view corner of the glass
const TRACKPAD_BEVEL = T.glassT * 0.25;                            // top/bottom edge fillet of the glass
const PLATE_INSET = BASE.wallT;                                    // steel plate inset from the glass
const PLATE_RADIUS = T.plateT / 3;
const FLEX_T = BATTERY.bmsFlex.t;
const FLEX_W = T.tapticSize[0] / 2;
const FLEX_LEN = T.cz - T.d / 2 - LOGIC_BOARD.z1;                  // trackpad rear edge → board edge
const TAPTIC_RADIUS = T.tapticSize[1] * 0.15;
const TAPTIC_COIL_R = T.tapticSize[1] * 0.3;
const TAPTIC_COIL_LEN = T.tapticSize[0] * 0.26;
const TAPTIC_COIL_X = T.tapticSize[0] * 0.22;

/* ---------------------------------------------------------------- legend atlas constants (pixels) */

const ATLAS_SIZE = 2048;
const ATLAS_PX_PER_MM = 12;
const ATLAS_PAD = 6;
const CAP_FILL = '#1b1b1d';
const LEGEND = '#e4e4e6';
const LED = '#b9c0b4';
const FONT = 'system-ui, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';

/* ---------------------------------------------------------------- layout (pure) */

const F_ICONS = ['sunLow', 'sunHigh', 'missionControl', 'spotlight', 'dictation', 'dnd', 'rewind', 'playPause', 'fastForward', 'mute', 'volDown', 'volUp'];

const letters = (s) => [...s].map((c) => ({ u: 1, legend: { t: 'letter', s: c } }));
const pairs = (list) => list.map(([top, bot]) => ({ u: 1, legend: { t: 'pair', top, bot } }));
const word = (u, w, al, sym = null, at = null) => ({ u, legend: { t: 'word', w, al, sym, at } });

/** Rows rear → front. `u` is the slot width in key units; `arrows` is the inverted-T cluster (3u). */
const ROWS = [
  { fn: true, keys: [word(1.5, 'esc', 'left'), ...F_ICONS.map((icon, i) => ({ u: 1, legend: { t: 'fkey', icon, label: `F${i + 1}` } }))] },
  { keys: [...pairs([['~', '`'], ['!', '1'], ['@', '2'], ['#', '3'], ['$', '4'], ['%', '5'], ['^', '6'], ['&', '7'], ['*', '8'], ['(', '9'], [')', '0'], ['_', '-'], ['+', '=']]), word(1.5, 'delete', 'right', 'delete', 'tr')] },
  { keys: [word(1.5, 'tab', 'left', 'tab', 'tl'), ...letters('QWERTYUIOP'), ...pairs([['{', '['], ['}', ']'], ['|', '\\']])] },
  { keys: [word(1.75, 'caps lock', 'left', 'capsdot', 'tl'), ...letters('ASDFGHJKL'), ...pairs([[':', ';'], ['"', "'"]]), word(1.75, 'return', 'right', 'return', 'tr')] },
  { keys: [word(2.25, 'shift', 'left', 'shift', 'tl'), ...letters('ZXCVBNM'), ...pairs([['<', ','], ['>', '.'], ['?', '/']]), word(2.25, 'shift', 'right', 'shift', 'tr')] },
  { keys: [word(1, 'fn', 'left', 'globe', 'tr'), word(1, 'control', 'center', 'ctrl', 'tr'), word(1, 'option', 'center', 'opt', 'tr'), word(1.25, 'command', 'center', 'cmd', 'tr'),
    { u: 5, legend: { t: 'blank' } }, word(1.25, 'command', 'center', 'cmd', 'tl'), word(1, 'option', 'center', 'opt', 'tl'), { arrows: true }] },
];

/**
 * Every cap as { x, z, w, d, legend, touch } in world metres (cap centre and footprint).
 * The last entry is the Touch ID slot (touch: true); it gets an atlas cell but is not merged.
 */
export function layoutKeys() {
  const keys = [];
  const fnZ = K.z0 + FN_ROW_PITCH / 2;
  ROWS.forEach((row, r) => {
    const zc = row.fn ? fnZ : K.z0 + FN_ROW_PITCH + (r - 0.5) * K.pitch;
    const d = row.fn ? K.fnRowD : K.keyD;
    let u = 0;
    for (const k of row.keys) {
      if (k.arrows) {
        const zUp = zc - K.keyD / 2 + ARROW_D / 2;
        const zDn = zc + K.keyD / 2 - ARROW_D / 2;
        const x = (slot) => ROW_X0 + (u + slot + 0.5) * K.pitch;
        keys.push(
          { x: x(0), z: zDn, w: K.keyW, d: ARROW_D, legend: { t: 'arrow', dir: 'left' } },
          { x: x(1), z: zUp, w: K.keyW, d: ARROW_D, legend: { t: 'arrow', dir: 'up' } },
          { x: x(1), z: zDn, w: K.keyW, d: ARROW_D, legend: { t: 'arrow', dir: 'down' } },
          { x: x(2), z: zDn, w: K.keyW, d: ARROW_D, legend: { t: 'arrow', dir: 'right' } },
        );
        u += 3;
        continue;
      }
      keys.push({ x: ROW_X0 + (u + k.u / 2) * K.pitch, z: zc, w: k.u * K.pitch - KEY_GAP, d, legend: k.legend });
      u += k.u;
    }
  });
  keys.push({ x: ROW_X0 + (ROW_UNITS - 0.5) * K.pitch, z: fnZ, w: K.keyW, d: K.fnRowD, legend: { t: 'blank' }, touch: true });
  return keys;
}

/** Shelf-pack one atlas cell per cap (inner rect = cap footprint at ATLAS_PX_PER_MM, padded). */
export function packAtlas(keys) {
  const pxPerM = ATLAS_PX_PER_MM / MM;
  const order = keys.map((_, i) => i).sort((a, b) => keys[b].d - keys[a].d || keys[b].w - keys[a].w);
  const cells = new Array(keys.length);
  let x = 0, y = 0, shelf = 0;
  for (const i of order) {
    const w = Math.ceil(keys[i].w * pxPerM) + 2 * ATLAS_PAD;
    const h = Math.ceil(keys[i].d * pxPerM) + 2 * ATLAS_PAD;
    if (x + w > ATLAS_SIZE) {
      x = 0;
      y += shelf;
      shelf = 0;
    }
    if (y + h > ATLAS_SIZE) throw new Error('input: keycap atlas overflow');
    cells[i] = { x: x + ATLAS_PAD, y: y + ATLAS_PAD, w: w - 2 * ATLAS_PAD, h: h - 2 * ATLAS_PAD };
    x += w;
    shelf = Math.max(shelf, h);
  }
  return cells;
}

const KEYS = Object.freeze(layoutKeys());
const CELLS = Object.freeze(packAtlas(KEYS));

/* ---------------------------------------------------------------- atlas drawing */

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

function poly(g, pts, close = false) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (close) g.closePath();
}

function circle(g, cx, cy, r) {
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
}

function tri(g, cx, cy, dir, s) {
  const p = dir === 'right' ? [[cx - s, cy - s], [cx + s, cy], [cx - s, cy + s]]
    : dir === 'left' ? [[cx + s, cy - s], [cx - s, cy], [cx + s, cy + s]]
      : dir === 'up' ? [[cx - s, cy + s], [cx, cy - s], [cx + s, cy + s]]
        : [[cx - s, cy - s], [cx + s, cy - s], [cx, cy + s]];
  poly(g, p, true);
  g.fill();
}

function sun(g, r0, r1, r2) {
  circle(g, 0, 0, r0);
  g.fill();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    poly(g, [[Math.cos(a) * r1, Math.sin(a) * r1], [Math.cos(a) * r2, Math.sin(a) * r2]]);
    g.stroke();
  }
}

function speaker(g, dx) {
  poly(g, [[dx - 0.5, -0.18], [dx - 0.26, -0.18], [dx + 0.02, -0.42], [dx + 0.02, 0.42], [dx - 0.26, 0.18], [dx - 0.5, 0.18]], true);
  g.fill();
}

function volArc(g, dx, r) {
  g.beginPath();
  g.arc(dx + 0.02, 0, r, -Math.PI / 4, Math.PI / 4);
  g.stroke();
}

/** Symbols drawn as paths in a unit box, so no glyph depends on the viewer's fonts. */
const SYMBOL = {
  ctrl(g) { poly(g, [[-0.42, 0.25], [0, -0.25], [0.42, 0.25]]); g.stroke(); },
  opt(g) { poly(g, [[-0.5, -0.35], [-0.18, -0.35], [0.18, 0.35], [0.5, 0.35]]); g.stroke(); poly(g, [[0.12, -0.35], [0.5, -0.35]]); g.stroke(); },
  cmd(g) {
    g.strokeRect(-0.22, -0.22, 0.44, 0.44);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { circle(g, sx * 0.36, sy * 0.36, 0.16); g.stroke(); }
  },
  shift(g) { poly(g, [[0, -0.5], [0.5, 0.02], [0.24, 0.02], [0.24, 0.5], [-0.24, 0.5], [-0.24, 0.02], [-0.5, 0.02]], true); g.stroke(); },
  tab(g) { poly(g, [[-0.5, 0], [0.32, 0]]); g.stroke(); poly(g, [[0.1, -0.22], [0.32, 0], [0.1, 0.22]]); g.stroke(); poly(g, [[0.48, -0.3], [0.48, 0.3]]); g.stroke(); },
  delete(g) {
    poly(g, [[-0.5, 0], [-0.2, -0.32], [0.5, -0.32], [0.5, 0.32], [-0.2, 0.32]], true); g.stroke();
    poly(g, [[0.02, -0.14], [0.3, 0.14]]); g.stroke(); poly(g, [[0.02, 0.14], [0.3, -0.14]]); g.stroke();
  },
  return(g) { poly(g, [[0.42, -0.35], [0.42, 0.12], [-0.32, 0.12]]); g.stroke(); poly(g, [[-0.12, -0.1], [-0.34, 0.12], [-0.12, 0.34]]); g.stroke(); },
  globe(g) {
    circle(g, 0, 0, 0.45); g.stroke();
    g.beginPath(); g.ellipse(0, 0, 0.2, 0.45, 0, 0, Math.PI * 2); g.stroke();
    poly(g, [[-0.45, 0], [0.45, 0]]); g.stroke();
  },
  capsdot(g) { const f = g.fillStyle; g.fillStyle = LED; circle(g, 0, 0, 0.16); g.fill(); g.fillStyle = f; },
  sunLow(g) { sun(g, 0.13, 0.22, 0.34); },
  sunHigh(g) { sun(g, 0.19, 0.3, 0.48); },
  missionControl(g) { g.strokeRect(-0.48, -0.4, 0.56, 0.34); g.strokeRect(0.16, -0.4, 0.32, 0.34); g.strokeRect(-0.48, 0.06, 0.96, 0.34); },
  spotlight(g) { circle(g, -0.1, -0.1, 0.3); g.stroke(); poly(g, [[0.12, 0.12], [0.46, 0.46]]); g.stroke(); },
  dictation(g) {
    g.beginPath(); g.roundRect(-0.14, -0.48, 0.28, 0.56, 0.14); g.fill();
    g.beginPath(); g.arc(0, 0.02, 0.3, 0, Math.PI); g.stroke();
    poly(g, [[0, 0.32], [0, 0.48]]); g.stroke(); poly(g, [[-0.18, 0.48], [0.18, 0.48]]); g.stroke();
  },
  dnd(g) { circle(g, 0, 0, 0.42); g.fill(); const f = g.fillStyle; g.fillStyle = CAP_FILL; circle(g, 0.2, -0.14, 0.38); g.fill(); g.fillStyle = f; },
  rewind(g) { tri(g, -0.24, 0, 'left', 0.24); tri(g, 0.24, 0, 'left', 0.24); },
  fastForward(g) { tri(g, -0.24, 0, 'right', 0.24); tri(g, 0.24, 0, 'right', 0.24); },
  playPause(g) { tri(g, -0.26, 0, 'right', 0.24); g.fillRect(0.12, -0.24, 0.14, 0.48); g.fillRect(0.34, -0.24, 0.14, 0.48); },
  mute(g) { speaker(g, 0.1); poly(g, [[0.2, -0.16], [0.46, 0.16]]); g.stroke(); poly(g, [[0.2, 0.16], [0.46, -0.16]]); g.stroke(); },
  volDown(g) { speaker(g, -0.1); volArc(g, -0.1, 0.26); },
  volUp(g) { speaker(g, -0.16); volArc(g, -0.16, 0.24); volArc(g, -0.16, 0.42); },
  left(g) { tri(g, 0, 0, 'left', 0.34); },
  right(g) { tri(g, 0, 0, 'right', 0.34); },
  up(g) { tri(g, 0, 0, 'up', 0.34); },
  down(g) { tri(g, 0, 0, 'down', 0.34); },
};

function drawSymbol(g, name, cx, cy, size) {
  const fn = SYMBOL[name];
  if (!fn) return;
  g.save();
  g.translate(cx, cy);
  g.scale(size, size);
  g.lineWidth = 0.09;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  fn(g);
  g.restore();
}

function font(g, px, weight = 400) {
  g.font = `${weight} ${px}px ${FONT}`;
}

/** Draw one cap's legend; origin at the cap centre, wPx × dPx is the cap footprint in atlas pixels. */
function drawLegend(g, legend, wPx, dPx) {
  const S = ATLAS_PX_PER_MM;
  g.fillStyle = LEGEND;
  g.strokeStyle = LEGEND;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  switch (legend.t) {
    case 'letter':
      font(g, 4.4 * S, 500);
      g.fillText(legend.s, 0, 0.15 * S);
      break;
    case 'pair':
      font(g, 2.6 * S);
      g.fillText(legend.top, 0, -3.3 * S);
      g.fillText(legend.bot, 0, 3.5 * S);
      break;
    case 'word': {
      font(g, 2.0 * S);
      g.textAlign = legend.al;
      const x = legend.al === 'left' ? -wPx / 2 + 1.7 * S : legend.al === 'right' ? wPx / 2 - 1.7 * S : 0;
      g.fillText(legend.w, x, dPx / 2 - 2.3 * S);
      if (legend.sym) drawSymbol(g, legend.sym, legend.at === 'tl' ? -wPx / 2 + 2.7 * S : wPx / 2 - 2.7 * S, -dPx / 2 + 2.7 * S, 2.6 * S);
      break;
    }
    case 'fkey':
      drawSymbol(g, legend.icon, 0, -0.7 * S, 2.7 * S);
      font(g, 1.35 * S, 500);
      g.textAlign = 'right';
      g.fillText(legend.label, wPx / 2 - 1.1 * S, dPx / 2 - 1.5 * S);
      break;
    case 'arrow':
      drawSymbol(g, legend.dir, 0, 0, 2.2 * S);
      break;
    default:
      break;
  }
}

function drawAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const g = canvas.getContext('2d');
  g.fillStyle = CAP_FILL;
  g.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
  // Faint matte speckle so the caps read as textured plastic instead of flat paint.
  const rnd = seeded(41);
  for (let i = 0; i < 26000; i++) {
    g.fillStyle = i & 1 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.10)';
    g.fillRect(rnd() * ATLAS_SIZE, rnd() * ATLAS_SIZE, 2, 2);
  }
  const pxPerM = ATLAS_PX_PER_MM / MM;
  KEYS.forEach((k, i) => {
    const c = CELLS[i];
    g.save();
    g.translate(c.x + c.w / 2, c.y + c.h / 2);
    drawLegend(g, k.legend, k.w * pxPerM, k.d * pxPerM);
    g.restore();
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ---------------------------------------------------------------- materials (created once, lazily: the atlas needs a canvas) */

let keycapMat = null;
let backlightMat = null;
let trackpadGlassMat = null;
let brushedSteelMat = null;

function ensureMaterials() {
  if (keycapMat) return;
  const atlas = drawAtlas();
  keycapMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: atlas, roughness: 0.65, metalness: 0,
    emissive: 0xffffff, emissiveMap: atlas, emissiveIntensity: 0.35,
  });
  keycapMat.name = 'keycapLegend';
  backlightMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.95, metalness: 0, emissive: 0xffffff, emissiveIntensity: 0.05 });
  backlightMat.name = 'backlight';
  trackpadGlassMat = new THREE.MeshPhysicalMaterial({ color: 0x222225, roughness: 0.25, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.15 });
  trackpadGlassMat.name = 'trackpadGlass';
  brushedSteelMat = new THREE.MeshPhysicalMaterial({ color: 0x9a9da2, metalness: 1, roughness: 0.38, anisotropy: 0.65 });
  brushedSteelMat.name = 'brushedSteel';
}

/* ---------------------------------------------------------------- geometry helpers */

/**
 * Rounded keycap without its bottom face, every vertex planar-projected (x, z) into the cap's
 * atlas cell so the top carries the legend and the sides sample the cell's dark rim.
 */
function keycapGeometry(w, h, d, cell) {
  const rb = new RoundedBoxGeometry(w, h, d, KEY_SEGMENTS, KEY_RADIUS);
  const pos = rb.attributes.position.array;
  const nor = rb.attributes.normal.array;
  const perFace = pos.length / 6;
  const keep = [0, 1, 2, 4, 5]; // BoxGeometry face order: +x, −x, +y, −y, +z, −z — drop −y
  const p = new Float32Array(perFace * keep.length);
  const n = new Float32Array(perFace * keep.length);
  keep.forEach((f, i) => {
    p.set(pos.subarray(f * perFace, (f + 1) * perFace), i * perFace);
    n.set(nor.subarray(f * perFace, (f + 1) * perFace), i * perFace);
  });
  const uv = new Float32Array((p.length / 3) * 2);
  for (let i = 0, j = 0; i < p.length; i += 3, j += 2) {
    const fx = p[i] / w + 0.5;
    const fz = p[i + 2] / d + 0.5; // +z (toward the user) is down the canvas
    uv[j] = (cell.x + fx * cell.w) / ATLAS_SIZE;
    uv[j + 1] = 1 - (cell.y + fz * cell.h) / ATLAS_SIZE;
  }
  rb.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

function roundedRectShape(w, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Trackpad glass: rounded-rect plate with filleted top and bottom edges; top face at local y = 0. */
function trackpadGlassGeometry() {
  const b = TRACKPAD_BEVEL;
  const shape = roundedRectShape(T.w - 2 * b, T.d - 2 * b, TRACKPAD_CORNER_R - b);
  const depth = T.glassT - 2 * b;
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 6 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -(depth + b), 0);
  return g;
}

function tapticGeometry() {
  const [tw, th, td] = T.tapticSize;
  const bodyH = th - TAPTIC_COIL_R;
  const body = new RoundedBoxGeometry(tw, bodyH, td, 1, TAPTIC_RADIUS).translate(0, -TAPTIC_COIL_R / 2, 0);
  const coils = [-1, 1].map((s) => new THREE.CylinderGeometry(TAPTIC_COIL_R, TAPTIC_COIL_R, TAPTIC_COIL_LEN, 20)
    .toNonIndexed().rotateZ(Math.PI / 2).translate(s * TAPTIC_COIL_X, th / 2 - TAPTIC_COIL_R, 0));
  const merged = mergeGeometries([body, mergeGeometries(coils, false)], true);
  body.dispose();
  for (const c of coils) c.dispose();
  return merged;
}

function touchIdGeometry(cell) {
  const cap = keycapGeometry(K.keyW, KEY_BODY_H, K.fnRowD, cell);
  const disc = new THREE.CylinderGeometry(TOUCH_DISC_R, TOUCH_DISC_R, TOUCH_DISC_T, 40).toNonIndexed().translate(0, KEY_BODY_H / 2, 0);
  const merged = mergeGeometries([cap, disc], true);
  cap.dispose();
  disc.dispose();
  return merged;
}

/* ---------------------------------------------------------------- build */

export function build(parent, chip, ctx) {
  const { mats } = ctx;
  ensureMaterials();
  const g = ctx.tag(new THREE.Group(), NAME);
  parent.add(g);

  /* Keyboard */
  const kb = ctx.tag(new THREE.Group(), 'Keyboard');
  g.add(kb);

  const capGeos = [];
  let touchCell = null;
  KEYS.forEach((k, i) => {
    if (k.touch) {
      touchCell = CELLS[i];
      return;
    }
    capGeos.push(keycapGeometry(k.w, KEY_BODY_H, k.d, CELLS[i]).translate(k.x - KEY_CENTRE.x, 0, k.z - KEY_CENTRE.z));
  });
  const grid = new THREE.Mesh(mergeGeometries(capGeos, false), keycapMat);
  for (const c of capGeos) c.dispose();
  grid.position.set(KEY_CENTRE.x, KEY_CENTRE.y, KEY_CENTRE.z);
  kb.add(ctx.tag(grid, 'KeyGrid'));

  const backlight = new THREE.Mesh(new THREE.PlaneGeometry(K.x1 - K.x0, K.z1 - K.z0).rotateX(-Math.PI / 2), backlightMat);
  backlight.position.set(KEY_CENTRE.x, BASE.h - K.wellDepth + BACKLIGHT_LIFT, KEY_CENTRE.z);
  kb.add(ctx.tag(backlight, 'Backlight'));

  /* Touch ID: keycap body + sapphire sensor disc as two material groups of one mesh */
  const touch = KEYS[KEYS.length - 1];
  const touchId = new THREE.Mesh(touchIdGeometry(touchCell), [keycapMat, mats.cameraLens]);
  touchId.position.set(touch.x, KEY_CENTRE.y, touch.z);
  g.add(ctx.tag(touchId, 'TouchIDButton'));

  /* Trackpad (group origin on the deck plane at the trackpad centre) */
  const tp = ctx.tag(new THREE.Group(), 'Trackpad');
  tp.position.set(T.cx, BASE.h, T.cz);
  g.add(tp);

  const glass = new THREE.Mesh(trackpadGlassGeometry(), trackpadGlassMat);
  glass.position.y = TRACKPAD_PROUD;
  tp.add(ctx.tag(glass, 'Trackpad.Glass'));

  const plate = new THREE.Mesh(new RoundedBoxGeometry(T.w - 2 * PLATE_INSET, T.plateT, T.d - 2 * PLATE_INSET, 1, PLATE_RADIUS), brushedSteelMat);
  plate.position.y = -BASE.deckT - T.plateT / 2;
  tp.add(ctx.tag(plate, 'StrainGaugePlate'));

  const [, th, td] = T.tapticSize;
  const taptic = new THREE.Mesh(tapticGeometry(), [mats.packageBlack, mats.copper]);
  taptic.position.set(0, -BASE.deckT - T.plateT - th / 2, T.d / 2 - td / 2 + td / 2);
  tp.add(ctx.tag(taptic, 'TapticEngine'));

  const flex = new THREE.Mesh(new RoundedBoxGeometry(FLEX_W, FLEX_T, FLEX_LEN, 1, FLEX_T / 2), mats.flex);
  flex.position.set(0, -BASE.deckT - T.plateT - FLEX_T / 2, -T.d / 2 + PLATE_INSET - FLEX_LEN / 2);
  tp.add(ctx.tag(flex, 'TrackpadFlex'));

  return g;
}

export const explodeOffsets = {
  Trackpad: [0, EXPLODE.trackpad, 0],
};
