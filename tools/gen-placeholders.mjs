#!/usr/bin/env node
/**
 * tools/gen-placeholders.mjs — writes data/chips.json and data/content.json placeholders.
 *
 * Usage:  node tools/gen-placeholders.mjs        (npm run placeholders)
 * Import: import { CHIP_IDS, PLACEHOLDER_TEXT, generate } from './tools/gen-placeholders.mjs'
 *
 * Idempotent and safe to re-run after step 2: a chip whose status is not "placeholder" and a card whose
 * text is not the placeholder string are kept exactly as they are. Nothing here comes from memory —
 * every number, date and boolean ships null; step 2 fills them from research/*.md with sources.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEYS, get } from '../src/parts/registry.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHIPS_PATH = join(ROOT, 'data', 'chips.json');
const CONTENT_PATH = join(ROOT, 'data', 'content.json');

export const PLACEHOLDER_TEXT = 'Content pending (step 2)';

/** The shipped variants, in display order. No M4 Ultra; M6 Pro/Max/Ultra are not announced. */
export const CHIP_IDS = Object.freeze([
  'm1', 'm1-pro', 'm1-max', 'm1-ultra',
  'm2', 'm2-pro', 'm2-max', 'm2-ultra',
  'm3', 'm3-pro', 'm3-max', 'm3-ultra',
  'm4', 'm4-pro', 'm4-max',
  'm5', 'm5-pro', 'm5-max', 'm5-ultra',
  'm6',
]);

/** 'm1-pro' → { family: 'M1', tier: 'Pro', marketing_name: 'Apple M1 Pro' }. */
export function placeholderChip(id) {
  const [fam, tierPart] = id.split('-');
  const family = fam.toUpperCase();
  const tier = tierPart ? tierPart[0].toUpperCase() + tierPart.slice(1) : 'base';
  return {
    id,
    family,
    tier,
    marketing_name: tier === 'base' ? `Apple ${family}` : `Apple ${family} ${tier}`,
    announce_date: null,
    ships_in_macbook: null,
    chassis: null,
    process_node: null,
    transistors_billion: null,
    cpu_cores_total: null,
    cpu_super_cores: null,
    cpu_p_cores: null,
    cpu_e_cores: null,
    gpu_cores: null,
    gpu_neural_accelerators: null,
    neural_engine_cores: null,
    ane_tops: null,
    ane_tops_basis: null,
    memory_options_gb: [],
    bandwidth_gbs: null,
    lpddr_generation: null,
    lpddr_modules: null,
    die_count: null,
    die_mm2: null,
    media_engines: { prores: null, av1_decode: null },
    thunderbolt_version: null,
    macbook_models: [],
    notable_features: [],
    sources: [],
    status: 'placeholder',
  };
}

export function placeholderCard(key) {
  return {
    what: PLACEHOLDER_TEXT,
    why: PLACEHOLDER_TEXT,
    connects: PLACEHOLDER_TEXT,
    aha: PLACEHOLDER_TEXT,
    level_min: get(key).level,
    sources: [],
  };
}

function isPlaceholderCard(card) {
  return ['what', 'why', 'connects', 'aha'].every((f) => card?.[f] === PLACEHOLDER_TEXT);
}

/** Existing file as parsed JSON, or `fallback` when the file is absent. A corrupt file is an error, never silently replaced. */
function readExisting(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new Error(`${path} exists but is not valid JSON (${e.message}); fix or delete it before regenerating`, { cause: e });
  }
}

/** Merge existing chips with placeholders: filled entries win, placeholders are regenerated, order is CHIP_IDS then extras. */
export function mergeChips(existing) {
  const byId = new Map(Array.isArray(existing) ? existing.map((c) => [c.id, c]) : []);
  const kept = [];
  const chips = CHIP_IDS.map((id) => {
    const prev = byId.get(id);
    if (prev && prev.status !== 'placeholder') { kept.push(id); return prev; }
    return placeholderChip(id);
  });
  const extras = [...byId.values()].filter((c) => !CHIP_IDS.includes(c.id) && c.status !== 'placeholder');
  return { chips: [...chips, ...extras], kept, extras: extras.map((c) => c.id) };
}

/** Merge existing cards with placeholders: filled cards win, placeholders are regenerated, order is registry order then orphans. */
export function mergeContent(existing) {
  const prev = existing && typeof existing === 'object' ? existing : {};
  const kept = [];
  const content = {};
  for (const key of KEYS) {
    if (prev[key] && !isPlaceholderCard(prev[key])) { kept.push(key); content[key] = prev[key]; }
    else content[key] = placeholderCard(key);
  }
  const orphans = Object.keys(prev).filter((k) => !get(k) && !isPlaceholderCard(prev[k]));
  for (const k of orphans) content[k] = prev[k];
  return { content, kept, orphans };
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function generate() {
  const chips = mergeChips(readExisting(CHIPS_PATH, []));
  const content = mergeContent(readExisting(CONTENT_PATH, {}));
  writeJson(CHIPS_PATH, chips.chips);
  writeJson(CONTENT_PATH, content.content);
  return { chips, content };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    const { chips, content } = generate();
    console.log(`data/chips.json: ${chips.chips.length} chips (${chips.kept.length} kept as filled${chips.extras.length ? `, extra ids kept: ${chips.extras.join(', ')}` : ''})`);
    console.log(`data/content.json: ${Object.keys(content.content).length} cards (${content.kept.length} kept as filled)`);
    if (content.orphans.length) console.warn(`warning: ${content.orphans.length} filled card(s) have no registry key and will fail the build: ${content.orphans.join(', ')}`);
  } catch (e) {
    console.error(`gen-placeholders: ${e.message}`);
    process.exit(1);
  }
}
