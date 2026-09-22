/**
 * src/ui/cards.js — the part card and the key → display-name rule.
 *
 * Opens on the 'select' event with a registry key; closes on select(null). Right column on desktop,
 * bottom sheet (grab handle, drag down to dismiss) under 720px — layout lives in theme.css, the DOM
 * is the same. Body copy comes from ctx.content[key]: what / why / connects / aha (+ sources).
 */

import { SECTION, LEVEL_NAMES, get as getEntry, parseNodeName } from '../parts/registry.js';

/** Drag distance on the grab handle that dismisses the bottom sheet, in CSS px. */
const SHEET_DISMISS_PX = 70;

export const SECTIONS = Object.freeze([
  ['what', 'What it is'],
  ['why', "Why it's there"],
  ['connects', 'Connects to'],
  ['aha', "One fact you didn't know"],
]);

/* ------------------------------------------------------------------ display names */

/** Compound words the camelCase splitter must keep whole. Longest first where one prefixes another. */
const KEEP = ['MacBook', 'MagSafe', 'PyTorch', 'LPDDR', 'USBC', 'TB5', 'SoC'];
const SPELL = Object.freeze({ USBC: 'USB-C' });
const TOKEN = new RegExp(`${KEEP.join('|')}|[A-Z][a-z]+|[A-Z]+(?![a-z])|[a-z]+|\\d+`, 'g');

function words(part) {
  const toks = part.match(TOKEN) || [part];
  return toks
    .map((t, i) => {
      const s = SPELL[t] ?? t;
      return i > 0 && /^[A-Z][a-z]+$/.test(s) ? s.toLowerCase() : s;
    })
    .join(' ');
}

/**
 * 'Display.Glass' → 'Glass (display)', 'LPDDR' → 'LPDDR', 'TB5' → 'TB5', 'SoCPackage' → 'SoC package',
 * 'MiniLEDBacklight' → 'Mini LED backlight'. Node names ('Feet[2]') resolve to their key first.
 */
export function displayName(key) {
  if (!key) return '';
  const { base } = parseNodeName(String(key));
  const dot = base.indexOf('.');
  if (dot > 0) return `${words(base.slice(dot + 1))} (${words(base.slice(0, dot)).toLowerCase()})`;
  return words(base);
}

/* ------------------------------------------------------------------ card */

function toText(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(toText).filter(Boolean).join(', ');
  if (typeof v === 'object') return v.title ?? v.name ?? v.url ?? '';
  return String(v);
}

export function create(ui) {
  const { ctx, el } = ui;

  const title = el('h2.card-title');
  const section = el('span.card-section');
  const badge = el('span.card-badge');
  const bodies = {};
  const blocks = SECTIONS.map(([k, label]) =>
    el('section.card-block', el('h3.card-h', { text: label }), (bodies[k] = el('p.card-p'))));
  const sources = el('p.card-sources', { hidden: true });

  const close = () => ui.act('select', null);
  const closeBtn = el('button.ui-icon.card-close', { type: 'button', 'aria-label': 'Close card (Esc)', title: 'Close (Esc)', onclick: close }, '×');
  const handle = el('button.card-handle', { type: 'button', 'aria-label': 'Drag down to close' });
  const scroller = el('div.card-scroll',
    el('header.card-head', title, el('p.card-caption', section, el('span.card-sep', { 'aria-hidden': 'true' }, '·'), badge)),
    ...blocks,
    sources);
  const panel = el('aside.card', { role: 'dialog', 'aria-label': 'Part card', hidden: true }, handle, closeBtn, scroller);

  // Bottom-sheet gesture: drag the handle down past SHEET_DISMISS_PX to close. A plain tap does nothing.
  let startY = 0, dragging = false;
  handle.addEventListener('pointerdown', (e) => {
    startY = e.clientY;
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    panel.classList.add('dragging');
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    panel.style.transform = `translateY(${Math.max(0, e.clientY - startY)}px)`;
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    panel.classList.remove('dragging');
    panel.style.transform = '';
    if (e.clientY - startY > SHEET_DISMISS_PX) close();
  };
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);

  function open(key) {
    const entry = getEntry(key);
    if (!entry) return hide();
    const card = ctx.content?.[key] ?? {};
    title.textContent = displayName(key);
    section.textContent = SECTION[key] ?? '';
    badge.textContent = LEVEL_NAMES[entry.level] ?? '';
    badge.setAttribute('aria-label', `${LEVEL_NAMES[entry.level] ?? ''} level`);
    for (const [k] of SECTIONS) {
      const text = toText(card[k]);
      bodies[k].textContent = text || '—';
      bodies[k].classList.toggle('is-empty', !text);
    }
    const src = Array.isArray(card.sources) ? card.sources.map(toText).filter(Boolean) : [];
    sources.hidden = src.length === 0;
    sources.textContent = src.length ? `Sources: ${src.join('; ')}` : '';
    panel.dataset.key = key;
    panel.hidden = false;
    document.body.classList.add('card-open');
    scroller.scrollTop = 0;
  }

  function hide() {
    if (panel.hidden) return;
    panel.hidden = true;
    delete panel.dataset.key;
    document.body.classList.remove('card-open');
  }

  ui.on('select', (key) => (key ? open(key) : hide()));
  if (ctx.state.selected) open(ctx.state.selected);

  return { el: panel, open, close: hide, isOpen: () => !panel.hidden };
}
