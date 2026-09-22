/**
 * src/engine/state.js — the shared context every lane codes against.
 *
 * createContext(gfx) returns `ctx`:
 *
 *   scene, camera, renderer, controls   from createRenderer (renderer = THREE.WebGLRenderer)
 *   mats                                frozen materials object (src/materials.js)
 *   dims, registry                      the two code contracts, re-exported for convenience
 *   tag(object, key, index?)            = registry.tag
 *   chips: Chip[]                       every data/chips.json entry, data order
 *   content: { [key]: Card }            data/content.json
 *   chip: Chip                          the current chip object
 *   state: {
 *     chip: string, view: string, dial: 1|2|3, explode: 0..1, stack: boolean,
 *     lidAngleDeg: number, selected: string|null, hovered: string|null,
 *     theme: 'system'|'light'|'dark', font: number, accent: number, traceSpeed: number,
 *     trace: { playing, step, total, path },          owned by the trace lane
 *     chipDerived: { dieSideMm, dieCount, lpddrCount, gpuTiles, cpuBlocks, streamSpeed }  set by soc
 *   }
 *   root: THREE.Group                   named 'MacBook', tagged, child of scene
 *   nodes: Map<name, Object3D>          every tagged node by scene name ('LPDDR[0]'). The two 'Glass'
 *                                       meshes collide on name: the first built wins, use byKey for those.
 *   byKey: Map<key, Object3D[]>         every tagged node by registry key ('Display.Glass')
 *   indexNodes()                        rebuilds nodes/byKey from root (call after any rebuild)
 *   rest: Map<Object3D, Vector3>        rest position of every tagged node; recordRest() refreshes it
 *   modules: SceneModule[]              the nine scene modules, build order (set by main)
 *   events: EventTarget                 'chip', 'view', 'dial', 'explode', 'stack', 'select', 'hover',
 *                                       'lid', 'theme' — detail carries the new value
 *   emit(name, detail)
 *   onFrame(fn) / offFrame(fn)          fn(dt, t) each frame, seconds
 *   actions: {}                         lanes install: setView, setDial, setExplode, setStack, setChip,
 *                                       setLid, select, hover, playTrace, setTraceSpeed, setTheme.
 *                                       api.js falls back to built-ins for any missing one.
 *   setRenderFn(fn), renderOnce(), setBackground(color), requestRender()
 */

import * as THREE from 'three';
import * as dims from '../dims.js';
import * as registry from '../parts/registry.js';

export function createContext({
  renderer, scene, camera, controls, onFrame, offFrame, setRenderFn, renderOnce, setBackground,
  mats, chips, content, params = {},
}) {
  const requested = params.chip && chips.find((c) => c.id === params.chip);
  const chip = requested || chips[0];
  if (!chip) throw new Error('state: chips.json has no entries');

  const events = new EventTarget();
  const root = registry.tag(new THREE.Group(), 'MacBook');
  const nodes = new Map();
  const byKey = new Map();
  const rest = new Map();

  const ctx = {
    scene, camera, renderer, controls, mats, dims, registry,
    tag: registry.tag,
    chips, content, chip,
    state: {
      chip: chip.id,
      view: 'Hero',
      dial: 2,
      explode: 0,
      stack: false,
      lidAngleDeg: dims.LID.restAngleDeg,
      selected: null,
      hovered: null,
      theme: 'system',
      font: 0,
      accent: 0,
      traceSpeed: 1,
      trace: { playing: false, step: 0, total: 0, path: null },
      chipDerived: null,
    },
    root, nodes, byKey, rest,
    modules: [],
    events,
    emit(name, detail) {
      events.dispatchEvent(new CustomEvent(name, { detail }));
    },
    indexNodes() {
      nodes.clear();
      byKey.clear();
      root.traverse((o) => {
        const key = o.userData.part;
        if (!key) return;
        if (!nodes.has(o.name)) nodes.set(o.name, o);
        let list = byKey.get(key);
        if (!list) byKey.set(key, (list = []));
        list.push(o);
      });
    },
    recordRest() {
      rest.clear();
      root.traverse((o) => {
        if (o.userData.part) rest.set(o, o.position.clone());
      });
    },
    actions: {},
    onFrame, offFrame, setRenderFn, renderOnce, setBackground,
    needsRender: true,
    requestRender() {
      ctx.needsRender = true;
    },
  };
  return ctx;
}
