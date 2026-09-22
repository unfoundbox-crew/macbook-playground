/**
 * src/ui/views.js — the view bar: one button per dims.VIEW_NAMES with its 1–7 key hint.
 * Clicking calls setView; the pressed button follows the 'view' event.
 */

import { VIEW_NAMES } from '../dims.js';

export function create(ui) {
  const { ctx, el } = ui;
  const btns = VIEW_NAMES.map((name, i) => el('button.view-btn', {
    type: 'button', 'aria-pressed': 'false', dataset: { view: name }, title: `${name} (${i + 1})`,
    onclick: () => ui.act('setView', name),
  }, name, el('kbd.kbd', String(i + 1))));
  const bar = el('div.views', { role: 'toolbar', 'aria-label': 'Views' }, ...btns);

  const sync = (view) => {
    for (const b of btns) b.setAttribute('aria-pressed', String(b.dataset.view === view));
  };
  ui.on('view', sync);
  sync(ctx.state.view);

  return { el: bar };
}
