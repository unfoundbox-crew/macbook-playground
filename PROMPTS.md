# MacBook Teaching Playground + Blender Render — three ultracode prompts

Prepared 22 Sep 2026 from sourced research (four research files ship alongside this doc; drop them into `./research/` in your repo before running Prompt 2).

---

## 0. How to run this with Fable 5.1 + ultracode

**What ultracode does.** With the keyword in your prompt, Claude Code authors and runs a Workflow script: it decomposes your task into subagents, fans them out in parallel, and typically adds critics that adversarially verify the builders' work. Subagents inherit your session's model by default, so Fable 5.1 spawns Fable 5.1 unless the orchestrator explicitly downgrades a trivial stage. Budget accordingly: a full run is several times a normal session.

**What makes it work.** The orchestrator decomposes along the structure you give it. Vague prompts produce vague decompositions. Every prompt below therefore fixes three contracts up front: the part/layer hierarchy names, the data schema, and the definition of done. Those contracts are also what let the three sessions hand off cleanly.

**Session plan.**

| Step | Mode | What it does | Why this mode |
|---|---|---|---|
| 1 | ultracode | Scaffold geometry, interaction, UI, schema, GLB export | Highly parallel (one agent per subassembly) + screenshot judges |
| 2 | ultracode | Fill spec data + teaching content from the research files, wire real traces | Adversarial verification of every number and claim earns its cost |
| 3 | plain session (optional ultracode) | Drive Blender via MCP | Single Blender socket — sequential by nature; agents only help as critics |

**Practical settings.**
- Put a `CLAUDE.md` at the repo root with the "Project conventions" block at the end of this doc.
- Add a token ceiling to a turn if you want predictability: `ultracode +800k` (the runtime treats it as a hard cap and scales fan-out to it).
- Ask for the decomposition plan before spawning on your first run (it's the first line of Prompt 1) so you can redirect early.
- If a run ends short of the definition of done, resume in the next turn — completed agents return cached results.
- Watch `/workflows` while it runs.

**Setting up Blender MCP (before Step 3).** Install Blender 5.2 LTS. Install the addon and server from `github.com/ahujasid/mcp-for-blender` (the renamed `blender-mcp`): `uvx mcp-for-blender install-addon`, enable the addon in Blender, click "Connect to Claude" in the sidebar panel, and register the server in Claude Code:

```
claude mcp add blender -- uvx mcp-for-blender
```

Blender must be running with its GUI open (no headless mode). Optionally set `BLENDER_MCP_SAFE_MODE=1` for sandboxed script validation.

---

## PROMPT 1 — Scaffold (paste as one message)

```
ultracode

Before spawning any agents, print your decomposition plan (agents, what each owns, verification stages) and then proceed without waiting.

<mission>
Scaffold a self-contained interactive 3D teaching playground of an Apple MacBook Pro (14-inch, M5 generation).
This is STEP 1 of 3. Build geometry, interaction, UI, data schema, tests and export. Do NOT research chip
specs or write teaching content — that arrives in step 2 from sourced research files. Ship placeholders.
</mission>

<deliverables>
./src/**            ES-module source (see <code_quality>)
./data/chips.json   every shipped M-series variant, all numeric fields null, "status":"placeholder"
./data/content.json every part and layer name → placeholder card
./build.mjs         esbuild bundle → ./playground/index.html (single file, Three.js inlined, zero runtime deps)
./export/macbook.glb produced by GLTFExporter; node names identical to the hierarchy below
./tests/**          Playwright smoke tests; `npm test` must pass
./README.md         run / build / test / export
</deliverables>

<model_hierarchy>
Every part is a named Object3D under this exact hierarchy. These names are the contract for steps 2 and 3.
MacBook
  Chassis: TopCase, BottomCase, HingeL, HingeR, VentAntennaBar, Feet[0..3]
  Display: LidShell, Glass, LCDPanel, MiniLEDBacklight, Bezel, NotchModule{Camera, CameraLED, AmbientLightSensor}, LidAngleSensor, DisplayFlex
  LogicBoard: PCB, SoCPackage{Substrate, Die, HeatSpreader, LPDDR[0..n]}, NAND[0..n], PMIC[0..n], ThunderboltRetimer[0..n],
              WirelessModule (Apple N1), NORFlash, USBCBoardL, USBCBoardR, MagSafeBoard, AudioBoard, Ports{TB5[0..2], HDMI, SDXC, HeadphoneJack, MagSafe3}
  Thermal: HeatPipe, HeatsinkPlate, FanL, FanR, GraphiteSheet
  Power: BatteryCell[0..5], BatteryManagementFlex
  Audio: WooferL[0..1], WooferR[0..1], TweeterL, TweeterR, Mic[0..2], SpeakerGrilleL, SpeakerGrilleR
  Input: Keyboard{KeyGrid, Backlight}, TouchIDButton, Trackpad{Glass, StrainGaugePlate, TapticEngine, TrackpadFlex}
Layout (from teardowns): logic board center-rear between the two fans; battery fills the front two-thirds under palm rests;
woofers stacked at front corners; trackpad center-front; vent/antenna bar between the hinges.
Outer envelope: 14-inch MacBook Pro = 31.26 cm × 22.12 cm × 1.55 cm (Apple spec page). Model in metres, +Y up, origin at
the bottom-case centre, so the GLB imports into Blender at true scale.
Procedural geometry only (rounded boxes, extrudes, bevels, lathes for fans). Materials: anodized aluminium (Space Black),
glass, matte plastic, black PCB with copper pads, silicon die (dark with faint grid), solder balls (instanced).
Lighting via RoomEnvironment + PMREM; no external HDR files.
</model_hierarchy>

<interaction>
- Exploded-view slider 0→1 with per-group offsets and easing, in this order: lid opens → bottom case drops → battery and
  trackpad lower → logic board lifts → SoC package lifts off the board → heat spreader lifts off the die → LPDDR modules
  spread → fans and heat pipe lift. Keyboard shortcut E toggles full explode.
- Click or hover any part: outline highlight + side card from content.json[name] with sections
  "What it is · Why it's there · Connects to · One fact you didn't know". Placeholder text: "Content pending (step 2)".
- Camera tour: named views Hero, Open lid, Board top-down, SoC macro, Thermal, Battery, Stack; smooth tweens; keys 1–7.
- Chip selector (key C): dropdown listing every chips.json entry grouped by family. Switching MUST visibly change:
  Die scale from die_mm2 (fallback: proportional to gpu_cores when null); GPU-core grid drawn on the die from gpu_cores;
  P/E/super core blocks from cpu_super_cores / cpu_p_cores / cpu_e_cores; LPDDR module count from lpddr_modules;
  bandwidth particle-stream speed from bandwidth_gbs; FanL/FanR hidden when chassis == "air"; a second die (and for Ultra
  a four-die layout) when die_count > 1. Wire all of this now with null-safe fallbacks.
- Visibility dial (key D): Overview / Engineer / Silicon. EVERYTHING is always built and present in the scene graph;
  the dial only toggles visibility of parts, labels and card sections via each item's level_min.
- Stack view (key S): translucent horizontal layers hovering above the SoC, bottom to top:
  BootChain, XNUKernel, UnifiedMemory, Scheduler, Drivers, Metal4, MPSGraph, PyTorchMPS, MLX, CoreML, CoreAI, ANERuntime,
  AccelerateSME, FoundationModels, App. Each layer is clickable with the same card system. Hardware units on the die
  (CPUCluster, GPUCores, NeuralEngine, MediaEngine, SecureEnclave, MemoryController, SLC) are separate named meshes so
  traces can light them.
- Trace engine: two buttons (Train, Infer) that animate a highlight path through a list of {layer|unit, duration, label}
  steps with a caption strip; implement with a placeholder path now. Real paths and numbers arrive in step 2.
</interaction>

<data_schema>
chips.json entries: {id, family, tier, marketing_name, announce_date, ships_in_macbook:boolean, chassis:"air"|"pro"|null,
process_node, transistors_billion, cpu_cores_total, cpu_super_cores, cpu_p_cores, cpu_e_cores, gpu_cores, gpu_neural_accelerators:boolean,
neural_engine_cores, ane_tops, ane_tops_basis:"fp16"|"int8"|null, memory_options_gb[], bandwidth_gbs, lpddr_generation,
lpddr_modules, die_count, die_mm2, media_engines{prores:int, av1_decode:boolean}, thunderbolt_version, macbook_models[],
notable_features[], sources[], status:"placeholder"|"verified"|"unverified"}.
Ship placeholder entries for exactly these shipped variants: M1, M1 Pro, M1 Max, M1 Ultra, M2, M2 Pro, M2 Max, M2 Ultra,
M3, M3 Pro, M3 Max, M3 Ultra, M4, M4 Pro, M4 Max, M5, M5 Pro, M5 Max, M5 Ultra, M6. (There is no M4 Ultra; M6 Pro/Max/Ultra
are not announced.) Do not fill numbers from memory.
content.json: {name: {what, why, connects, aha, level_min:1|2|3, sources[]}} for every hierarchy part, every stack layer,
and every die unit — all placeholders.
Validate both files against JSON schemas at build time (fail the build on drift).
</data_schema>

<design>
White background; serif body ~20px / line-height 1.65 in a ~680px reading column for cards; bold sans headings;
accents restricted to orange #E8590C and blue #1C64F2; one message per visual; generous whitespace; minimal chrome.
Must be usable at phone width (card becomes a bottom sheet).
</design>

<code_quality>
Source in ./src as ES modules; ./build.mjs (esbuild) bundles src + data into ./playground/index.html. Never hand-edit
the built file. Structure: src/scene/<subassembly>.js each exporting build(parent, chip) and explodeOffsets;
src/parts/registry.js — the single source of truth mapping hierarchy names → mesh, content, explode group, level_min;
src/engine/ (renderer, camera tours, explode, picking, dial, trace animator); src/ui/ (cards, selector, dial);
src/data/ (loaders + schema validation); src/dims.js (all dimensions, no magic numbers); src/materials.js (created once, shared).
Every mesh gets its hierarchy name as .name and userData.part. Dispose geometry on chip switch; no allocations in the
frame loop. ESLint config, zero warnings.
</code_quality>

<orchestration>
Fan out: one agent per subassembly (Chassis, Display, LogicBoard, Thermal, Power, Audio, Input, StackLayers) for geometry;
one for the interaction engine; one for UI + dial; one for trace engine; one for build/test/export tooling. Then a judge
panel scores headless-Chromium screenshots of all 7 named views for proportion accuracy and visual quality; a completeness
critic verifies every hierarchy name exists in the scene graph, the registry, content.json and the exported GLB.
Loop on bugs until two consecutive passes find nothing new. Commit after each phase.
</orchestration>

<definition_of_done>
`npm test` passes: index.html loads in headless Chromium with zero console errors; all 7 views render; every chips.json
entry switches without error and visibly changes the model; the dial hides/reveals at all three levels; stack view opens
and the trace engine animates the placeholder path; macbook.glb round-trips through a glTF validator with the full named
hierarchy. README explains run/build/test/export. You have looked at every screenshot yourself.
</definition_of_done>
```

---

## PROMPT 2 — Feed the research (paste as one message, with `./research/` present)

```
ultracode

<mission>
STEP 2 of 3. The playground scaffold exists (read README.md, src/parts/registry.js, data/*.json first). Now make it
teach. Fill every placeholder with sourced content, wire the two real traces, and adversarially verify every number.
Source of truth: ./research/chips.md, ./research/anatomy.md, ./research/os_ml.md, ./research/blender_mcp.md
(compiled 22 Sep 2026 with a URL beside every numeric claim). Read them in full before writing anything.
</mission>

<accuracy_policy>
- Every numeric field in chips.json is copied from research/chips.md with its source URL in sources[]; status:"verified".
- Anything the research marks UNVERIFIED stays null with status:"unverified" and is rendered as "not published" in the UI.
  Known nulls: transistor counts for M4 Pro/Max, all M5, M6; ANE TOPS for M5/M6; die areas for M3+; M6 LPDDR type.
- Rumors (M6 MacBook Pro, M7, OLED MacBook Pro) never enter the data files. Do not fill from memory; if the research is
  silent, the value is null.
- Note the ANE TOPS basis flip: M1–M3 figures are FP16-class; M4+ (38 TOPS) are INT8-class. Show this in the UI.
</accuracy_policy>

<chip_data_to_load>
Family status: M1/M2/M3 have base, Pro, Max, Ultra. M4 has base, Pro, Max only (no Ultra ever shipped). M5 has all four
(Ultra announced 25 Aug 2026, ships 22 Sep 2026, quad-die, Mac Studio only). M6 base only (2 nm, Mac mini, 25 Aug 2026);
no M6 Pro/Max/Ultra announced. Headline numbers (full tables in research/chips.md):
bandwidth GB/s — M1 68.3 · M1 Pro 200 · M1 Max 400 · M1 Ultra 800 · M2 100 · M2 Pro 200 · M2 Max 400 · M2 Ultra 800 ·
M3 100 · M3 Pro 150 · M3 Max 300/400 · M3 Ultra 800+ · M4 120 · M4 Pro 273 · M4 Max 410/546 · M5 153 · M5 Pro 307 ·
M5 Max 460/614 · M5 Ultra 1200 · M6 153/170.
CPU — M5 Pro/Max are the first with zero efficiency cores (super + performance); M6 is the first three-tier
(2 super + 4 performance + 6 efficiency). M5 Pro/Max are two dies ("Fusion Architecture"); M5 Ultra is four.
GPU — M3 introduced Dynamic Caching, hardware ray tracing, mesh shading; M5 added a Neural Accelerator in every GPU core.
Neural Engine — 16 cores on all base/Pro/Max; 32 on Ultras; M6 has dual 16-core engines usable simultaneously.
Thunderbolt 5 from M4 Pro/Max and M3 Ultra; base chips (including M6) remain Thunderbolt 4.
Set chassis and ships_in_macbook from the "MacBooks" rows; Ultras and M6 do not ship in a MacBook.
</chip_data_to_load>

<hardware_content>
Fill content.json for every part from research/anatomy.md. Required specifics (all sourced there): the SSD controller and
its AES engine live inside the SoC's Secure Enclave, so NAND on the board is raw flash; unified memory is LPDDR packaged
on the SoC substrate under no lid (the heat spreader covers only the die); M5 Pro/Max and M5 Air use Apple's N1 wireless
chip (Wi-Fi 7 / BT 6) while the 14" M5 still uses Wi-Fi 6E; battery 72.4 Wh six-cell (14") / 100 Wh (16") /
53.8 and 66.5 Wh four-cell tray (Air 13/15); Pro has two Nidec fans + one heat pipe, Air is fanless with graphite and a
heat shield; mini-LED Liquid Retina XDR on Pro (no MacBook ships OLED as of Sept 2026), LED IPS on Air; six-speaker system
with force-cancelling woofers; Force Touch trackpad = glass + strain gauges + Taptic Engine, no moving click.
Each card's "aha" must be a real mechanism, not trivia. Level_min: Overview = parts a buyer sees; Engineer = board-level;
Silicon = on-die units, package details, controller locations.
</hardware_content>

<software_stack_content>
Fill every stack layer and die unit from research/os_ml.md. Current platform facts to teach: macOS 27 "Golden Gate"
(14 Sep 2026, Apple-silicon only); Metal 4 with MTLTensor, ML command encoder and TensorOps (fp4/fp8 in macOS 27);
MPSGraph as the layer PyTorch-MPS historically lowered to and that PyTorch 2.14 is migrating off toward native Metal
kernels (no float64 on GPU, PYTORCH_ENABLE_MPS_FALLBACK); MLX 0.32 (lazy graphs, unified memory streams, quantized
kernels incl. nvfp4/mxfp4, NAX kernels for M5 GPU accelerators, distributed via ring or JACCL RDMA-over-Thunderbolt-5);
Core ML (.mlpackage, MIL, stateful KV cache) and its WWDC26 successor Core AI (.aimodel, specialization compile, CPU/GPU/ANE,
CoreAILanguageModel provider); the ANE as an fp16 fixed-function MAC array with int8 dequantized before compute, per-op
SRAM working-set cliffs, and immutable weights (hence no training); Accelerate/BNNS dispatching GEMMs to AMX (M1–M3) or
SME (M4+); Foundation Models framework with AFM 3 Core (3B dense) and AFM 3 Core Advanced (20B sparse), 8192-token
context, LoRA adapters; boot chain Boot ROM → LLB → iBoot → XNU with the signed system volume; XNU = Mach + BSD + IOKit,
16 KB pages, AMP scheduler by QoS; unified memory with CPU MMU, GPU UAT page tables and DARTs for other DMA engines.
</software_stack_content>

<traces>
Train (MLX LoRA fine-tune, mlx_lm.lora): tokenizer on CPU → weights + optimizer state + activations in unified memory
(one pool, zero copy) → forward/backward on GPU cores (M5+: GPU Neural Accelerators for the GEMMs) → grad step writes back
in place → ANE idle (immutable-weight, fp16-only) → checkpoint to NAND through the Secure Enclave AES path.
Caption the WWDC26 datapoint: Qwen3.5-9B LoRA ~180 → ~600 tok/s across 4× M3 Ultra over JACCL.
Infer (compare three paths side by side for the selected chip): (1) Core AI/Core ML on ANE — good for encoders, vision,
small transformers; explain graph partitioning and why decode falls back; (2) MLX on GPU — prefill compute-bound on GPU
(accelerators on M5+), decode bandwidth-bound; (3) llama.cpp Metal — same units, Metal 4 tensor API on M5-class only.
Live estimate: tok/s ≈ bandwidth_gbs ÷ model_GB × efficiency, efficiency slider default 0.8 (research shows 66–93%),
model size selector (7B at Q4 ≈ 3.9 GB, Q8 ≈ 7.2 GB, F16 ≈ 13.5 GB). Label as ESTIMATE and show the measured llama.cpp
LLaMA-2-7B table from research/os_ml.md beside it for the selected chip. Show why quantization ≈ doubles decode and why
MoE decodes faster than dense at equal size.
</traces>

<orchestration>
Fan out: one agent per chip family for chips.json entry writing; one agent per subassembly for hardware cards; one per
stack layer group (boot+kernel+memory / Metal+MPS+PyTorch / MLX / CoreML+CoreAI+ANE / Accelerate+FoundationModels) for
software cards; one for the two traces. Then adversarial verification: for every chips.json entry, 3 independent
verifiers try to refute each numeric field against research/chips.md and the cited URL (WebFetch); a field survives only
if ≥2 confirm. For every card, 2 verifiers check each claim has a source and no rumor leaked. A completeness critic asks
"which part, layer, ML path, or chip-selector effect still shows placeholder text?" and feeds a fix round. Loop until dry.
</orchestration>

<definition_of_done>
Zero placeholders remain (test asserts it). Every chips.json entry is "verified" or "unverified" with sources. Switching
to each of the 20 chips updates the die, cores, LPDDR, bandwidth stream and the inference estimate. Both traces run with
captions at all three dial levels. `npm test` green. A ./docs/SOURCES.md lists every URL used. Commit.
</definition_of_done>
```

---

## PROMPT 3 — Blender via MCP (plain session; add `ultracode` if you want render critics)

```
<mission>
STEP 3 of 3. Rebuild the playground's MacBook as a photoreal Blender product render by operating Blender through the
connected Blender MCP server, step by step, verifying visually after every step. Do not hand me a script to run myself.
Inputs: ./export/macbook.glb (named hierarchy), ./data/chips.json, ./data/content.json, ./research/blender_mcp.md
(read it first — it has the tool list, the 180-second timeout, Blender 5.x API notes and material recipes).
</mission>

<environment_facts>
Blender 5.2 LTS (Python API has breaking changes vs 4.x; use bpy_api_lookup / describe_node_type instead of guessing
identifiers; "EEVEE Next" is now plain EEVEE). MCP server: mcp-for-blender. Tools you have: get_addon_status,
get_scene_info (lists only the first 10 objects — query collections explicitly via execute_blender_code), get_object_info,
get_viewport_screenshot (viewport grab, ≤800 px, not a render), execute_blender_code, bpy_api_lookup, describe_node_type,
export_scene, Poly Haven search/download (request 1k–2k HDRIs). Every call has a hard 180 s timeout on both sides and runs
on Blender's main thread.
</environment_facts>

<working_rules>
1. Preflight: get_addon_status → get_scene_info → get_viewport_screenshot. Save immediately with an absolute path:
   bpy.ops.wm.save_as_mainfile(filepath="<abs>/blender/macbook.blend"). Save again after every phase.
2. Every execute_blender_code chunk is small (< ~80 lines), idempotent (obj = bpy.data.objects.get(name) or create),
   uses the bpy.data API rather than context-dependent bpy.ops, and never calls modal/interactive operators. Use
   bpy.context.temp_override when an operator is unavoidable.
3. After every chunk: get_viewport_screenshot, look at it, compare to the intent, fix before moving on.
4. Rendering: never inside a chunk that does anything else. Set a Cycles time limit so the render returns well under
   180 s; write to an absolute PNG path; read the PNG from disk to judge it. Do preview renders at 25% resolution and
   64 samples; only the final passes go full size. If a final 4K render cannot finish under 180 s, render tiles/regions
   or lower samples and rely on OIDN — do not let the socket time out.
5. Keep a ./blender/LOG.md of every step, what worked, what failed (API renames, poll failures, timeouts) and how you fixed it.
</working_rules>

<build_plan>
A. Import: bpy.ops.import_scene.gltf(filepath=abs("export/macbook.glb")). Verify hierarchy by iterating
   bpy.data.collections and object names; confirm scale (31.26 × 22.12 × 1.55 cm). Move everything into a "MacBook"
   collection tree mirroring the hierarchy.
B. Refine topology: Bevel modifier (angle limit, harden normals, 2–4 segments) on chassis, keys, board; Subdivision where
   curvature matters (hinge, feet); rebuild fans as proper blade lathes; instance solder balls and keys.
C. Materials (Principled BSDF, verify socket names with describe_node_type): anodized aluminium Space Black (metallic 1,
   roughness ~0.35, anisotropy ~0.5, slight fine-grain noise on roughness); display glass (transmission 1, IOR 1.5, thin);
   LCD as emissive image plane; matte keycaps (roughness ~0.5, subtle bump); PCB (dark solder mask, copper pad emission-free,
   silkscreen labels from content.json names); silicon die (dark, faint procedural grid, thin-film on the heat spreader);
   LPDDR and NAND packages (matte black with laser-etched text); battery pouches (matte foil); heat pipe (brushed copper).
D. Lighting: Poly Haven studio HDRI (2k) + key/fill/rim area lights; softbox reflections visible in the aluminium.
E. Cameras: Hero (85 mm, three-quarter, lid at 110°), Exploded (50 mm, elevated), Board (top-down macro, 100 mm),
   SoC (macro, shallow DOF). Color management AgX (or Khronos PBR Neutral for the board shot), Cycles GPU (Metal),
   OIDN denoise, noise threshold 0.01.
F. Animation: exploded-view keyframes in the same order as the web app (lid → bottom case → battery/trackpad → board →
   package → spreader → LPDDR → thermal), 120 frames; a 240-frame turntable of the hero.
G. Labels: text objects for each part name and its one-line "what it is" from content.json, in a "Labels" collection
   toggled per dial level (three view layers: Overview / Engineer / Silicon).
H. Chip variants: a function apply_chip(chip_id) reading chips.json that swaps die scale, die count, LPDDR module count
   and fan presence; render the SoC shot for M1, M4 Max, M5 Max and M6 as a comparison strip.
</build_plan>

<outputs>
./renders/hero.png, exploded.png, board.png, soc.png (3840×2160); ./renders/soc-compare-{m1,m4-max,m5-max,m6}.png;
./renders/turntable.mp4 and exploded.mp4 (1080p, from image sequences via ffmpeg); ./blender/macbook.blend;
./blender/LOG.md. You have opened and looked at every PNG before declaring done.
</outputs>

<if_ultracode>
Use subagents only as critics and preparers: one writes and dry-checks each material node script against
describe_node_type before you execute it; three independent judges score every preview render for realism, proportion
and readability of labels, and you act on majority findings. Only one agent ever talks to the Blender socket.
</if_ultracode>
```

---

## Project conventions (put this in CLAUDE.md before Step 1)

```
# MacBook teaching playground
- Single source of truth for part/layer names: src/parts/registry.js. Never rename without updating data/*.json, tests and the GLB export.
- Data files: data/chips.json, data/content.json validated at build time. Numbers only from research/*.md with sources. Unknown = null, never invented.
- Built artifact playground/index.html is generated; never hand-edit.
- Design: white background, serif body ~20px, sans headings, accents only #E8590C and #1C64F2.
- Tests: npm test (Playwright, headless Chromium). Must be green before any commit.
- Blender: only through the MCP server; chunks < 80 lines, idempotent, save after each phase, log to blender/LOG.md.
```

---

## What else makes it world-class (add if you have budget left)

1. **A "how a keypress becomes a pixel" trace** alongside Train/Infer: keyboard scan → USB-C controller → XNU → WindowServer → Metal → display engine → mini-LED zones. It ties the hardware and software halves together.
2. **Power and thermal overlay**: package power vs bandwidth for each chip, with the Air's fanless throttling story.
3. **A quiz mode** (hide labels, name the part) — retention is what makes it a teaching tool, not a demo.
4. **Scroll-driven narrative page** in front of the free-explore mode, Ciechanowski-style: one idea per screen, scrubbable animation, then "explore freely".
5. **Before running Step 3**: run the GLB through the Khronos glTF validator and open it in Blender by hand once. Ninety percent of Blender pain is import scale and orphan nodes.
