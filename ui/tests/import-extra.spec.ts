import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * Remaining import matrix rows (Phase 1 completion):
 *  - A1 Drag & drop: dropping a PDF on the landing dropzone opens it.
 *  - A7 Multi-file import: selecting two PDFs merges them into one document.
 *  - A8 Recent files: an opened document persists to (and reopens from) the
 *    landing page's Recent Files list (idb-keyval).
 */
test.describe('Import — remaining matrix @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Import flows are Chromium-pinned');

  test('drag & drop opens a PDF (A1)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Drag & Drop your files here')).toBeVisible();

    const b64 = (await fs.readFile(path.join(FIXTURES, 'demo1.pdf'))).toString('base64');
    const dataTransfer = await page.evaluateHandle((b64) => {
      const dt = new DataTransfer();
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      dt.items.add(new File([bytes], 'dropped.pdf', { type: 'application/pdf' }));
      return dt;
    }, b64);
    // The drop bubbles from the heading to the dropzone's onDrop handler.
    await page.getByText('Drag & Drop your files here').dispatchEvent('drop', { dataTransfer });

    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 20000 });
  });

  test('selecting two PDFs merges them into one document (A7)', async ({ page }) => {
    await page.goto('/');
    const fc = page.waitForEvent('filechooser');
    await page.getByText('browse files').click();
    (await fc).setFiles([
      path.join(FIXTURES, 'demo1.pdf'),
      path.join(FIXTURES, 'demo2.pdf'),
    ]);
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 20000 });
    // Two single-page PDFs → merged two-page document.
    await expect(page.getByText('Pages (2)')).toBeVisible();
  });

  test('an opened document appears in Recent Files and reopens (A8)', async ({ page }) => {
    // Open once so it lands in IndexedDB.
    await page.goto('/');
    const fc = page.waitForEvent('filechooser');
    await page.getByText('browse files').click();
    (await fc).setFiles(path.join(FIXTURES, 'demo1.pdf'));
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 20000 });

    // Back to the landing page: the document is listed under Recent Files.
    await page.getByText('File', { exact: true }).click();
    await page.getByText('Close Document').click();
    await expect(page.getByText('Recent Files')).toBeVisible({ timeout: 10000 });
    const entry = page.getByText('demo1.pdf', { exact: true }).first();
    await expect(entry).toBeVisible();

    // Clicking it reopens the document without any file picker.
    await entry.click();
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 20000 });
  });
});
