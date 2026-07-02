import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * Mobile contract sweep (Phase 9). Below the 768px breakpoint the workspace
 * runs a limited-edit layout: desktop-precision tools are hidden (Toolbar
 * `compact`, TopBar hides the Tools menu, viewer aids suppressed — the last is
 * covered by mobile-layout.spec.ts) while the core mobile flows stay available
 * (open, read, zoom, annotate, save). Tagged @mobile so it runs on the
 * Pixel 7 / iPhone 14 projects only.
 */
test.describe('Mobile contract @mobile', () => {
  async function openDoc(page: Page, { edit = false } = {}) {
    await page.goto('/');
    const fc = page.waitForEvent('filechooser');
    await page.getByText('browse files').click();
    (await fc).setFiles(path.join(FIXTURES, 'demo1.pdf'));
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 20000 });
    if (edit) {
      await page.getByTitle('Toggle Edit Mode').click();
      await expect(page.getByText('Edit Mode Active')).toBeVisible();
    }
  }

  test('desktop-precision toolbar tools are hidden', async ({ page }) => {
    await openDoc(page, { edit: true });
    for (const title of [
      'Extract Pages',
      'Split Document',
      'Merge Document',
      'Visual Page Organizer',
      'Edit Metadata',
      'Encrypt / Lock',
    ]) {
      await expect(page.getByTitle(title), `${title} must be hidden on mobile`).toHaveCount(0);
    }
    // The Tools menu is dropped from the top bar too.
    await expect(page.getByRole('button', { name: 'Tools', exact: true })).toHaveCount(0);
  });

  test('core mobile controls stay available', async ({ page }) => {
    await openDoc(page);
    await expect(page.getByTitle('Annotate Document')).toBeVisible();
    await expect(page.getByTitle('Zoom In')).toBeVisible();
    await expect(page.getByTitle('Zoom Out')).toBeVisible();
    await expect(page.getByTitle('Toggle Sidebar')).toBeVisible();
    // File menu (open/save) remains.
    await page.getByText('File', { exact: true }).click();
    await expect(page.getByText('Open Document...')).toBeVisible();
    await expect(page.getByText('Save Document...')).toBeVisible();
  });

  test('sidebar starts collapsed (drawer) on mobile', async ({ page }) => {
    await openDoc(page);
    await expect(page.getByText(/Pages \(\d+\)/)).toBeHidden();
    await page.getByTitle('Toggle Sidebar').click();
    await expect(page.getByText(/Pages \(\d+\)/)).toBeVisible();
  });

  test('annotating with the pen works on mobile', async ({ page }) => {
    await openDoc(page, { edit: true });
    await page.getByTitle('Annotate Document').click();
    await expect(page.getByTitle('Pen Tool')).toBeVisible();
    await page.getByTitle('Pen Tool').click();
    const overlay = page.getByTestId('annotation-svg');
    await expect(overlay).toBeVisible();
    const box = await overlay.boundingBox();
    if (!box) throw new Error('overlay not found');
    await page.mouse.move(box.x + box.width * 0.3, box.y + 60);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + 200, { steps: 6 });
    await page.mouse.up();
    await expect(overlay.locator('path[stroke="#FF3B30"]')).toBeVisible();
  });
});
