/**
 * src/engine/api.js — window.__playground, the surface tools/snap.mjs and the tests drive.
 *
 * installErrors() runs before anything else so boot failures land in .errors and reject .ready.
 * install(ctx) fills in every method from CONTRACT.md. Each method delegates to ctx.actions[name]
 * when a lane installed one; otherwise a built-in fallback runs. Whoever implements an action owns
 * ctx.state and the matching ctx.emit(); the fallbacks here do both.
 */

import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { VIEWS, VIEW_NAMES } from '../dims.js';

let readyResolve, readyReject;

export function installErrors() {
  const pg = window.__playground || (window.__playground = {});
  pg.errors = pg.errors || [];
  const push = (err, text) => {
    if (err && typeof err === 'object' && err.__reported) return;
    pg.errors.push(text);
  };
  window.addEventListener('error', (e) => push(e.error, String(e.message || e.error || e)));
  window.addEventListener('unhandledrejection', (e) => push(e.reason, String(e.reason?.stack || e.reason || e)));
  pg.ready = new Promise((res, rej) => {
    readyResolve = res;
    readyReject = rej;
  });
  pg.ready.catch(() => {});
  return pg;
}

export function markReady() {
  readyResolve?.();
}

export function markFailed(err) {
  if (err && typeof err === 'object') err.__reported = true;
  window.__playground?.errors.push(String(err?.stack || err));
  readyReject?.(err);
}

function isVisible(o) {
  for (let n = o; n; n = n.parent) if (!n.visible) return false;
  return true;
}

export function install(ctx) {
  const pg = installErrorsIfMissing();
  const { state } = ctx;
  const run = (name, ...args) => (ctx.actions[name] ? ctx.actions[name](...args) : fallbacks[name](...args));

  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  function syncBackground() {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    ctx.setBackground(bg || '#ffffff');
  }
  mq?.addEventListener?.('change', syncBackground);

  const fallbacks = {
    setTheme(theme) {
      state.theme = ['light', 'dark', 'system'].includes(theme) ? theme : 'system';
      document.documentElement.dataset.theme = state.theme;
      syncBackground();
      ctx.emit('theme', state.theme);
    },
    setFont(i) {
      state.font = Math.max(0, Math.round(Number(i) || 0));
      document.documentElement.dataset.font = String(state.font);
      ctx.emit('font', state.font);
    },
    setAccent(i) {
      state.accent = Math.max(0, Math.round(Number(i) || 0));
      document.documentElement.dataset.accent = String(state.accent);
      ctx.emit('accent', state.accent);
    },
    setDial(level) {
      state.dial = Math.min(3, Math.max(1, Math.round(Number(level) || 1)));
      ctx.emit('dial', state.dial);
    },
    setExplode(t) {
      state.explode = Math.min(1, Math.max(0, Number(t) || 0));
      ctx.emit('explode', state.explode);
    },
    setLid(deg) {
      state.lidAngleDeg = Number(deg);
      const display = ctx.byKey.get('Display')?.[0];
      if (display) display.rotation.x = -state.lidAngleDeg * (Math.PI / 180);
      ctx.emit('lid', state.lidAngleDeg);
    },
    setStack(open) {
      state.stack = !!open;
      const stack = ctx.byKey.get('Stack')?.[0];
      if (stack) stack.visible = state.stack;
      ctx.emit('stack', state.stack);
    },
    select(key) {
      state.selected = key ?? null;
      ctx.emit('select', state.selected);
    },
    hover(key) {
      state.hovered = key ?? null;
      ctx.emit('hover', state.hovered);
    },
    playTrace(kind) {
      state.trace = { playing: false, step: 0, total: 0, path: kind };
      ctx.emit('trace', state.trace);
      return Promise.resolve();
    },
    setTraceSpeed(mult) {
      state.traceSpeed = Number(mult) || 1;
      ctx.emit('traceSpeed', state.traceSpeed);
    },
    setView(name) {
      const v = VIEWS[name];
      if (!v) throw new Error(`unknown view "${name}"`);
      state.view = name;
      ctx.camera.position.fromArray(v.position);
      ctx.controls.target.fromArray(v.target);
      ctx.controls.update();
      run('setLid', v.lidAngleDeg);
      run('setExplode', v.explode);
      run('setStack', v.stack);
      if (v.dial != null) run('setDial', v.dial);
      ctx.emit('view', name);
      return ctx.renderOnce();
    },
    async setChip(id) {
      const chip = ctx.chips.find((c) => c.id === id);
      if (!chip) throw new Error(`unknown chip "${id}"`);
      await applyChipObject(chip);
    },
  };

  /**
   * Apply a chip object (a chips.json entry, or an ad-hoc object from the tests): every module's
   * applyChip, re-index nodes, refresh rest poses, emit 'chip', re-apply dial and explode, one frame.
   * The setChip fallback and the applyChipObject test helper share this so they cannot drift apart.
   */
  async function applyChipObject(chip) {
    if (!chip || typeof chip !== 'object') throw new Error('applyChipObject: a chip object is required');
    ctx.chip = chip;
    state.chip = String(chip.id ?? 'adhoc');
    for (const m of ctx.modules) {
      const g = m.applyChip && ctx.byKey.get(m.NAME)?.[0];
      if (g) m.applyChip(g, chip, ctx);
    }
    ctx.indexNodes();
    // Keep the rest pose of surviving nodes (they may be exploded right now); record only new ones.
    const fresh = new Map();
    ctx.root.traverse((o) => {
      if (o.userData.part) fresh.set(o, ctx.rest.get(o) ?? o.position.clone());
    });
    ctx.rest.clear();
    for (const [o, p] of fresh) ctx.rest.set(o, p);
    ctx.emit('chip', chip);
    run('setDial', state.dial);
    run('setExplode', state.explode);
    await ctx.renderOnce();
  }

  const api = {
    state() {
      const d = state.chipDerived || {};
      const fan = ctx.nodes.get('FanL');
      return {
        chip: state.chip, view: state.view, dial: state.dial, explode: state.explode, stack: state.stack,
        lidAngleDeg: state.lidAngleDeg, selected: state.selected, hovered: state.hovered,
        trace: { ...state.trace },
        dieSideMm: d.dieSideMm ?? null, dieCount: d.dieCount ?? null, lpddrCount: d.lpddrCount ?? null,
        gpuTiles: d.gpuTiles ?? null, cpuBlocks: d.cpuBlocks ? { ...d.cpuBlocks } : null,
        fansVisible: fan ? isVisible(fan) : false, streamSpeed: d.streamSpeed ?? null,
      };
    },
    chips: () => ctx.chips.map((c) => c.id),
    setChip: (id) => run('setChip', id),
    /** Test-only: apply an ad-hoc chip object (not in chips.json) exactly like the setChip fallback. */
    applyChipObject: (chipObject) => applyChipObject(chipObject),
    views: () => [...VIEW_NAMES],
    setView: (name, opts = {}) => run('setView', name, opts),
    setDial: (level) => run('setDial', level),
    setExplode: (t) => run('setExplode', t),
    setStack: (open) => run('setStack', open),
    setLid: (deg) => run('setLid', deg),
    select: (key) => run('select', key),
    hover: (key) => run('hover', key),
    playTrace: (kind) => run('playTrace', kind),
    setTraceSpeed: (mult) => run('setTraceSpeed', mult),
    setTheme: (theme) => run('setTheme', theme),
    setFont: (i) => run('setFont', i),
    setAccent: (i) => run('setAccent', i),
    sceneNames() {
      const names = [];
      ctx.root.traverse((o) => {
        if (o.name) names.push(o.name);
      });
      return names;
    },
    partKeys() {
      const keys = new Set();
      ctx.root.traverse((o) => {
        if (o.userData.part) keys.add(o.userData.part);
      });
      return [...keys];
    },
    visibleParts() {
      const names = [];
      ctx.root.traverse((o) => {
        if (o.isMesh && o.userData.part && isVisible(o)) names.push(o.name);
      });
      return names;
    },
    renderOnce: () => ctx.renderOnce(),
    async exportGLB() {
      const flipped = [];
      ctx.root.traverse((o) => {
        const want = o.userData.effect ? false : o.userData.part ? true : o.visible;
        if (o.visible !== want) {
          o.visible = want;
          flipped.push(o);
        }
      });
      try {
        return await new GLTFExporter().parseAsync(ctx.root, { binary: true, onlyVisible: true });
      } finally {
        for (const o of flipped) o.visible = !o.visible;
      }
    },
    ctx,
  };
  Object.assign(pg, api);
  ctx.api = pg;
  return pg;
}

function installErrorsIfMissing() {
  return window.__playground?.ready ? window.__playground : installErrors();
}
