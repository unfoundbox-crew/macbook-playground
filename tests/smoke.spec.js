/**
 * tests/smoke.spec.js — the smoke suite from docs/CONTRACT.md, run against playground/index.html.
 *
 * Build first (`npm run build`); the page is opened over file:// with ui=0. Every test gets a fresh page.
 * Order: a. load + data, b. seven views, c. chips (chips.json ids, then ad-hoc fixtures), d. dial,
 * e. stack + trace, f. explode, g. GLB export + validation. Screenshots land in test-results/.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { validateData } from '../build.mjs';
import * as registry from '../src/parts/registry.js';
import { glbJson, glbNodeNames, missingNames } from '../tools/validate-glb.mjs';
import { FIXTURES } from './fixtures/chips.js';
import {
  ROOT, PAGE, openPlayground, apiErrors, pgState, renderOnce, canvasScreenshot, diffRatio, lumaStdDev, slug,
} from './helpers.js';

const OUT = join(ROOT, 'test-results');
const VIEW_DIR = join(OUT, 'views');
const CHIP_DIR = join(OUT, 'chips');
const EXPLODE_DIR = join(OUT, 'explode');
const GLB = join(ROOT, 'export', 'macbook.glb');
const GLB_REPORT = join(ROOT, 'export', 'macbook.validation.json');

/** Thresholds: a blank canvas has luma stddev ~0; two views / chips must move a visible share of pixels. */
const MIN_LUMA_STDDEV = 4;
const VIEW_DIFF = 0.02;
const CHIP_DIFF = 0.01;
const EXPLODE_DIFF = 0.05;
const TRACE_TIMEOUT_MS = 30_000;

const INSTANCE_RE = /^(Die|LPDDR)\[\d+\]$/;

function savePng(dir, name, png) {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${slug(name)}.png`);
  writeFileSync(file, png);
  return file;
}

/** World Y of named nodes through the api's ctx (present in api.js; null when it is not exposed). */
function worldY(page, names) {
  return page.evaluate((ns) => {
    const ctx = window.__playground.ctx;
    if (!ctx?.nodes || !ctx.root) return null;
    ctx.root.updateMatrixWorld(true);
    const out = {};
    for (const n of ns) {
      const o = ctx.nodes.get(n);
      if (!o) return null;
      out[n] = o.matrixWorld.elements[13];
    }
    return out;
  }, names);
}

function run(script, args = []) {
  return spawnSync(process.execPath, [join(ROOT, 'tools', script), ...args], { cwd: ROOT, encoding: 'utf8', timeout: 150_000 });
}

test.describe('smoke', () => {
  test('a. loads with zero errors and the data validates', async ({ page }) => {
    const { errors } = await openPlayground(page);
    expect(errors, 'console errors / page errors').toEqual([]);
    expect(await apiErrors(page), '__playground.errors').toEqual([]);
    const state = await pgState(page);
    expect(registry.KEYS).toContain('MacBook');
    expect(state.view).toBe('Hero');

    const data = validateData();
    expect(data.errors, 'validateData()').toEqual([]);
    expect(data.ok).toBe(true);
  });

  test('b. all 7 views render and each differs from the previous one', async ({ page }) => {
    const { errors } = await openPlayground(page);
    const views = await page.evaluate(() => window.__playground.views());
    expect(views).toHaveLength(7);
    let prev = null;
    for (const name of views) {
      await page.evaluate((n) => window.__playground.setView(n, { instant: true }), name);
      await renderOnce(page);
      const png = await canvasScreenshot(page);
      savePng(VIEW_DIR, name, png);
      expect((await pgState(page)).view, `state().view after setView(${name})`).toBe(name);
      expect(lumaStdDev(png), `${name}: canvas is blank`).toBeGreaterThan(MIN_LUMA_STDDEV);
      if (prev) expect(diffRatio(prev.png, png), `${name} looks like ${prev.name}`).toBeGreaterThan(VIEW_DIFF);
      prev = { name, png };
    }
    expect(errors, 'console errors / page errors').toEqual([]);
    expect(await apiErrors(page), '__playground.errors').toEqual([]);
  });

  test('c. every chips.json id switches; ad-hoc chips drive the geometry', async ({ page }) => {
    const { errors } = await openPlayground(page);
    const ids = await page.evaluate(() => window.__playground.chips());
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      await page.evaluate((i) => window.__playground.setChip(i), id);
      expect((await pgState(page)).chip, `state().chip after setChip(${id})`).toBe(id);
      expect(errors, `errors after setChip(${id})`).toEqual([]);
      expect(await apiErrors(page), `__playground.errors after setChip(${id})`).toEqual([]);
    }

    // Fixtures at 'SoC macro' (dial 3, so the level-2 fans are governed by the chip, not the dial).
    await page.evaluate(() => window.__playground.setView('SoC macro', { instant: true }));
    const shots = [];
    for (const f of FIXTURES) {
      const id = f.chip.id;
      await page.evaluate((c) => window.__playground.applyChipObject(c), f.chip);
      await renderOnce(page);
      const s = await pgState(page);
      expect(s.chip, `state().chip after applyChipObject(${id})`).toBe(id);
      const got = { dieCount: s.dieCount, lpddrCount: s.lpddrCount, gpuTiles: s.gpuTiles, fansVisible: s.fansVisible, streamSpeed: s.streamSpeed };
      expect(got, `${id}: derived state`).toEqual(f.expect);
      if (f.dieSideMm != null) expect(s.dieSideMm, `${id}: dieSideMm`).toBeCloseTo(f.dieSideMm, 2);

      const names = await page.evaluate(() => window.__playground.sceneNames());
      const instances = names.filter((n) => INSTANCE_RE.test(n)).sort();
      const expected = registry.expectedNodeNames(f.chip).filter((n) => INSTANCE_RE.test(n)).sort();
      expect(instances, `${id}: Die[i] / LPDDR[i] nodes`).toEqual(expected);

      const png = await canvasScreenshot(page);
      savePng(CHIP_DIR, id, png);
      shots.push({ id, png });
    }
    for (let i = 0; i < shots.length; i++) {
      for (let j = i + 1; j < shots.length; j++) {
        expect(diffRatio(shots[i].png, shots[j].png), `${shots[i].id} looks like ${shots[j].id}`).toBeGreaterThan(CHIP_DIFF);
      }
    }
    expect(errors, 'console errors / page errors').toEqual([]);
    expect(await apiErrors(page), '__playground.errors').toEqual([]);
  });

  test('d. the dial reveals strictly more at each level', async ({ page }) => {
    const { errors } = await openPlayground(page);
    const counts = [];
    for (const level of [1, 2, 3]) {
      await page.evaluate((l) => window.__playground.setDial(l), level);
      await renderOnce(page);
      expect((await pgState(page)).dial, `state().dial after setDial(${level})`).toBe(level);
      const visible = await page.evaluate(() => window.__playground.visibleParts());
      counts.push(visible.length);
      if (level === 1) expect(visible, 'dial 1 must hide PCB (level 2)').not.toContain('PCB');
      if (level === 3) for (const unit of registry.DIE_UNITS) expect(visible, `dial 3 must show ${unit}`).toContain(unit);
    }
    expect(counts[0], `visibleParts: dial 1 (${counts[0]}) < dial 2 (${counts[1]})`).toBeLessThan(counts[1]);
    expect(counts[1], `visibleParts: dial 2 (${counts[1]}) < dial 3 (${counts[2]})`).toBeLessThan(counts[2]);
    expect(errors, 'console errors / page errors').toEqual([]);
    expect(await apiErrors(page), '__playground.errors').toEqual([]);
  });

  test('e. stack view shows every layer and the trace runs to the end', async ({ page }) => {
    const { errors } = await openPlayground(page);
    await page.evaluate(() => window.__playground.setDial(3));
    await page.evaluate(() => window.__playground.setStack(true));
    await renderOnce(page);
    expect((await pgState(page)).stack).toBe(true);
    let visible = await page.evaluate(() => window.__playground.visibleParts());
    for (const layer of registry.STACK_LAYERS) expect(visible, `stack open, dial 3: ${layer} visible`).toContain(layer);
    savePng(VIEW_DIR, 'stack-open', await canvasScreenshot(page));

    await page.evaluate(() => window.__playground.setTraceSpeed(20));
    await page.evaluate(({ timeout }) => {
      const late = new Promise((_, reject) => setTimeout(() => reject(new Error(`playTrace('train') did not resolve within ${timeout} ms`)), timeout));
      return Promise.race([window.__playground.playTrace('train'), late]);
    }, { timeout: TRACE_TIMEOUT_MS });
    const { trace } = await pgState(page);
    // path: the kind ('train') or the list of step targets; either way it is set while a path is loaded.
    expect(trace.path, 'trace.path is set after playTrace').toBeTruthy();
    if (Array.isArray(trace.path)) expect(trace.path.length, 'trace.path steps').toBeGreaterThan(0);
    else expect(trace.path, 'trace.path').toBe('train');
    expect(trace.total, 'trace.total (a placeholder path must have steps)').toBeGreaterThan(0);
    expect(trace.step, 'trace.step reached trace.total').toBe(trace.total);
    expect(trace.playing, 'trace.playing after the path finished').toBe(false);

    await page.evaluate(() => window.__playground.setStack(false));
    await renderOnce(page);
    expect((await pgState(page)).stack).toBe(false);
    visible = await page.evaluate(() => window.__playground.visibleParts());
    for (const layer of registry.STACK_LAYERS) expect(visible, `stack closed: ${layer} hidden`).not.toContain(layer);
    expect(errors, 'console errors / page errors').toEqual([]);
    expect(await apiErrors(page), '__playground.errors').toEqual([]);
  });

  test('f. explode moves the parts', async ({ page }) => {
    const { errors } = await openPlayground(page);
    await page.evaluate(() => window.__playground.setView('Thermal', { instant: true }));
    await page.evaluate(() => window.__playground.setExplode(0));
    await renderOnce(page);
    expect((await pgState(page)).explode).toBe(0);
    const y0 = await worldY(page, ['BottomCase', 'HeatPipe']);
    const closed = await canvasScreenshot(page);
    savePng(EXPLODE_DIR, 'thermal-explode-0', closed);

    await page.evaluate(() => window.__playground.setExplode(1));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await renderOnce(page);
    expect((await pgState(page)).explode).toBe(1);
    const y1 = await worldY(page, ['BottomCase', 'HeatPipe']);
    const open = await canvasScreenshot(page);
    savePng(EXPLODE_DIR, 'thermal-explode-1', open);

    expect(diffRatio(closed, open), 'Thermal view: explode 0 vs 1').toBeGreaterThan(EXPLODE_DIFF);
    if (y0 && y1) {
      expect(y1.BottomCase, 'BottomCase world y drops at explode 1').toBeLessThan(y0.BottomCase);
      expect(y1.HeatPipe, 'HeatPipe world y rises at explode 1').toBeGreaterThan(y0.HeatPipe);
    } else {
      test.info().annotations.push({ type: 'note', description: '__playground.ctx not exposed: world-y check skipped' });
    }
    expect(errors, 'console errors / page errors').toEqual([]);
    expect(await apiErrors(page), '__playground.errors').toEqual([]);
  });

  test('g. GLB export validates and covers every registry node name', async () => {
    test.setTimeout(240_000);
    const exp = run('export-glb.mjs', [`--html=${PAGE}`]);
    expect(exp.status, `export-glb.mjs exit ${exp.status}\n${exp.stdout}\n${exp.stderr}`).toBe(0);
    expect(existsSync(GLB), `${GLB} written`).toBe(true);
    const buf = readFileSync(GLB);
    expect(buf.toString('latin1', 0, 4), 'GLB magic').toBe('glTF');

    const val = run('validate-glb.mjs');
    expect(val.status, `validate-glb.mjs exit ${val.status}\n${val.stdout}\n${val.stderr}`).toBe(0);
    const report = JSON.parse(readFileSync(GLB_REPORT, 'utf8'));
    expect(report.numErrors, 'validator errors').toBe(0);
    expect(report.missing, 'names missing from the GLB (validator report)').toEqual([]);

    // Independent multiset check straight from the GLB's JSON chunk.
    const { chips } = validateData();
    const names = glbNodeNames(glbJson(buf));
    expect(names.length).toBeGreaterThan(0);
    expect(missingNames(names, registry.expectedNodeNames(chips[0])), 'names missing from the GLB').toEqual([]);
  });
});
