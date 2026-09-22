/**
 * src/ui/trace-bar.js — Train / Infer buttons and the caption strip (trace lane).
 *
 * mount(ctx) (alias init) is idempotent. It renders into #trace-bar when the page or the ui lane
 * provides one; otherwise it creates a fixed bottom-centre #trace-bar inside #ui (so ui=0 hides it).
 * If a #trace-bar container appears after mounting (the ui lane's init runs after ours), the bar
 * moves into it on the next microtask / frame. Styles live in one <style id="trace-bar-style">
 * injected from here and use the theme tokens (--accent, --accent-2, --fg, --bg, --muted,
 * --font-heading, --font-body) with fallbacks.
 *
 * Buttons call ctx.actions.playTrace / stopTrace (falling back to the api). Clicking the button of the
 * trace that is already playing stops it. The caption follows the 'trace' event: target name, step
 * label, "step i / n", a segmented progress strip and a × stop; it is hidden when idle.
 *
 * URL parameter trace=train|infer: main.js starts it before ready; this file only starts one after
 * ready when nothing has played yet (ctx.params?.trace, else the location), so a trace never double-starts.
 */

import { TRACES, TRACE_NAMES } from '../data/traces.js';

const BAR_ID = 'trace-bar';
const STYLE_ID = 'trace-bar-style';

const CSS = `
#${BAR_ID} {
  position: fixed;
  left: 50%;
  bottom: calc(var(--ui-gutter, 16px) + var(--tb-clear, 0px) + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: var(--z-card, 30);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: min(560px, calc(100vw - 32px));
  pointer-events: none;
  font-family: var(--font-heading, -apple-system, 'Helvetica Neue', Inter, Arial, sans-serif);
  /* The caption follows the scene: the lit layer and the bead are always the primary accent. */
  --tb-color: var(--accent, #E8590C);
}
#${BAR_ID} > * { pointer-events: auto; }
#${BAR_ID}.tb-adopted { position: static; transform: none; width: auto; }
[data-ui="0"] #${BAR_ID} { display: none; }

.tb-buttons { display: flex; gap: 8px; }
.tb-btn {
  appearance: none;
  margin: 0;
  cursor: pointer;
  font: 600 13px/1 var(--font-heading, -apple-system, 'Helvetica Neue', Inter, Arial, sans-serif);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 10px 18px;
  border-radius: 999px;
  --tb-btn: var(--accent, #E8590C);
  color: var(--tb-btn);
  border: 1.5px solid var(--tb-btn);
  background: color-mix(in srgb, var(--bg, #fff) 82%, transparent);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
  backdrop-filter: blur(12px) saturate(1.2);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08), 0 8px 24px -10px rgba(0, 0, 0, 0.3);
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}
.tb-btn[data-kind="infer"] { --tb-btn: var(--accent-2, #1C64F2); }
.tb-btn:hover, .tb-btn:focus-visible, .tb-btn[aria-pressed="true"] { background: var(--tb-btn); color: #fff; }
.tb-btn:active { transform: translateY(1px); }
.tb-btn:focus-visible { outline: 2px solid var(--tb-btn); outline-offset: 3px; }

.tb-caption {
  display: none;
  flex-direction: column;
  gap: 9px;
  width: 100%;
  box-sizing: border-box;
  padding: 12px 12px 12px 16px;
  border-radius: 14px;
  color: var(--fg, #111);
  background: color-mix(in srgb, var(--bg, #fff) 86%, transparent);
  border: 1px solid color-mix(in srgb, var(--fg, #111) 12%, transparent);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  backdrop-filter: blur(14px) saturate(1.2);
  box-shadow: 0 12px 32px -14px rgba(0, 0, 0, 0.4);
  animation: tb-in 0.22s cubic-bezier(0.2, 0.7, 0.2, 1);
}
#${BAR_ID}[data-playing="1"] .tb-caption { display: flex; }

.tb-row { display: flex; align-items: center; gap: 10px; min-height: 28px; }
.tb-dot {
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--tb-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--tb-color) 22%, transparent);
  animation: tb-pulse 1.4s ease-in-out infinite;
}
.tb-target {
  font: 700 13px/1 var(--font-heading, -apple-system, 'Helvetica Neue', Inter, Arial, sans-serif);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tb-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tb-count {
  margin-left: auto;
  font: 500 12px/1 var(--font-heading, -apple-system, 'Helvetica Neue', Inter, Arial, sans-serif);
  letter-spacing: 0.04em;
  color: var(--muted, #666);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.tb-stop {
  flex: none;
  appearance: none;
  margin: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--fg, #111) 18%, transparent);
  background: transparent;
  color: var(--fg, #111);
  font: 400 18px/1 var(--font-heading, -apple-system, 'Helvetica Neue', Inter, Arial, sans-serif);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.tb-stop:hover, .tb-stop:focus-visible { background: var(--fg, #111); color: var(--bg, #fff); }
.tb-stop:focus-visible { outline: 2px solid var(--tb-color); outline-offset: 2px; }
.tb-label {
  margin: 0;
  font: 16px/1.45 var(--font-body, Georgia, 'Iowan Old Style', 'Times New Roman', serif);
  color: var(--fg, #111);
}
.tb-progress { display: flex; gap: 3px; height: 3px; }
.tb-progress i {
  flex: 1;
  border-radius: 2px;
  background: color-mix(in srgb, var(--fg, #111) 12%, transparent);
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}
.tb-progress i.on { background: var(--tb-color); }
.tb-progress i.now { background: var(--tb-color); box-shadow: 0 0 8px var(--tb-color); }

@keyframes tb-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes tb-pulse {
  0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--tb-color) 22%, transparent); }
  50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--tb-color) 10%, transparent); }
}
@media (prefers-reduced-motion: reduce) {
  .tb-caption, .tb-dot { animation: none; }
  .tb-btn, .tb-stop, .tb-progress i { transition: none; }
}
@media (max-width: 720px) {
  #${BAR_ID} { gap: 8px; }
  .tb-label { font-size: 15px; }
  .tb-btn { padding: 9px 14px; }
}
`;

/** Breathing room above a bottom bar we have to clear. */
const CLEAR_GAP_PX = 10;
/** Anything taller than this share of the viewport is a wrapper or a sheet, never a bar to clear. */
const MAX_BAR_FRACTION = 0.4;

/** Registry key → readable name: 'GPUCores' → 'GPU Cores', 'Metal4' → 'Metal 4', 'ANERuntime' → 'ANE Runtime'. */
function displayName(key) {
  return String(key)
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2');
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

let bar = null;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

/** Move the bar into a #trace-bar container the ui lane created after us; a no-op otherwise. */
function adopt() {
  if (!bar) return;
  const host = document.getElementById(BAR_ID);
  if (!host || host === bar || host.contains(bar)) return;
  host.appendChild(bar);
  bar.classList.add('tb-adopted');
}

/**
 * Keep the floating bar clear of any fixed bottom chrome it overlaps horizontally (the ui lane's
 * explode slider on narrow screens, an open bottom-sheet card): lift it by the tallest such box.
 */
function layout() {
  if (!bar || bar.classList.contains('tb-adopted') || !bar.parentElement) return;
  // Each visible row (caption, buttons) is tested on its own, at its natural (unlifted) place, so a
  // narrow button row beside a wide caption never lifts the bar for an overlap nobody can see, and
  // the answer never depends on the previous lift.
  const lifted = parseFloat(bar.style.getPropertyValue('--tb-clear')) || 0;
  const rows = [];
  for (const row of bar.children) {
    const r = row.getBoundingClientRect();
    if (r.width && r.height) rows.push({ left: r.left, right: r.right, top: r.top + lifted, bottom: r.bottom + lifted });
  }
  if (!rows.length) return;
  let clear = 0;
  for (const el of bar.parentElement.children) {
    if (el === bar) continue;
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.height > innerHeight * MAX_BAR_FRACTION) continue; // a full-screen wrapper or a tall sheet, not a bar
    for (const p of rows) {
      if (r.bottom <= p.top || r.top >= p.bottom) continue;     // no vertical overlap
      if (r.right <= p.left || r.left >= p.right) continue;     // no horizontal overlap
      clear = Math.max(clear, p.bottom - r.top + CLEAR_GAP_PX);
    }
  }
  bar.style.setProperty('--tb-clear', `${Math.round(clear)}px`);
}

export function mount(ctx) {
  if (bar) {
    adopt();
    return bar;
  }
  injectStyle();

  const existing = document.getElementById(BAR_ID);
  bar = existing ?? el('div');
  bar.id = BAR_ID;
  bar.dataset.playing = '0';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Trace');
  if (existing) bar.classList.add('tb-adopted');

  const caption = el('div', 'tb-caption');
  caption.setAttribute('role', 'status');
  caption.setAttribute('aria-live', 'polite');
  const row = el('div', 'tb-row');
  const dot = el('span', 'tb-dot');
  dot.setAttribute('aria-hidden', 'true');
  const target = el('span', 'tb-target');
  const count = el('span', 'tb-count');
  const stop = el('button', 'tb-stop', '×');
  stop.type = 'button';
  stop.setAttribute('aria-label', 'Stop trace');
  row.append(dot, target, count, stop);
  const label = el('p', 'tb-label');
  const progress = el('div', 'tb-progress');
  progress.setAttribute('aria-hidden', 'true');
  caption.append(row, label, progress);

  const buttons = el('div', 'tb-buttons');
  const btn = new Map();
  for (const name of TRACE_NAMES) {
    const b = el('button', 'tb-btn', TRACES[name].label);
    b.type = 'button';
    b.dataset.kind = name;
    b.setAttribute('aria-pressed', 'false');
    b.title = `Play the ${TRACES[name].label.toLowerCase()} trace`;
    b.addEventListener('click', () => {
      const tr = ctx.state.trace;
      if (tr?.playing && tr.name === name) stopTrace();
      else playTrace(name);
    });
    buttons.appendChild(b);
    btn.set(name, b);
  }
  stop.addEventListener('click', () => stopTrace());

  bar.append(caption, buttons);
  if (!existing) (document.getElementById('ui') ?? document.body).appendChild(bar);

  function playTrace(name) {
    const fn = ctx.actions.playTrace ?? ctx.api?.playTrace;
    if (typeof fn === 'function') fn(name);
  }
  function stopTrace() {
    const fn = ctx.actions.stopTrace;
    if (typeof fn === 'function') fn();
  }

  let segments = 0;
  function render(tr) {
    const playing = Boolean(tr?.playing);
    bar.dataset.playing = playing ? '1' : '0';
    if (tr?.name) bar.dataset.kind = tr.name;
    for (const [name, b] of btn) b.setAttribute('aria-pressed', playing && tr.name === name ? 'true' : 'false');
    layout();
    if (!playing) return;
    const n = tr.total || 0;
    const i = tr.step || 0;
    target.textContent = tr.target ? displayName(tr.target) : '';
    count.textContent = `step ${i} / ${n}`;
    label.textContent = tr.label ?? '';
    if (segments !== n) {
      progress.replaceChildren();
      for (let k = 0; k < n; k++) progress.appendChild(el('i'));
      segments = n;
    }
    const kids = progress.children;
    for (let k = 0; k < kids.length; k++) kids[k].className = k + 1 < i ? 'on' : k + 1 === i ? 'now' : '';
  }

  ctx.events.addEventListener('trace', (e) => render(e.detail ?? ctx.state.trace));
  render(ctx.state.trace);

  // The ui lane's init runs after ours: adopt its #trace-bar if it makes one, then measure its chrome.
  const settle = () => {
    adopt();
    layout();
  };
  Promise.resolve().then(settle);
  requestAnimationFrame(settle);
  window.addEventListener('resize', layout);
  for (const name of ['select', 'view', 'theme']) ctx.events.addEventListener(name, () => requestAnimationFrame(layout));

  // URL parameter, only if nothing has started a trace by the time the page is ready.
  const wanted = ctx.params?.trace ?? new URLSearchParams(location.search).get('trace');
  if (wanted && TRACES[wanted]) {
    const ready = window.__playground?.ready;
    Promise.resolve(ready).then(() => {
      if (ctx.state.trace?.name == null) playTrace(wanted);
    }, () => {});
  }

  return bar;
}

export const init = mount;
