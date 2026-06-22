import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Headers & Footers E2E', () => {
  test('can open headers and footers modal and apply', async ({ page }) => {
    await page.goto('/');

    const demo1Path = path.join(__dirname, 'fixtures', 'demo1.pdf');

    // Upload first PDF
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(demo1Path);

    // Wait for the document to load
    await expect(page.getByText('Pages (1)')).toBeVisible();

    // Enable Edit Mode before modifying
    await page.getByTitle('Toggle Edit Mode').click();
    await expect(page.getByText('Edit Mode Active')).toBeVisible();

    // Click Headers & Footers button
    const hfBtn = page.getByTitle('Headers & Footers');
    await expect(hfBtn).toBeVisible();
    await hfBtn.click();

    // Verify modal appears
    await expect(page.getByText('Headers & Footers', { exact: true })).toBeVisible();
    
    // Fill header right
    const headerRightInput = page.locator('div').filter({ hasText: /^HeaderLeftCenterRight$/ }).getByRole('textbox').nth(2);
    await headerRightInput.fill('Page {pageNumber} of {totalPages}');
    
    // Click Apply
    const applyBtn = page.getByRole('button', { name: 'Apply' });
    await applyBtn.click();

    // The modal should close
    await expect(page.getByText('Headers & Footers', { exact: true })).not.toBeVisible();
  });
});
