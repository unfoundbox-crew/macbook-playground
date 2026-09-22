/**
 * src/scene/display.js — stub. The lid as five stacked layer boxes in lid-local space (see
 * CONTRACT.md: origin at the hinge axis, +Z hinge → free edge, glass on the −Y side).
 * The display lane replaces this file.
 */

import * as THREE from 'three';
import { HINGE, LID, SCREEN, EXPLODE } from '../dims.js';

export const NAME = 'Display';
const DEG = Math.PI / 180;

function layerY(range) {
  return LID.gap + (range[0] + range[1]) / 2;
}
function layerT(range) {
  return range[1] - range[0];
}

function box(ctx, parent, key, mat, [w, h, d], [x, y, z]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(ctx.tag(m, key));
  return m;
}

export function build(parent, chip, ctx) {
  const { mats } = ctx;
  const g = ctx.tag(new THREE.Group(), NAME);
  g.position.set(0, HINGE.y, HINGE.z);
  g.rotation.x = -ctx.state.lidAngleDeg * DEG;
  parent.add(g);

  const L = LID.layers;
  const zLid = LID.zRear + LID.d / 2;
  const zScreen = (SCREEN.zBottom + SCREEN.zTop) / 2;

  box(ctx, g, 'Display.Glass', mats.glass, [LID.w, layerT(L.glass), LID.d], [0, layerY(L.glass), zLid]);
  box(ctx, g, 'Bezel', mats.bezel, [LID.w, layerT(L.bezel), LID.d], [0, layerY(L.bezel), zLid]);
  box(ctx, g, 'LCDPanel', mats.screen, [SCREEN.w, layerT(L.lcd), SCREEN.h], [0, layerY(L.lcd), zScreen]);
  box(ctx, g, 'MiniLEDBacklight', mats.plastic, [SCREEN.w, layerT(L.backlight), SCREEN.h], [0, layerY(L.backlight), zScreen]);
  box(ctx, g, 'LidShell', mats.aluminium, [LID.w, layerT(L.shell), LID.d], [0, layerY(L.shell), zLid]);

  const notch = ctx.tag(new THREE.Group(), 'NotchModule');
  notch.position.set(0, layerY(L.lcd), SCREEN.zTop - SCREEN.notch.h / 2);
  g.add(notch);
  const r = SCREEN.cameraRadius;
  const camT = layerT(L.lcd);
  const cam = new THREE.Mesh(new THREE.CylinderGeometry(r, r, camT, 24), mats.cameraLens);
  notch.add(ctx.tag(cam, 'Camera'));
  const led = new THREE.Mesh(new THREE.CylinderGeometry(r / 3, r / 3, camT, 12), mats.ledLens);
  led.position.x = r * 3;
  notch.add(ctx.tag(led, 'CameraLED'));
  box(ctx, notch, 'AmbientLightSensor', mats.plastic, [r, camT, r], [-r * 3, 0, 0]);

  box(ctx, g, 'LidAngleSensor', mats.packageBlack, [HINGE.radius, HINGE.radius, HINGE.radius], [HINGE.xR - HINGE.length, layerY(L.shell), 0]);
  box(ctx, g, 'DisplayFlex', mats.flex, [SCREEN.notch.w, layerT(L.bezel), -LID.zRear * 2], [0, LID.gap, 0]);
  return g;
}

/** Lid layers fan along the lid normal (local +Y), glass stays, shell moves furthest. */
const gap = EXPLODE.displayLayerGap;
export const explodeOffsets = {
  Bezel: [0, gap, 0],
  LCDPanel: [0, gap * 2, 0],
  NotchModule: [0, gap * 2, 0],
  MiniLEDBacklight: [0, gap * 3, 0],
  LidShell: [0, gap * 4, 0],
};
