import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('Page Numbering: applies correctly and modal closes on user document', async ({ page }) => {
  test.setTimeout(120000);
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('dialog', dialog => dialog.dismiss());

  await page.goto('/');

  // Load the document
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('browse files').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'demo-heavy.pdf'));

  // Wait for the first page to render
  await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 30000 });
  // Give it a moment to finish rendering the content onto the canvas
  await page.waitForTimeout(1000);

  // Capture the canvas BEFORE applying page numbers
  const canvasLocator = page.locator('#pdf-page-1 canvas');
  const beforeData = await canvasLocator.evaluate((c: HTMLCanvasElement) => c.toDataURL());

  // Enable Edit Mode (required for PDF modification features)
  await page.getByTitle('Toggle Edit Mode').click();
  await expect(page.getByText('Edit Mode Active')).toBeVisible();

  // Wait for any Vite HMR to settle before interacting
  await page.waitForTimeout(2000);

  // Open the Page Numbering modal
  await page.getByTitle('Page Numbering').click();
  await expect(page.getByText('Page Numbering', { exact: true })).toBeVisible({ timeout: 5000 });

  // Click Apply — modal should close promptly (flushSync ensures this before re-render)
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('Page Numbering', { exact: true })).not.toBeVisible({ timeout: 30000 });

  // Verify page numbers were actually applied: poll until the canvas visually changes
  // (the page number stamp means pixel data differs from the original)
  await expect(async () => {
    const afterData = await canvasLocator.evaluate((c: HTMLCanvasElement) => c.toDataURL());
    expect(afterData).not.toEqual(beforeData);
  }).toPass({ timeout: 30000 });

  // Verify the document is still scrollable by checking additional pages are in the DOM
  await expect(page.locator('#pdf-page-2')).toBeAttached();
  await expect(page.locator('#pdf-page-3')).toBeAttached();
});
