/**
 * tests/helpers.js — shared helpers for the Playwright smoke tests.
 *
 * openPlayground(page, params) opens the built page (file://…/playground/index.html?…, or the file named
 * by PLAYGROUND_HTML) with URL parameters, collects console errors and page errors as they happen, waits
 * for window.__playground.ready and returns { errors, url }. `errors` is live: read it again later.
 *
 * Pixel helpers work on the PNG buffers Playwright's screenshot returns, without a new package: a
 * tiny PNG decoder (8-bit, non-interlaced, gray / gray+alpha / RGB / RGBA — what Chromium writes)
 * on top of node:zlib.
 *   canvasScreenshot(page)          → PNG Buffer of the #scene canvas (falls back to the viewport)
 *   decodePng(buf)                  → { width, height, data: RGBA Buffer }
 *   diffRatio(a, b, threshold = 16) → fraction of pixels whose max RGB delta exceeds the threshold (1 when sizes differ)
 *   lumaStdDev(png)                 → standard deviation of pixel luminance (0..255); a blank canvas gives ~0
 */
import { existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pageUrl } from '../tools/snap.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/** The page under test: playground/index.html, or a private build named by PLAYGROUND_HTML (node build.mjs --out=…). */
export const PAGE = process.env.PLAYGROUND_HTML ? resolve(process.env.PLAYGROUND_HTML) : join(ROOT, 'playground', 'index.html');
export const READY_TIMEOUT = 30_000;

export function assertBuilt() {
  if (!existsSync(PAGE)) throw new Error(`${PAGE} not found — run \`npm run build\` first`);
}

/** Navigate, collect errors, await ready. `params` are the URL parameters from docs/CONTRACT.md (ui=0 by default). */
export async function openPlayground(page, params = {}) {
  assertBuilt();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  const url = pageUrl({ ui: 0, html: PAGE, ...params });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.__playground?.ready), null, { timeout: 5_000 });
  await page.evaluate(({ timeout }) => {
    const late = new Promise((_, reject) => setTimeout(() => reject(new Error(`__playground.ready did not resolve within ${timeout} ms`)), timeout));
    return Promise.race([window.__playground.ready, late]);
  }, { timeout: READY_TIMEOUT });
  return { errors, url };
}

/** window.__playground.errors as strings. */
export function apiErrors(page) {
  return page.evaluate(() => Array.from(window.__playground.errors ?? [], String));
}

/** window.__playground.state(). */
export function pgState(page) {
  return page.evaluate(() => window.__playground.state());
}

/** Force one frame and resolve after it is drawn. */
export function renderOnce(page) {
  return page.evaluate(() => window.__playground.renderOnce());
}

/** PNG of the WebGL canvas (#scene). Falls back to the viewport when the element cannot be captured. */
export async function canvasScreenshot(page) {
  const canvas = page.locator('#scene');
  if ((await canvas.count()) === 1) {
    try {
      return await canvas.screenshot({ type: 'png' });
    } catch {
      /* fall through to the viewport */
    }
  }
  return page.screenshot({ type: 'png', fullPage: false });
}

/** File-name-safe form of a view or chip name: 'SoC macro' → 'soc-macro'. */
export function slug(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/* ---------------------------------------------------------------- PNG decode + compare (no dependencies) */

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 }; // colour type → samples per pixel

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Decode an 8-bit non-interlaced PNG into RGBA. Throws on anything else (Chromium never writes it). */
export function decodePng(input) {
  if (input && input.data && input.width) return input; // already decoded
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (buf[i] !== PNG_SIGNATURE[i]) throw new Error('decodePng: not a PNG');
  }
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  for (let off = 8; off + 8 <= buf.length;) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  const channels = CHANNELS[colorType];
  if (!width || !height) throw new Error('decodePng: missing IHDR');
  if (bitDepth !== 8 || interlace !== 0 || !channels) {
    throw new Error(`decodePng: unsupported PNG (bit depth ${bitDepth}, colour type ${colorType}, interlace ${interlace})`);
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  let cur = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    for (let x = 0; x < stride; x++) {
      const r = raw[p + x];
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v;
      switch (filter) {
        case 0: v = r; break;
        case 1: v = r + a; break;
        case 2: v = r + b; break;
        case 3: v = r + ((a + b) >> 1); break;
        case 4: v = r + paeth(a, b, c); break;
        default: throw new Error(`decodePng: bad filter ${filter} on row ${y}`);
      }
      cur[x] = v & 0xff;
    }
    p += stride;
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const s = x * channels;
      switch (channels) {
        case 1: out[o] = out[o + 1] = out[o + 2] = cur[s]; out[o + 3] = 255; break;
        case 2: out[o] = out[o + 1] = out[o + 2] = cur[s]; out[o + 3] = cur[s + 1]; break;
        case 3: out[o] = cur[s]; out[o + 1] = cur[s + 1]; out[o + 2] = cur[s + 2]; out[o + 3] = 255; break;
        default: out[o] = cur[s]; out[o + 1] = cur[s + 1]; out[o + 2] = cur[s + 2]; out[o + 3] = cur[s + 3];
      }
    }
    [prev, cur] = [cur, prev];
  }
  return { width, height, data: out };
}

/** Fraction of pixels (0..1) whose largest RGB channel difference exceeds `threshold`. Different sizes → 1. */
export function diffRatio(a, b, threshold = 16) {
  const A = decodePng(a);
  const B = decodePng(b);
  if (A.width !== B.width || A.height !== B.height) return 1;
  const n = A.width * A.height;
  let changed = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const d = Math.max(Math.abs(A.data[o] - B.data[o]), Math.abs(A.data[o + 1] - B.data[o + 1]), Math.abs(A.data[o + 2] - B.data[o + 2]));
    if (d > threshold) changed++;
  }
  return changed / n;
}

/** Standard deviation of Rec.601 luminance over every pixel (0..255). */
export function lumaStdDev(png) {
  const P = decodePng(png);
  const n = P.width * P.height;
  let sum = 0, sumSq = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const l = 0.299 * P.data[o] + 0.587 * P.data[o + 1] + 0.114 * P.data[o + 2];
    sum += l;
    sumSq += l * l;
  }
  const mean = sum / n;
  return Math.sqrt(Math.max(0, sumSq / n - mean * mean));
}
