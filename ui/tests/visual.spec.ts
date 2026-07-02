import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Visual-regression baselines. Screenshots are pixel-compared against committed
 * baselines (per-project, per-platform — see snapshotPathTemplate). Baselines are
 * OS-sensitive, so the ones committed from CI are the source of truth; regenerate
 * with `npx playwright test visual.spec.ts --update-snapshots` on the target OS.
 *
 * Determinism:
 *  - the config forces reducedMotion (freezes the aurora backdrop) and
 *    toHaveScreenshot disables animations;
 *  - the theme is pinned via localStorage before load — otherwise it falls back
 *    to the machine's prefers-color-scheme (see src/utils/theme.ts) and drifts
 *    between local and CI;
 *  - each test waits for the surface to settle before capturing.
 */
async function pinTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
}

// framer-motion mount animations (incl. opacity fades) aren't covered by the CSS
// reduced-motion switch, and settle slower on WebKit under parallel load. Give
// them room, and a generous stabilization budget on the comparison itself.
const SETTLE_MS = 2000;
const SHOT_TIMEOUT = 15_000;

async function settle(page: Page) {
  await page.waitForTimeout(SETTLE_MS);
}

async function openMultipage(page: Page) {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('browse files').click();
  (await fileChooserPromise).setFiles(path.join(__dirname, 'fixtures', 'demo-multipage.pdf'));
  await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 15000 });
}

test.describe('Visual regression @visual', () => {
  // Desktop baselines are captured on the reference engine only to keep the
  // baseline set maintainable; WebKit rasterizes text differently.
  test.skip(({ browserName }) => browserName !== 'chromium', 'Desktop visual baselines: Chromium only');

  test('landing — light', async ({ page }) => {
    await pinTheme(page, 'light');
    await page.goto('/');
    await expect(page.getByText('Drag & Drop your files here')).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot('landing-light.png', { fullPage: true, timeout: SHOT_TIMEOUT });
  });

  test('landing — dark', async ({ page }) => {
    await pinTheme(page, 'dark');
    await page.goto('/');
    await expect(page.getByText('Drag & Drop your files here')).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot('landing-dark.png', { fullPage: true, timeout: SHOT_TIMEOUT });
  });

  test('workspace — multipage document loaded', async ({ page }) => {
    await pinTheme(page, 'light');
    await page.goto('/');
    await openMultipage(page);
    // Give thumbnails + all page canvases time to rasterize for a stable capture.
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot('workspace-multipage.png', {
      fullPage: true,
      // The pdf.js canvas can differ a hair between renders; allow a small budget.
      maxDiffPixelRatio: 0.03,
      timeout: SHOT_TIMEOUT,
    });
  });

  // -------------------------------------------------------------------------
  // Phase 10 sweep — one baseline per key surface.
  // -------------------------------------------------------------------------

  test('workspace — dark theme', async ({ page }) => {
    await pinTheme(page, 'dark');
    await page.goto('/');
    await openMultipage(page);
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot('workspace-dark.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
      timeout: SHOT_TIMEOUT,
    });
  });

  test('annotation toolbar open', async ({ page }) => {
    await pinTheme(page, 'light');
    await page.goto('/');
    await openMultipage(page);
    await page.getByTitle('Toggle Edit Mode').click();
    await page.getByTitle('Annotate Document').click();
    await expect(page.getByTitle('Pen Tool')).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot('annotation-toolbar.png', {
      maxDiffPixelRatio: 0.03,
      timeout: SHOT_TIMEOUT,
    });
  });

  test('bookmarks panel open', async ({ page }) => {
    await pinTheme(page, 'light');
    await page.goto('/');
    const fc = page.waitForEvent('filechooser');
    await page.getByText('browse files').click();
    (await fc).setFiles(path.join(__dirname, 'fixtures', 'demo-bookmarked.pdf'));
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Bookmarks' }).click();
    await expect(page.getByTestId('bookmark-item').first()).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot('bookmarks-panel.png', {
      maxDiffPixelRatio: 0.03,
      timeout: SHOT_TIMEOUT,
    });
  });

  test('visual page organizer view', async ({ page }) => {
    await pinTheme(page, 'light');
    await page.goto('/');
    await openMultipage(page);
    await page.getByTitle('Toggle Edit Mode').click();
    await page.getByTitle('Visual Page Organizer').click();
    await expect(page.getByText('Organize Pages')).toBeVisible();
    // Thumbnails in the grid rasterize asynchronously.
    await page.waitForTimeout(2500);
    await expect(page).toHaveScreenshot('organizer-view.png', {
      maxDiffPixelRatio: 0.04,
      timeout: SHOT_TIMEOUT,
    });
  });

  test('page numbering modal', async ({ page }) => {
    await pinTheme(page, 'light');
    await page.goto('/');
    await openMultipage(page);
    await page.getByTitle('Toggle Edit Mode').click();
    await page.getByTitle('Page Numbering').click();
    await expect(page.getByText('Page Numbering', { exact: true })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot('page-numbering-modal.png', {
      maxDiffPixelRatio: 0.03,
      timeout: SHOT_TIMEOUT,
    });
  });
});

test.describe('Visual regression — mobile @mobile', () => {
  test('landing — mobile viewport', async ({ page }) => {
    await pinTheme(page, 'light');
    await page.goto('/');
    await expect(page.getByText('Drag & Drop your files here')).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot('landing-mobile.png', { fullPage: true, timeout: SHOT_TIMEOUT });
  });

  test('workspace — mobile viewport', async ({ page }) => {
    await pinTheme(page, 'light');
    await page.goto('/');
    await openMultipage(page);
    await page.waitForTimeout(1500);
    // Viewport-only shot: the limited-edit layout (collapsed sidebar, compact
    // toolbar, no viewer aids) is the surface under test.
    await expect(page).toHaveScreenshot('workspace-mobile.png', {
      maxDiffPixelRatio: 0.03,
      timeout: SHOT_TIMEOUT,
    });
  });
});
