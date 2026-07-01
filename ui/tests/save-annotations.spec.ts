import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO1 = path.join(__dirname, 'fixtures', 'demo1.pdf');
const INK = '#FF3B30'; // default ink colour, rgb(255,59,48)

/**
 * Verifies annotations actually persist through Save — i.e. the saved bytes,
 * reopened from scratch, still contain the mark. Both save modes are covered:
 *  - Flatten: the stroke is burned into the page content.
 *  - Native:  the stroke is written as a real PDF annotation.
 * Pinned to Chromium for deterministic download + rasterization.
 */
test.describe('Save persists annotations @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Save round-trip runs on Chromium only');

  async function openInEditMode(page: Page, file = DEMO1) {
    await page.goto('/');
    const fc = page.waitForEvent('filechooser');
    await page.getByText('browse files').click();
    (await fc).setFiles(file);
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 15000 });
    await page.getByTitle('Toggle Edit Mode').click();
    await expect(page.getByText('Edit Mode Active')).toBeVisible();
  }

  async function drawInkStroke(page: Page) {
    await page.getByTitle('Annotate Document').click();
    await expect(page.getByTitle('Pen Tool')).toBeVisible();
    await page.getByTitle('Pen Tool').click();
    const overlay = page.getByTestId('annotation-svg');
    await expect(overlay).toBeVisible();
    const box = await overlay.boundingBox();
    if (!box) throw new Error('annotation overlay not found');
    // The page canvas is taller than the viewport, so keep the stroke in the
    // visible band (mouse can't reach coordinates below the fold).
    const startX = box.x + box.width * 0.3;
    const startY = box.y + 80;
    const endX = box.x + box.width * 0.6;
    const endY = box.y + 380;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 8 });
    await page.mouse.up();
    await expect(overlay.locator(`path[stroke="${INK}"]`)).toBeVisible();
  }

  /** Count reddish pixels in the rendered page canvas (the ink stroke). */
  async function redPixelCount(page: Page): Promise<number> {
    return page.locator('#pdf-page-1 canvas').first().evaluate((el) => {
      const c = el as HTMLCanvasElement;
      const ctx = c.getContext('2d');
      if (!ctx) return 0;
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 180 && d[i + 1] < 120 && d[i + 2] < 120) n++;
      }
      return n;
    });
  }

  async function reopen(page: Page, file: string) {
    await page.goto('/');
    const fc = page.waitForEvent('filechooser');
    await page.getByText('browse files').click();
    (await fc).setFiles(file);
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 15000 });
  }

  for (const mode of ['Flatten Document', 'Native Annotations (Recommended)'] as const) {
    test(`"${mode}" save keeps the annotation on reopen`, async ({ page }) => {
      test.setTimeout(120000);
      // Force the <a download> fallback so Playwright can capture the file.
      await page.addInitScript(() => {
        try {
          delete (window as any).showSaveFilePicker;
        } catch {
          /* ignore */
        }
      });

      await openInEditMode(page);
      await drawInkStroke(page);

      const downloadPromise = page.waitForEvent('download');
      await page.getByText('File', { exact: true }).click();
      await page.getByText('Save As...').click();
      await page.getByText(mode).click();
      const download = await downloadPromise;
      const savedPath = await download.path();
      expect(savedPath).toBeTruthy();

      await reopen(page, savedPath!);
      // Let the reopened page (and any native annotation layer) rasterize.
      await page.waitForTimeout(1500);
      const red = await redPixelCount(page);
      expect(red, `expected the ${mode} annotation to render after reopen`).toBeGreaterThan(20);
    });
  }
});
