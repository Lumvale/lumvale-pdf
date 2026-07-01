import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { selectTool, dragOnPage, insertImage, countPixels } from './helpers/annotate';
import { forceDownloadPath, saveAs, openFile, openInEditMode, type SaveMode } from './helpers/save';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures');
const IMAGE_FIXTURE = path.resolve(__dirname, '..', 'public', 'pwa-192x192.png');
const MODES: SaveMode[] = ['Flatten Document', 'Native Annotations (Recommended)'];

/**
 * Per-tool annotation persistence: for each UI-reachable tool, draw it, Save As
 * (each mode), reopen the saved file from disk, and assert the mark is really
 * there. Complements save-annotations.spec.ts (ink) and the core unit tests.
 * Pinned to Chromium for deterministic download + rasterization.
 */
test.describe('Annotation round-trip by tool @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Round-trip runs on Chromium only');

  for (const mode of MODES) {
    test(`Redact persists (${mode})`, async ({ page }) => {
      test.setTimeout(120000);
      await forceDownloadPath(page);
      await openInEditMode(page, FIXTURES, 'demo1.pdf');
      await selectTool(page, 'Redact Tool');
      await dragOnPage(page);
      const saved = await saveAs(page, mode);
      await openFile(page, saved);
      await page.waitForTimeout(1500);
      // A redaction burns an opaque black box into the page.
      expect(await countPixels(page, 'black')).toBeGreaterThan(50);
    });
  }

  for (const mode of MODES) {
    test(`Rectangle persists (${mode})`, async ({ page }) => {
      test.setTimeout(120000);
      await forceDownloadPath(page);
      await openInEditMode(page, FIXTURES, 'demo1.pdf');
      await selectTool(page, 'Rectangle Tool');
      await dragOnPage(page);
      const saved = await saveAs(page, mode);
      await openFile(page, saved);
      await page.waitForTimeout(1500);
      // Default annotation colour is red (#FF3B30) → red stroke pixels.
      expect(await countPixels(page, 'red')).toBeGreaterThan(20);
    });

    test(`Circle persists (${mode})`, async ({ page }) => {
      test.setTimeout(120000);
      await forceDownloadPath(page);
      await openInEditMode(page, FIXTURES, 'demo1.pdf');
      await selectTool(page, 'Circle Tool');
      await dragOnPage(page);
      const saved = await saveAs(page, mode);
      await openFile(page, saved);
      await page.waitForTimeout(1500);
      expect(await countPixels(page, 'red')).toBeGreaterThan(20);
    });
  }

  test('Image inserts and persists (Flatten)', async ({ page }) => {
    test.setTimeout(120000);
    await forceDownloadPath(page);
    await openInEditMode(page, FIXTURES, 'demo1.pdf');
    await insertImage(page, IMAGE_FIXTURE);
    // The inserted image renders in the overlay as an <image> element.
    await expect(page.getByTestId('annotation-svg').locator('image')).toBeVisible();
    const saved = await saveAs(page, 'Flatten Document');
    await openFile(page, saved);
    await page.waitForTimeout(1500);
    // The baked image (a coloured icon) adds non-white pixels beyond the sparse text.
    expect(await countPixels(page, 'nonwhite')).toBeGreaterThan(500);
  });

  // TODO(annotation phase): Text and Highlight round-trips. Text needs the
  // text-input focus/commit flow worked out; Highlight needs its default colour
  // pinned for pixel detection.
});
