/**
 * src/ui/selector.js — the chip selector: a button showing the current marketing_name and a
 * dropdown listbox grouped by family. Key C toggles it (shortcuts.js), arrows move, Enter picks,
 * Esc closes. Picking calls setChip; the button follows the 'chip' event.
 */

export function create(ui) {
  const { ctx, el } = ui;

  const name = el('span.chip-name');
  const btn = el('button.ui-btn.chip-btn', {
    type: 'button', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', title: 'Chip (C)',
    onclick: () => toggle(),
  }, name, el('span.chev', { 'aria-hidden': 'true' }), el('kbd.kbd', 'C'));

  const list = el('div.menu.chip-menu', { role: 'listbox', 'aria-label': 'Chip', hidden: true, tabindex: '-1' });
  const options = [];
  const groups = new Map();
  for (const chip of ctx.chips) {
    const fam = chip.family ?? 'Other';
    if (!groups.has(fam)) groups.set(fam, []);
    groups.get(fam).push(chip);
  }
  for (const [family, chips] of groups) {
    list.append(el('div.menu-group', { role: 'presentation', text: family }));
    for (const chip of chips) {
      const opt = el('button.menu-item', {
        type: 'button', role: 'option', 'aria-selected': 'false', tabindex: '-1', dataset: { id: chip.id },
        onclick: () => choose(chip.id),
      }, el('span.menu-dot', { 'aria-hidden': 'true' }), chip.marketing_name ?? chip.id);
      options.push(opt);
      list.append(opt);
    }
  }
  const wrap = el('div.chip', btn, list);

  const currentIndex = () => Math.max(0, options.findIndex((o) => o.dataset.id === ctx.state.chip));
  const focusAt = (i) => {
    const n = options.length;
    if (!n) return;
    const o = options[((i % n) + n) % n];
    o.focus();
    o.scrollIntoView({ block: 'nearest' });
  };

  function onOutside(e) {
    if (!wrap.contains(e.target)) close();
  }
  function open() {
    if (!list.hidden) return;
    list.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    focusAt(currentIndex());
    document.addEventListener('pointerdown', onOutside, true);
  }
  function close({ refocus = false } = {}) {
    if (list.hidden) return;
    list.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutside, true);
    if (refocus) btn.focus();
  }
  function toggle() {
    if (list.hidden) open();
    else close({ refocus: true });
  }
  function choose(id) {
    close({ refocus: true });
    ui.act('setChip', id);
  }

  list.addEventListener('keydown', (e) => {
    const i = options.indexOf(document.activeElement);
    switch (e.key) {
      case 'ArrowDown': focusAt(i + 1); break;
      case 'ArrowUp': focusAt(i - 1); break;
      case 'Home': focusAt(0); break;
      case 'End': focusAt(options.length - 1); break;
      case 'Escape': close({ refocus: true }); break;
      case 'Tab': close(); return;
      default: return; // Enter/Space activate the focused button natively
    }
    e.preventDefault();
  });

  function sync(detail) {
    const id = typeof detail === 'string' ? detail : detail?.id ?? ctx.state.chip;
    const chip = ctx.chips.find((c) => c.id === id) ?? ctx.chip;
    name.textContent = chip?.marketing_name ?? chip?.id ?? '—';
    for (const o of options) o.setAttribute('aria-selected', String(o.dataset.id === chip?.id));
  }
  ui.on('chip', sync);
  sync(ctx.state.chip);

  return { el: wrap, open, close, toggle, isOpen: () => !list.hidden };
}
