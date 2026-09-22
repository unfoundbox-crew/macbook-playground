/**
 * src/engine/tween.js — a tiny tween runner driven by ctx.onFrame. No dependencies.
 *
 *   init(ctx)                       registers the single frame hook (idempotent; every engine calls it)
 *   tween({ from, to, duration, ease, onUpdate, onComplete, target })  → handle { promise, cancel, done }
 *
 * `from`/`to` are numbers or Vector3s. A Vector3 tween writes into `target` (default: `from` itself), so
 * callers pass the live object (camera.position, controls.target) and nothing is allocated per frame.
 * `duration` is milliseconds; `duration <= 0` applies `to` synchronously. `onComplete(finished)` gets
 * false when the tween was cancelled; the promise resolves either way so awaiting a view never hangs.
 */

export const easeLinear = (p) => p;
export const easeOutCubic = (p) => 1 - (1 - p) ** 3;
export const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);

const MS = 1000;
const active = [];
let driver = null;

export function init(ctx) {
  if (driver) return;
  driver = ctx;
  ctx.onFrame(step);
}

/** Advance every running tween by dt seconds. Zero allocations. */
function step(dt) {
  for (let i = active.length - 1; i >= 0; i--) {
    const tw = active[i];
    tw.elapsed += dt * MS;
    const p = Math.min(1, tw.elapsed / tw.duration);
    tw.apply(tw.ease(p));
    if (p >= 1) {
      active.splice(i, 1);
      finish(tw, true);
    }
  }
}

function finish(tw, finished) {
  if (tw.done) return;
  tw.done = true;
  tw.onComplete?.(finished);
  tw.resolve(finished);
}

export function tween({ from, to, duration = 0, ease = easeInOutCubic, onUpdate, onComplete, target } = {}) {
  const tw = { elapsed: 0, duration, ease, onComplete, done: false, apply: null, resolve: null, promise: null, cancel: null };
  if (from?.isVector3) {
    const f = from.clone();
    const t = to.clone();
    const out = target || from;
    tw.apply = (e) => {
      out.lerpVectors(f, t, e);
      onUpdate?.(out);
    };
  } else {
    const f = Number(from) || 0;
    const t = Number(to) || 0;
    tw.apply = (e) => onUpdate?.(f + (t - f) * e);
  }
  tw.promise = new Promise((resolve) => {
    tw.resolve = resolve;
  });
  tw.cancel = () => {
    const i = active.indexOf(tw);
    if (i >= 0) active.splice(i, 1);
    finish(tw, false);
  };
  if (!(duration > 0) || !driver) {
    tw.apply(1);
    finish(tw, true);
    return tw;
  }
  active.push(tw);
  return tw;
}

/** Number of tweens currently running (tests, debugging). */
export function activeCount() {
  return active.length;
}
