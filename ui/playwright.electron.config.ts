import { defineConfig } from '@playwright/test';

/**
 * Separate Playwright config for Electron app e2e. Electron is launched via
 * _electron.launch (not a web server), so this config has no `webServer` and no
 * browser projects. It reuses the same PDF fixture generator as the web suite.
 *
 * Run: npm run build && npx playwright test -c playwright.electron.config.ts
 */
export default defineConfig({
  testDir: './tests/electron',
  globalSetup: './tests/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  reporter: 'html',
  use: {
    reducedMotion: 'reduce',
    trace: 'on-first-retry',
  },
});
