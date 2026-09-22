/**
 * src/ui/settings.js — appearance: theme (System / Light / Dark), five font pairs, five accent pairs.
 *
 * installActions(ui) installs ctx.actions.setTheme / setFont / setAccent (always, even with ?ui=0):
 *   theme  → <html data-theme>, scene background via ctx.setBackground, 'theme' event { theme, dark }
 *   font   → --font-body / --font-heading on :root, 'font' event { index, body, heading }
 *   accent → --accent / --accent-2 on :root, 'accent' event { index, accent, accent2 }
 * Choices persist in localStorage (pg.theme / pg.font / pg.accent). A URL parameter wins for that
 * load only. main.js boots with setTheme('system') / setFont(0) / setAccent(0) when the URL has no
 * parameter; until the page is ready those default calls resolve to the stored choice instead.
 *
 * create(ui) builds the gear button and its popover.
 */

export const THEMES = Object.freeze(['system', 'light', 'dark']);
export const THEME_LABELS = Object.freeze({ system: 'System', light: 'Light', dark: 'Dark' });

/** Serif body + sans heading pairs; option 0 is the foundation's default tokens. System stacks only. */
export const FONTS = Object.freeze([
  { name: 'Georgia + Helvetica', body: "Georgia, 'Iowan Old Style', 'Times New Roman', serif", heading: "-apple-system, 'Helvetica Neue', Helvetica, Inter, Arial, sans-serif" },
  { name: 'Iowan Old Style + Avenir Next', body: "'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif", heading: "'Avenir Next', Avenir, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif" },
  { name: 'Palatino + Gill Sans', body: "Palatino, 'Palatino Linotype', 'Book Antiqua', Georgia, serif", heading: "'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif" },
  { name: 'Times New Roman + Arial', body: "'Times New Roman', Times, serif", heading: "Arial, 'Helvetica Neue', Helvetica, sans-serif" },
  { name: 'Charter + Seravek', body: "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, Georgia, serif", heading: "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'Segoe UI', sans-serif" },
]);

/** Primary / secondary accent pairs; option 0 is the foundation's default (#E8590C / #1C64F2). */
export const ACCENTS = Object.freeze([
  { name: 'Ember', accent: '#E8590C', accent2: '#1C64F2' },
  { name: 'Berry', accent: '#C2255C', accent2: '#0B7285' },
  { name: 'Iris', accent: '#6741D9', accent2: '#2F9E44' },
  { name: 'Moss', accent: '#2B8A3E', accent2: '#D9480F' },
  { name: 'Plum', accent: '#9C36B5', accent2: '#F08C00' },
]);

const STORE = Object.freeze({ theme: 'pg.theme', font: 'pg.font', accent: 'pg.accent' });
const BG = Object.freeze({ light: '#ffffff', dark: '#0b0b0c' });

function read(key) {
  try {
    return localStorage.getItem(STORE[key]);
  } catch {
    return null;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(STORE[key], String(value));
  } catch {
    /* private mode or blocked storage: the choice still applies for this load */
  }
}
const clampIndex = (i, n) => Math.min(n - 1, Math.max(0, Math.round(Number(i)) || 0));

/* ------------------------------------------------------------------ actions */

export function installActions(ui) {
  const { ctx } = ui;
  const rootEl = document.documentElement;
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  const q = new URLSearchParams(location.search);
  const stored = { theme: read('theme'), font: read('font'), accent: read('accent') };

  let booting = true;
  const done = () => { booting = false; };
  const ready = window.__playground?.ready;
  if (ready && typeof ready.then === 'function') ready.then(done, done);
  else queueMicrotask(done);

  const isDark = (theme) => theme === 'dark' || (theme === 'system' && !!mq?.matches);

  function applyTheme(theme, persist) {
    const t = THEMES.includes(theme) ? theme : 'system';
    ctx.state.theme = t;
    rootEl.dataset.theme = t;
    const dark = isDark(t);
    const bg = getComputedStyle(rootEl).getPropertyValue('--bg').trim() || (dark ? BG.dark : BG.light);
    if (typeof ctx.setBackground === 'function') ctx.setBackground(bg);
    else ctx.renderer?.setClearColor?.(bg);
    ctx.requestRender?.();
    if (persist) write('theme', t);
    ctx.emit('theme', { theme: t, dark });
  }

  function applyFont(index, persist) {
    const i = clampIndex(index, FONTS.length);
    const f = FONTS[i];
    ctx.state.font = i;
    rootEl.dataset.font = String(i);
    if (i === 0) {
      rootEl.style.removeProperty('--font-body');
      rootEl.style.removeProperty('--font-heading');
    } else {
      rootEl.style.setProperty('--font-body', f.body);
      rootEl.style.setProperty('--font-heading', f.heading);
    }
    if (persist) write('font', i);
    ctx.emit('font', { index: i, body: f.body, heading: f.heading });
  }

  function applyAccent(index, persist) {
    const i = clampIndex(index, ACCENTS.length);
    const a = ACCENTS[i];
    ctx.state.accent = i;
    rootEl.dataset.accent = String(i);
    if (i === 0) {
      rootEl.style.removeProperty('--accent');
      rootEl.style.removeProperty('--accent-2');
    } else {
      rootEl.style.setProperty('--accent', a.accent);
      rootEl.style.setProperty('--accent-2', a.accent2);
    }
    if (persist) write('accent', i);
    ctx.emit('accent', { index: i, accent: a.accent, accent2: a.accent2 });
  }

  ctx.actions.setTheme = (theme) => {
    let t = theme ?? 'system';
    if (booting && !q.has('theme') && t === 'system' && stored.theme) t = stored.theme;
    applyTheme(t, !booting);
  };
  ctx.actions.setFont = (index) => {
    let i = index ?? 0;
    if (booting && !q.has('font') && Number(i) === 0 && stored.font != null) i = stored.font;
    applyFont(i, !booting);
  };
  ctx.actions.setAccent = (index) => {
    let i = index ?? 0;
    if (booting && !q.has('accent') && Number(i) === 0 && stored.accent != null) i = stored.accent;
    applyAccent(i, !booting);
  };

  // Apply the stored/URL choices now so the first frame is already right, even if nobody calls the actions.
  applyTheme(q.get('theme') ?? stored.theme ?? 'system', false);
  applyFont(q.get('font') ?? stored.font ?? 0, false);
  applyAccent(q.get('accent') ?? stored.accent ?? 0, false);

  mq?.addEventListener?.('change', () => {
    if (ctx.state.theme === 'system') applyTheme('system', false);
  });

  // The popover calls these directly: always persist.
  ui.appearance = {
    setTheme: (t) => applyTheme(t, true),
    setFont: (i) => applyFont(i, true),
    setAccent: (i) => applyAccent(i, true),
  };
}

/* ------------------------------------------------------------------ popover */

const SVG_NS = 'http://www.w3.org/2000/svg';
const GEAR_PATHS = [
  'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z',
];

function gearIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  for (const d of GEAR_PATHS) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}

export function create(ui) {
  const { ctx, el } = ui;

  const themeBtns = THEMES.map((t) => el('button.seg-btn', {
    type: 'button', role: 'radio', 'aria-checked': 'false', dataset: { theme: t }, text: THEME_LABELS[t],
    onclick: () => ui.appearance.setTheme(t),
  }));
  const fontBtns = FONTS.map((f, i) => {
    const [serif, sans] = f.name.split(' + ');
    return el('button.opt.opt-font', {
      type: 'button', role: 'radio', 'aria-checked': 'false', dataset: { font: i },
      onclick: () => ui.appearance.setFont(i),
    },
    el('span.opt-serif', { style: { fontFamily: f.body }, text: serif }),
    el('span.opt-plus', { 'aria-hidden': 'true', text: '+' }),
    el('span.opt-sans', { style: { fontFamily: f.heading }, text: sans }));
  });
  const accentBtns = ACCENTS.map((a, i) => el('button.opt.opt-accent', {
    type: 'button', role: 'radio', 'aria-checked': 'false', dataset: { accent: i }, title: a.name,
    'aria-label': `${a.name}: ${a.accent} and ${a.accent2}`,
    onclick: () => ui.appearance.setAccent(i),
  },
  el('span.swatch', { 'aria-hidden': 'true' },
    el('span.swatch-a', { style: { background: a.accent } }),
    el('span.swatch-b', { style: { background: a.accent2 } })),
  el('span.opt-name', { text: a.name })));

  const pop = el('div.popover.settings-pop', { role: 'dialog', 'aria-label': 'Appearance', hidden: true },
    el('h4.pop-h', { text: 'Theme' }),
    el('div.seg.seg-wide', { role: 'radiogroup', 'aria-label': 'Theme' }, ...themeBtns),
    el('h4.pop-h', { text: 'Font' }),
    el('div.opt-list', { role: 'radiogroup', 'aria-label': 'Font' }, ...fontBtns),
    el('h4.pop-h', { text: 'Accent' }),
    el('div.opt-row', { role: 'radiogroup', 'aria-label': 'Accent' }, ...accentBtns));

  const btn = el('button.ui-icon.settings-btn', {
    type: 'button', 'aria-label': 'Appearance settings', title: 'Appearance', 'aria-haspopup': 'dialog', 'aria-expanded': 'false',
    onclick: () => toggle(),
  }, gearIcon());
  const wrap = el('div.settings', btn, pop);

  function onOutside(e) {
    if (!wrap.contains(e.target)) close();
  }
  function open() {
    if (!pop.hidden) return;
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', onOutside, true);
  }
  function close() {
    if (pop.hidden) return;
    pop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutside, true);
  }
  function toggle() {
    if (pop.hidden) open();
    else close();
  }

  const check = (btns, pick) => btns.forEach((b) => b.setAttribute('aria-checked', String(pick(b))));
  const syncTheme = (d) => {
    const t = typeof d === 'string' ? d : d?.theme ?? ctx.state.theme;
    check(themeBtns, (b) => b.dataset.theme === t);
  };
  const syncFont = (d) => {
    const i = typeof d === 'number' ? d : d?.index ?? ctx.state.font;
    check(fontBtns, (b) => Number(b.dataset.font) === i);
  };
  const syncAccent = (d) => {
    const i = typeof d === 'number' ? d : d?.index ?? ctx.state.accent;
    check(accentBtns, (b) => Number(b.dataset.accent) === i);
  };
  ui.on('theme', syncTheme);
  ui.on('font', syncFont);
  ui.on('accent', syncAccent);
  syncTheme(ctx.state.theme);
  syncFont(ctx.state.font);
  syncAccent(ctx.state.accent);

  return { el: wrap, open, close, toggle, isOpen: () => !pop.hidden };
}
