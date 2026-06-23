import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Bates Numbering E2E', () => {
  test('can open bates numbering modal and apply', async ({ page }) => {
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

    // Open Page Numbering modal
    await page.getByTitle('Page Numbering').click();

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

    // The modal should close
    await expect(page.getByText('Page Numbering', { exact: true })).not.toBeVisible();
  });
});
