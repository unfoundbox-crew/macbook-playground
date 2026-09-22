import js from '@eslint/js';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['node_modules/', 'playground/', 'export/', 'playwright-report/', 'test-results/']),
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: {
      // Scene/engine modules implement fixed signatures (build, update, applyChip); unused params are by design.
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
    },
  },
  {
    files: ['src/**/*.js'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // Node scripts. Tools and tests also run code inside the page (page.evaluate), so they get browser globals too.
    files: ['build.mjs', 'eslint.config.js', 'playwright.config.js', 'tools/**/*.{js,mjs}', 'tests/**/*.{js,mjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
]);
