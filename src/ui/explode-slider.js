/**
 * src/ui/explode-slider.js — the explode slider (0..1, bound both ways to state.explode through
 * 'explode' events) with its E hint, and the Stack toggle (S) beside it.
 */

const STEP = 0.01;

export function create(ui) {
  const { ctx, el } = ui;

  const input = el('input.explode-range#explode-range', {
    type: 'range', min: '0', max: '1', step: String(STEP), value: String(ctx.state.explode), 'aria-label': 'Explode',
  });
  const setFill = (t) => input.style.setProperty('--fill', `${Math.round(t * 100)}%`);
  input.addEventListener('input', () => {
    setFill(Number(input.value));
    ui.act('setExplode', Number(input.value));
  });

  const label = el('label.dock-label', { for: 'explode-range' }, 'Explode', el('kbd.kbd', 'E'));
  const stackBtn = el('button.ui-btn.stack-btn', {
    type: 'button', 'aria-pressed': 'false', title: 'Software stack (S)',
    onclick: () => ui.act('setStack', !ctx.state.stack),
  }, 'Stack', el('kbd.kbd', 'S'));
  const dock = el('div.dock', label, input, stackBtn);

  ui.on('explode', (t) => {
    const v = Math.min(1, Math.max(0, Number(t) || 0));
    const s = String(Math.round(v / STEP) * STEP);
    if (input.value !== s) input.value = s;
    setFill(v);
  });
  ui.on('stack', (open) => stackBtn.setAttribute('aria-pressed', String(!!open)));
  setFill(ctx.state.explode);
  stackBtn.setAttribute('aria-pressed', String(!!ctx.state.stack));

  return { el: dock, input };
}
