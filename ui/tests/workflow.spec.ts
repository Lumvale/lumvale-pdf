import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { selectTool, dragOnPage } from './helpers/annotate';
import { forceDownloadPath, saveAs, openFile } from './helpers/save';
import { initOcr, terminateOcr, ocrCanvas } from './helpers/ocr';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * Cross-feature workflow journey (Phase 11): import a Word doc (conversion) →
 * edit → annotate (ink) → page numbering (Bates) → Save As (flatten) → reopen the
 * saved file from scratch → verify BOTH edits survived. This is the release-
 * confidence "does the whole pipeline hold together" test.
 */
test.describe('Workflow journey @workflow @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Journey runs on Chromium only');
  test.beforeAll(initOcr);
  test.afterAll(terminateOcr);

  test('open → annotate → bates → save(flatten) → reopen keeps both', async ({ page }) => {
    test.setTimeout(180000);
    await forceDownloadPath(page);

    // 1. Open a document and enter edit mode. (Conversion is covered separately;
    // this journey focuses on the edit→stamp→save→reopen pipeline holding together.)
    await openFile(page, path.join(FIXTURES, 'demo1.pdf'));
    await page.getByTitle('Toggle Edit Mode').click();
    await expect(page.getByText('Edit Mode Active')).toBeVisible();

    // 2. Ink annotation.
    await selectTool(page, 'Pen Tool');
    await dragOnPage(page);
    await expect(page.getByTestId('annotation-svg').locator('path[stroke="#FF3B30"]')).toBeVisible();

    // 3. Bates / page numbering with a distinctive prefix.
    await page.getByTitle('Page Numbering').click();
    await expect(page.getByText('Page Numbering', { exact: true })).toBeVisible();
    await page.getByPlaceholder('e.g. EXH-').fill('JRNY-');
    await page.locator('input[type="number"]').first().fill('1');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('Page Numbering', { exact: true })).not.toBeVisible();
    // Bates commits via startTransition + rAF — let it land in documentBytes
    // before the save reads it.
    await page.waitForTimeout(1500);

    // 4. Save As → Flatten (bakes annotation + stamp) → capture the file.
    const saved = await saveAs(page, 'Flatten Document');

    // 5. Reopen the saved file and verify BOTH survived.
    await openFile(page, saved);
    const canvas = page.locator('#pdf-page-1 canvas');

    // Ink stroke → red pixels. Poll: the reopened page rasterizes asynchronously.
    const redCount = () =>
      canvas.first().evaluate((el) => {
        const c = el as HTMLCanvasElement;
        const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] > 180 && d[i + 1] < 120 && d[i + 2] < 120) n++;
        return n;
      });
    await expect
      .poll(redCount, { timeout: 20000, intervals: [500, 1000, 2000] })
      .toBeGreaterThan(20);

    // Bates stamp → OCR the footer strip.
    await expect
      .poll(() => ocrCanvas(canvas, { region: { x: 0, y: 0.86, w: 1, h: 0.14 }, scale: 3 }), {
        timeout: 45000,
        intervals: [1000, 2000, 3000, 5000],
      })
      .toMatch(/jrny\W*0*1\b/i);
  });
});
