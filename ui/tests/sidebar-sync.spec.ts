import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Upload a fixture PDF and wait for the workspace to be ready. */
async function uploadPDF(page: any, fixtureName: string) {
  await page.goto('/');
  const filePath = path.join(__dirname, 'fixtures', fixtureName);
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('browse files').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePath);
  // Wait for workspace to appear
  await expect(page.locator('[data-testid="thumbnail-page-1"]')).toBeVisible({ timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('Sidebar Sync — active page feedback', () => {
  // -------------------------------------------------------------------------
  // 1. Thumbnail: active glow class applied on load
  // -------------------------------------------------------------------------
  test('first thumbnail has active glow class on initial load', async ({ page }) => {
    await uploadPDF(page, 'demo-multipage.pdf');

    // Thumbnail for page 1 should carry the data-active=true attribute
    const thumb1 = page.getByTestId('thumbnail-page-1');
    await expect(thumb1).toHaveAttribute('data-active', 'true');

    // And it should carry the glow CSS class
    await expect(thumb1).toHaveClass(/thumbnail-active-glow/);
  });

  // -------------------------------------------------------------------------
  // 2. Thumbnail: "Viewing" badge is visible on the active thumbnail
  // -------------------------------------------------------------------------
  test('"Viewing" badge appears on the active thumbnail', async ({ page }) => {
    await uploadPDF(page, 'demo-multipage.pdf');

    // The badge is rendered inside thumbnail-page-1 when it is active
    const badge = page.getByTestId('thumbnail-viewing-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Viewing');
  });

  // -------------------------------------------------------------------------
  // 3. Thumbnail: badge disappears from page 1, appears on page 3 after click
  // -------------------------------------------------------------------------
  test('active thumbnail updates after clicking another thumbnail', async ({ page }) => {
    await uploadPDF(page, 'demo-multipage.pdf');

    const thumb1 = page.getByTestId('thumbnail-page-1');
    const thumb3 = page.getByTestId('thumbnail-page-3');

    // Initially page 1 is active
    await expect(thumb1).toHaveAttribute('data-active', 'true');
    await expect(thumb3).toHaveAttribute('data-active', 'false');

    // Click page-3 thumbnail
    await thumb3.click();

    // Page 3 should now be active, page 1 should not
    await expect(thumb3).toHaveAttribute('data-active', 'true', { timeout: 5000 });
    await expect(thumb1).toHaveAttribute('data-active', 'false');

    // Viewing badge should be on page 3 now
    const badge = page.getByTestId('thumbnail-viewing-badge');
    await expect(badge).toBeVisible();

    // The badge should be inside the page-3 thumbnail container
    const thumb3WithBadge = page.getByTestId('thumbnail-page-3').getByTestId('thumbnail-viewing-badge');
    await expect(thumb3WithBadge).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 4. Thumbnail: only ONE thumbnail is active at a time
  // -------------------------------------------------------------------------
  test('only one thumbnail is active at a time', async ({ page }) => {
    await uploadPDF(page, 'demo-multipage.pdf');

    await page.getByTestId('thumbnail-page-4').click();
    await expect(page.getByTestId('thumbnail-page-4')).toHaveAttribute('data-active', 'true', { timeout: 5000 });

    // Count all active thumbnails — must be exactly 1
    const activeThumbs = page.locator('[data-testid^="thumbnail-page-"][data-active="true"]');
    await expect(activeThumbs).toHaveCount(1);
  });

  // -------------------------------------------------------------------------
  // 5. Thumbnail: page label turns bold/primary on active thumbnail
  // -------------------------------------------------------------------------
  test('page label text becomes bold on active thumbnail', async ({ page }) => {
    await uploadPDF(page, 'demo-multipage.pdf');

    await page.getByTestId('thumbnail-page-2').click();
    await expect(page.getByTestId('thumbnail-page-2')).toHaveAttribute('data-active', 'true', { timeout: 5000 });

    // The label div inside thumbnail-page-2 should have 'Page 2' text and the
    // bold active styling (the active color is a theme token, so assert on the
    // font-bold class rather than a hard-coded color).
    const label = page.getByTestId('thumbnail-page-2').locator('div.font-bold');
    await expect(label.filter({ hasText: 'Page 2' })).toBeVisible();
    await expect(label.filter({ hasText: 'Page 2' })).toContainText('Page 2');

  });

  // -------------------------------------------------------------------------
  // 6. Bookmarks tab: no bookmarks message shown for fixture with no outline
  // -------------------------------------------------------------------------
  test('bookmarks tab shows empty state for PDFs without an outline', async ({ page }) => {
    await uploadPDF(page, 'demo-multipage.pdf');

    // Switch to bookmarks tab
    await page.getByRole('button', { name: /bookmarks/i }).click();
    await expect(page.getByText('This document has no bookmarks.')).toBeVisible({ timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // 7. Thumbnail: sidebar auto-scrolls to keep active thumb in view
  //    (verifies the scrollIntoView logic fires without error)
  // -------------------------------------------------------------------------
  test('sidebar scrolls to keep active thumbnail in view', async ({ page }) => {
    await uploadPDF(page, 'demo-multipage.pdf');

    // Click the last thumbnail — sidebar should scroll it into view
    const lastThumb = page.getByTestId('thumbnail-page-5');
    await lastThumb.click();

    await expect(lastThumb).toHaveAttribute('data-active', 'true', { timeout: 5000 });
    // After scrollIntoView the thumbnail should be inside the viewport
    await expect(lastThumb).toBeInViewport();
  });

  // -------------------------------------------------------------------------
  // 8. Thumbnail: clicking thumbnail scrolls the main canvas
  // -------------------------------------------------------------------------
  test('clicking a thumbnail scrolls the main canvas to that page', async ({ page }) => {
    await uploadPDF(page, 'demo-multipage.pdf');

    // Click page 5 thumbnail
    await page.getByTestId('thumbnail-page-5').click();

    // The main-canvas page 5 wrapper should become visible in the scroll container
    const mainPage5 = page.locator('#pdf-page-5');
    await expect(mainPage5).toBeVisible({ timeout: 8000 });

    // Verify the scroll container has scrolled — poll until scrollTop > 0
    // (smooth scroll is async; a single evaluate() would race before it completes)
    await page.waitForFunction(
      () => (document.getElementById('main-scroll-container')?.scrollTop ?? 0) > 0,
      { timeout: 5000 }
    );
  });

  // -------------------------------------------------------------------------
  // 9. No viewing badge in extract mode
  // -------------------------------------------------------------------------
  test('"Viewing" badge is NOT shown in extract mode', async ({ page }) => {
    await uploadPDF(page, 'demo-multipage.pdf');

    // Enable extract mode
    await page.getByTitle('Extract Pages').click();

    // Viewing badge should not be visible in extract mode
    const badge = page.getByTestId('thumbnail-viewing-badge');
    await expect(badge).not.toBeVisible();
  });
});

// ==========================================================================
// Bug-Fix Regression Suite
// Tests that verify the three bugs reported after the initial implementation.
// ==========================================================================

test.describe('Sidebar Sync — bug fixes', () => {
  // -------------------------------------------------------------------------
  // Bug 1: Sidebar panel should scroll when main-canvas scroll changes page
  // -------------------------------------------------------------------------
  test('[Bug 1] sidebar scroll container scrolls when active page changes', async ({ page }) => {
    await uploadPDF(page, 'demo-multipage.pdf');

    // Get initial sidebar scroll position
    const sidebarContainer = page.getByTestId('sidebar-scroll-container');
    const initialScrollTop = await sidebarContainer.evaluate((el) => el.scrollTop);

    // Click the last thumbnail — it requires the sidebar to scroll
    await page.getByTestId('thumbnail-page-5').click();

    // Wait for active state to transfer
    await expect(page.getByTestId('thumbnail-page-5')).toHaveAttribute('data-active', 'true', { timeout: 5000 });

    // The sidebar container must have scrolled from its initial position
    const finalScrollTop = await sidebarContainer.evaluate((el) => el.scrollTop);
    expect(finalScrollTop).toBeGreaterThan(initialScrollTop);
  });

  // -------------------------------------------------------------------------
  // Bug 2a: Bookmark stays highlighted (full) on its exact page
  // -------------------------------------------------------------------------
  test('[Bug 2a] bookmark has full highlight on its exact target page', async ({ page }) => {
    await uploadPDF(page, 'demo-bookmarked.pdf');

    // Switch to bookmarks tab
    await page.getByRole('button', { name: /bookmarks/i }).click();

    // Wait for bookmarks to load
    await expect(page.getByTestId('bookmark-item').first()).toBeVisible({ timeout: 8000 });

    // Click the first bookmark ("Introduction" → page 1)
    await page.getByTestId('bookmark-item').first().click();

    // The first bookmark should have full active highlight (data-active=true)
    await expect(page.getByTestId('bookmark-item').first()).toHaveAttribute('data-active', 'true', { timeout: 6000 });
    // And NOT be dimmed
    await expect(page.getByTestId('bookmark-item').first()).toHaveAttribute('data-dim', 'false');
    // It should carry the active CSS class
    await expect(page.getByTestId('bookmark-item').first()).toHaveClass(/bookmark-active-row/);
  });

  // -------------------------------------------------------------------------
  // Bug 2b: Bookmark dims (stays visible) when reader is between bookmarks
  // -------------------------------------------------------------------------
  test('[Bug 2b] bookmark dims when reader scrolls to inter-section page', async ({ page }) => {
    await uploadPDF(page, 'demo-bookmarked.pdf');

    // Switch to bookmarks tab
    await page.getByRole('button', { name: /bookmarks/i }).click();
    await expect(page.getByTestId('bookmark-item').first()).toBeVisible({ timeout: 8000 });

    // Navigate to page 2 — between "Introduction" (p.1) and "Chapter 1" (p.3)
    // We do this via the thumbnail tab
    await page.getByRole('button', { name: /thumbnails/i }).click();
    await page.getByTestId('thumbnail-page-2').click();
    await expect(page.getByTestId('thumbnail-page-2')).toHaveAttribute('data-active', 'true', { timeout: 5000 });

    // Switch back to bookmarks
    await page.getByRole('button', { name: /bookmarks/i }).click();

    // The first bookmark should now be DIMMED (not fully active, not gone)
    const firstBookmark = page.getByTestId('bookmark-item').first();
    await expect(firstBookmark).toHaveAttribute('data-dim', 'true', { timeout: 4000 });
    await expect(firstBookmark).toHaveClass(/bookmark-dim-row/);
    // It must still be visible — not removed from view
    await expect(firstBookmark).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Bug 3: Bookmark click scrolls to page top on the FIRST attempt
  // -------------------------------------------------------------------------
  test('[Bug 3] clicking a bookmark scrolls the main canvas on the first click', async ({ page }) => {
    await uploadPDF(page, 'demo-bookmarked.pdf');

    // Switch to bookmarks and wait for them to load
    await page.getByRole('button', { name: /bookmarks/i }).click();
    await expect(page.getByTestId('bookmark-item').first()).toBeVisible({ timeout: 8000 });

    // Record the scroll position before clicking
    const scrollBefore = await page.locator('#main-scroll-container').evaluate((el) => el.scrollTop);

    // Click the THIRD bookmark on the FIRST attempt
    const thirdBookmark = page.getByTestId('bookmark-item').nth(2);
    await thirdBookmark.click();

    // The critical Bug 3 assertion: the main canvas scroll container should move
    // on the FIRST click (not require a second click). Poll until the async smooth
    // scroll has advanced from the initial position.
    await page.waitForFunction(
      (before) => (document.getElementById('main-scroll-container')?.scrollTop ?? 0) > before,
      scrollBefore,
      { timeout: 5000 }
    );

    // The third bookmark should now be the "owner" of the current page —
    // either fully active or dimmed (but NOT some other bookmark being active).
    await page.waitForTimeout(1200);
    const thirdIsActiveOrDim = await thirdBookmark.evaluate((el) =>
      el.getAttribute('data-active') === 'true' || el.getAttribute('data-dim') === 'true'
    );
    expect(thirdIsActiveOrDim).toBe(true);
  });
});



