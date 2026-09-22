/**
 * src/ui/index.js — the chrome. Builds every control into #ui, installs the selection actions
 * (ctx.actions.select / hover) and the appearance actions (setTheme / setFont / setAccent), and keeps
 * every control in sync with ctx.events. `?ui=0` renders no chrome at all; the actions still install
 * so window.__playground.select() and the theme parameters keep working for screenshots.
 *
 * Layout (all direct children of #ui, so each one takes pointer events on its own box only):
 *   .topbar      title · chip selector · dial · settings · ? / view bar          (top-left)
 *   .dock        explode slider + stack toggle                                    (bottom-left)
 *   #trace-bar   empty unless the trace lane already mounted one; it fills it      (bottom-centre)
 *   .card        the part card: right column on desktop, bottom sheet under 720px
 *   .hover-label floating part name near the pointer (pointer-events: none)
 *   .dialog-scrim shortcuts help
 *
 * Components are factories `create(ui)` that receive one shared helper object:
 *   ui.ctx              the engine context
 *   ui.el(spec, attrs, ...children)   tiny hyperscript: el('button.cls#id', { attrs }, 'text', node)
 *   ui.act(name, ...args)  ctx.actions[name] → ctx.api[name] → window.__playground[name]; never throws
 *   ui.on(event, fn)    ctx.events listener with the CustomEvent detail unwrapped
 */

import { get as getEntry, parseNodeName } from '../parts/registry.js';
import * as cards from './cards.js';
import * as selector from './selector.js';
import * as dial from './dial.js';
import * as views from './views.js';
import * as explodeSlider from './explode-slider.js';
import * as settings from './settings.js';
import * as shortcuts from './shortcuts.js';

export const TITLE = 'MacBook Pro · teaching playground';

/** Pointer offset of the hover label from the cursor, in CSS px. */
const LABEL_DX = 14;
const LABEL_DY = 18;

/* ------------------------------------------------------------------ helpers */

/** el('button.ui-btn#save', { type: 'button', onclick, dataset: {...}, text: 'Save' }, ...children) */
export function el(spec, attrs, ...children) {
  const [tag, ...rest] = spec.split(/(?=[.#])/);
  const node = document.createElement(tag || 'div');
  for (const r of rest) {
    if (r[0] === '.') node.classList.add(r.slice(1));
    else node.id = r.slice(1);
  }
  if (attrs != null && (typeof attrs !== 'object' || attrs instanceof Node)) {
    children.unshift(attrs);
  } else if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'text') node.textContent = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k === 'style') Object.assign(node.style, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : String(c));
  }
  return node;
}

function makeUi(ctx) {
  const ui = {
    ctx,
    el,
    act(name, ...args) {
      const fn = ctx.actions[name] ?? ctx.api?.[name] ?? window.__playground?.[name];
      if (typeof fn !== 'function') return undefined;
      try {
        const r = fn(...args);
        if (r && typeof r.catch === 'function') r.catch((e) => console.warn(`ui: ${name} failed`, e));
        return r;
      } catch (e) {
        console.warn(`ui: ${name} failed`, e);
        return undefined;
      }
    },
    on(name, fn) {
      ctx.events.addEventListener(name, (e) => fn(e.detail));
    },
  };
  return ui;
}

/* ------------------------------------------------------------------ selection actions */

/** Registry key for whatever the caller passed: a key, a node name ('LPDDR[2]'), or null. */
function resolveKey(key) {
  if (key == null || key === '') return null;
  const k = String(key);
  if (getEntry(k)) return k;
  const { base } = parseNodeName(k);
  return getEntry(base) ? base : null;
}

function installSelection(ui) {
  const { ctx } = ui;
  const shown = (key) => (getEntry(key)?.level ?? 1) <= ctx.state.dial;

  ctx.actions.select = (key) => {
    let k = resolveKey(key);
    if (k && !shown(k)) k = null; // the part is hidden at this dial level: the card cannot open
    ctx.state.selected = k;
    ctx.emit('select', k);
  };
  ctx.actions.hover = (key) => {
    let k = resolveKey(key);
    if (k && !shown(k)) k = null;
    if (k === ctx.state.hovered) return;
    ctx.state.hovered = k;
    ctx.emit('hover', k);
  };
  ui.on('dial', () => {
    const s = ctx.state.selected;
    if (s && !shown(s)) ctx.actions.select(null);
  });
}

/* ------------------------------------------------------------------ hover label */

function createHoverLabel(ui) {
  const { ctx } = ui;
  const label = el('div.hover-label', { hidden: true, 'aria-hidden': 'true' });
  let x = 0, y = 0, raf = 0, shown = false;
  const place = () => {
    raf = 0;
    label.style.transform = `translate3d(${x + LABEL_DX}px, ${y + LABEL_DY}px, 0)`;
  };
  window.addEventListener('pointermove', (e) => {
    x = e.clientX;
    y = e.clientY;
    if (shown && !raf) raf = requestAnimationFrame(place);
  }, { passive: true });
  const show = (key) => {
    if (key && key !== ctx.state.selected) {
      label.textContent = cards.displayName(key);
      if (!shown) {
        shown = true;
        label.hidden = false;
        place();
      }
    } else if (shown) {
      shown = false;
      label.hidden = true;
    }
  };
  ui.on('hover', show);
  ui.on('select', () => show(ctx.state.hovered));
  return label;
}

/* ------------------------------------------------------------------ init */

export function init(ctx) {
  const ui = makeUi(ctx);
  installSelection(ui);
  settings.installActions(ui);

  const noChrome = document.documentElement.dataset.ui === '0' || new URLSearchParams(location.search).get('ui') === '0';
  const root = document.getElementById('ui');
  if (noChrome || !root) return;

  const chipSel = selector.create(ui);
  const dialSeg = dial.create(ui);
  const viewBar = views.create(ui);
  const gear = settings.create(ui);
  const help = shortcuts.create(ui);
  const dock = explodeSlider.create(ui);
  const card = cards.create(ui);

  const bar = el('div.topbar',
    el('div.bar-row.bar-row-main',
      el('h1.title', { text: TITLE }),
      chipSel.el,
      dialSeg.el,
      el('div.bar-tools', gear.el, help.button),
      el('i.bar-break', { 'aria-hidden': 'true' })),
    el('div.bar-row.bar-row-views', viewBar.el));

  // Append, never replace: trace.init runs before ui.init and may already have mounted its bar here.
  root.append(bar, dock.el, card.el, createHoverLabel(ui), help.dialog);
  if (!document.getElementById('trace-bar')) root.append(el('div#trace-bar'));

  /** Close the topmost open menu/dialog; true when something closed. */
  const closeMenus = () => {
    if (help.isOpen()) return help.close(), true;
    if (chipSel.isOpen()) return chipSel.close(), true;
    if (gear.isOpen()) return gear.close(), true;
    return false;
  };
  shortcuts.installKeys(ui, { selector: chipSel, help, closeMenus });

  ui.on('trace', (t) => document.body.classList.toggle('trace-playing', !!t?.playing));
}
