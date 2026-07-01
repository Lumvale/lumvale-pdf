import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { openFile } from './helpers/save';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * Bookmarks / outline navigation (B5). Uses demo-bookmarked.pdf (6 pages, 3
 * outline entries injected by global-setup): Introduction (p1), Chapter 1 (p3),
 * Chapter 2 (p5). Verifies the outline lists, navigates, and tracks the active
 * section. Chromium is enough for this functional flow.
 */
test.describe('Bookmarks @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Functional bookmark flow runs on Chromium only');

  async function openBookmarks(page: import('@playwright/test').Page) {
    await openFile(page, path.join(FIXTURES, 'demo-bookmarked.pdf'));
    await page.getByRole('button', { name: 'Bookmarks' }).click();
  }

  test('lists the document outline', async ({ page }) => {
    await openBookmarks(page);
    await expect(page.getByTestId('bookmark-item')).toHaveCount(3);
    await expect(page.getByText('Introduction', { exact: true })).toBeVisible();
    await expect(page.getByText(/Chapter 1/)).toBeVisible();
    await expect(page.getByText(/Chapter 2/)).toBeVisible();
  });

  test('clicking a bookmark navigates and marks it active', async ({ page }) => {
    await openBookmarks(page);

    const chapter1 = page.getByTestId('bookmark-item').filter({ hasText: 'Chapter 1' });
    await chapter1.click();
    // The clicked bookmark becomes the active section (exact-page highlight).
    await expect(chapter1).toHaveAttribute('data-active', 'true', { timeout: 10000 });

    // Navigating to a different bookmark moves the active highlight.
    const intro = page.getByTestId('bookmark-item').filter({ hasText: 'Introduction' });
    await intro.click();
    await expect(intro).toHaveAttribute('data-active', 'true', { timeout: 10000 });
    await expect(chapter1).toHaveAttribute('data-active', 'false');
  });
});
