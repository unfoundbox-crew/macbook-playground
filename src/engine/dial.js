/**
 * src/engine/dial.js — the visibility dial (1 Overview, 2 Engineer, 3 Silicon).
 *
 * Every tagged mesh, layer and unit (kind !== 'group'; groups stay visible so their children can show)
 * is visible when level >= userData.level. A node a module hid for chip reasons (thermal hides the fans
 * on 'air': userData.hiddenByChip === true, or the older userData.chipHidden) is never shown by the dial.
 * The list is built once and rebuilt after 'chip' (soc rebuilds nodes).
 *
 * Installs ctx.actions.setDial(level) and ctx.actions.cycleDial(). Key D cycles 1 → 2 → 3 → 1.
 * Emits 'dial' with the new level.
 */

import { KIND } from '../parts/registry.js';
import { shortcutKey } from './interaction.js';

const LEVELS = 3;

export function init(ctx) {
  const { state } = ctx;
  let toggled = [];

  function collect() {
    toggled = [];
    ctx.root.traverse((o) => {
      const ud = o.userData;
      if (ud.part && ud.kind && ud.kind !== KIND.GROUP) toggled.push(o);
    });
  }

  function apply(level) {
    for (let i = 0; i < toggled.length; i++) {
      const o = toggled[i];
      const ud = o.userData;
      o.visible = level >= ud.level && ud.hiddenByChip !== true && ud.chipHidden !== true;
    }
    ctx.requestRender?.();
  }

  ctx.actions.setDial = (level) => {
    const l = Math.min(LEVELS, Math.max(1, Math.round(Number(level) || 1)));
    state.dial = l;
    apply(l);
    ctx.emit('dial', l);
  };
  ctx.actions.cycleDial = () => ctx.actions.setDial((state.dial % LEVELS) + 1);

  ctx.events.addEventListener('chip', () => {
    collect();
    apply(state.dial);
  });

  window.addEventListener('keydown', (e) => {
    if (shortcutKey(e) === 'd') {
      e.preventDefault();
      ctx.actions.cycleDial();
    }
  });

  collect();
  apply(state.dial);
}
