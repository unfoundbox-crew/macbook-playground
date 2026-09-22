/**
 * src/engine/tours.js — camera tours over dims.VIEWS.
 *
 * ctx.actions.setView(name, { instant, duration }) tweens camera.position and controls.target over
 * TOUR_MS (easeInOutCubic) while the explode slider (tweenExplode) and the lid (setLid) tween alongside;
 * stack and dial switch at once per preset. state.view updates and 'view' is emitted when the tour
 * starts; the returned promise resolves after the last tween frame has been drawn (immediately drawn
 * when instant). A new setView cancels the tours in flight, and their promises resolve too.
 * Keys 1–7 pick views in dims.VIEW_NAMES order (ignored while typing in a field).
 */

import * as THREE from 'three';
import { VIEWS, VIEW_NAMES } from '../dims.js';
import { init as initTween, tween, easeInOutCubic } from './tween.js';
import { shortcutKey } from './interaction.js';

export const TOUR_MS = 900;
const VIEW_KEYS = '1234567';

const _toPosition = new THREE.Vector3();
const _toTarget = new THREE.Vector3();

export function init(ctx) {
  initTween(ctx);
  const { state, camera, controls } = ctx;
  const inFlight = [];

  /** Call a sibling action: a lane's install first, then the api fallback, then a local minimum. */
  function act(name, ...args) {
    const fn = ctx.actions[name] ?? ctx.api?.[name];
    if (fn) return fn(...args);
    if (name === 'setStack') {
      state.stack = !!args[0];
      const stack = ctx.byKey.get('Stack')?.[0];
      if (stack) stack.visible = state.stack;
      ctx.emit('stack', state.stack);
    }
    return undefined;
  }

  function cancelInFlight() {
    while (inFlight.length) inFlight.pop().cancel();
  }

  function setView(name, opts = {}) {
    const v = VIEWS[name];
    if (!v) throw new Error(`unknown view "${name}"`);
    cancelInFlight();
    state.view = name;
    const duration = opts.instant ? 0 : Number(opts.duration ?? TOUR_MS);

    if (!(duration > 0)) {
      camera.position.fromArray(v.position);
      controls.target.fromArray(v.target);
      controls.update();
      act('setLid', v.lidAngleDeg);
      act('setExplode', v.explode);
      act('setStack', v.stack);
      if (v.dial != null) act('setDial', v.dial);
      ctx.emit('view', name);
      return ctx.renderOnce();
    }

    act('setStack', v.stack);
    if (v.dial != null) act('setDial', v.dial);
    _toPosition.fromArray(v.position);
    _toTarget.fromArray(v.target);
    const ease = easeInOutCubic;
    const pos = tween({ from: camera.position, to: _toPosition, target: camera.position, duration, ease });
    const tgt = tween({ from: controls.target, to: _toTarget, target: controls.target, duration, ease });
    const lid = tween({ from: state.lidAngleDeg, to: v.lidAngleDeg, duration, ease, onUpdate: (deg) => act('setLid', deg) });
    inFlight.push(pos, tgt, lid);
    const explode = ctx.actions.tweenExplode
      ? ctx.actions.tweenExplode(v.explode, duration)
      : Promise.resolve(act('setExplode', v.explode));
    ctx.emit('view', name);
    return Promise.all([pos.promise, tgt.promise, lid.promise, explode]).then(() => ctx.renderOnce());
  }

  ctx.actions.setView = setView;

  window.addEventListener('keydown', (e) => {
    const key = shortcutKey(e);
    const i = key ? VIEW_KEYS.indexOf(key) : -1;
    if (i < 0 || i >= VIEW_NAMES.length) return;
    e.preventDefault();
    setView(VIEW_NAMES[i]);
  });
}
