/**
 * src/ui/shortcuts.js — the '?' help dialog and the global keyboard shortcuts.
 *
 * E toggle full explode · C chip selector · D cycle dial · S stack · 1–7 views · Esc close · ? help.
 * Keys are ignored while typing in a text field and when a menu already handled the event.
 */

import { VIEW_NAMES } from '../dims.js';

export const SHORTCUTS = Object.freeze([
  ['E', 'Toggle full explode'],
  ['C', 'Chip selector'],
  ['D', 'Cycle the dial: Overview, Engineer, Silicon'],
  ['S', 'Software stack'],
  ['1–7', 'Camera views'],
  ['Esc', 'Close the card or any menu'],
  ['?', 'This list'],
]);

const TEXT_INPUT = /^(text|search|email|url|number|password|tel)$/;

function isTyping(target) {
  if (!target || target === document.body) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return tag === 'INPUT' && TEXT_INPUT.test(target.type);
}

export function create(ui) {
  const { el } = ui;
  const rows = SHORTCUTS.flatMap(([key, what]) => [el('kbd.kbd.kbd-lg', key), el('span', what)]);
  const dialog = el('div.dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Keyboard shortcuts' },
    el('h3.dialog-h', { text: 'Keyboard shortcuts' }),
    el('div.keys', ...rows),
    el('button.ui-btn.dialog-close', { type: 'button', text: 'Done', onclick: () => close() }));
  const scrim = el('div.dialog-scrim', { hidden: true, onpointerdown: (e) => { if (e.target === scrim) close(); } }, dialog);
  const button = el('button.ui-icon.help-btn', {
    type: 'button', 'aria-label': 'Keyboard shortcuts (?)', title: 'Keyboard shortcuts (?)', 'aria-haspopup': 'dialog', 'aria-expanded': 'false',
    onclick: () => toggle(),
  }, '?');

  function open() {
    if (!scrim.hidden) return;
    scrim.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    dialog.querySelector('.dialog-close')?.focus();
  }
  function close() {
    if (scrim.hidden) return;
    scrim.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    button.focus();
  }
  function toggle() {
    if (scrim.hidden) open();
    else close();
  }
  return { button, dialog: scrim, open, close, toggle, isOpen: () => !scrim.hidden };
}

/** Global keydown handler. `selector` and `help` expose toggle(); closeMenus() closes the topmost menu. */
export function installKeys(ui, { selector, help, closeMenus }) {
  const { ctx } = ui;
  window.addEventListener('keydown', (e) => {
    // The interaction lane's engines handle E, D and 1–7 first and preventDefault(); this skips those.
    if (e.defaultPrevented || e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
    const s = ctx.state;
    const k = e.key;
    if (k === 'Escape') {
      if (!closeMenus() && s.selected) ui.act('select', null);
      return;
    }
    if (k === '?') {
      help.toggle();
      e.preventDefault();
      return;
    }
    if (help.isOpen()) return; // the dialog is modal: only Esc and ? get through
    const lower = k.length === 1 ? k.toLowerCase() : k;
    if (lower === 'e') (ctx.actions.toggleExplode ? ui.act('toggleExplode') : ui.act('setExplode', s.explode < 1 ? 1 : 0));
    else if (lower === 'c') selector.toggle();
    else if (lower === 'd') (ctx.actions.cycleDial ? ui.act('cycleDial') : ui.act('setDial', (s.dial % 3) + 1));
    else if (lower === 's') ui.act('setStack', !s.stack);
    else if (/^[1-7]$/.test(k) && VIEW_NAMES[Number(k) - 1]) ui.act('setView', VIEW_NAMES[Number(k) - 1]);
    else return;
    e.preventDefault();
  });
}
