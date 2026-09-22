/**
 * src/data/traces.js — the two trace paths the trace engine animates (trace lane).
 *
 *   TRACES = { train: { label, steps, path }, infer: { label, steps, path } }
 *   step   = { target: registryKey, duration: ms, label: string }
 *
 * `target` is always a software-stack layer or an on-die unit (registry kind 'layer' | 'unit');
 * anything else throws at module load so a typo never reaches the animator. `path` is the
 * ordered list of target keys (what ctx.state.trace.path carries).
 *
 * STEP 1 SHIPS PLACEHOLDER PATHS. The shapes are plausible so the animation reads (an app
 * descending through the stack to the silicon and back), but the order, the timings and the
 * labels are not sourced. Step 2 replaces them from research/*.md with citations.
 */

import { KIND, get } from '../parts/registry.js';

/** Registry kinds a trace may light. */
const TARGET_KINDS = Object.freeze([KIND.LAYER, KIND.UNIT]);

function placeholder(i, n) {
  return `Placeholder step ${i} of ${n} — content pending (step 2)`;
}

/** [target, duration ms] pairs → frozen steps with placeholder labels. */
function steps(pairs) {
  const n = pairs.length;
  return Object.freeze(pairs.map(([target, duration], i) => Object.freeze({ target, duration, label: placeholder(i + 1, n) })));
}

function trace(label, pairs) {
  const s = steps(pairs);
  return Object.freeze({ label, steps: s, path: Object.freeze(s.map((step) => step.target)) });
}

export const TRACES = Object.freeze({
  // Training: the app calls MLX, which lowers to Metal, through the driver into unified memory,
  // then a GPU ⇄ memory-controller ⇄ SLC loop, back to the GPU, and the result lands in memory.
  train: trace('Train', [
    ['App', 900], ['MLX', 800], ['Metal4', 700], ['Drivers', 700], ['UnifiedMemory', 900],
    ['GPUCores', 1200], ['MemoryController', 800], ['SLC', 800], ['GPUCores', 1000], ['UnifiedMemory', 900],
  ]),
  // Inference: the app asks Core AI, the ANE runtime and driver hand the graph to the Neural
  // Engine, the output lands in unified memory, the CPU post-processes, the app gets its answer.
  infer: trace('Infer', [
    ['App', 900], ['CoreAI', 800], ['ANERuntime', 700], ['Drivers', 700],
    ['NeuralEngine', 1200], ['UnifiedMemory', 800], ['CPUCluster', 900], ['App', 800],
  ]),
});

export const TRACE_NAMES = Object.freeze(Object.keys(TRACES));

/** Sum of a trace's step durations in ms at speed 1. */
export function totalDuration(name) {
  return TRACES[name]?.steps.reduce((sum, s) => sum + s.duration, 0) ?? 0;
}

/* ---------------------------------------------------------------- module-load assertions */

for (const [name, t] of Object.entries(TRACES)) {
  if (!t.steps.length) throw new Error(`traces: "${name}" has no steps`);
  t.steps.forEach((s, i) => {
    const e = get(s.target);
    if (!e) throw new Error(`traces: "${name}" step ${i + 1} targets unknown registry key "${s.target}"`);
    if (!TARGET_KINDS.includes(e.kind)) throw new Error(`traces: "${name}" step ${i + 1} targets "${s.target}" (kind ${e.kind}); only layers and die units can be traced`);
    if (!(Number.isFinite(s.duration) && s.duration > 0)) throw new Error(`traces: "${name}" step ${i + 1} has a bad duration ${s.duration}`);
    if (typeof s.label !== 'string' || !s.label) throw new Error(`traces: "${name}" step ${i + 1} has no label`);
  });
}
