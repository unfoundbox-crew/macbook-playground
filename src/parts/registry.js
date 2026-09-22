/**
 * src/parts/registry.js — the single source of truth for every name in the playground.
 *
 * Every hierarchy part, every software stack layer and every on-die unit is one entry here.
 * data/content.json is keyed by `key`; scene nodes and GLB nodes are named by `name`;
 * mesh.userData.part holds `key`. Tests, the build validator and the GLB export all read this file.
 * Never rename here without updating data/*.json, tests and the export.
 *
 * Naming rules
 *  - `name` is the hierarchy name from PROMPTS.md. `key` equals `name` except for the one collision:
 *    Display.Glass and Trackpad.Glass (both meshes are named "Glass"; keys are qualified).
 *  - Instanced parts (Feet[0..3], LPDDR[0..n], ...) are one entry with `instances`. Scene nodes are
 *    named `${name}[${i}]` and carry userData.part = key, userData.instance = i.
 *  - A `group` entry with `instances` (Die) is an Object3D named `name` whose children are `name[i]`.
 *  - `level` is the dial level at which the item first shows: 1 Overview, 2 Engineer, 3 Silicon.
 *    The dial toggles meshes only; group nodes stay visible so their children can show.
 *  - `explode` is the explode stage that moves the node (see EXPLODE_STAGES). null = static
 *    (it still moves with an exploding ancestor).
 */

export const LEVEL = Object.freeze({ OVERVIEW: 1, ENGINEER: 2, SILICON: 3 });
export const LEVEL_NAMES = Object.freeze(['', 'Overview', 'Engineer', 'Silicon']);

/** Explode stages in animation order. Stage k plays over slider t ∈ [k/8, (k+1)/8]. */
export const EXPLODE_STAGES = Object.freeze([
  'lid',        // lid opens further, display layers fan along the lid normal
  'bottomCase', // BottomCase + Feet drop (−Y)
  'battery',    // BatteryCell[*], BatteryManagementFlex, Trackpad lower (−Y)
  'board',      // LogicBoard group lifts (+Y)
  'soc',        // SoCPackage lifts off the PCB (+Y)
  'spreader',   // HeatSpreader lifts off the Die (+Y)
  'lpddr',      // LPDDR[*] spread outward in XZ
  'thermal',    // FanL, FanR, HeatPipe, HeatsinkPlate, GraphiteSheet lift (+Y, highest)
]);

export const SUBASSEMBLIES = Object.freeze(['Chassis', 'Display', 'LogicBoard', 'Thermal', 'Power', 'Audio', 'Input']);

export const KIND = Object.freeze({ GROUP: 'group', MESH: 'mesh', LAYER: 'layer', UNIT: 'unit' });

const ROOT = 'MacBook';

function entry(key, parent, o = {}) {
  return Object.freeze({
    key,
    name: o.name ?? key,
    parent,
    kind: o.kind ?? KIND.MESH,
    level: o.level ?? LEVEL.ENGINEER,
    explode: o.explode ?? null,
    /** { count } fixed, or { countFrom: chipField, fallback } dynamic. */
    instances: o.instances ?? null,
    /** Subassembly (Chassis, Display, ...) or 'Stack' / 'Die' for layers and units. */
    section: o.section ?? null,
  });
}

const G = KIND.GROUP;

/* ------------------------------------------------------------------ hardware hierarchy */

const HARDWARE = [
  entry(ROOT, null, { kind: G, level: 1, section: 'MacBook' }),

  // Chassis
  entry('Chassis', ROOT, { kind: G, level: 1 }),
  entry('TopCase', 'Chassis', { level: 1 }),
  entry('BottomCase', 'Chassis', { level: 1, explode: 'bottomCase' }),
  entry('HingeL', 'Chassis', { level: 1 }),
  entry('HingeR', 'Chassis', { level: 1 }),
  entry('VentAntennaBar', 'Chassis', { level: 1 }),
  entry('Feet', 'Chassis', { level: 1, explode: 'bottomCase', instances: { count: 4 } }),

  // Display (the whole lid; pivot at the hinge axis, rotation.x = -lidAngle)
  entry('Display', ROOT, { kind: G, level: 1, explode: 'lid' }),
  entry('LidShell', 'Display', { level: 1, explode: 'lid' }),
  entry('Display.Glass', 'Display', { name: 'Glass', level: 1, explode: 'lid' }),
  entry('LCDPanel', 'Display', { level: 1, explode: 'lid' }), // the lit screen is the part a buyer sees first
  entry('MiniLEDBacklight', 'Display', { level: 2, explode: 'lid' }),
  entry('Bezel', 'Display', { level: 1, explode: 'lid' }),
  entry('NotchModule', 'Display', { kind: G, level: 1, explode: 'lid' }),
  entry('Camera', 'NotchModule', { level: 1 }),
  entry('CameraLED', 'NotchModule', { level: 1 }),
  entry('AmbientLightSensor', 'NotchModule', { level: 2 }),
  entry('LidAngleSensor', 'Display', { level: 2, explode: 'lid' }),
  entry('DisplayFlex', 'Display', { level: 2 }),

  // LogicBoard
  entry('LogicBoard', ROOT, { kind: G, level: 1, explode: 'board' }),
  entry('PCB', 'LogicBoard', { level: 2 }),
  entry('SoCPackage', 'LogicBoard', { kind: G, level: 2, explode: 'soc' }),
  entry('Substrate', 'SoCPackage', { level: 2 }),
  entry('Die', 'SoCPackage', { kind: G, level: 3, instances: { countFrom: 'die_count', fallback: 1 } }),
  entry('HeatSpreader', 'SoCPackage', { level: 2, explode: 'spreader' }),
  entry('LPDDR', 'SoCPackage', { level: 2, explode: 'lpddr', instances: { countFrom: 'lpddr_modules', fallback: 2 } }),
  entry('NAND', 'LogicBoard', { level: 2, instances: { count: 2 } }),
  entry('PMIC', 'LogicBoard', { level: 2, instances: { count: 3 } }),
  entry('ThunderboltRetimer', 'LogicBoard', { level: 2, instances: { count: 3 } }),
  entry('WirelessModule', 'LogicBoard', { level: 2 }),
  entry('NORFlash', 'LogicBoard', { level: 2 }),
  entry('USBCBoardL', 'LogicBoard', { level: 2 }),
  entry('USBCBoardR', 'LogicBoard', { level: 2 }),
  entry('MagSafeBoard', 'LogicBoard', { level: 2 }),
  entry('AudioBoard', 'LogicBoard', { level: 2 }),
  entry('Ports', 'LogicBoard', { kind: G, level: 1 }),
  entry('TB5', 'Ports', { level: 1, instances: { count: 3 } }),
  entry('HDMI', 'Ports', { level: 1 }),
  entry('SDXC', 'Ports', { level: 1 }),
  entry('HeadphoneJack', 'Ports', { level: 1 }),
  entry('MagSafe3', 'Ports', { level: 1 }),

  // Thermal
  entry('Thermal', ROOT, { kind: G, level: 2 }),
  entry('HeatPipe', 'Thermal', { level: 2, explode: 'thermal' }),
  entry('HeatsinkPlate', 'Thermal', { level: 2, explode: 'thermal' }),
  entry('FanL', 'Thermal', { level: 2, explode: 'thermal' }),
  entry('FanR', 'Thermal', { level: 2, explode: 'thermal' }),
  entry('GraphiteSheet', 'Thermal', { level: 2, explode: 'thermal' }),

  // Power
  entry('Power', ROOT, { kind: G, level: 2 }),
  entry('BatteryCell', 'Power', { level: 2, explode: 'battery', instances: { count: 6 } }),
  entry('BatteryManagementFlex', 'Power', { level: 2, explode: 'battery' }),

  // Audio
  entry('Audio', ROOT, { kind: G, level: 1 }),
  entry('WooferL', 'Audio', { level: 2, instances: { count: 2 } }),
  entry('WooferR', 'Audio', { level: 2, instances: { count: 2 } }),
  entry('TweeterL', 'Audio', { level: 2 }),
  entry('TweeterR', 'Audio', { level: 2 }),
  entry('Mic', 'Audio', { level: 2, instances: { count: 3 } }),
  entry('SpeakerGrilleL', 'Audio', { level: 1 }),
  entry('SpeakerGrilleR', 'Audio', { level: 1 }),

  // Input
  entry('Input', ROOT, { kind: G, level: 1 }),
  entry('Keyboard', 'Input', { kind: G, level: 1 }),
  entry('KeyGrid', 'Keyboard', { level: 1 }),
  entry('Backlight', 'Keyboard', { level: 2 }),
  entry('TouchIDButton', 'Input', { level: 1 }),
  entry('Trackpad', 'Input', { kind: G, level: 1, explode: 'battery' }),
  entry('Trackpad.Glass', 'Trackpad', { name: 'Glass', level: 1 }),
  entry('StrainGaugePlate', 'Trackpad', { level: 2 }),
  entry('TapticEngine', 'Trackpad', { level: 2 }),
  entry('TrackpadFlex', 'Trackpad', { level: 2 }),
];

/* ------------------------------------------------------------------ software stack (bottom → top) */

const STACK_ORDER = [
  ['BootChain', 2], ['XNUKernel', 1], ['UnifiedMemory', 1], ['Scheduler', 2], ['Drivers', 2],
  ['Metal4', 2], ['MPSGraph', 2], ['PyTorchMPS', 1], ['MLX', 1], ['CoreML', 1], ['CoreAI', 1],
  ['ANERuntime', 2], ['AccelerateSME', 2], ['FoundationModels', 1], ['App', 1],
];

const STACK = [
  entry('Stack', ROOT, { kind: G, level: 1, section: 'Stack' }),
  ...STACK_ORDER.map(([k, level]) => entry(k, 'Stack', { kind: KIND.LAYER, level, section: 'Stack' })),
];

/* ------------------------------------------------------------------ on-die hardware units (children of Die) */

const DIE_UNIT_NAMES = ['CPUCluster', 'GPUCores', 'NeuralEngine', 'MediaEngine', 'SecureEnclave', 'MemoryController', 'SLC'];
const UNITS = DIE_UNIT_NAMES.map((k) => entry(k, 'Die', { kind: KIND.UNIT, level: 3, section: 'Die' }));

/* ------------------------------------------------------------------ public surface */

/** Every entry, in hierarchy order. */
export const ENTRIES = Object.freeze([...HARDWARE, ...STACK, ...UNITS]);

/** Section (subassembly) of a hardware entry = its top-level ancestor under MacBook. */
const byKey = new Map(ENTRIES.map((e) => [e.key, e]));
function sectionOf(e) {
  if (e.section) return e.section;
  let cur = e;
  while (cur.parent && cur.parent !== ROOT) cur = byKey.get(cur.parent);
  return cur.key;
}
export const SECTION = Object.freeze(Object.fromEntries(ENTRIES.map((e) => [e.key, sectionOf(e)])));

export const STACK_LAYERS = Object.freeze(STACK_ORDER.map(([k]) => k));
export const DIE_UNITS = Object.freeze([...DIE_UNIT_NAMES]);
export const KEYS = Object.freeze(ENTRIES.map((e) => e.key));

/** Registry entry by key ('Display.Glass'), or undefined. */
export function get(key) {
  return byKey.get(key);
}

/** Children entries of a key, in registry order. */
export function childrenOf(key) {
  return ENTRIES.filter((e) => e.parent === key);
}

/** Number of instances an entry has for a chip (null when the entry is not instanced). */
export function instanceCount(entryOrKey, chip) {
  const e = typeof entryOrKey === 'string' ? byKey.get(entryOrKey) : entryOrKey;
  if (!e?.instances) return null;
  if (e.instances.count != null) return e.instances.count;
  const v = chip?.[e.instances.countFrom];
  return Number.isInteger(v) && v > 0 ? v : e.instances.fallback;
}

/** Scene node name for an entry instance: 'Feet[2]', or the plain name when not instanced. */
export function nodeName(entryOrKey, index = null) {
  const e = typeof entryOrKey === 'string' ? byKey.get(entryOrKey) : entryOrKey;
  return index == null ? e.name : `${e.name}[${index}]`;
}

/**
 * Every node name the scene graph (and the exported GLB) must contain for a chip.
 * Returns duplicates on purpose ('Glass' twice): compare as a multiset.
 */
export function expectedNodeNames(chip) {
  const names = [];
  for (const e of ENTRIES) {
    const n = instanceCount(e, chip);
    if (n == null) { names.push(e.name); continue; }
    if (e.kind === KIND.GROUP) names.push(e.name); // group node plus its instanced children
    for (let i = 0; i < n; i++) names.push(nodeName(e, i));
  }
  return names;
}

/** Parse 'LPDDR[3]' → { base: 'LPDDR', index: 3 }; plain names give index null. */
export function parseNodeName(name) {
  const m = /^(.+?)\[(\d+)\]$/.exec(name);
  return m ? { base: m[1], index: Number(m[2]) } : { base: name, index: null };
}

/**
 * Tag a scene object as a registry item. Sets .name, userData.part, userData.level,
 * userData.explode, userData.instance. Call this on every mesh AND every group node you create.
 */
export function tag(object, key, index = null) {
  const e = byKey.get(key);
  if (!e) throw new Error(`registry: unknown key "${key}"`);
  object.name = nodeName(e, index);
  object.userData.part = e.key;
  object.userData.kind = e.kind;
  object.userData.level = e.level;
  object.userData.explode = e.explode;
  object.userData.instance = index;
  return object;
}

/** Stage index (0..7) of an explode stage name, or -1. */
export function stageIndex(stage) {
  return EXPLODE_STAGES.indexOf(stage);
}
