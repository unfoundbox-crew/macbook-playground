/**
 * src/scene/audio.js — the six-speaker system and the mic array.
 *
 *   WooferL[0..1] / WooferR[0..1]   force-cancelling woofer pairs at the front corners. Each is a flat
 *                                   housing (extruded rounded plate, every edge and the driver cutout rim
 *                                   filleted) stacked back to back: the lower driver fires down, the upper
 *                                   fires up. The cutout holds an untagged driver — rubber surround, cone,
 *                                   dust cap and a steel magnet on the back — so it reads from both sides.
 *   TweeterL / TweeterR             filleted lathe housings with a rubber ring and a metal dome on top.
 *   Mic[0..2]                       MEMS mic cans hanging from a flex strip under the deck, along the left grille.
 *   SpeakerGrilleL / SpeakerGrilleR thin aluminium plates whose top face sits flush with the deck (y = BASE.h);
 *                                   each carries an InstancedMesh of hex-packed hole discs (≤ 600) so the
 *                                   strip reads as perforated.
 *
 * Static subassembly: no explode offsets, nothing chip-dependent, no per-frame work. Untagged detail
 * meshes are children of the tagged mesh they belong to, so they hide with the dial and move with any
 * exploding ancestor. Every number below derives from dims.js.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { AUDIO, SPEAKER_GRILLE, INTERIOR, BASE, BATTERY, MM } from '../dims.js';

export const NAME = 'Audio';

/* ------------------------------------------------------------------ derived dimensions */

const W = AUDIO.woofer;
const T = AUDIO.tweeter;
const S = SPEAKER_GRILLE;

const WOOFER_BEVEL = W.t * 0.12;                 // fillet on every housing edge and on the cutout rim
const WOOFER_CORNER = W.w * 0.12;                // plan-view corner radius of the housing
const WOOFER_HOLE_R = W.w * 0.40;                // driver cutout radius at the face
const SURROUND_TUBE = W.w * 0.03;                // rubber surround half-width
const CONE_R = WOOFER_HOLE_R - 2 * SURROUND_TUBE;
const CONE_DEPTH = W.t * 0.45;                   // how far the cone sinks below the face
const CAP_R = CONE_R * 0.32;                     // dust cap / cone apex radius
const DOME_H = CONE_DEPTH * 0.55;
const MAGNET_R = CONE_R * 0.6;
const MAGNET_H = W.t - CONE_DEPTH - WOOFER_BEVEL;
const WOOFER_Y0 = INTERIOR.y0 + W.t / 2;         // centre of the lower housing
const WOOFER_STEP = W.t + W.stackGap;            // centre-to-centre of the stack

const TWEETER_FILLET = T.t * 0.25;
const TWEETER_DOME_R = T.radius * 0.45;
const TWEETER_DOME_H = T.t * 0.5;
const TWEETER_RING_TUBE = T.radius * 0.06;
const TWEETER_RING_R = TWEETER_DOME_R + TWEETER_RING_TUBE;
const TWEETER_Y = INTERIOR.y0 + T.t / 2;

const MIC_H = AUDIO.micRadius;
const MIC_FILLET = AUDIO.micRadius * 0.2;
const FLEX_T = BATTERY.bmsFlex.t;               // the model's one flex-circuit thickness
const MIC_FLEX_W = AUDIO.micRadius * 4;
const MIC_Y = INTERIOR.y1 - FLEX_T - MIC_H / 2;  // flex against the deck underside, can hangs below it

const GRILLE_T = BASE.deckT * 0.5;               // plate sits in the deck, top face flush with it
const GRILLE_LIFT = 0.05 * MM;                   // above the deck top so the plate never z-fights the TopCase
const GRILLE_LEN = S.z1 - S.z0;
const GRILLE_CZ = (S.z0 + S.z1) / 2;
const GRILLE_Y = BASE.h + GRILLE_LIFT - GRILLE_T / 2;
const HOLE_R = S.holePitch * 0.25;
const HOLE_LIFT = 0.03 * MM;                     // discs float a hair above the plate top
const HOLE_MARGIN = S.holePitch;                 // no hole within one pitch of the plate edge
const HOLE_ROW_PITCH = S.holePitch * (Math.sqrt(3) / 2); // hex packing
const MAX_HOLES = 600;

const SEG = Object.freeze({ housingCurve: 16, bevel: 3, cone: 40, torusRadial: 8, torusTube: 40, dome: 24, magnet: 32, lathe: 40, mic: 20, hole: 12 });

/* ------------------------------------------------------------------ materials materials.js lacks (created once) */

const diaphragmMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide });
diaphragmMat.name = 'audioDiaphragm';
/** Unlit black: a hole in the deck is a void, it never catches the environment. */
const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
holeMat.name = 'audioGrilleHole';

/* ------------------------------------------------------------------ geometry helpers */

function roundedRectShape(hw, hd, r) {
  const s = new THREE.Shape();
  s.moveTo(-hw + r, -hd);
  s.lineTo(hw - r, -hd);
  s.absarc(hw - r, -hd + r, r, -Math.PI / 2, 0, false);
  s.lineTo(hw, hd - r);
  s.absarc(hw - r, hd - r, r, 0, Math.PI / 2, false);
  s.lineTo(-hw + r, hd);
  s.absarc(-hw + r, hd - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-hw, -hd + r);
  s.absarc(-hw + r, -hd + r, r, Math.PI, Math.PI * 1.5, false);
  s.closePath();
  return s;
}

/** Weld the extrude's duplicated vertices and recompute normals so bevels shade as smooth fillets. */
function smoothed(geo) {
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  const merged = mergeVertices(geo, 1e-7);
  geo.dispose();
  merged.computeVertexNormals();
  return merged;
}

/** Woofer housing: w × t × d rounded plate with a bevelled circular cutout, centred, faces along ±Y. */
function wooferHousingGeometry() {
  const shape = roundedRectShape(W.w / 2 - WOOFER_BEVEL, W.d / 2 - WOOFER_BEVEL, WOOFER_CORNER);
  const hole = new THREE.Path();
  hole.absarc(0, 0, WOOFER_HOLE_R, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const depth = W.t - 2 * WOOFER_BEVEL;
  const geo = smoothed(new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: WOOFER_BEVEL, bevelSize: WOOFER_BEVEL, bevelOffset: 0,
    bevelSegments: SEG.bevel, curveSegments: SEG.housingCurve,
  }));
  geo.rotateX(-Math.PI / 2);   // extrude axis → +Y
  geo.translate(0, -depth / 2, 0);
  return geo;
}

function pushArc(pts, cx, cy, r, a0, a1, n) {
  for (let i = 1; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
}

/** Cylinder of radius r, height h with fillet f on both rims (G1 lathe profile, so normals stay smooth), centred. */
function filletedCylinderGeometry(r, h, f, radial) {
  const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(r - f, 0)];
  pushArc(pts, r - f, f, f, -Math.PI / 2, 0, 5);
  pts.push(new THREE.Vector2(r, h - f));
  pushArc(pts, r - f, h - f, f, 0, Math.PI / 2, 5);
  pts.push(new THREE.Vector2(0, h));
  const geo = new THREE.LatheGeometry(pts, radial);
  geo.translate(0, -h / 2, 0);
  return geo;
}

/** Hex-packed hole centres in plate-local XZ, capped at MAX_HOLES. */
function holePositions() {
  const out = [];
  const halfW = S.w / 2 - HOLE_MARGIN;
  const halfL = GRILLE_LEN / 2 - HOLE_MARGIN;
  const cols = Math.floor((2 * halfW) / S.holePitch) + 1;
  const rows = Math.floor((2 * halfL) / HOLE_ROW_PITCH) + 1;
  const x0 = (-(cols - 1) * S.holePitch) / 2;
  const z0 = (-(rows - 1) * HOLE_ROW_PITCH) / 2;
  for (let r = 0; r < rows; r++) {
    const odd = r % 2;
    for (let c = 0; c < cols - odd; c++) {
      if (out.length >= MAX_HOLES) return out;
      out.push([x0 + c * S.holePitch + (odd * S.holePitch) / 2, z0 + r * HOLE_ROW_PITCH]);
    }
  }
  return out;
}

const _m = new THREE.Matrix4();

/* ------------------------------------------------------------------ build */

export function build(parent, chip, ctx) {
  const { mats } = ctx;
  const g = ctx.tag(new THREE.Group(), NAME);
  parent.add(g);

  /* -- woofers: shared geometry for the four housings and four drivers -- */
  const housingGeo = wooferHousingGeometry();
  const surroundGeo = new THREE.TorusGeometry(CONE_R + SURROUND_TUBE, SURROUND_TUBE, SEG.torusRadial, SEG.torusTube);
  const coneGeo = new THREE.CylinderGeometry(CONE_R, CAP_R, CONE_DEPTH, SEG.cone, 1, true);
  const domeGeo = new THREE.SphereGeometry(CAP_R, SEG.dome, SEG.dome / 3, 0, Math.PI * 2, 0, Math.PI / 2);
  const magnetGeo = new THREE.CylinderGeometry(MAGNET_R, MAGNET_R, MAGNET_H, SEG.magnet);

  /** Driver parts in housing-local space, face at +Y; rotated π about X for a downward-firing driver. */
  function driver(faceUp) {
    const d = new THREE.Group();
    const face = W.t / 2;
    const surround = new THREE.Mesh(surroundGeo, mats.rubber);
    surround.rotation.x = Math.PI / 2;
    surround.position.y = face - SURROUND_TUBE * 0.5;
    const cone = new THREE.Mesh(coneGeo, diaphragmMat);
    cone.position.y = face - CONE_DEPTH / 2;
    const cap = new THREE.Mesh(domeGeo, diaphragmMat);
    cap.position.y = face - CONE_DEPTH;
    cap.scale.y = DOME_H / CAP_R;
    const magnet = new THREE.Mesh(magnetGeo, mats.steel);
    magnet.position.y = -face + MAGNET_H / 2;
    d.add(surround, cone, cap, magnet);
    if (!faceUp) d.rotation.x = Math.PI;
    return d;
  }

  for (const [key, x] of [['WooferL', W.xL], ['WooferR', W.xR]]) {
    for (let i = 0; i < 2; i++) {
      const housing = new THREE.Mesh(housingGeo, mats.speakerMesh);
      housing.position.set(x, WOOFER_Y0 + i * WOOFER_STEP, W.z);
      housing.add(driver(i === 1)); // lower fires down, upper fires up: back to back
      g.add(ctx.tag(housing, key, i));
    }
  }

  /* -- tweeters -- */
  const tweeterGeo = filletedCylinderGeometry(T.radius, T.t, TWEETER_FILLET, SEG.lathe);
  const tweeterRingGeo = new THREE.TorusGeometry(TWEETER_RING_R, TWEETER_RING_TUBE, SEG.torusRadial, SEG.torusTube);
  const tweeterDomeGeo = new THREE.SphereGeometry(TWEETER_DOME_R, SEG.dome, SEG.dome / 3, 0, Math.PI * 2, 0, Math.PI / 2);
  for (const [key, x] of [['TweeterL', T.xL], ['TweeterR', T.xR]]) {
    const housing = new THREE.Mesh(tweeterGeo, mats.speakerMesh);
    housing.position.set(x, TWEETER_Y, T.z);
    const ring = new THREE.Mesh(tweeterRingGeo, mats.rubber);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = T.t / 2;
    const dome = new THREE.Mesh(tweeterDomeGeo, mats.aluminiumInner);
    dome.position.y = T.t / 2;
    dome.scale.y = TWEETER_DOME_H / TWEETER_DOME_R;
    housing.add(ring, dome);
    g.add(ctx.tag(housing, key));
  }

  /* -- mics on a flex under the deck -- */
  const micGeo = filletedCylinderGeometry(AUDIO.micRadius, MIC_H, MIC_FILLET, SEG.mic);
  const zs = AUDIO.mics.map(([, z]) => z);
  const zMin = Math.min(...zs);
  const zMax = Math.max(...zs);
  const flexLen = zMax - zMin + 2 * MIC_FLEX_W;
  const carrier = Math.floor(AUDIO.mics.length / 2); // the flex strip rides on the middle mic
  AUDIO.mics.forEach(([x, z], i) => {
    const can = new THREE.Mesh(micGeo, mats.packageBlack);
    can.position.set(x, MIC_Y, z);
    if (i === carrier) {
      const flex = new THREE.Mesh(new THREE.BoxGeometry(MIC_FLEX_W, FLEX_T, flexLen), mats.flex);
      flex.position.set(0, MIC_H / 2 + FLEX_T / 2, (zMin + zMax) / 2 - z);
      can.add(flex);
    }
    g.add(ctx.tag(can, 'Mic', i));
  });

  /* -- grilles: plate + instanced hole discs -- */
  const plateGeo = new RoundedBoxGeometry(S.w, GRILLE_T, GRILLE_LEN, 2, GRILLE_T * 0.45);
  const holeGeo = new THREE.CircleGeometry(HOLE_R, SEG.hole);
  holeGeo.rotateX(-Math.PI / 2); // face +Y
  const holes = holePositions();
  for (const [key, x] of [['SpeakerGrilleL', S.xL], ['SpeakerGrilleR', S.xR]]) {
    const plate = new THREE.Mesh(plateGeo, mats.aluminium);
    plate.position.set(x, GRILLE_Y, GRILLE_CZ);
    const inst = new THREE.InstancedMesh(holeGeo, holeMat, holes.length);
    for (let i = 0; i < holes.length; i++) {
      _m.makeTranslation(holes[i][0], GRILLE_T / 2 + HOLE_LIFT, holes[i][1]);
      inst.setMatrixAt(i, _m);
    }
    inst.instanceMatrix.needsUpdate = true;
    plate.add(inst);
    g.add(ctx.tag(plate, key));
  }
  return g;
}

/** Static subassembly: nothing in Audio has an explode stage. */
export const explodeOffsets = {};
