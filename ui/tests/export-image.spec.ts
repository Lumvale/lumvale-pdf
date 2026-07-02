import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { openFile } from './helpers/save';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * Export to Image (Phase 6, F1). A single page exports as one image; the default
 * format is PNG. Verifies the File → Export to Image flow produces a download.
 */
test.describe('Export to image @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Functional export flow runs on Chromium only');

  test('exports the current page as a PNG', async ({ page }) => {
    test.setTimeout(120000);
    await openFile(page, path.join(FIXTURES, 'demo1.pdf'));

    await page.getByText('File', { exact: true }).click();
    await page.getByText('Export to Image...').click();
    await expect(page.getByText('Export to Image', { exact: true })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/i);
  });
});
