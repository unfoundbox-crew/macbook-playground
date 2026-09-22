#!/usr/bin/env node
/**
 * build.mjs — validate data/*.json, bundle src/main.js with esbuild (Three.js inlined, zero runtime
 * deps), inline src/ui/theme.css and the bundle into src/index.html, write playground/index.html.
 *
 * Usage:  node build.mjs                                   (npm run build)
 * Import: import { validateData } from './build.mjs'       (tests)
 *
 * Any failure prints one clear message and exits 1. playground/index.html is generated; never hand-edit it.
 */
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { build as esbuild } from 'esbuild';
import { KEYS, get } from './src/parts/registry.js';
import { CHIP_IDS } from './tools/gen-placeholders.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PATHS = Object.freeze({
  chips: join(ROOT, 'data', 'chips.json'),
  content: join(ROOT, 'data', 'content.json'),
  chipsSchema: join(ROOT, 'schemas', 'chips.schema.json'),
  contentSchema: join(ROOT, 'schemas', 'content.schema.json'),
  entry: join(ROOT, 'src', 'main.js'),
  template: join(ROOT, 'src', 'index.html'),
  css: join(ROOT, 'src', 'ui', 'theme.css'),
  out: join(ROOT, 'playground', 'index.html'),
});
const CSS_MARKER = '<!--CSS-->';
const SCRIPT_MARKER = '<!--SCRIPT-->';

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new Error(`${relative(ROOT, path)}: ${e.message}`, { cause: e });
  }
}

function schemaErrors(ajv, schema, data, label) {
  const validate = ajv.compile(schema);
  if (validate(data)) return [];
  return validate.errors.map((e) => {
    const where = `${label}${e.instancePath || ''}`;
    const extra = e.params?.allowedValues ? ` (${JSON.stringify(e.params.allowedValues)})`
      : e.params?.additionalProperty ? ` ("${e.params.additionalProperty}")` : '';
    return `${where}: ${e.message}${extra}`;
  });
}

/**
 * Validate the data files against the schemas and the registry.
 * Pass { chips, content } objects to validate in-memory data; otherwise the files on disk are read.
 * Returns { ok, errors, chips, content }; never throws on validation failure (only on unreadable files).
 */
export function validateData({ chips = readJson(PATHS.chips), content = readJson(PATHS.content) } = {}) {
  const errors = [];
  const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
  errors.push(...schemaErrors(ajv, readJson(PATHS.chipsSchema), chips, 'chips.json'));
  errors.push(...schemaErrors(ajv, readJson(PATHS.contentSchema), content, 'content.json'));

  if (Array.isArray(chips)) {
    const ids = chips.map((c) => c?.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length) errors.push(`chips.json: duplicate ids: ${[...new Set(dupes)].join(', ')}`);
    const missing = CHIP_IDS.filter((id) => !ids.includes(id));
    if (missing.length) errors.push(`chips.json: missing expected ids: ${missing.join(', ')}`);
  }

  if (content && typeof content === 'object' && !Array.isArray(content)) {
    const keys = Object.keys(content);
    const missing = KEYS.filter((k) => !(k in content));
    const orphans = keys.filter((k) => !get(k));
    if (missing.length) errors.push(`content.json: missing registry keys: ${missing.join(', ')}`);
    if (orphans.length) errors.push(`content.json: keys not in the registry: ${orphans.join(', ')}`);
    for (const k of keys) {
      const level = get(k)?.level;
      const got = content[k]?.level_min;
      if (level != null && got !== level) errors.push(`content.json/${k}: level_min is ${got}, registry says ${level}`);
    }
  }

  return { ok: errors.length === 0, errors, chips, content };
}

/** Bundle src/main.js (or `entry`, tests only) into one IIFE string. Everything (three, data JSON) is inlined. */
export async function bundle(entry = PATHS.entry) {
  const result = await esbuild({
    entryPoints: [entry],
    absWorkingDir: ROOT,
    nodePaths: [join(ROOT, 'node_modules')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    minify: false,
    sourcemap: false,
    write: false,
    logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}

/** Inline text into HTML safely: a closing tag inside the text must not end the element early. */
function escapeClose(text, tag) {
  return text.replaceAll(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`);
}

function inline(html, marker, block) {
  if (!html.includes(marker)) throw new Error(`${relative(ROOT, PATHS.template)}: marker ${marker} not found`);
  return html.replace(marker, () => block); // function form: '$' sequences in the bundle stay literal
}

/** Validate, bundle and write the page. `entry` and `out` exist for tests only; the build uses the defaults. */
export async function buildPage({ entry = PATHS.entry, out = PATHS.out } = {}) {
  const { ok, errors, chips, content } = validateData();
  if (!ok) throw new Error(`data validation failed:\n  ${errors.join('\n  ')}`);

  const js = await bundle(entry);
  const css = readFileSync(PATHS.css, 'utf8');
  let html = readFileSync(PATHS.template, 'utf8');
  html = inline(html, CSS_MARKER, `<style>\n${escapeClose(css, 'style')}\n</style>`);
  html = inline(html, SCRIPT_MARKER, `<script>\n${escapeClose(js, 'script')}\n</script>`);

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  const bytes = Buffer.byteLength(html);
  const kb = (n) => `${Math.round(n / 1024)} KB`;
  console.log(`${relative(ROOT, out)}: ${bytes.toLocaleString('en-US')} bytes (js ${kb(js.length)}, css ${kb(css.length)}) — ${chips.length} chips, ${Object.keys(content).length} cards, data valid`);
  return { out, bytes };
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  // `--out=/abs/path.html` builds to a private location (parallel lanes, tests); default is playground/index.html.
  const outArg = process.argv.slice(2).find((a) => a.startsWith('--out='));
  buildPage(outArg ? { out: resolve(outArg.slice('--out='.length)) } : {}).catch((e) => {
    const msg = e?.errors?.length ? e.errors.map((m) => `${m.location?.file ?? ''}:${m.location?.line ?? ''} ${m.text}`).join('\n  ') : e.message;
    console.error(`build failed: ${msg}`);
    process.exit(1);
  });
}
