/**
 * src/materials.js — every material in the model, created once and shared.
 *
 * createMaterials() returns a frozen object; scene modules pick from it and never create their
 * own materials. Textures are procedural CanvasTextures (no external files) with a seeded PRNG so
 * two builds render pixel-identical. disposeMaterials(mats) frees GPU resources.
 */

import * as THREE from 'three';

export const ORANGE = '#E8590C';
export const BLUE = '#1C64F2';

/** Small deterministic PRNG (mulberry32) so procedural textures never change between runs. */
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

function canvasTexture(size, repeat, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Black solder mask with copper pads and a few traces. */
function pcbTexture() {
  return canvasTexture(256, 6, (g, s) => {
    const rnd = seeded(7);
    g.fillStyle = '#0f1113';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#7a4d22';
    g.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      const x = rnd() * s, y = rnd() * s;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(rnd() > 0.5 ? x + (rnd() - 0.5) * 120 : x, rnd() > 0.5 ? y + (rnd() - 0.5) * 120 : y);
      g.stroke();
    }
    g.fillStyle = '#b87333';
    for (let i = 0; i < 110; i++) {
      const r = 1.5 + rnd() * 2.5;
      g.beginPath();
      g.arc(rnd() * s, rnd() * s, r, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** Dark silicon with a faint metal-layer grid. */
function siliconTexture() {
  return canvasTexture(256, 8, (g, s) => {
    g.fillStyle = '#1c1f26';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#272b34';
    g.lineWidth = 1;
    for (let p = 0; p < s; p += 16) {
      g.beginPath();
      g.moveTo(p + 0.5, 0);
      g.lineTo(p + 0.5, s);
      g.moveTo(0, p + 0.5);
      g.lineTo(s, p + 0.5);
      g.stroke();
    }
  });
}

const Std = THREE.MeshStandardMaterial;
const Phys = THREE.MeshPhysicalMaterial;

export function createMaterials() {
  const mats = {
    aluminium: new Std({ color: 0x2b2b2e, metalness: 0.9, roughness: 0.35 }),
    aluminiumInner: new Std({ color: 0x3c3c40, metalness: 0.85, roughness: 0.5 }),
    glass: new Phys({ color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 0.9, ior: 1.5, thickness: 0.0005, transparent: true }),
    screen: new Std({ color: 0x0a0a0c, roughness: 0.15, metalness: 0 }),
    bezel: new Std({ color: 0x050505, roughness: 0.6, metalness: 0 }),
    plastic: new Std({ color: 0x1a1a1a, roughness: 0.8, metalness: 0 }),
    keycap: new Std({ color: 0x111111, roughness: 0.7, metalness: 0 }),
    rubber: new Std({ color: 0x161616, roughness: 0.95, metalness: 0 }),
    pcb: new Std({ color: 0xffffff, map: pcbTexture(), roughness: 0.55, metalness: 0.1 }),
    copper: new Std({ color: 0xb87333, metalness: 1, roughness: 0.3 }),
    copperPad: new Std({ color: 0xb87333, metalness: 1, roughness: 0.3 }),
    silicon: new Std({ color: 0xffffff, map: siliconTexture(), roughness: 0.35, metalness: 0.2 }),
    siliconUnit: new Std({ color: 0x2a2f3a, roughness: 0.35, metalness: 0.2 }),
    solderBall: new Std({ color: 0x9aa0a6, metalness: 1, roughness: 0.35 }),
    packageBlack: new Std({ color: 0x101010, roughness: 0.5, metalness: 0.1 }),
    steel: new Std({ color: 0x8d9196, metalness: 1, roughness: 0.4 }),
    batteryFoil: new Std({ color: 0x3a3d42, metalness: 0.6, roughness: 0.5 }),
    flex: new Std({ color: 0xc07a1c, roughness: 0.5, metalness: 0, transparent: true, opacity: 0.9 }),
    speakerMesh: new Std({ color: 0x0d0d0d, roughness: 0.9, metalness: 0 }),
    ledLens: new Std({ color: 0x7cff7c, emissive: 0x7cff7c, emissiveIntensity: 1.5, roughness: 0.3 }),
    cameraLens: new Phys({ color: 0x000000, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 }),
    layerTranslucent: new Phys({ color: BLUE, transparent: true, opacity: 0.35, roughness: 0.3, side: THREE.DoubleSide, depthWrite: false }),
    layerTranslucentAlt: new Phys({ color: ORANGE, transparent: true, opacity: 0.35, roughness: 0.3, side: THREE.DoubleSide, depthWrite: false }),
    highlight: new Std({ color: ORANGE, emissive: ORANGE, emissiveIntensity: 0.8, roughness: 0.4 }),
    ORANGE,
    BLUE,
  };
  for (const [name, m] of Object.entries(mats)) if (m.isMaterial) m.name = name;
  return Object.freeze(mats);
}

export function disposeMaterials(mats) {
  for (const m of Object.values(mats)) {
    if (!m?.isMaterial) continue;
    m.map?.dispose();
    m.emissiveMap?.dispose();
    m.roughnessMap?.dispose();
    m.dispose();
  }
}
