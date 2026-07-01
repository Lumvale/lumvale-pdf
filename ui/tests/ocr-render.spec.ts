import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { initOcr, terminateOcr, ocrCanvas } from './helpers/ocr';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * OCR-verified rendering. These upgrade the existing "did the canvas change?"
 * heuristics into true content checks: after applying an edit we read the
 * rasterized page back to text and assert the stamped characters are legible.
 *
 * Pinned to Chromium — rasterization is deterministic there and OCR is the
 * heavy part of the CV layer; there's no value in multiplying it across engines.
 */
test.describe('OCR-verified rendering @ocr', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'OCR checks run on Chromium only');

  test.beforeAll(initOcr);
  test.afterAll(terminateOcr);

  async function uploadInEditMode(page: import('@playwright/test').Page, fixture: string) {
    await page.goto('/');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files').click();
    (await fileChooserPromise).setFiles(path.join(__dirname, 'fixtures', fixture));
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 15000 });
    await page.getByTitle('Toggle Edit Mode').click();
    await expect(page.getByText('Edit Mode Active')).toBeVisible();
  }

  test('applied Bates number is legible in the rendered page', async ({ page }) => {
    test.setTimeout(120000);
    await uploadInEditMode(page, 'demo1.pdf');

    await page.getByTitle('Page Numbering').click();
    await expect(page.getByText('Page Numbering', { exact: true })).toBeVisible();
    await page.getByPlaceholder('e.g. EXH-').fill('CASE-');
    await page.locator('input[type="number"]').first().fill('100');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('Page Numbering', { exact: true })).not.toBeVisible();

    // The stamp (rendered as the zero-padded "CASE-000100" in the footer) appears
    // asynchronously after apply. OCR the upscaled bottom strip until it reads.
    const canvas = page.locator('#pdf-page-1 canvas');
    await expect
      .poll(() => ocrCanvas(canvas, { region: { x: 0, y: 0.86, w: 1, h: 0.14 }, scale: 3 }), {
        timeout: 45000,
        intervals: [1000, 2000, 3000, 5000],
      })
      // Tolerate OCR noise around the separator / leading zeros.
      .toMatch(/case\W*0*100\b/i);
  });

  test('applied header text is legible in the rendered page', async ({ page }) => {
    test.setTimeout(120000);
    await uploadInEditMode(page, 'demo1.pdf');

    await page.getByTitle('Headers & Footers').click();
    await expect(page.getByText('Headers & Footers', { exact: true })).toBeVisible();
    const headerRight = page
      .locator('div')
      .filter({ hasText: /^HeaderLeftCenterRight$/ })
      .getByRole('textbox')
      .nth(2);
    await headerRight.fill('Page {pageNumber} of {totalPages}');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('Headers & Footers', { exact: true })).not.toBeVisible();

    // Header renders "Page 1 of 1" in the top strip.
    const canvas = page.locator('#pdf-page-1 canvas');
    await expect
      .poll(() => ocrCanvas(canvas, { region: { x: 0, y: 0, w: 1, h: 0.12 }, scale: 3 }), {
        timeout: 45000,
        intervals: [1000, 2000, 3000, 5000],
      })
      .toMatch(/page\s*1\s*of\s*1/i);
  });
});
