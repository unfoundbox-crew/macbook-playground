/**
 * src/scene/soc-stream.js — BandwidthStream (soc lane; see soc.js and soc-die.js).
 *
 * One THREE.Points of STREAM_COUNT particles. Each particle belongs to one LPDDR module and cycles from
 * that module's inner edge to the nearest edge of the die footprint and back, arcing a little above the
 * package. Speed follows chip.bandwidth_gbs: one traverse (one way) takes TRAVERSE_GBS / bandwidth
 * seconds. Colours alternate the two accents. The node is an effect (userData.effect = true, untagged).
 *
 * All per-particle state lives in Float32Arrays allocated by layoutStream (once per chip); updateStream
 * writes the position attribute in place and allocates nothing.
 */

import * as THREE from 'three';
import { MM } from '../dims.js';
import { ORANGE, BLUE } from '../materials.js';

export const STREAM_NAME = 'BandwidthStream';
export const STREAM_COUNT = 600;
/** Bandwidth (GB/s) at which one traverse takes exactly one second. */
export const TRAVERSE_GBS = 200;
export const FALLBACK_BANDWIDTH_GBS = 100;

const POINT_SIZE = 0.6 * MM;
/** Peak height of a particle's arc above its baseline. */
const ARC_MAX = 1.6 * MM;
/** Per-particle speed multiplier range, so the stream reads as flow rather than a marching grid. */
const SPEED_JITTER = 0.4;
/** How much of a module's edge the particles spread across. */
const EDGE_FILL = 0.85;
/** Particles drawn per LPDDR module (the buffer always holds STREAM_COUNT; the draw range follows the module count). */
const PER_MODULE = 200;
const SPRITE_PX = 32;

/** Soft round sprite so the particles read as glowing dots, not squares, at 2× DPR. */
function spriteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_PX;
  canvas.height = SPRITE_PX;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(SPRITE_PX / 2, SPRITE_PX / 2, 0, SPRITE_PX / 2, SPRITE_PX / 2, SPRITE_PX / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let material = null;
function mat() {
  if (!material) {
    material = new THREE.PointsMaterial({
      size: POINT_SIZE, sizeAttenuation: true, vertexColors: true, map: spriteTexture(), alphaTest: 0.05,
      transparent: true, opacity: 0.95, depthWrite: false,
    });
    material.name = 'soc.stream';
  }
  return material;
}

/** Small deterministic PRNG (mulberry32) so two builds lay the stream out identically. */
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

/** Create the (empty) stream node. Call layoutStream before the first frame. */
export function createStream() {
  const n = STREAM_COUNT;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const colour = new Float32Array(n * 3);
  const a = new THREE.Color(ORANGE);
  const b = new THREE.Color(BLUE);
  for (let i = 0; i < n; i++) {
    const c = i % 2 ? b : a;
    colour[i * 3] = c.r;
    colour[i * 3 + 1] = c.g;
    colour[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colour, 3));
  geo.attributes.position.setUsage(THREE.DynamicDrawUsage);

  const pts = new THREE.Points(geo, mat());
  pts.name = STREAM_NAME;
  pts.userData.effect = true;
  pts.frustumCulled = false;
  pts.userData.stream = {
    phase: new Float32Array(n),   // 0..2: 0→1 module → die, 1→2 back
    mul: new Float32Array(n),
    start: new Float32Array(n * 3),
    end: new Float32Array(n * 3),
    arc: new Float32Array(n),
    speed: 0,                     // traverses per second
  };
  return pts;
}

/**
 * Lay the particles out for a chip.
 * links: one per LPDDR module, in package-local metres:
 *   { sx, sz  module inner-edge centre;  ex, ez  nearest die-edge point;  px, pz  unit vector along that edge;
 *     half    half-length of the module edge;  lo, hi  clamp range (along px/pz) for the die end;  y  baseline }
 * bandwidth: chip.bandwidth_gbs (null → FALLBACK_BANDWIDTH_GBS).
 */
export function layoutStream(pts, links, bandwidth) {
  const d = pts.userData.stream;
  const n = STREAM_COUNT;
  const rnd = seeded(11);
  const bw = Number.isFinite(bandwidth) && bandwidth > 0 ? bandwidth : FALLBACK_BANDWIDTH_GBS;
  d.speed = bw / TRAVERSE_GBS;
  const pos = pts.geometry.attributes.position.array;
  const count = links.length;
  for (let i = 0; i < n; i++) {
    const L = links[i % Math.max(1, count)];
    const j = (rnd() * 2 - 1) * L.half * EDGE_FILL;
    const je = Math.min(L.hi, Math.max(L.lo, j));
    d.start[i * 3] = L.sx + L.px * j;
    d.start[i * 3 + 1] = L.y;
    d.start[i * 3 + 2] = L.sz + L.pz * j;
    d.end[i * 3] = L.ex + L.px * je;
    d.end[i * 3 + 1] = L.y;
    d.end[i * 3 + 2] = L.ez + L.pz * je;
    d.phase[i] = rnd() * 2;
    d.mul[i] = 1 - SPEED_JITTER / 2 + rnd() * SPEED_JITTER;
    d.arc[i] = ARC_MAX * (0.5 + 0.5 * rnd());
    pos[i * 3] = d.start[i * 3];
    pos[i * 3 + 1] = d.start[i * 3 + 1];
    pos[i * 3 + 2] = d.start[i * 3 + 2];
  }
  pts.visible = count > 0;
  pts.geometry.setDrawRange(0, Math.min(n, Math.max(PER_MODULE, PER_MODULE * count)));
  pts.geometry.attributes.position.needsUpdate = true;
}

/** Per-frame: advance phases by dt seconds and rewrite positions. Zero allocations. */
export function updateStream(pts, dt, visible) {
  pts.visible = visible;
  if (!visible) return;
  const d = pts.userData.stream;
  const pos = pts.geometry.attributes.position.array;
  const { phase, mul, start, end, arc } = d;
  const step = d.speed * dt;
  for (let i = 0; i < STREAM_COUNT; i++) {
    let p = phase[i] + step * mul[i];
    if (p >= 2) p -= 2;
    phase[i] = p;
    const u = p < 1 ? p : 2 - p;
    const i3 = i * 3;
    pos[i3] = start[i3] + (end[i3] - start[i3]) * u;
    pos[i3 + 1] = start[i3 + 1] + arc[i] * Math.sin(Math.PI * u);
    pos[i3 + 2] = start[i3 + 2] + (end[i3 + 2] - start[i3 + 2]) * u;
  }
  pts.geometry.attributes.position.needsUpdate = true;
}
