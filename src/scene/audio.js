/** src/scene/audio.js — stub. Woofers, tweeters, mics and grilles as boxes/cylinders. The audio lane replaces this file. */

import * as THREE from 'three';
import { AUDIO, SPEAKER_GRILLE, INTERIOR, BASE, KEYBOARD } from '../dims.js';

export const NAME = 'Audio';

function box(ctx, parent, key, mat, [w, h, d], [x, y, z], index = null) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(ctx.tag(m, key, index));
  return m;
}

function disc(ctx, parent, key, mat, r, h, [x, y, z], index = null) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), mat);
  m.position.set(x, y, z);
  parent.add(ctx.tag(m, key, index));
  return m;
}

export function build(parent, chip, ctx) {
  const { mats } = ctx;
  const g = ctx.tag(new THREE.Group(), NAME);
  parent.add(g);

  const W = AUDIO.woofer;
  for (const [key, x] of [['WooferL', W.xL], ['WooferR', W.xR]]) {
    for (let i = 0; i < 2; i++) {
      box(ctx, g, key, mats.speakerMesh, [W.w, W.t, W.d], [x, INTERIOR.y0 + i * (W.t + W.stackGap) + W.t / 2, W.z], i);
    }
  }
  const T = AUDIO.tweeter;
  disc(ctx, g, 'TweeterL', mats.speakerMesh, T.radius, T.t, [T.xL, INTERIOR.y0 + T.t / 2, T.z]);
  disc(ctx, g, 'TweeterR', mats.speakerMesh, T.radius, T.t, [T.xR, INTERIOR.y0 + T.t / 2, T.z]);
  AUDIO.mics.forEach(([x, z], i) => {
    disc(ctx, g, 'Mic', mats.packageBlack, AUDIO.micRadius, AUDIO.micRadius, [x, INTERIOR.y1 - AUDIO.micRadius / 2, z], i);
  });

  const S = SPEAKER_GRILLE;
  const grille = [S.w, KEYBOARD.keyH, S.z1 - S.z0];
  const y = BASE.h + KEYBOARD.keyH / 2;
  box(ctx, g, 'SpeakerGrilleL', mats.speakerMesh, grille, [S.xL, y, (S.z0 + S.z1) / 2]);
  box(ctx, g, 'SpeakerGrilleR', mats.speakerMesh, grille, [S.xR, y, (S.z0 + S.z1) / 2]);
  return g;
}

export const explodeOffsets = {};
