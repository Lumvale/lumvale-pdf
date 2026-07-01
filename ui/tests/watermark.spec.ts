import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { openInEditMode } from './helpers/save';
import { countPixels } from './helpers/annotate';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * Watermark (E6). The default watermark is a large, rotated, translucent stamp
 * ("CONFIDENTIAL", 45°, red) — too rotated/faint for reliable OCR — so we verify
 * it renders by asserting the page gains a meaningful amount of ink after apply.
 */
test.describe('Watermark @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Functional watermark flow runs on Chromium only');

  // The canvas briefly shows a placeholder frame right after edit mode, so read
  // the ink count only once it has settled to a stable value.
  async function stableNonwhite(page: import('@playwright/test').Page): Promise<number> {
    let last = -1;
    for (let i = 0; i < 12; i++) {
      const v = await countPixels(page, 'nonwhite');
      if (v === last) return v;
      last = v;
      await page.waitForTimeout(400);
    }
    return last;
  }

  test('applying a watermark stamps the page', async ({ page }) => {
    test.setTimeout(120000);
    await openInEditMode(page, FIXTURES, 'demo1.pdf');

    const before = await stableNonwhite(page);

    await page.getByText('Tools', { exact: true }).click();
    await page.getByText('Add Watermark...').click();
    await expect(page.getByText('Add Watermark', { exact: true })).toBeVisible();
    await page.getByPlaceholder('e.g. DRAFT').fill('CONFIDENTIAL');
    await page.getByRole('button', { name: 'Apply Watermark' }).click();
    await expect(page.getByText('Add Watermark', { exact: true })).not.toBeVisible();

    // The re-render bakes the watermark in; wait until the page gains ink.
    await expect
      .poll(() => countPixels(page, 'nonwhite'), { timeout: 20000, intervals: [500, 1000, 2000] })
      .toBeGreaterThan(before + 300);
  });
});
