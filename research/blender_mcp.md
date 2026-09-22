# Blender MCP — state of play as of 2026-09-22

Research compiled from primary sources (GitHub repo + raw source files, PyPI, blender.org, developer.blender.org release notes, the Blender manual source on projects.blender.org, threejs.org/GitHub for three.js) plus a few secondary guides. Anything not confirmed in a source is marked **UNVERIFIED**.

---

## 1. Which Blender is current (Sept 2026)

| Version | Date | Notes | Source |
|---|---|---|---|
| **5.2.2 LTS** | 15 Sep 2026 | Current download; LTS supported through July 2028; macOS build requires macOS 13 Ventura+, Apple Silicon native | https://www.blender.org/download/ , https://www.blender.org/download/releases/5-2/ |
| 5.2 LTS | 14 Jul 2026 | Cycles texture cache (.tx), Principled BSDF *Thin Wall*, EEVEE 2x faster in instance-heavy scenes, glTF meshopt/point clouds/iridescence/dispersion, GPU background-mode Python API | https://www.blender.org/download/releases/5-2/ |
| 5.1 | 17 Mar 2026 | Cycles GPU "up to 10%" faster, HIP RT on by default (AMD), Python 3.13, OCIO 2.5 | https://www.blender.org/download/releases/5-1/ |
| 5.0 | 18 Nov 2025 | Color-management overhaul (wide gamut/HDR, ACES 1.3/2.0, AgX HDR, Linear Rec.2020/ACEScg working spaces); "EEVEE Next" renamed to plain "EEVEE"; Python API breaking changes vs 4.x | https://www.blender.org/download/releases/5-0/ , https://en.wikipedia.org/wiki/Blender_(software) |
| 4.5 LTS | 15 Jul 2025 | Vulkan backend fully supported (opt-in), faster FBX importer, improved glTF; supported till ~Jul 2027 | https://www.blender.org/download/releases/4-5/ |
| 4.2 LTS | 16 Jul 2024 | EEVEE Next rewrite, Ray Portal BSDF, thin-film, OIDN 2.3 + GPU denoise on AMD, Khronos PBR Neutral view transform, Extensions platform; LTS ended Jul 2026 | https://www.blender.org/download/releases/4-2/ |

Blender's official version history page lists 5.2 LTS (Jul 14 2026), 5.1 (Mar 17 2026), 5.0 (Nov 18 2025), 4.5 LTS, 4.2 LTS: https://www.blender.org/download/releases/

**Implication for agents:** scripts written for 4.x may hit 5.0 Python API breakages (Blender explicitly warns of breaking changes: https://www.blender.org/download/releases/5-0/). Geometry-node inputs/outputs became RNA properties in 5.2 "requiring script updates" (https://www.blender.org/download/releases/5-2/). The exact list of removed/renamed identifiers is **UNVERIFIED** here (the 5.0 python_api release-notes page redirected/403'd during research).

---

## 2. The community server: ahujasid/blender-mcp → **mcp-for-blender**

### 2.1 Identity, rename, versions
- Repo: https://github.com/ahujasid/mcp-for-blender (old URL https://github.com/ahujasid/blender-mcp redirects). Description: "Community plugin to control Blender 3D with any LLM of your choice". MIT license. ~29.1k stars, ~2.6k forks (README fetch, Sept 2026): https://github.com/ahujasid/mcp-for-blender
- Renamed Sept 2026 to make clear it is "an MCP server for Blender" and a community third-party integration distinct from official Blender Lab projects. Issue #366: https://github.com/ahujasid/mcp-for-blender/issues/366
  - New PyPI package `mcp-for-blender`; old `blender-mcp` is now "a compatibility wrapper that installs `mcp-for-blender`". `uvx blender-mcp` still works. Python import path stays `blender_mcp`. Addon name unchanged. 2.0.0 has "no breaking API changes" — the major bump signals the rename only.
- PyPI `mcp-for-blender` 2.0.0 released 16 Sep 2026; requires Python >=3.10: https://pypi.org/project/mcp-for-blender/
- PyPI `blender-mcp` history: 2.0.0 (16 Sep 2026), 1.9.4 (15 Sep 2026), 1.9.1 (2 Sep 2026), 1.9.0 (30 Aug 2026), 1.8.x (Aug 2026), 1.6.5 (29 Jul 2026), 1.0.0 (10 Mar 2025): https://pypi.org/project/blender-mcp/
- GitHub Releases page has no tagged releases: https://github.com/ahujasid/blender-mcp/releases
- Addon (`addon.py`) `bl_info` version **1.7**, minimum Blender **3.0.0**, protocol version **7** (handshake `get_addon_info` returns addon version tuple, protocol version, capabilities list, Blender version): https://raw.githubusercontent.com/ahujasid/mcp-for-blender/main/addon.py
- Server tool `get_addon_status` checks "whether the connected Blender addon matches this MCP server version": https://raw.githubusercontent.com/ahujasid/mcp-for-blender/main/src/blender_mcp/server.py

### 2.2 Requirements
- Blender 3.0+, Python 3.10+, `uv` installed via the official installer (README warns `pip install uv` can hide `uvx`): https://github.com/ahujasid/mcp-for-blender

### 2.3 Install steps (from README)
1. Install uv: macOS `brew install uv`; Windows `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`; Linux `curl -LsSf https://astral.sh/uv/install.sh | sh`.
2. Configure the MCP client:
   - **Claude Desktop** `claude_desktop_config.json`:
     ```json
     { "mcpServers": { "blender": { "command": "uvx", "args": ["mcp-for-blender"] } } }
     ```
   - **Claude Code CLI**: `claude mcp add blender uvx mcp-for-blender`
   - **Codex**: `codex mcp add blender -- uvx mcp-for-blender` or `~/.codex/config.toml` `[mcp_servers.blender] command="uvx" args=["mcp-for-blender"]`
   - **Cursor** (Windows): `{"command": "cmd", "args": ["/c", "uvx", "mcp-for-blender"]}`
   - OpenCode / Antigravity / VS Code variants also listed.
   - If the GUI client reports `spawn uvx ENOENT`, use the absolute path (`/opt/homebrew/bin/uvx`, `C:\Users\<name>\.local\bin\uvx.exe`).
3. Install the addon: `uvx mcp-for-blender install-addon` (copies addon into Blender's addons folder, backs up existing) or manual: download `addon.py` → Edit → Preferences → Add-ons → Install → enable "Interface: MCP for Blender". `uvx mcp-for-blender addon-paths` lists addon folders (https://pypi.org/project/mcp-for-blender/).
4. In Blender: 3D Viewport → `N` sidebar → "MCP for Blender" tab → toggle integrations (Poly Haven, Poly Pizza, …) → **Connect to Claude**. Do not also run `uvx` manually in a terminal (conflicts).
5. Env vars: `BLENDER_HOST` (default `localhost`), `BLENDER_PORT` (default `9876`), `BLENDER_MCP_SAFE_MODE=1`, `DISABLE_TELEMETRY=true`, and API keys `BLENDERMCP_SKETCHFAB_API_KEY`, `BLENDERMCP_POLYPIZZA_API_KEY`, `BLENDERMCP_HYPER3D_API_KEY`, `BLENDERMCP_HUNYUAN3D_SECRET_ID/SECRET_KEY/API_URL`.
Source: https://github.com/ahujasid/mcp-for-blender

### 2.4 Architecture (what actually happens per call)
- MCP server (Python, FastMCP) ↔ Blender addon over a **plain TCP socket on localhost:9876**, JSON messages, no length prefix; only one MCP client should connect at a time: https://mcp-for-blender.com/concepts/how-it-works , https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-blender-mcp
- Server side: socket timeout **180.0 s** (matches addon), recv buffer 8192 bytes: https://raw.githubusercontent.com/ahujasid/mcp-for-blender/main/src/blender_mcp/server.py
- Addon side: server socket & client sockets use 1.0 s poll timeouts, backlog 5, 8192-byte recv chunks; commands are queued and drained on Blender's **main thread via `bpy.app.timers`** (0.05 s poll) because "it is not safe to call bpy from other threads" (https://docs.blender.org/api/current/bpy.app.timers.html). The addon **refuses to start in background mode (`blender -b`)** — "commands would never execute". Source: https://raw.githubusercontent.com/ahujasid/mcp-for-blender/main/addon.py
- `execute_code` runs `exec()` with a namespace containing `bpy`, captures stdout, returns exception type/message/traceback on error.
- No authentication on the socket; README says keep it on localhost, use SSH tunnels for remote: https://github.com/ahujasid/mcp-for-blender
- Telemetry is on by default (anonymous: install ID, tool names, success/duration, versions, OS); prompts/code/screenshots only with explicit opt-in consent; `DISABLE_TELEMETRY=true` turns it off. Tool `disable_telemetry` exists.

### 2.5 Exact tool list (server.py on `main`, Sept 2026)
From https://raw.githubusercontent.com/ahujasid/mcp-for-blender/main/src/blender_mcp/server.py (31 `@mcp.tool()`s):

Core
1. `get_addon_status(user_prompt)` — addon/server version match check
2. `disable_telemetry(user_prompt)`
3. `get_scene_info(user_prompt)` — scene name, object count, material count; **object list limited to the first 10 objects** with name/type/location rounded to 2 decimals (addon: "Collect minimal object information (limit to first 10 objects)")
4. `get_object_info(object_name, user_prompt)`
5. `get_viewport_screenshot(max_size, user_prompt)` → Image. Addon default `max_size=800` px (older server signature default was 1000); captures via `gpu.types.GPUOffscreen` with fallback to `screen.screenshot_area`; downscales if larger.
6. `execute_blender_code(code, user_prompt)` — "Make sure to do it step-by-step by breaking it into smaller chunks."
7. `describe_node_type(bl_idname, property_overrides, user_prompt)` — node property/socket schema lookup without touching the scene
8. `bpy_api_lookup(query, user_prompt)` — "Structured Blender RNA/API reference lookup: types, properties, functions, and operators"
9. `export_scene(filepath, format, object_names, selection_only, apply_modifiers, user_prompt)` — GLB or FBX to disk
10. `record_trajectory_feedback(feedback, correction_text, step_index, user_prompt)` — evaluation feedback (telemetry/trajectory)

Poly Haven (CC0 HDRIs/textures/models; ~2,400+ assets per README)
11. `get_polyhaven_status`
12. `get_polyhaven_categories(asset_type="hdris")`
13. `search_polyhaven_assets(asset_type="all", categories)` — addon caps results at 20 per request "to avoid overwhelming Blender's message buffer"
14. `download_polyhaven_asset(asset_id, asset_type, resolution="1k", file_format)`
15. `set_texture(object_name, texture_id)`

Sketchfab (API key required)
16. `get_sketchfab_status`
17. `search_sketchfab_models(query, categories, count=20, downloadable=True)`
18. `get_sketchfab_model_preview(uid)` → Image
19. `download_sketchfab_model(uid, target_size)` — scaled so largest dimension = target_size

Poly Pizza (~10,600 low-poly CC0/CC-BY models; free API key from poly.pizza/settings/api; "69% CC-BY assets requiring attribution")
20. `get_polypizza_status`
21. `search_polypizza_models(query, category, licence, animated, limit)`
22. `download_polypizza_model(model_id, normalize_size, target_size)`

Hyper3D Rodin (AI text/image→3D; main site or FAL.ai keys)
23. `get_hyper3d_status`
24. `generate_hyper3d_model_via_text(text_prompt, bbox_condition)`
25. `generate_hyper3d_model_via_images(input_image_paths, input_image_urls, bbox_condition)`
26. `poll_rodin_job_status(subscription_key, request_id)`
27. `import_generated_asset(name, task_uuid, request_id)`

Hunyuan3D (Tencent Cloud, mainland or international "AI3D 3.0" endpoints, or local API)
28. `get_hunyuan3d_status`
29. `generate_hunyuan3d_model(text_prompt, input_image_url)`
30. `poll_hunyuan_job_status(job_id)`
31. `import_generated_asset_hunyuan(name, zip_file_url)`

MCP prompt `asset_creation_strategy()`: "Always start by checking if integrations are available"; use `get_viewport_screenshot()` BEFORE changes and AFTER executing code/importing assets; priority PolyHaven → Sketchfab ("good at Realistic models") → Hyper3D/Hunyuan3D → scripted primitives as fallback: https://raw.githubusercontent.com/ahujasid/blender-mcp/main/src/blender_mcp/server.py

### 2.6 Safe mode (`safe_mode.py`)
`BLENDER_MCP_SAFE_MODE=1` validates scripts before `exec`: import allowlist (`bpy`, `bmesh`, `mathutils`, pure-stdlib `math`, `json`, `re`…), denies `os`, `sys`, `subprocess`, `socket`; blocks `eval/exec/compile/__import__/open/input`, dunder escape attributes (`__class__`, `__globals__`, `__subclasses__`, `__builtins__`), and persistence paths (`bpy.app.handlers`, `bpy.app.timers`, `bpy.ops.wm.append`, `bpy.data.texts`, `bpy.ops.script.*`). Still allows rendering, save/open, import/export via bpy. Violations raise `SandboxViolation` with a line number; `is_safe(code)` returns `(ok, reason)` "safe to return to the model so it can repair its script": https://github.com/ahujasid/mcp-for-blender/blob/main/src/blender_mcp/safe_mode.py

### 2.7 Known limitations (sourced)
| Limitation | Evidence |
|---|---|
| **180 s hard timeout** per operation on both sides; long code/renders fail with `MCP error -32001: Request timed out` | server.py/addon.py timeouts; https://mcp-for-blender.com/concepts/how-it-works ("All operations time out after 180 seconds"); issue #50 (complex requests timed out, Blender crashed once): https://github.com/ahujasid/blender-mcp/issues/50 |
| Everything (code, Poly Haven downloads, renders) runs on Blender's **main thread** → UI freezes during a call; README: Poly Haven "assets download on main thread; request 1k–2k resolution unless viewing close-up" | https://github.com/ahujasid/mcp-for-blender ; https://docs.blender.org/api/current/bpy.app.timers.html (timer callbacks block Blender) |
| Rendering blocks the socket: a `bpy.ops.render.render()` inside `execute_blender_code` cannot return until the render finishes, so it must complete within the 180 s window or the client times out (inference from the timer-queue architecture; the maintainer's docs only say "split complex tasks … respecting the 180-second timeout"). The glonorce fork explicitly moved renders to a subprocess "to avoid freezing the interface" — evidence the problem is real. | https://mcp-for-blender.com/concepts/how-it-works ; https://github.com/glonorce/Blender_mcp |
| `get_scene_info` returns only first 10 objects | addon.py |
| Viewport screenshot capped at `max_size` (800 default) and is a viewport grab, not a render; fails on some setups (Windows Blender + WSL server #187; "Screenshot file was not created" #148) | https://github.com/ahujasid/blender-mcp/issues/187 , https://github.com/ahujasid/blender-mcp/issues/148 |
| Truncated/incomplete JSON responses (fixed 51-byte responses) leading to timeouts — framing bug reports | https://github.com/ahujasid/blender-mcp/issues/219 |
| Windows terminal corruption when used as MCP server | https://github.com/ahujasid/blender-mcp/issues/209 |
| Poly Pizza downloads can fail behind Cloudflare bot protection from datacenter/VPN IPs | README |
| Single client only; no auth; arbitrary code execution (security issue #207) | README; https://github.com/ahujasid/blender-mcp/issues/207 |
| No headless (`blender -b`) mode — needs GUI or virtual display | addon.py |
| Large scripts: README/troubleshooting only says "break requests into smaller steps"; no documented max payload size (**UNVERIFIED** whether there is a hard byte limit beyond the 8192-byte chunked recv loop) | README |

### 2.8 Best practices people have found for driving it from an agent
Sources: the tool's own prompt/docs (https://raw.githubusercontent.com/ahujasid/blender-mcp/main/src/blender_mcp/server.py , https://mcp-for-blender.com/concepts/how-it-works), the Hermes Agent skill page (https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-blender-mcp), claude-3d-harness (https://github.com/MAX-786/claude-3d-harness), StraySpark guide (https://www.strayspark.studio/blog/ai-powered-3d-modeling-blender-mcp-server-guide), Blender API docs.

1. **Small, idempotent chunks.** The tool docstring itself says "do it step-by-step by breaking it into smaller chunks"; docs: "Split complex tasks into smaller operations respecting the 180-second timeout window". Hermes: "Break complex scenes into multiple smaller execute_code calls to avoid timeouts". Write code as `obj = bpy.data.objects.get("Name") or create()` so re-running after a timeout does not duplicate objects (Hermes: query state first "prevents duplicate object creation").
2. **Check scene state after each step.** Use `get_scene_info` / `get_object_info` before modifying; `get_viewport_screenshot` before and after changes (server prompt). claude-3d-harness encodes plan → execute → checkpoint screenshot/preview render → inspect against acceptance criteria → 1–4 fix passes.
3. **Prefer high-level tools; use `execute_blender_code` only for what tools can't do** (mcp-for-blender.com). Use `bpy_api_lookup` / `describe_node_type` instead of guessing node socket names (server.py).
4. **Naming conventions & collections.** Hermes: "Name objects deliberately for reliable targeting across calls"; since `get_scene_info` shows only 10 objects, put work into named collections and query `bpy.data.collections["X"].objects` explicitly (collections advice is practice-derived; only the 10-object cap is sourced).
5. **Save `.blend` often.** README: "ALWAYS save your work before using [execute_blender_code]"; official Blender Lab page: server "will execute LLM generated code in Blender without any guards" (https://www.blender.org/lab/mcp-server/). Use `bpy.ops.wm.save_as_mainfile(filepath=...)` with absolute paths.
6. **Avoid modal/interactive operators and context-dependent `bpy.ops`.** Code runs from a timer with no 3D-view context; operators that need a specific area/region fail their poll. Prefer `bpy.data` API (e.g., `bpy.data.meshes.new`, `obj.data.materials.append`) and `bpy.context.temp_override(...)` when an operator is unavoidable (Blender API gotchas page: https://docs.blender.org/api/current/info_gotchas_operators.html — body not retrievable during research, content **UNVERIFIED** beyond the page's existence). Hermes gotcha: "Shade smoothing fails — object must be selected in object mode first".
7. **Rendering in a dedicated call** with absolute output paths (`/tmp/...`) (Hermes), low resolution / low samples / time limit so it returns under 180 s, then read the PNG from disk rather than relying on the viewport screenshot.
8. **Keep downloads small**: Poly Haven 1k–2k (README).
9. **Version handshake**: call `get_addon_status` first; mismatch → `uvx mcp-for-blender install-addon` again.
10. **Lessons logged by claude-3d-harness** (real runs): OptiX compile failures forcing CUDA fallback; light linking set via Python not honored; thin geometry vanishing at typical resolutions — record lessons in a notes file across jobs.
11. **Safe mode** for untrusted sessions; script validator returns a reason the model can use to repair its code.

### 2.9 Significant forks / related
- **Official Blender Lab MCP** (see §3).
- **newo-ether fork v1.18.0** (structured node editing, multi-instance) — default provider in claude-3d-harness: https://github.com/MAX-786/claude-3d-harness
- **glonorce/Blender_mcp** — "69 tools … thread-safe bpy execution, 499 tests", async render in subprocess, requires Blender 5.0+, 4 stars: https://github.com/glonorce/Blender_mcp
- Others indexed: naab007/blender_mcp, ssoj13/blender-mcp-rs (Rust), IAmMarcellus/BlenderMCP (not evaluated).

---

## 3. Official Blender-side effort: Blender Lab "MCP Server"
- Project page: https://www.blender.org/lab/mcp-server/ ; repo: https://projects.blender.org/lab/blender_mcp ; listed on https://www.blender.org/lab/ as "Released", category AI and ML, funded by the Development Fund: "Building a standalone Model Context Protocol server and integration with Blender (as an add-on)".
- Described as "a lightweight MCP server for Blender" giving "a natural language interface with Blender's Python API, improving access to documentation".
- **Requires Blender 5.1 or newer**; add-on version 1.0.3 (page content); three components you install yourself: the add-on (drag-and-drop installs the Blender Lab extension repository first, then the add-on), an MCP-capable LLM client (llama.cpp is the documented example, local-first with open-weight models), and the MCP server (as an `.mcpb` MCP Bundle from the releases page, or from source). "Blender does not have any built-in functionality for connecting to LLMs."
- Security statement: "The MCP server will execute LLM generated code in Blender without any guards in place to protect your data from removal or from being sent to a remote location" → run in a VM / machine without sensitive data.
- Sample prompts: find polygon-heavy objects with little screen presence, fix data-block naming, which objects use a material, generate inline docs for geometry-node setups.
- Q1 2026 Blender Lab activity report frames it as exploration under an "artist-centric policy", local-first (llama.cpp), demo of mesh-density-vs-camera-distance analysis: https://www.blender.org/development/blender-lab-activity-report-q1-2026/
- Third-party listing (mcp.film) claims ~26 tools (12 core + `*_for_cli` headless variants: execute code, object/scene data, screenshots & renders, docs access, missing-asset/linked-library inspection), TCP socket transport, "explicitly outside the current Blender roadmap"/experimental — **UNVERIFIED** against the repo (projects.blender.org returned 403 to the fetcher): https://mcp.film/mcps/blender-lab-mcp/
- Comparison (rifty.ai, July 2026): official needs 5.1+ and manual 3-part install; community needs 3.0+, easier install, asset integrations the official one lacks: https://www.rifty.ai/labs/blender-mcp

---

## 4. Photoreal product renders in Blender 4.2 → 5.2

### 4.1 Cycles vs EEVEE (Next)
- EEVEE Next shipped in 4.2 LTS as a full rewrite: screen-space global illumination, virtual shadow maps, dithered volumetrics, true displacement, unlimited BSDFs, viewport motion blur: https://www.blender.org/download/releases/4-2/
- Key limitation: EEVEE reflections/GI are **screen-space only** (cannot reflect off-screen geometry); light probes (sphere/volume) are the fallback; max 4,096 simultaneous visible lights: https://developer.blender.org/docs/release_notes/4.2/eevee/
- As of 5.0 beta "EEVEE Next" is just "EEVEE": https://en.wikipedia.org/wiki/Blender_(software) ; 5.2 EEVEE: 2x speedup in instance-heavy scenes, removed 8-attribute limit, backface screen-tracing to reduce light leaking, anisotropic filtering, dithering: https://www.blender.org/download/releases/5-2/
- Cycles is the path tracer; 4.2 added Ray Portal BSDF, thin-film interference, blue-noise dithered sampling (better at low sample counts, default for new files), volume light sampling; 5.0 made null-scattering volumes default, multi-bounce SSS, metallic thin-film; 5.2 added texture cache and Thin Wall: sources above.
- The **Bevel shader node is Cycles-only** (see 4.5) — a practical reason product-shot work stays on Cycles. Secondary guides (CGAxis 2026, tripo3d) recommend Cycles for photoreal product shots: https://cgaxis.com/complete-blender-render-setup-guide-for-photorealistic-results-2026/ , https://www.tripo3d.ai/blog/explore/blender-render-settings-for-consistent-product-shots

### 4.2 HDRI studio lighting from Poly Haven
- Poly Haven API: `GET /assets`, `GET /files/{id}`; types hdris(0)/textures(1)/models(2); HDRI resolutions 1k, 2k, 4k, 8k, 16k, 24k; formats `.hdr`/`.exr`; all CC0; no key needed but a unique `User-Agent` header is mandatory: https://polyhaven.com/our-api
- Via MCP: `search_polyhaven_assets(asset_type="hdris", categories="studio")` → `download_polyhaven_asset(id, "hdris", resolution="2k")`. README advises 1k–2k because downloads block the main thread.
- World node chain: Environment Texture (Equirectangular) → Background → World Output; Texture Coordinate(Generated) → Mapping → Environment Texture *Vector* for Z-rotation; start Strength 1.0; test rotations 0/30/60/90°; keep World Strength separate from Exposure: https://3dskillup.art/hdri-lighting-blender-product-renders/
- Studio-style recipes use HDRI as low fill (0.1–0.3 per tripo3d; 0.3–0.8 per CGAxis) plus key area light 500–2000 W at 30–45°, fill 20–50% of key, small rim spot (tripo3d). Hide the HDRI from camera with Film → Transparent or a Light Path *Is Camera Ray* mix (standard technique; **UNVERIFIED** here as a citation).

### 4.3 Principled BSDF settings (Blender manual, Principled v2, 4.0+)
Manual: https://projects.blender.org/blender/blender-manual/raw/branch/main/manual/render/shader_nodes/shader/principled.rst
- Metallic 1.0 = "fully specular reflection tinted with the base color, without diffuse reflection or transmission"; IOR default 1.5 "a good approximation for glass"; Specular IOR Level default 0.5; Coat "to simulate for example a clearcoat, lacquer or car paint"; Thin Film IOR default 1.33 (thickness sweet spot 100–1000 nm); Thin Wall for papers/leaves/window sheets; Multiscatter GGX more physically accurate than GGX.
- **Anodized aluminium** (secondary; artisticrender): Metallic 1, Roughness 0.1–0.4, Anisotropy ~0.5 to stretch reflections; brushed look via stretched noise → low-distance bump; metals depend heavily on the HDRI: https://artisticrender.com/how-to-create-an-aluminum-material-in-blender/ . Anodizing colour = tinted Base Color on a metallic surface; a thin Coat (weight 0.2–0.5) helps the dyed-oxide sheen — **UNVERIFIED/practice**.
- **Glass**: Transmission Weight 1.0, Roughness ~0–0.05, IOR 1.45–1.52 (manual: 1.5 default approximates glass); Transmission bounces 8–12 (CGAxis); use Thin Wall (5.2) for thin panes.
- **Matte plastic**: Metallic 0, Roughness ~0.4–0.7, Specular IOR Level 0.5, optional slight Subsurface for soft plastics — value ranges from CGAxis ("Roughness range 0.1–0.9", base colours 30–240 RGB, never pure black/white).
- Colour-accurate product colours: Khronos PBR Neutral view transform is designed so "sRGB colors in the output render … match … the input sRGB base color" (see 4.6).

### 4.4 Bevel modifier / bevel shader for edge highlights
- Bevel modifier: Width (Offset/Width/Depth/Percent/Absolute), Segments, Limit Method Angle ("bevels edges whose angle of adjacent face normals plus the defined Angle is less than 180°"), Weight, Vertex Group, **Harden Normals** (bevel face normals match surrounding faces), Clamp Overlap, Superellipse/Custom profile, miter types: https://projects.blender.org/blender/blender-manual/raw/branch/main/manual/modeling/modifiers/generate/bevel.rst
- **Bevel shader node (Cycles only)**: rounds edges in shading without geometry; Radius input; Samples default 4; "very expensive shader, and may slow down renders by 20%"; plug its Normal output into the material Normal; breaks with caustics settings and with OSL on OptiX: https://projects.blender.org/blender/blender-manual/raw/branch/main/manual/render/shader_nodes/input/bevel.rst
- 5.1: Normal Map node option to apply to smooth undisplaced vs displaced mesh; 4.5: bump Filter Width input: https://www.blender.org/download/releases/5-1/ , https://www.blender.org/download/releases/4-5/

### 4.5 Camera for product shots
- 85–135 mm focal length, f/2.8–f/5.6 (tripo3d) or f/1.4–f/2.8 (CGAxis) for DOF; slightly above, three-quarter view; use *Lock Camera to View*: https://www.tripo3d.ai/blog/explore/blender-render-settings-for-consistent-product-shots , https://cgaxis.com/complete-blender-render-setup-guide-for-photorealistic-results-2026/
- Blender's Cycles camera also supports custom OSL cameras (4.5).

### 4.6 Colour management: AgX vs Filmic vs PBR Neutral
Manual (displays/views): https://projects.blender.org/blender/blender-manual/raw/branch/main/manual/render/color_management/displays_views.rst
- **AgX**: "improves on Filmic, giving more photorealistic results … 16.5 stops of dynamic range and desaturates highly exposed colors to mimic film". Default for new files since 4.0 ("bright colors go towards white, similar to real cameras"): https://developer.blender.org/docs/release_notes/4.0/color_management/
- **Filmic**: "deprecated and is superseded by AgX"; doesn't work with macOS HDR display option.
- **Khronos PBR Neutral** (4.2+): tone map "designed specifically for PBR color accuracy" — best for catalogue colour fidelity.
- **Standard**: no tone mapping (for pre-graded footage / NPR). Raw / False Color for inspection.
- 5.0 adds wide-gamut/HDR pipeline, ACES 1.3/2.0, AgX HDR, Rec.2100 PQ/HLG, Linear Rec.2020 & ACEScg working spaces; 5.2 adds camera-vendor colour spaces (Apple, ARRI, Blackmagic, Canon, Sony); 5.1 OCIO 2.5.

### 4.7 Denoising and samples
- Denoiser options: Automatic (prefers GPU, OIDN over OptiX), **OpenImageDenoise** ("typically provides the highest quality"; Prefilter None/Fast/Accurate; Quality High/Balanced/Fast; *Use GPU* "significantly faster … but requires additional GPU memory"), **OptiX** ("Only available on NVIDIA GPUs"); separate Denoise toggles for Viewport and Render: https://projects.blender.org/blender/blender-manual/raw/branch/main/manual/render/cycles/render_settings/sampling.rst
- OIDN GPU acceleration (4.1+): NVIDIA GTX 16xx/TITAN V/RTX, AMD RDNA2/RDNA3, Intel Xe-HPG+, **Apple Silicon on macOS 13.0+**: https://developer.blender.org/docs/release_notes/4.1/cycles/ ; OIDN 2.3 + AMD support in 4.2: https://developer.blender.org/docs/release_notes/4.2/cycles/ ; 5.1 smoother albedo/normal pass transitions.
- Adaptive sampling: Noise Threshold typical "0.1 to 0.001"; Time Limit stops at wall-clock (0 = off, excludes pre-processing); Light Tree on; Max/Min samples defaults not stated in the manual text (Blender's factory defaults of 4096 render / 1024 viewport / 0.01 threshold are **UNVERIFIED** here). Cycles X (3.0) workflow: set a noise threshold and let the denoiser finish: https://developer.blender.org/docs/release_notes/3.0/cycles/
- Practitioner numbers: noise threshold 0.01, min 128, product shots converge at 256–512 (tripo3d) or 512–1024 (CGAxis); bounces Total 8 / Diffuse 3 / Glossy 4 / Transmission 8 (tripo3d) or Max 12 with transmission 8–12 for glass (CGAxis); Filter Glossy 1.0 with caustics off.
- Blue-noise sampling (4.2+) helps low sample counts.

### 4.8 Blender on Apple Silicon
- Cycles Metal: "supported on Apple computers with Apple Silicon. macOS 13.0 or newer is required to support all features. GPU accelerated ray-tracing and denoising is available on Apple Silicon.": https://projects.blender.org/blender/blender-manual/raw/branch/main/manual/render/cycles/gpu_rendering.rst
- Hardware ray tracing (MetalRT): on by default on M3; "fully supported" but off by default on M1/M2 because Cycles' own intersection code is faster there (4.0): https://developer.blender.org/docs/release_notes/4.0/cycles/ ; M3 tuning PR: https://projects.blender.org/blender/blender/pulls/114296
- Metal support introduced in Blender 3.1: https://en.wikipedia.org/wiki/Blender_(software) ; Metal viewport backend: https://code.blender.org/2023/01/introducing-the-blender-metal-viewport/
- Enable in Edit → Preferences → System → Cycles Render Devices → Metal, then Render Properties → Device: GPU Compute (standard UI; implied by the manual). Set via Python: `bpy.context.preferences.addons['cycles'].preferences.compute_device_type = 'METAL'` then `get_devices()` + `scene.cycles.device='GPU'` (**UNVERIFIED** snippet, common practice).
- 5.2 macOS build: macOS 13+, ~330 MB: https://www.blender.org/download/
- Benchmark numbers for M-series vs RTX: **UNVERIFIED** (opendata.blender.org data pages not retrievable).

---

## 5. glTF/GLB from a Three.js scene into Blender

### 5.1 What three.js `GLTFExporter` writes
Source: https://github.com/mrdoob/three.js/blob/dev/examples/jsm/exporters/GLTFExporter.js
- Extensions: KHR_lights_punctual, KHR_materials_clearcoat / dispersion / emissive_strength / ior / iridescence / sheen / specular / transmission / unlit / volume, KHR_mesh_quantization, KHR_texture_transform, EXT_materials_bump, EXT_mesh_gpu_instancing (InstancedMesh), EXT_texture_webp.
- Options: `binary` false, `trs` false, `onlyVisible` true, `maxTextureSize` Infinity, `animations` [], `includeCustomExtensions` false.
- Full fidelity only for `MeshStandardMaterial` / `MeshPhysicalMaterial`; other materials (Phong/Lambert/Basic/**ShaderMaterial**) are downgraded with warnings — custom GLSL is lost. Cameras and punctual lights are exported; skinning/morph targets/animations supported.

### 5.2 What Blender's importer (bundled io_scene_gltf2) preserves
Source: https://projects.blender.org/blender/blender-manual/raw/branch/main/manual/addons/scene_gltf2.rst , https://github.com/KhronosGroup/glTF-Blender-IO
- **Survives**: meshes (triangles; *Merge Vertices* recombines split verts but not those with differing normals), hierarchy (scenes as collections; empties; instances via EXT_mesh_gpu_instancing become objects sharing mesh data; orphan nodes go to an excluded "Orphan Collection"), PBR materials rebuilt as Principled BSDF (Base Color, Metallic/Roughness, tangent-space normal map +Y, Emission with KHR_materials_emissive_strength, Clearcoat, Transmission, IOR default 1.5), extensions KHR_materials_pbrSpecularGlossiness / clearcoat / transmission / unlit / emissive_strength / volume / sheen / specular / anisotropy / dispersion / ior / variants, KHR_texture_transform (Mapping node; rotation Z-only), alpha modes Opaque/Mask/Blend, cameras, point/spot/directional lights (KHR_lights_punctual; Lighting Mode Standard=physical cd/lx/nt, Unitless, Raw), animations (object transforms, pose bones, shape keys; first animation plays, others stashed as NLA tracks named after the glTF animation — enable Solo to play a multi-object animation), skins/armatures (Bone Dir heuristic, Guess Original Bind Pose), Draco (bundled; **UNVERIFIED** specifically for import in fetched text), WebP textures, Pack Images option.
- **Lost**: curves/non-mesh data ("must be converted to meshes"), custom GLSL/ShaderMaterial (already lost on export), area lights and world/environment lighting, animation of "physics, lights, or materials … will be ignored", no way to see the non-animated rest pose of an animated model; Y-up → Z-up conversion is applied automatically (glTF is +Y up, metres).
- 5.2 importer/exporter adds point clouds, meshopt compression, iridescence, dispersion: https://www.blender.org/download/releases/5-2/ ; Khronos history of extension mapping (3.3 era; sheen/specular limitations resolved by Principled v2 in 4.0): https://www.khronos.org/blog/blender-gltf-i-o-support-for-gltf-pbr-material-extensions
- Via MCP: `execute_blender_code("bpy.ops.import_scene.gltf(filepath='/abs/path/scene.glb')")`, then re-check `get_scene_info` (only 10 objects listed) and export back with `export_scene(format="GLB")`.

---

## 6. Quick agent playbook (synthesis)
1. `get_addon_status` → `get_scene_info` → `get_viewport_screenshot`.
2. Save: `bpy.ops.wm.save_as_mainfile(filepath="/abs/product.blend")`.
3. Import GLB; put objects in a named collection; apply `Bevel` modifier (Angle limit, Harden Normals, 2–4 segments) or Bevel shader node (Cycles only, Samples 4).
4. Materials with Principled BSDF: metal (Metallic 1, Roughness 0.1–0.4, Anisotropy ~0.5), glass (Transmission 1, IOR 1.5), matte plastic (Roughness ~0.5).
5. `download_polyhaven_asset(<studio hdri>, "hdris", "2k")`; add key/fill/rim area lights.
6. Camera 85–135 mm; Cycles, Device GPU (Metal on Apple Silicon), AgX or Khronos PBR Neutral, OIDN GPU denoise, noise threshold 0.01, Time Limit set so the render finishes well inside 180 s, render to an absolute path in its own call.
7. Verify by reading the rendered PNG; iterate in small idempotent code chunks.
