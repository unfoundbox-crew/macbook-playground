#!/usr/bin/env node
/**
 * tools/export-glb.mjs — open the built page in headless Chromium, call __playground.exportGLB() and
 * write export/macbook.glb (GLTFExporter binary of the MacBook root; effects hidden, every tagged node
 * forced visible by the api).
 *
 * Usage:  node tools/export-glb.mjs [--out=export/macbook.glb] [--html=playground/index.html] [--chip=m1] [--timeout=60000]
 *         npm run export
 * Opens the page with ui=0&dial=3&stack=1 so everything is present, awaits ready, exports, prints the byte
 * size and node count. Exits 1 on any console error, page error or __playground error.
 * Import: import { exportGlb } from './tools/export-glb.mjs'
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { LAUNCH_ARGS, pageUrl } from './snap.mjs';
import { glbJson } from './validate-glb.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = join(ROOT, 'playground', 'index.html');
export const DEFAULT_OUT = join(ROOT, 'export', 'macbook.glb');

const DEFAULTS = Object.freeze({ out: DEFAULT_OUT, timeout: 60_000, width: 1280, height: 800 });

/** Repo-relative when inside the repo, absolute otherwise (private builds live in a scratchpad). */
function pretty(p) {
  const r = relative(ROOT, p);
  return r && !r.startsWith('..') ? r : p;
}

/** Page state for the export: everything built and shown. */
const EXPORT_PARAMS = Object.freeze({ view: 'Hero', ui: 0, dial: 3, stack: 1 });

/** Export one GLB. Resolves with { out, url, bytes, nodes, meshes, errors }; rejects only on setup problems. */
export async function exportGlb(opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const html = o.html ? resolve(o.html) : PAGE;
  if (!existsSync(html)) throw new Error(`${html} not found — run \`npm run build\` first`);
  const url = pageUrl({ ...EXPORT_PARAMS, html: o.html, chip: o.chip });
  const errors = [];
  const browser = await chromium.launch({ args: [...LAUNCH_ARGS] });
  try {
    const page = await browser.newPage({ viewport: { width: Number(o.width), height: Number(o.height) }, deviceScaleFactor: 1 });
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    await page.goto(url, { waitUntil: 'load', timeout: Number(o.timeout) });
    await page.waitForFunction(() => Boolean(window.__playground?.ready), null, { timeout: 5_000 });
    await page.evaluate(({ timeout }) => {
      const late = new Promise((_, reject) => setTimeout(() => reject(new Error(`__playground.ready did not resolve within ${timeout} ms`)), timeout));
      return Promise.race([window.__playground.ready, late]);
    }, { timeout: Number(o.timeout) });

    // ArrayBuffer → base64 in the page (32 KiB chunks keep String.fromCharCode's argument list small).
    const b64 = await page.evaluate(async () => {
      const bytes = new Uint8Array(await window.__playground.exportGLB());
      const CHUNK = 0x8000;
      let s = '';
      for (let i = 0; i < bytes.length; i += CHUNK) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
      return btoa(s);
    });
    const apiErrors = await page.evaluate(() => Array.from(window.__playground.errors ?? [], String));
    errors.push(...apiErrors.map((e) => `__playground.errors: ${e}`));

    const buf = Buffer.from(b64, 'base64');
    const json = glbJson(buf);
    mkdirSync(dirname(o.out), { recursive: true });
    writeFileSync(o.out, buf);
    return { out: o.out, url, bytes: buf.length, nodes: json.nodes?.length ?? 0, meshes: json.meshes?.length ?? 0, errors };
  } finally {
    await browser.close();
  }
}

function parseArgs(argv) {
  const opts = {};
  for (const a of argv) {
    if (!a.startsWith('--')) throw new Error(`unexpected argument "${a}" (use --name=value)`);
    const eq = a.indexOf('=');
    opts[eq === -1 ? a.slice(2) : a.slice(2, eq)] = eq === -1 ? '1' : a.slice(eq + 1);
  }
  return opts;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    if ('help' in opts) {
      console.log('usage: node tools/export-glb.mjs [--out=export/macbook.glb] [--html=playground/index.html] [--chip=<id>] [--timeout=60000]');
      process.exit(0);
    }
    if (opts.out) opts.out = resolve(opts.out);
    const { out, bytes, nodes, meshes, errors } = await exportGlb(opts);
    console.log(`wrote ${pretty(out)}: ${bytes.toLocaleString('en-US')} bytes, ${nodes} nodes, ${meshes} meshes`);
    for (const e of errors) console.error(`  ${e}`);
    if (errors.length) {
      console.error(`export-glb: ${errors.length} error(s) on the page`);
      process.exit(1);
    }
  } catch (e) {
    console.error(`export-glb: ${e.message}`);
    process.exit(1);
  }
}
