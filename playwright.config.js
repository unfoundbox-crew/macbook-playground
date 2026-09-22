/**
 * playwright.config.js — headless Chromium smoke tests against the built page.
 *
 * No web server: the tests open file:///…/playground/index.html directly (run `npm run build` first).
 * One worker, no retries, 60 s per test, list reporter. Launch args are the ones tools/snap.mjs
 * measured (Metal on macOS, explicit SwiftShader elsewhere) so a test frame renders the way a snap does.
 */
import { defineConfig, devices } from '@playwright/test';
import { LAUNCH_ARGS } from './tools/snap.mjs';

const VIEWPORT = Object.freeze({ width: 1280, height: 800 });

export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.js',
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: 'list',
  use: {
    headless: true,
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    launchOptions: { args: [...LAUNCH_ARGS] },
    screenshot: 'off',
    video: 'off',
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: VIEWPORT, deviceScaleFactor: 1 },
    },
  ],
});
