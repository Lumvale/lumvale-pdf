import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Electron specs launch their own app via playwright.electron.config.ts — never
  // run them under the web browser projects (they can't launch in the headless
  // web CI container and would run redundantly).
  testIgnore: ['**/electron/**'],
  globalSetup: './tests/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Each worker renders real PDFs (some fixtures are 100+ raster pages). Too many
  // parallel contexts starve the CPU and make WebKit in particular blow past the
  // per-test timeout mid-render. Cap concurrency so the render-heavy suite stays
  // reliable across browsers.
  workers: process.env.CI ? 1 : 4,
  // Headroom for slow, render-heavy tests under load (esp. WebKit).
  timeout: 60_000,
  reporter: 'html',
  // Baselines are OS-sensitive (font anti-aliasing differs per platform), so the
  // {platform} suffix is deliberate — never share a snapshot across OSes.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}/{arg}-{projectName}-{platform}{ext}',
  expect: {
    // The workspace has a slow animated "aurora" backdrop + framer-motion, so
    // screenshot comparisons must freeze animations and tolerate sub-pixel AA.
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    // The workspace runs a perpetual "aurora" backdrop animation. It never
    // settles, so Playwright's click "stability" wait can hang (especially on
    // WebKit). The app zeroes these animations under prefers-reduced-motion
    // (see src/fx.css), so force that mode for deterministic, stable actions.
    reducedMotion: 'reduce',
  },
  projects: [
    // Desktop projects run the full suite (cross-browser), minus @mobile tests
    // which assume a sub-768px layout.
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /@mobile/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      grepInvert: /@mobile/,
    },
    // Mobile projects run only @mobile-tagged tests — the existing suite assumes
    // a desktop layout (sidebar, viewer aids) that the responsive UI hides below
    // the 768px breakpoint (useIsSmallScreen).
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
      grep: /@mobile/,
    },
    {
      name: 'mobile-webkit',
      use: { ...devices['iPhone 14'] },
      grep: /@mobile/,
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
