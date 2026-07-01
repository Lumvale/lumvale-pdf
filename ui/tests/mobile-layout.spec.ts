import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Mobile layout coverage. These tests are tagged @mobile so they only run on the
 * mobile-* Playwright projects (Pixel 7 / iPhone 14), whose viewports sit below
 * the 768px `useIsSmallScreen` breakpoint. Below that breakpoint the workspace
 * hides the desktop-only viewer aids (dual/ruler/grid) and starts with the
 * sidebar collapsed — the contract exercised here.
 */
test.describe('Mobile layout @mobile', () => {
  test('landing page loads on a small viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LumvalePDF/i);
    await expect(page.getByText('Drag & Drop your files here')).toBeVisible();
  });

  test('can open a PDF and render the first page on mobile', async ({ page }) => {
    await page.goto('/');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'demo1.pdf'));

    // The core viewer must still rasterize the page at mobile widths.
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 15000 });
  });

  test('desktop-only viewer aids are hidden below the breakpoint', async ({ page }) => {
    await page.goto('/');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'demo1.pdf'));

    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 15000 });

    // viewAidsEnabled === false on small screens → the toggles are not rendered.
    await expect(page.getByLabel('toggle-dual')).toHaveCount(0);
    await expect(page.getByLabel('toggle-ruler')).toHaveCount(0);
    await expect(page.getByLabel('toggle-grid')).toHaveCount(0);
  });
});
