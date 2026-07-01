import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { openFile, openInEditMode, forceDownloadPath } from './helpers/save';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * Page operations (Phase 4). Extract/merge/delete are already covered by
 * workspace.spec.ts; this adds Split (D2). Rotate/reorder remain TODO.
 */
test.describe('Page operations @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Functional page ops run on Chromium only');

  /** Aspect ratio (height/width) of the first rendered page canvas. */
  async function pageAspect(page: import('@playwright/test').Page): Promise<number> {
    return page.locator('#pdf-page-1 canvas').first().evaluate((el) => {
      const c = el as HTMLCanvasElement;
      return c.height / c.width;
    });
  }

  test('Rotate turns a portrait page landscape', async ({ page }) => {
    test.setTimeout(120000);
    await openInEditMode(page, FIXTURES, 'demo-multipage.pdf'); // organizer needs edit mode
    // A4 portrait → aspect > 1.
    await expect.poll(() => pageAspect(page), { timeout: 15000 }).toBeGreaterThan(1);

    await page.getByTitle('Visual Page Organizer').click();
    await page.getByTitle('Rotate Page').first().click();
    await page.getByTitle('Visual Page Organizer').click(); // back to the document view

    // After a 90° rotation the rendered page is landscape → aspect < 1.
    await expect.poll(() => pageAspect(page), { timeout: 15000 }).toBeLessThan(1);
  });

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
