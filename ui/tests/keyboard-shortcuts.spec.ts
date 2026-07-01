import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO1 = path.join(__dirname, 'fixtures', 'demo1.pdf');

/**
 * Industry-standard keyboard shortcuts. Existing coverage (zoom Ctrl +/-/0,
 * annotation Delete/Esc/Enter) lives elsewhere; this pins the newly added ones.
 */
test.describe('Keyboard shortcuts @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Shortcut coverage runs on Chromium only');

  async function openDoc(page: Page, { edit = true } = {}) {
    await page.goto('/');
    const fc = page.waitForEvent('filechooser');
    await page.getByText('browse files').click();
    (await fc).setFiles(DEMO1);
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 15000 });
    if (edit) {
      await page.getByTitle('Toggle Edit Mode').click();
      await expect(page.getByText('Edit Mode Active')).toBeVisible();
    }
  }

  test('Ctrl+O opens the file picker', async ({ page }) => {
    await openDoc(page, { edit: false });
    const fileChooser = page.waitForEvent('filechooser');
    await page.keyboard.press('Control+o');
    expect(await fileChooser).toBeTruthy();
  });

  test('Escape closes an open modal', async ({ page }) => {
    await openDoc(page);
    await page.getByTitle('Edit Metadata').click();
    await expect(page.getByText('Metadata Manager')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Metadata Manager')).toBeHidden();
  });

  test('Ctrl+S triggers save (flatten dialog when annotations exist)', async ({ page }) => {
    await openDoc(page);
    // Add an ink annotation so Save routes through the visible dialog.
    await page.getByTitle('Annotate Document').click();
    await expect(page.getByTitle('Pen Tool')).toBeVisible();
    await page.getByTitle('Pen Tool').click();
    const overlay = page.getByTestId('annotation-svg');
    await expect(overlay).toBeVisible();
    const box = await overlay.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.3, box.y + 80);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.6, box.y + 300, { steps: 6 });
      await page.mouse.up();
    }
    await page.keyboard.press('Control+s');
    await expect(page.getByText('Save & Download PDF')).toBeVisible();
  });
});
