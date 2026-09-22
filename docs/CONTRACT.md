# Playground contract (step 1 scaffold)

Read this before touching any file. `src/parts/registry.js` and `src/dims.js` are the two
code contracts; this page explains how the pieces plug together and who owns which file.

## Coordinate system

Metres, +Y up, +Z toward the user, origin at the centre of the bottom case's underside
(the laptop sits on y = 0). Hinge line along X at the rear (−Z). All numbers come from
`src/dims.js`; a module never hard-codes a dimension.

The `Display` group's origin is the hinge axis (world `[0, HINGE.y, HINGE.z]`) and
`Display.rotation.x = -lidAngleRad`. Lid-local +Z runs hinge → free edge, lid-local −Y is the
glass side (faces the user when open). Everything in the lid is built in lid-local space.

## Scene module interface — `src/scene/<subassembly>.js`

```js
export const NAME = 'Display';                       // registry key of the group this module builds
export function build(parent, chip, ctx) { ... }     // creates the group, attaches to parent, returns it
export const explodeOffsets = { ... };               // see below
export function applyChip(group, chip, ctx) { ... }  // optional: rebuild chip-dependent geometry in place
export function update(group, state, dt) { ... }     // optional: per-frame hook, zero allocations
```

- `ctx = { mats, dims, registry, tag }` — `mats` from `src/materials.js` (one shared instance per
  material), `tag(object, key, index?)` from the registry. Call `tag` on every group node and every
  mesh you create; it sets `.name`, `userData.part`, `userData.level`, `userData.explode`.
- Group nodes exist for every registry `kind: 'group'` entry (`Chassis`, `Display`, `NotchModule`,
  `LogicBoard`, `SoCPackage`, `Die`, `Ports`, `Thermal`, `Power`, `Audio`, `Input`, `Keyboard`,
  `Trackpad`, `Stack`). Meshes are children of their registry `parent`.
- Instanced entries produce nodes `Name[i]` (`tag(mesh, 'Feet', i)`). Counts: `registry.instanceCount(key, chip)`.
- `Die` is a group named `Die`; its children are slab meshes `Die[i]` (i < die_count) plus the seven
  unit meshes (`CPUCluster` … `SLC`) laid out on `Die[0]` from `dims.DIE_UNITS`. Extra dies are
  unlabeled slabs (2 side by side; 4 in a 2×2 for `die_count === 4`).
- `explodeOffsets`: `{ [nodeNameOrKey]: [x, y, z] | (index, count, chip) => [x, y, z] }` — the
  node's full-slider displacement in its **parent's local space**. Node name (`'LPDDR[0]'`) wins
  over key (`'LPDDR'`). Distances come from `dims.EXPLODE`. Stages come from the registry; the
  engine multiplies the offset by that stage's eased progress. The `Display` group's own stage
  (`lid`) is a rotation from `LID.restAngleDeg` to `LID.explodeAngleDeg`, handled by the engine.
- Store the rest transform: the engine records `position` after `build`/`applyChip` as the rest
  pose. Never move a node after build except through `update`.
- Geometry: procedural only (RoundedBoxGeometry, ExtrudeGeometry, LatheGeometry, Shape). Use
  `InstancedMesh` for repeated tiny things (solder balls, GPU-core tiles, keycaps). Keep every
  subassembly under ~60k triangles at full detail.
- `applyChip` must dispose the geometries it replaces (`geometry.dispose()`), never materials.
- Effects that are not parts (particle streams, labels, helper planes) get `userData.effect = true`
  and are not tagged; the exporter hides them before export.

## Chip object (data/chips.json entry)

Numeric fields may be `null` (step 1 ships every number null). Modules must be null-safe:

| field | used by | fallback |
|---|---|---|
| `die_mm2` | Die scale | `dims.SOC.dieSideFromGpuCores(gpu_cores ?? 10)` |
| `gpu_cores` | GPU-core grid on the die | 10 |
| `cpu_super_cores`, `cpu_p_cores`, `cpu_e_cores` | CPU block layout | 4 / 0 / 4 |
| `lpddr_modules` | LPDDR count | 2 |
| `bandwidth_gbs` | particle stream speed | 100 |
| `chassis` | `'air'` hides FanL/FanR (and HeatPipe) | `'pro'` |
| `die_count` | Die[i] count, 2 = side by side, 4 = 2×2 | 1 |

## Runtime state and the test API

`src/engine/api.js` exposes `window.__playground` (also used by `tools/snap.mjs` and the tests):

```ts
ready: Promise<void>                 // resolves after the first rendered frame
state(): { chip, view, dial, explode, stack, lidAngleDeg, selected, hovered, trace: {playing, step, total, path} ,
           dieSideMm, dieCount, lpddrCount, gpuTiles, cpuBlocks: {super, p, e}, fansVisible, streamSpeed }
chips(): string[]                    // chip ids in data order
setChip(id): Promise<void>           // rebuilds chip-dependent geometry, waits one frame
applyChipObject(chip): Promise<void> // test-only: applies an ad-hoc chip object exactly like setChip
views(): string[]                    // dims.VIEW_NAMES
setView(name, {instant?: boolean}): Promise<void>   // tween (or jump) camera + lid + explode + stack + dial preset
setDial(level: 1|2|3): void
setExplode(t: number): void          // 0..1
setStack(open: boolean): void
select(key: string | null): void     // opens the card for a registry key
hover(key: string | null): void
playTrace('train' | 'infer'): Promise<void>   // resolves when the path finishes (tests may use speed)
setTraceSpeed(mult: number): void
sceneNames(): string[]               // every Object3D name under MacBook (+ Stack)
partKeys(): string[]                 // distinct userData.part values in the scene
visibleParts(): string[]             // node names of visible tagged meshes (respects dial and ancestors)
renderOnce(): Promise<void>          // force one frame, resolve after it is drawn
exportGLB(): Promise<ArrayBuffer>    // GLTFExporter binary of the MacBook root (effects hidden)
errors: string[]                     // window.onerror + unhandledrejection messages
```

URL parameters (read at boot, applied before `ready` resolves): `view`, `chip`, `dial`, `explode`,
`stack=1`, `lid` (degrees), `trace=train|infer`, `ui=0` (hide chrome for screenshots),
`theme=light|dark|system`, `font`, `accent`.

Keyboard: `E` toggle full explode, `C` chip selector, `D` cycle dial, `S` stack view, `1`–`7` views,
`Esc` close card, `?` shortcuts help.

## UI design tokens (`src/ui/theme.css`, inlined by the build)

White background (`--bg`), serif body 20px / line-height 1.65, ~680px reading column, bold sans
headings, accent only `#E8590C` (orange, primary) and `#1C64F2` (blue, secondary). Minimal chrome.
Theme switch: System / Light / Dark (dark uses near-black `--bg`, scene background follows).
Five font options (serif body + sans heading pairs) and five accent options, both persisted in
`localStorage`; the defaults are the two accents above. Card becomes a bottom sheet under 720px.

## File ownership (one owner per file; never edit another lane's file)

| lane | files |
|---|---|
| foundation-toolchain | `package.json` scripts, `build.mjs`, `eslint.config.js`, `schemas/*.json`, `tools/gen-placeholders.mjs`, `data/*.json`, `tools/snap.mjs`, `tools/serve.mjs` |
| foundation-runtime | `src/materials.js`, `src/main.js`, `src/engine/renderer.js`, `src/engine/api.js`, `src/engine/state.js`, `src/index.html` (template), stub `src/scene/*.js`, stub `src/engine/{interaction,explode,dial,tours,trace}.js`, stub `src/ui/index.js` |
| chassis / display / logicboard / soc / thermal / power / audio / input / stack | `src/scene/<name>.js` (soc also `src/scene/soc-die.js`, `src/scene/soc-stream.js`) |
| interaction | `src/engine/interaction.js` (picking, outline), `src/engine/tours.js`, `src/engine/explode.js`, `src/engine/dial.js`, `src/engine/tween.js` |
| ui | `src/ui/*` (cards, selector, dial, views, explode slider, settings, shortcuts help, `theme.css`) |
| trace | `src/engine/trace.js`, `src/ui/trace-bar.js`, `src/data/traces.js` |
| tooling | `tests/*`, `playwright.config.js`, `tools/export-glb.mjs`, `tools/validate-glb.mjs`, `README.md` |

`src/main.js` composes: build scene → `interaction.init(ctx)` → `explode.init(ctx)` →
`dial.init(ctx)` → `tours.init(ctx)` → `trace.init(ctx)` → `ui.init(ctx)` → `api.install(ctx)`.
Each `init` receives the same `ctx` (see `src/engine/state.js` for its shape) and may register
`ctx.onFrame(fn)` hooks. The stubs the runtime lane ships define the exact signatures.

Event detail shapes on `ctx.events`: `explode` and `dial` carry the new value as a plain number,
`chip` the chip object, `view` the view name, `stack` a boolean, `select`/`hover` the registry key or
null, `theme` `{ theme, dark }`, `trace` the `state.trace` object.

## Build and scripts

`npm run build` → `node build.mjs`: validates `data/chips.json` and `data/content.json` against
`schemas/`, checks every registry key has a content card (and no orphan cards), bundles `src/main.js`
with esbuild (Three.js inlined, JSON imported), inlines CSS, writes `playground/index.html`.
`npm run snap -- --view=Hero --out=/abs/path.png [--chip=m1 --dial=2 --explode=1 --stack=1]`
screenshots the built page in headless Chromium. `npm test` runs Playwright. `npm run export`
writes `export/macbook.glb` and validates it. `npm run lint` must report zero warnings.
