/**
 * src/main.js — composition root. Build the scene, init every engine and the UI, install the
 * test API, apply URL parameters, start the loop, resolve ready after the first frame.
 */

import chipsJson from '../data/chips.json' with { type: 'json' };
import contentJson from '../data/content.json' with { type: 'json' };
import { VIEW_NAMES } from './dims.js';
import { createMaterials } from './materials.js';
import { createRenderer } from './engine/renderer.js';
import { createContext } from './engine/state.js';
import * as api from './engine/api.js';
import * as chassis from './scene/chassis.js';
import * as display from './scene/display.js';
import * as logicboard from './scene/logicboard.js';
import * as soc from './scene/soc.js';
import * as thermal from './scene/thermal.js';
import * as power from './scene/power.js';
import * as audio from './scene/audio.js';
import * as input from './scene/input.js';
import * as stack from './scene/stack.js';
import * as interaction from './engine/interaction.js';
import * as explode from './engine/explode.js';
import * as dial from './engine/dial.js';
import * as tours from './engine/tours.js';
import * as trace from './engine/trace.js';
import * as ui from './ui/index.js';

api.installErrors();

/** chips.json may be a bare array or { chips: [...] }; content.json a bare map or { cards: {...} }. */
const chips = Array.isArray(chipsJson) ? chipsJson : Array.isArray(chipsJson?.chips) ? chipsJson.chips : Object.values(chipsJson ?? {});
const content = contentJson?.cards && typeof contentJson.cards === 'object' ? contentJson.cards : contentJson ?? {};

function readParams() {
  const q = new URLSearchParams(location.search);
  const num = (k) => (q.has(k) && q.get(k) !== '' && Number.isFinite(Number(q.get(k))) ? Number(q.get(k)) : null);
  return {
    view: q.get('view'),
    chip: q.get('chip'),
    dial: num('dial'),
    explode: num('explode'),
    stack: q.has('stack') ? q.get('stack') !== '0' : null,
    lid: num('lid'),
    trace: q.get('trace'),
    ui: q.get('ui'),
    theme: q.get('theme'),
    font: num('font'),
    accent: num('accent'),
  };
}

async function boot() {
  const params = readParams();
  if (params.ui === '0') document.documentElement.dataset.ui = '0';

  const mats = createMaterials();
  const gfx = createRenderer(document.getElementById('scene'));
  const ctx = createContext({ ...gfx, mats, chips, content, params });
  ctx.modules = [chassis, display, logicboard, soc, thermal, power, audio, input, stack];
  gfx.scene.add(ctx.root);

  const { chip, root } = ctx;
  chassis.build(root, chip, ctx);
  display.build(root, chip, ctx);
  const board = logicboard.build(root, chip, ctx);
  soc.build(board, chip, ctx);
  thermal.build(root, chip, ctx);
  power.build(root, chip, ctx);
  audio.build(root, chip, ctx);
  input.build(root, chip, ctx);
  stack.build(root, chip, ctx);
  ctx.indexNodes();
  ctx.recordRest();

  for (const m of ctx.modules) {
    const g = m.update && ctx.byKey.get(m.NAME)?.[0];
    if (g) ctx.onFrame((dt) => m.update(g, ctx.state, dt));
  }

  interaction.init(ctx);
  explode.init(ctx);
  dial.init(ctx);
  tours.init(ctx);
  trace.init(ctx);
  ui.init(ctx);
  const play = api.install(ctx);

  play.setTheme(params.theme ?? 'system');
  play.setFont(params.font ?? 0);
  play.setAccent(params.accent ?? 0);
  if (params.view && VIEW_NAMES.includes(params.view)) await play.setView(params.view, { instant: true });
  if (params.dial != null) play.setDial(params.dial);
  if (params.explode != null) play.setExplode(params.explode);
  if (params.stack != null) play.setStack(params.stack);
  if (params.lid != null) play.setLid(params.lid);
  if (params.trace === 'train' || params.trace === 'infer') play.playTrace(params.trace);

  gfx.start();
  await gfx.renderOnce();
  api.markReady();
}

boot().catch((err) => {
  api.markFailed(err);
  throw err;
});
