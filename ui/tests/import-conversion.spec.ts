import { test, expect, type Page, type Locator } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { initOcr, terminateOcr, ocrCanvas } from './helpers/ocr';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * Import & conversion (Phase 1, domain A). Each non-PDF format is converted to a
 * PDF on import (PDFUploader → @lumvale/pdf-browser converters) and then rendered.
 * We assert it renders AND — for text formats — OCR the rasterised page to prove
 * the actual content survived the conversion. Chromium only (deterministic raster
 * + the converters need a real DOM).
 *
 * pptx is intentionally omitted: there's no pptx *writer* library available to
 * build a fixture (pptx-preview only reads). Tracked as a follow-up.
 */
test.describe('Import & conversion @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Converters need a real DOM; run on Chromium');
  test.beforeAll(initOcr);
  test.afterAll(terminateOcr);

  async function importAndRender(page: Page, fixture: string): Promise<Locator> {
    await page.goto('/');
    const fc = page.waitForEvent('filechooser');
    await page.getByText('browse files').click();
    (await fc).setFiles(path.join(FIXTURES, fixture));
    const canvas = page.locator('#pdf-page-1 canvas');
    await expect(canvas).toBeVisible({ timeout: 60000 });
    return canvas;
  }

  const cases: Array<{ name: string; fixture: string; expect: RegExp }> = [
    { name: 'Markdown', fixture: 'test.md', expect: /conversion|regression|fixture/i },
    { name: 'Word (docx)', fixture: 'test.docx', expect: /paragraph/i },
    { name: 'Excel (xlsx)', fixture: 'test.xlsx', expect: /widget|inventory|gadget/i },
  ];

  for (const c of cases) {
    test(`${c.name} → PDF renders and is legible`, async ({ page }) => {
      test.setTimeout(120000);
      const canvas = await importAndRender(page, c.fixture);
      await expect
        .poll(() => ocrCanvas(canvas, { scale: 2 }), { timeout: 40000, intervals: [1000, 2000, 3000, 5000] })
        .toMatch(c.expect);
    });
  }

  test('Image → PDF renders', async ({ page }) => {
    test.setTimeout(60000);
    const canvas = await importAndRender(page, 'test-image.png');
    // The embedded image produces a non-blank page.
    const nonwhite = await canvas.evaluate((el) => {
      const c = el as HTMLCanvasElement;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 235 || d[i + 1] < 235 || d[i + 2] < 235) n++;
      return n;
    });
    expect(nonwhite).toBeGreaterThan(200);
  });
});
