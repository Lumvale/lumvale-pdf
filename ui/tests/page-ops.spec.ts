import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { PDFDocument } from 'pdf-lib';
import { openFile, openInEditMode, forceDownloadPath, saveAsPlain } from './helpers/save';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * Page operations (Phase 4). Extract/merge/delete are already covered by
 * workspace.spec.ts; this adds Split (D2). Rotate/reorder remain TODO.
 */
test.describe('Page operations @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Functional page ops run on Chromium only');

  test('Rotate sets the first page rotation to 90°', async ({ page }) => {
    test.setTimeout(120000);
    await forceDownloadPath(page);
    await openInEditMode(page, FIXTURES, 'demo-multipage.pdf'); // organizer needs edit mode

    await page.getByTitle('Visual Page Organizer').click();
    await page.getByTitle('Rotate Page').first().click();
    // The rotate commits via startTransition + rAF; give it a moment to land in
    // documentBytes before saving.
    await page.waitForTimeout(1500);

    // Save (no annotations → single "Save Document" button) and inspect the output.
    await page.getByText('File', { exact: true }).click();
    await page.getByText('Save As...').click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save Document', exact: true }).click();
    const download = await downloadPromise;

    const bytes = await fs.readFile(await download.path()!);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPages()[0].getRotation().angle % 360).toBe(90);
  });

  test('Reorder via keyboard drag swaps the saved page order (D6)', async ({ page }) => {
    test.setTimeout(120000);
    await forceDownloadPath(page);

    // Build a 2-page doc with distinct pages: multi-select merges demo1 + demo2.
    await page.goto('/');
    const fc = page.waitForEvent('filechooser');
    await page.getByText('browse files').click();
    (await fc).setFiles([path.join(FIXTURES, 'demo1.pdf'), path.join(FIXTURES, 'demo2.pdf')]);
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 20000 });
    await page.getByTitle('Toggle Edit Mode').click();
    await expect(page.getByText('Edit Mode Active')).toBeVisible();

    // Organizer → keyboard drag (Space lift, ArrowRight move, Space drop):
    // @hello-pangea/dnd's keyboard mode is deterministic where pointer-drag is not.
    await page.getByTitle('Visual Page Organizer').click();
    await expect(page.getByText('Organize Pages')).toBeVisible();
    const firstHandle = page.locator('[data-rfd-drag-handle-draggable-id]').first();
    await firstHandle.focus();
    await page.keyboard.press(' ');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press(' ');
    await page.waitForTimeout(800); // drop animation + state commit
    await page.getByTitle('Visual Page Organizer').click(); // back to document view

    // Save and verify: page 1 of the output must now be the original page 2.
    const saved = await saveAsPlain(page);
    const { initOcr, terminateOcr, ocrCanvas } = await import('./helpers/ocr');
    await initOcr();
    try {
      await openFile(page, saved);
      const canvas = page.locator('#pdf-page-1 canvas');
      await expect
        .poll(() => ocrCanvas(canvas, { scale: 2 }), { timeout: 40000, intervals: [1000, 2000, 3000] })
        .toMatch(/demo pdf 2/i);
    } finally {
      await terminateOcr();
    }
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
