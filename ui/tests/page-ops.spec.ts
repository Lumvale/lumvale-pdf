import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { PDFDocument } from 'pdf-lib';
import { openFile, openInEditMode, forceDownloadPath } from './helpers/save';

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
