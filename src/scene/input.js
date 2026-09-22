/** src/scene/input.js — stub. Keyboard, Touch ID and trackpad stack as boxes. The input lane replaces this file. */

import * as THREE from 'three';
import { BASE, KEYBOARD, TRACKPAD, EXPLODE } from '../dims.js';

export const NAME = 'Input';

function box(ctx, parent, key, mat, [w, h, d], [x, y, z]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(ctx.tag(m, key));
  return m;
}

export function build(parent, chip, ctx) {
  const { mats } = ctx;
  const g = ctx.tag(new THREE.Group(), NAME);
  parent.add(g);

  const K = KEYBOARD;
  const kb = ctx.tag(new THREE.Group(), 'Keyboard');
  g.add(kb);
  const kw = K.x1 - K.x0, kd = K.z1 - K.z0, kx = (K.x0 + K.x1) / 2, kz = (K.z0 + K.z1) / 2;
  box(ctx, kb, 'KeyGrid', mats.keycap, [kw, K.keyH, kd], [kx, BASE.h + K.keyH / 2, kz]);
  box(ctx, kb, 'Backlight', mats.plastic, [kw, K.wellDepth, kd], [kx, BASE.h - BASE.deckT - K.wellDepth / 2, kz]);
  box(ctx, g, 'TouchIDButton', mats.aluminiumInner, [K.keyW, K.keyH, K.fnRowD], [K.x1 - K.keyW / 2, BASE.h + K.keyH / 2, K.z0 + K.fnRowD / 2]);

  const T = TRACKPAD;
  const tp = ctx.tag(new THREE.Group(), 'Trackpad');
  tp.position.set(T.cx, BASE.h, T.cz);
  g.add(tp);
  box(ctx, tp, 'Trackpad.Glass', mats.glass, [T.w, T.glassT, T.d], [0, T.glassT / 2, 0]);
  box(ctx, tp, 'StrainGaugePlate', mats.steel, [T.w, T.plateT, T.d], [0, -BASE.deckT - T.plateT / 2, 0]);
  const [tw, th, td] = T.tapticSize;
  box(ctx, tp, 'TapticEngine', mats.packageBlack, [tw, th, td], [0, -BASE.deckT - T.plateT - th / 2, 0]);
  box(ctx, tp, 'TrackpadFlex', mats.flex, [T.w / 2, T.glassT / 4, td], [0, -BASE.deckT - T.plateT - th, -T.d / 2]);
  return g;
}

export const explodeOffsets = {
  Trackpad: [0, EXPLODE.trackpad, 0],
};
