# MacBook teaching playground
- Single source of truth for part/layer names: src/parts/registry.js. Never rename without updating data/*.json, tests and the GLB export.
- Data files: data/chips.json, data/content.json validated at build time. Numbers only from research/*.md with sources. Unknown = null, never invented.
- Built artifact playground/index.html is generated; never hand-edit.
- Design: white background, serif body ~20px, sans headings, accents only #E8590C and #1C64F2. Keep system/light/dark mode options, give 5 font options, and 5 accent options
- Tests: npm test (Playwright, headless Chromium). Must be green before any commit.
- Check i think we have both already, if not then only install - Blender: only through the MCP server; chunks < 80 lines, idempotent, save after each phase, log to blender/LOG.md.
