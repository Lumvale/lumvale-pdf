import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { PDFDocument } from 'pdf-lib';
import { openInEditMode } from './helpers/save';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * Encrypt / Lock (Phase 5, E3). The permission-integer maths is unit-tested in
 * core (encrypt.test.ts); this proves the end-to-end UI actually produces an
 * encrypted PDF — the downloaded bytes must be password-protected.
 */
test.describe('Encrypt @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Functional encrypt flow runs on Chromium only');

  test('locking with a password produces an encrypted PDF', async ({ page }) => {
    test.setTimeout(120000);
    await openInEditMode(page, FIXTURES, 'demo1.pdf');

    await page.getByTitle('Encrypt / Lock').click();
    await expect(page.getByText('Encrypt Document')).toBeVisible();
    await page.getByTestId('meta-user-password').fill('s3cret-pw');

    const downloadPromise = page.waitForEvent('download');
    await page.getByText('Lock PDF').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/-protected\.pdf$/i);

    const bytes = await fs.readFile(await download.path()!);
    // pdf-lib refuses to load an encrypted document unless explicitly told to.
    await expect(PDFDocument.load(bytes)).rejects.toThrow(/encrypted/i);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    expect(doc.isEncrypted).toBe(true);
  });
});
