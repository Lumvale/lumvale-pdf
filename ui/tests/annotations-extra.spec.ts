import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { selectTool, dragOnPage, placeText, countPixels } from './helpers/annotate';
import { forceDownloadPath, saveAs, openFile, openInEditMode } from './helpers/save';
import { initOcr, terminateOcr, ocrCanvas } from './helpers/ocr';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * Remaining annotation matrix rows (Phase 3 completion):
 *  - C2 Highlight: flatten round-trip (translucent overlay adds ink).
 *  - C6 Text: flatten round-trip with OCR-legible content.
 *  - C8 Select + Delete: an annotation can be selected and removed via Delete.
 *  - C10 Toolbar colour: picking a swatch changes the stroke colour of new marks.
 */
test.describe('Annotations — remaining matrix @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium-pinned like the other round-trips');
  test.beforeAll(initOcr);
  test.afterAll(terminateOcr);

  test('Highlight persists through flatten (C2)', async ({ page }) => {
    test.setTimeout(120000);
    await forceDownloadPath(page);
    await openInEditMode(page, FIXTURES, 'demo1.pdf');

    const before = await countPixels(page, 'nonwhite');
    await selectTool(page, 'Highlighter');
    await dragOnPage(page);
    const saved = await saveAs(page, 'Flatten Document');
    await openFile(page, saved);
    // The 40%-opacity overlay adds a visible band of ink to the page.
    await expect
      .poll(() => countPixels(page, 'nonwhite'), { timeout: 20000, intervals: [500, 1000, 2000] })
      .toBeGreaterThan(before + 300);
  });

  test('Text persists through flatten and is legible (C6)', async ({ page }) => {
    test.setTimeout(120000);
    await forceDownloadPath(page);
    await openInEditMode(page, FIXTURES, 'demo1.pdf');

    await selectTool(page, 'Text Tool');
    // Default text is 16px red — too faint for whole-page OCR. Use black at the
    // max size (font size = stroke width × 4 → 48px) for a legible stamp.
    await page.getByTitle('Color #000000').click();
    await page.locator('input[type="range"]').fill('12');
    await placeText(page, 'LUMVALE');
    // The committed text renders in the overlay SVG.
    await expect(page.getByTestId('annotation-svg').locator('text')).toBeVisible();

    const saved = await saveAs(page, 'Flatten Document');
    await openFile(page, saved);
    const canvas = page.locator('#pdf-page-1 canvas');
    // OCR the top band where the text was placed, upscaled.
    await expect
      .poll(() => ocrCanvas(canvas, { region: { x: 0, y: 0, w: 1, h: 0.35 }, scale: 3 }), {
        timeout: 40000,
        intervals: [1000, 2000, 3000, 5000],
      })
      .toMatch(/lumvale/i);
  });

  test('Select + Delete removes an annotation (C8)', async ({ page }) => {
    await openInEditMode(page, FIXTURES, 'demo1.pdf');

    await selectTool(page, 'Pen Tool');
    await dragOnPage(page);
    const stroke = page.getByTestId('annotation-svg').locator('path[stroke="#FF3B30"]');
    await expect(stroke).toBeVisible();

    // Deactivate the tool (Escape), then click the stroke to select and Delete it.
    await page.keyboard.press('Escape');
    await stroke.click({ force: true });
    await page.keyboard.press('Delete');
    await expect(stroke).toHaveCount(0);
  });

  test('Colour swatch changes the stroke colour of new marks (C10)', async ({ page }) => {
    await openInEditMode(page, FIXTURES, 'demo1.pdf');

    await selectTool(page, 'Pen Tool');
    await page.getByTitle('Color #007AFF').click(); // Blue
    await dragOnPage(page);
    await expect(page.getByTestId('annotation-svg').locator('path[stroke="#007AFF"]')).toBeVisible();
  });
});
