import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { PDFDocument } from 'pdf-lib';
import { openInEditMode, forceDownloadPath, saveAsPlain } from './helpers/save';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * Document-operation round-trips (Phase 5/6 stragglers):
 *  - E1 Compress: completes and the saved output is still a valid, same-page PDF.
 *  - E2 Metadata: edits round-trip into the saved file's info dictionary.
 *  - F4 Encrypted reopen: the app fails gracefully (error message, no crash)
 *    when fed its own password-protected output.
 */
test.describe('Doc-op round-trips @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Round-trips run on Chromium only');

  test('Compress keeps the document valid with the same page count (E1)', async ({ page }) => {
    test.setTimeout(120000);
    await forceDownloadPath(page);
    await openInEditMode(page, FIXTURES, 'demo-multipage.pdf');

    page.once('dialog', (d) => d.accept()); // compression success alert
    await page.getByTitle('Compress / Optimize').click();
    await expect(page.getByTitle('Compress / Optimize')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1500); // let the compressed bytes commit (startTransition)

    const saved = await saveAsPlain(page);
    const doc = await PDFDocument.load(await fs.readFile(saved));
    // Same page count as the source fixture (its HTML render spills to 10 pages).
    const src = await PDFDocument.load(await fs.readFile(path.join(FIXTURES, 'demo-multipage.pdf')));
    expect(doc.getPageCount()).toBe(src.getPageCount());
  });

  test('Metadata edits round-trip into the saved file (E2)', async ({ page }) => {
    test.setTimeout(120000);
    await forceDownloadPath(page);
    await openInEditMode(page, FIXTURES, 'demo1.pdf');

    await page.getByTitle('Edit Metadata').click();
    await expect(page.getByText('Metadata Manager')).toBeVisible();
    await page.getByTestId('meta-author').fill('Roundtrip Author');
    await page.getByText('Save Changes').click();
    await expect(page.getByText('Metadata Manager')).toBeHidden();
    await page.waitForTimeout(1000);

    const saved = await saveAsPlain(page);
    const doc = await PDFDocument.load(await fs.readFile(saved));
    expect(doc.getAuthor()).toBe('Roundtrip Author');
  });

  test('Reopening an encrypted output fails gracefully (F4)', async ({ page }) => {
    test.setTimeout(120000);
    await forceDownloadPath(page);
    await openInEditMode(page, FIXTURES, 'demo1.pdf');

    await page.getByTitle('Encrypt / Lock').click();
    await expect(page.getByText('Encrypt Document')).toBeVisible();
    await page.getByTestId('meta-user-password').fill('pw-123');
    const downloadPromise = page.waitForEvent('download');
    await page.getByText('Lock PDF').click();
    const protectedPath = await (await downloadPromise).path();

    // Feed the protected file back to the uploader: it must surface an error
    // message on the landing screen — never a blank/broken viewer.
    await openFileExpectingError(page, protectedPath!);
  });

  async function openFileExpectingError(page: import('@playwright/test').Page, filePath: string) {
    await page.goto('/');
    const fc = page.waitForEvent('filechooser');
    await page.getByText('browse files').click();
    (await fc).setFiles(filePath);
    // Graceful failure: error text appears, the workspace canvas never mounts.
    await expect(page.locator('#pdf-page-1 canvas')).toHaveCount(0);
    await expect(
      page.getByText(/encrypt|password|failed to parse|valid formats/i).first()
    ).toBeVisible({ timeout: 15000 });
  }
});
