/**
 * src/ui/dial.js — the visibility dial as a three-segment control: Overview / Engineer / Silicon.
 * Clicking calls setDial; the checked segment follows the 'dial' event. D cycles it (shortcuts.js).
 */

import { LEVEL_NAMES } from '../parts/registry.js';

const LEVELS = Object.freeze([1, 2, 3]);

export function create(ui) {
  const { ctx, el } = ui;
  const btns = LEVELS.map((level) => el('button.seg-btn', {
    type: 'button', role: 'radio', 'aria-checked': 'false', dataset: { level }, text: LEVEL_NAMES[level],
    onclick: () => ui.act('setDial', level),
  }));
  const group = el('div.seg.dial', { role: 'radiogroup', 'aria-label': 'Detail level', title: 'Detail level (D cycles)' }, ...btns);

  const sync = (level) => {
    const l = Number(level);
    btns.forEach((b, i) => b.setAttribute('aria-checked', String(LEVELS[i] === l)));
  };
  ui.on('dial', sync);
  sync(ctx.state.dial);

  return { el: group };
}
