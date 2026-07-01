import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { openFile, forceDownloadPath } from './helpers/save';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * Page operations (Phase 4). Extract/merge/delete are already covered by
 * workspace.spec.ts; this adds Split (D2). Rotate/reorder remain TODO.
 */
test.describe('Page operations @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Functional page ops run on Chromium only');

  test('Split into single pages downloads a ZIP', async ({ page }) => {
    test.setTimeout(120000);
    await forceDownloadPath(page);
    await openFile(page, path.join(FIXTURES, 'demo-multipage.pdf'));

    await page.getByTitle('Split Document').click();
    await expect(page.getByText('Split PDF Document')).toBeVisible();
    await page.getByText('Split into Single Pages').click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Split & Download ZIP/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/i);
  });
});
