import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { openFile } from './helpers/save';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * Desktop viewer aids (B6) and fit-width zoom (B2). The aids are desktop-only —
 * their mobile-hidden contract is covered by mobile-layout.spec.ts, so this runs
 * on the desktop projects. Chromium is enough for these functional toggles.
 */
test.describe('Viewer aids + fit width @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Functional toggles run on Chromium only');

  async function openMultipage(page: import('@playwright/test').Page) {
    await openFile(page, path.join(FIXTURES, 'demo-multipage.pdf'));
  }

  for (const aid of ['dual', 'ruler', 'grid'] as const) {
    test(`"${aid}" view aid toggles on and off`, async ({ page }) => {
      await openMultipage(page);
      const toggle = page.getByLabel(`toggle-${aid}`);
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });
  }

  test('dual-page view renders a second page beside the first', async ({ page }) => {
    await openMultipage(page);
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible();
    await page.getByLabel('toggle-dual').click();
    // In dual-page mode page 2 is laid out next to page 1.
    await expect(page.locator('#pdf-page-2 canvas')).toBeVisible({ timeout: 10000 });
  });

  test('Fit Width changes the zoom level', async ({ page }) => {
    await openMultipage(page);
    const zoom = page.getByTitle('Reset zoom to 100%');
    const before = (await zoom.textContent())?.trim();
    await page.getByTitle('Fit Width').click();
    await expect(zoom).not.toHaveText(before ?? '100%');
  });
});
