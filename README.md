# MacBook Pro teaching playground

An interactive 3D model of a 14-inch MacBook Pro (M-series) you can orbit, explode and
switch chips on. Every part is a named node: click one for its card, turn the dial to go
from Overview to Silicon, open the software stack above the SoC and play a training or
inference trace through it. Procedural geometry only (Three.js 0.186), one HTML file, no
runtime dependencies, exportable to GLB at true scale.

## Run

```
npm install
npm run build          # writes playground/index.html
npm run serve          # local server, or just open playground/index.html
```

## Build, test, export, lint

| command | what it does |
| --- | --- |
| `npm run build` | validates `data/*.json` against `schemas/`, bundles `src/main.js` with esbuild, writes `playground/index.html` |
| `npm test` | Playwright smoke suite (headless Chromium) against the built page; screenshots in `test-results/` |
| `npm run snap -- --view=Hero --out=/abs/hero.png` | one screenshot of the built page (`--chip --dial --explode --stack` also work) |
| `npm run export` | opens the built page, calls `exportGLB()`, writes `export/macbook.glb` |
| `npm run validate-glb` | Khronos glTF validator on the GLB plus a node-name check against the registry; report in `export/macbook.validation.json` |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm run check` | lint, build, test |

Build before testing or exporting: the tests and tools load `playground/index.html`, never `src/`.

## Keyboard

| key | action |
| --- | --- |
| `E` | toggle full explode |
| `C` | chip selector |
| `D` | cycle the dial (Overview, Engineer, Silicon) |
| `S` | stack view |
| `1`–`7` | views: Hero, Open lid, Board top-down, SoC macro, Thermal, Battery, Stack |
| `Esc` | close the card |
| `?` | shortcuts help |

## URL parameters

Read once at boot: `view=<name>`, `chip=<id>`, `dial=1|2|3`, `explode=0..1`, `stack=1`,
`lid=<degrees>`, `trace=train|infer`, `ui=0` (hide the chrome for screenshots),
`theme=light|dark|system`, `font=<n>`, `accent=<n>`.

The page exposes `window.__playground` for tools and tests; the surface is in
`docs/CONTRACT.md`.

## Files

```
src/parts/registry.js   every part, layer and unit name: the single source of truth
src/dims.js             every dimension, in metres
src/materials.js        every material, created once and shared
src/scene/              one module per subassembly (chassis, display, logicboard, soc, thermal, power, audio, input, stack)
src/engine/             renderer, state, explode, dial, tours, trace, interaction, the test api
src/ui/                 cards, selector, dial, views, explode slider, settings, theme.css
src/main.js             composition root
data/                   chips.json and content.json (validated at build time)
schemas/                JSON schemas for data/
docs/CONTRACT.md        how the pieces plug together and who owns which file
tools/                  snap, serve, export-glb, validate-glb, gen-placeholders
tests/                  Playwright smoke suite, helpers, chip fixtures
build.mjs               the build; playground/index.html is generated, never hand-edited
export/                 macbook.glb and its validation report
```

## Step 2 fills the data

Every number in `data/chips.json` is `null` and every card in `data/content.json` is a
placeholder. Step 2 fills them from `research/*.md` with sources. The geometry already
reacts to the chip fields (die size, die count, GPU cores, LPDDR count, bandwidth,
chassis), so nothing in `src/` needs to change for the numbers to show.
