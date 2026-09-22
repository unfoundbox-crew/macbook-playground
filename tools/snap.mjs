#!/usr/bin/env node
/**
 * tools/snap.mjs — screenshot the built playground (playground/index.html) in headless Chromium.
 *
 * Usage:  node tools/snap.mjs --view=Hero --out=/abs/path.png
 *           [--chip=m1 --dial=1|2|3 --explode=0..1 --stack=1 --lid=105 --trace=train|infer
 *            --theme=light|dark|system --font=N --accent=N --width=1280 --height=800 --ui=0|1 --timeout=30000]
 *         npm run snap -- --view="SoC macro" --out=/abs/soc.png --chip=m3-max --dial=3
 * Import: import { snap, LAUNCH_ARGS } from './tools/snap.mjs';
 *         const { out, url, errors } = await snap({ view: 'Hero', out: '/abs/hero.png', chip: 'm1' });
 *
 * Flow: open file:///…/playground/index.html?view=…&ui=0, wait for window.__playground (up to 2 s; when it is
 * absent the page is screenshotted anyway), await __playground.ready (--timeout, default 30 s), await
 * __playground.renderOnce() when present, screenshot the viewport, then report console errors, page errors and
 * __playground.errors. The PNG is always written; the exit code is 1 when anything was reported.
 *
 * WebGL backend — measured 2026-09-22 on this Mac (Apple M1 Max, Playwright chromium 1243), one PMREM frame of a
 * 130k-triangle Three.js scene at 1280×800, launch → screenshot → close, two runs each:
 *   default (headless falls back to SwiftShader)          ~2.9 s, console spam "GPU stall due to ReadPixels"
 *   --use-angle=swiftshader --enable-unsafe-swiftshader   ~2.9 s, same spam
 *   --use-angle=metal (real GPU)                          0.4 s warm / 1.5 s cold shader cache, quiet console
 * macOS therefore uses Metal; every other platform gets explicit SwiftShader, which needs no GPU (Linux CI).
 */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = join(ROOT, 'playground', 'index.html');

export const LAUNCH_ARGS = Object.freeze(
  process.platform === 'darwin' ? ['--use-angle=metal'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
);

/** URL parameters the page reads at boot (docs/CONTRACT.md). */
const URL_PARAMS = ['view', 'chip', 'dial', 'explode', 'stack', 'lid', 'trace', 'ui', 'theme', 'font', 'accent'];

const DEFAULTS = Object.freeze({ view: 'Hero', width: 1280, height: 800, ui: 0, timeout: 30000 });

/** `html` (or --html=) points at a privately built page (node build.mjs --out=…); default playground/index.html. */
export function pageUrl(opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const params = new URLSearchParams();
  for (const k of URL_PARAMS) if (o[k] != null && o[k] !== '') params.set(k, String(o[k]));
  return `${pathToFileURL(o.html ? resolve(o.html) : PAGE).href}?${params}`;
}

/** Screenshot one state of the page. Resolves with { out, url, errors }; rejects only on setup problems. */
export async function snap(opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  if (!o.out) throw new Error('--out=<abs path.png> is required');
  if (!isAbsolute(o.out)) throw new Error(`--out must be an absolute path, got "${o.out}"`);
  const page0 = o.html ? resolve(o.html) : PAGE;
  if (!existsSync(page0)) throw new Error(`${page0} not found — run \`npm run build\` first`);
  mkdirSync(dirname(o.out), { recursive: true });

  const url = pageUrl(o);
  const errors = [];
  const browser = await chromium.launch({ args: [...LAUNCH_ARGS] });
  try {
    const page = await browser.newPage({
      viewport: { width: Number(o.width), height: Number(o.height) },
      deviceScaleFactor: 1,
    });
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    await page.goto(url, { waitUntil: 'load', timeout: Number(o.timeout) });

    const hasApi = await page
      .waitForFunction(() => Boolean(window.__playground), null, { timeout: 2000 })
      .then(() => true, () => false);

    if (hasApi) {
      const readyError = await page.evaluate(({ timeout }) => {
        const api = window.__playground;
        const late = new Promise((_, reject) => setTimeout(() => reject(new Error(`__playground.ready did not resolve within ${timeout} ms`)), timeout));
        return Promise.race([Promise.resolve(api.ready), late]).then(() => null, (e) => `__playground.ready rejected: ${e?.message ?? e}`);
      }, { timeout: Number(o.timeout) });
      if (readyError) errors.push(readyError);

      const renderError = await page.evaluate(() => {
        const api = window.__playground;
        if (typeof api.renderOnce !== 'function') return null;
        return Promise.resolve(api.renderOnce()).then(() => null, (e) => `renderOnce: ${e?.message ?? e}`);
      });
      if (renderError) errors.push(renderError);

      const apiErrors = await page.evaluate(() => Array.from(window.__playground.errors ?? [], String));
      errors.push(...apiErrors.map((e) => `__playground.errors: ${e}`));
    } else {
      console.warn('snap: window.__playground not found after 2 s; screenshotting anyway');
    }

    await page.screenshot({ path: o.out, fullPage: false });
  } finally {
    await browser.close();
  }
  return { out: o.out, url, errors };
}

function parseArgs(argv) {
  const opts = {};
  for (const a of argv) {
    if (!a.startsWith('--')) throw new Error(`unexpected argument "${a}" (use --name=value)`);
    const eq = a.indexOf('=');
    const key = eq === -1 ? a.slice(2) : a.slice(2, eq);
    opts[key] = eq === -1 ? '1' : a.slice(eq + 1);
  }
  return opts;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    if ('help' in opts) {
      console.log('usage: node tools/snap.mjs --view=Hero --out=/abs/path.png [--chip= --dial= --explode= --stack=1 --lid= --trace= --theme= --font= --accent= --width= --height= --ui=0|1 --timeout=]');
      process.exit(0);
    }
    const { out, url, errors } = await snap(opts);
    console.log(`wrote ${out} (${opts.width ?? DEFAULTS.width}×${opts.height ?? DEFAULTS.height}, ${Math.round(statSync(out).size / 1024)} KB)\n${url}`);
    for (const e of errors) console.error(`  ${e}`);
    if (errors.length) {
      console.error(`snap: ${errors.length} error(s) on the page`);
      process.exit(1);
    }
  } catch (e) {
    console.error(`snap: ${e.message}`);
    process.exit(1);
  }
}
