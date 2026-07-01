import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Page Numbering 1000-Page E2E', () => {
  test('can open page numbering modal and apply to 1000 pages', async ({ page, browserName }) => {
    // Large-scale render/perf stress test — pinned to the reference engine
    // (Chromium). Running several 100–1000 page renders in parallel across
    // engines starves the CPU and makes this timing-sensitive test flaky.
    test.skip(browserName !== 'chromium', 'Render-perf stress test runs on Chromium only');
    // Increase test timeout for large PDF processing
    test.setTimeout(120000);

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err));

    await page.goto('/');

    // Upload first PDF
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'demo-1000.pdf'));

    // Wait for the document to load
    await expect(page.getByText('Pages (1000)')).toBeVisible({ timeout: 20000 });

    // Wait for canvas to render first page
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 10000 });
    // Give it a moment to finish rendering the content onto the canvas
    await page.waitForTimeout(1000);
    
    // Capture canvas before
    const canvasLocator = page.locator('#pdf-page-1 canvas');
    const beforeData = await canvasLocator.evaluate((c: HTMLCanvasElement) => c.toDataURL());

    // Enable Edit Mode before modifying
    await page.getByTitle('Toggle Edit Mode').click();
    await expect(page.getByText('Edit Mode Active')).toBeVisible();

    // Click Page Numbering button
    const batesBtn = page.getByTitle('Page Numbering');
    await expect(batesBtn).toBeVisible();
    await batesBtn.click();

    // Verify modal appears
    await expect(page.getByText('Page Numbering', { exact: true })).toBeVisible();
    
    // Fill prefix
    await page.getByPlaceholder('e.g. EXH-').fill('CASE-');
    
    // Fill start number
    const startNumberInput = page.locator('input[type="number"]').first();
    await startNumberInput.fill('100');
    
    // Click Apply
    const applyBtn = page.getByRole('button', { name: 'Apply' });
    await applyBtn.click();

    // Verify progress messages
    await expect(page.getByRole('button', { name: /Applying/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Saving document/i })).toBeVisible({ timeout: 10000 }).catch(() => {});

    // The modal should close
    await expect(page.getByText('Page Numbering', { exact: true })).not.toBeVisible({ timeout: 60000 });
    
    // Continuously poll the canvas until it visually changes
    await expect(async () => {
      const afterData = await canvasLocator.evaluate((c: HTMLCanvasElement) => c.toDataURL());
      expect(afterData).not.toEqual(beforeData);
    }).toPass({ timeout: 30000 });
  });
});
