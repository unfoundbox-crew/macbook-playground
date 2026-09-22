#!/usr/bin/env node
/**
 * tools/validate-glb.mjs — run the Khronos glTF validator over export/macbook.glb and check that the
 * GLB's node names cover registry.expectedNodeNames(chip) as a multiset (two 'Glass' nodes, Feet[0..3], …).
 *
 * Usage:  node tools/validate-glb.mjs [--in=export/macbook.glb] [--chip=m1] [--report=export/macbook.validation.json]
 *         npm run validate-glb
 * Prints a summary and every missing name; writes the report JSON; exits 1 on validator errors or missing names.
 * Import: import { glbJson, glbNodeNames, missingNames, validateGlb, defaultChip } from './tools/validate-glb.mjs'
 *
 * The validator report has no node names, so the JSON chunk is parsed here (GLB header: magic 'glTF',
 * version 2, then chunks of [length, type, data]; the first chunk is the JSON).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expectedNodeNames } from '../src/parts/registry.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_GLB = join(ROOT, 'export', 'macbook.glb');
export const DEFAULT_REPORT = join(ROOT, 'export', 'macbook.validation.json');

const GLB_MAGIC = 0x46546c67; // 'glTF' little-endian
const GLB_VERSION = 2;
const CHUNK_JSON = 0x4e4f534a; // 'JSON'

/** Repo-relative when inside the repo, absolute otherwise (private builds live in a scratchpad). */
function pretty(p) {
  const r = relative(ROOT, p);
  return r && !r.startsWith('..') ? r : p;
}

/** Parse the JSON chunk of a GLB buffer. Throws when the buffer is not a GLB 2.0. */
export function glbJson(input) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (b.length < 20 || b.readUInt32LE(0) !== GLB_MAGIC) throw new Error('not a GLB: bad magic (expected "glTF")');
  const version = b.readUInt32LE(4);
  if (version !== GLB_VERSION) throw new Error(`unsupported GLB version ${version}`);
  const total = Math.min(b.readUInt32LE(8), b.length);
  for (let off = 12; off + 8 <= total;) {
    const len = b.readUInt32LE(off);
    const type = b.readUInt32LE(off + 4);
    if (type === CHUNK_JSON) return JSON.parse(b.toString('utf8', off + 8, off + 8 + len));
    off += 8 + len;
  }
  throw new Error('GLB has no JSON chunk');
}

/** Node names in glTF order ('' for unnamed nodes). */
export function glbNodeNames(json) {
  return (json?.nodes ?? []).map((n) => (typeof n?.name === 'string' ? n.name : ''));
}

/** Entries of `expected` (a multiset) that `names` does not cover, in expected order. */
export function missingNames(names, expected) {
  const pool = new Map();
  for (const n of names) pool.set(n, (pool.get(n) ?? 0) + 1);
  const missing = [];
  for (const e of expected) {
    const c = pool.get(e) ?? 0;
    if (c > 0) pool.set(e, c - 1);
    else missing.push(e);
  }
  return missing;
}

/** chips.json entries (bare array or { chips: [...] }). */
export function readChips() {
  const raw = JSON.parse(readFileSync(join(ROOT, 'data', 'chips.json'), 'utf8'));
  return Array.isArray(raw) ? raw : Array.isArray(raw?.chips) ? raw.chips : Object.values(raw ?? {});
}

/** The chip the page boots with: the first chips.json entry, or the one named by `id`. */
export function defaultChip(id = null) {
  const chips = readChips();
  const chip = id ? chips.find((c) => c.id === id) : chips[0];
  if (!chip) throw new Error(id ? `unknown chip "${id}"` : 'data/chips.json has no entries');
  return chip;
}

/** Khronos validator report for a GLB buffer (loaded lazily: the Dart build is a few MB of JS). */
export async function validateGlb(buffer, { uri = 'macbook.glb' } = {}) {
  const { validateBytes } = await import('gltf-validator');
  return validateBytes(new Uint8Array(buffer), { uri, writeTimestamp: false, maxIssues: 0 });
}

/**
 * Validate a GLB file end to end. Returns { ok, report, names, missing, unnamed, nodeCount, issues } where
 * `report` is the object written to --report and `issues` the validator's messages.
 */
export async function checkGlb({ file = DEFAULT_GLB, chip = null, reportPath = DEFAULT_REPORT } = {}) {
  const buffer = readFileSync(file);
  const result = await validateGlb(buffer, { uri: pretty(file) });
  const issues = result.issues ?? { numErrors: 0, numWarnings: 0, numInfos: 0, numHints: 0, messages: [] };
  const json = glbJson(buffer);
  const names = glbNodeNames(json);
  const chipObj = defaultChip(chip);
  const expected = expectedNodeNames(chipObj);
  const missing = missingNames(names, expected);
  const unnamed = names.filter((n) => n === '').length;
  const report = {
    file: pretty(file),
    bytes: buffer.length,
    chip: chipObj.id,
    validatorVersion: result.validatorVersion ?? null,
    numErrors: issues.numErrors ?? 0,
    numWarnings: issues.numWarnings ?? 0,
    numInfos: issues.numInfos ?? 0,
    numHints: issues.numHints ?? 0,
    messages: issues.messages ?? [],
    nodeCount: names.length,
    meshCount: json.meshes?.length ?? 0,
    unnamedNodes: unnamed,
    expectedCount: expected.length,
    missing,
    nodeNames: names,
  };
  if (reportPath) {
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }
  return { ok: report.numErrors === 0 && missing.length === 0, report, names, missing, unnamed, nodeCount: names.length, issues };
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
      console.log('usage: node tools/validate-glb.mjs [--in=export/macbook.glb] [--chip=<id>] [--report=export/macbook.validation.json]');
      process.exit(0);
    }
    const file = opts.in ? resolve(opts.in) : DEFAULT_GLB;
    const reportPath = opts.report ? resolve(opts.report) : DEFAULT_REPORT;
    const { ok, report, issues } = await checkGlb({ file, chip: opts.chip ?? null, reportPath });
    console.log(`${report.file}: ${report.bytes.toLocaleString('en-US')} bytes, ${report.nodeCount} nodes (${report.unnamedNodes} unnamed), ${report.meshCount} meshes`);
    console.log(`validator ${report.validatorVersion ?? '?'}: ${report.numErrors} errors, ${report.numWarnings} warnings, ${report.numInfos} infos, ${report.numHints} hints`);
    for (const m of issues.messages ?? []) {
      if (m.severity <= 1) console.log(`  [${m.severity === 0 ? 'error' : 'warning'}] ${m.code} ${m.pointer ?? ''}: ${m.message}`);
    }
    console.log(`registry (chip ${report.chip}): ${report.expectedCount - report.missing.length}/${report.expectedCount} expected names present`);
    for (const n of report.missing) console.log(`  missing: ${n}`);
    console.log(`report: ${pretty(reportPath)}`);
    if (!ok) {
      console.error(`validate-glb: ${report.numErrors} validator error(s), ${report.missing.length} missing name(s)`);
      process.exit(1);
    }
  } catch (e) {
    console.error(`validate-glb: ${e.message}`);
    process.exit(1);
  }
}
