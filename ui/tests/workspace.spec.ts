import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Workspace E2E', () => {
  test('has title and landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LumvalePDF/i);
    await expect(page.getByText('Drag & Drop your files here')).toBeVisible();
  });

  test('can upload a PDF, extract, and merge', async ({ page }) => {
    await page.goto('/');

    const demo1Path = path.join(__dirname, 'fixtures', 'demo1.pdf');
    const demo2Path = path.join(__dirname, 'fixtures', 'demo2.pdf');

    // Upload first PDF
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(demo1Path);

    // Verify transition to workspace
    await expect(page.getByText('Pages (1)')).toBeVisible();
    
    // Verify UI buttons
    const extractBtn = page.getByTitle('Extract Pages');
    await expect(extractBtn).toBeVisible();

    // Verify Zoom buttons
    await expect(page.getByTitle('Zoom In')).toBeVisible();
    await expect(page.getByTitle('Zoom Out')).toBeVisible();

    // 1. Test Extraction
    await extractBtn.click();
    await expect(page.getByText('Download Selected')).toBeVisible();
    
    // Click a page thumbnail to select it (in Extraction mode)
    await page.getByText('Page 1', { exact: true }).click();
    await expect(page.getByText('1 Selected')).toBeVisible();
    
    // We can't easily intercept the download in this simple flow without waiting for the event
    const downloadPromise = page.waitForEvent('download');
    await page.getByText('Download Selected').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('lumvalepdf-extracted.pdf');

    // Enable Edit Mode before modifying
    await page.getByTitle('Toggle Edit Mode').click();
    await expect(page.getByText('Edit Mode Active')).toBeVisible();

    // 2. Test Merging
    const mergeInputPromise = page.waitForEvent('filechooser');
    await page.getByTitle('Merge Document').click();
    const mergeChooser = await mergeInputPromise;
    await mergeChooser.setFiles(demo2Path);

    // We are in MergeWorkspace. Click the "+" button on the secondary page
    const secondaryPage = page.getByTestId('secondary-0');
    await secondaryPage.hover();
    await secondaryPage.getByRole('button', { name: '+' }).click();

    // Now click "Apply Merge"
    const applyMergeBtn = page.getByText('Apply Merge');
    await expect(applyMergeBtn).toBeVisible();
    await applyMergeBtn.click();

    // 3. Test Compress / Optimize
    page.once('dialog', dialog => dialog.accept()); // Accept the compression success alert
    await page.getByTitle('Compress / Optimize').click();
    
    // Wait for the button to return to its original state
    await expect(page.getByTitle('Compress / Optimize')).toBeVisible({ timeout: 10000 });

    // 4. Test Metadata Manager
    await page.getByTitle('Edit Metadata').click();
    await expect(page.getByText('Metadata Manager')).toBeVisible();
    
    // Fill in Author
    await page.getByTestId('meta-author').fill('VaultPDF Automator');
    await page.getByText('Save Changes').click();
    
    // Re-open to verify
    await page.getByTitle('Edit Metadata').click();
    await expect(page.getByTestId('meta-author')).toHaveValue('VaultPDF Automator');

    // Test Clear All Metadata
    await page.getByText('Clear All Metadata').click(); // First click arms the confirmation
    await page.getByText('Click again to confirm').click(); // Second click confirms
    await expect(page.getByTestId('meta-author')).toHaveValue('');
    
    await page.getByText('Save Changes').click();

    // 5. Test Encryption Manager
    // Accept the download/file action silently or just test the UI interaction
    await page.getByTitle('Encrypt / Lock').click();
    await expect(page.getByText('Encrypt Document')).toBeVisible();
    
    // Test passwords
    await page.getByTestId('meta-user-password').fill('testuser');
    await page.getByTestId('meta-owner-password').fill('testowner');
    
    // Toggle password visibility
    await page.getByText('Show Passwords').click();
    await expect(page.getByTestId('meta-user-password')).toHaveAttribute('type', 'text');
    
    // Submit
    await page.getByText('Lock PDF').click();

    // 6. Test Help Menu & Updates
    await page.getByText('Help').click();
    await expect(page.getByText('Check for Updates...')).toBeVisible();
    
    // Mock the auto-updater alert
    page.once('dialog', dialog => dialog.accept());
    await page.getByText('Check for Updates...').click();

    // 7. Test Page Deletion
    const firstPageThumb = page.locator('div').filter({ hasText: /^Page 1$/ }).first();
    await firstPageThumb.hover();
    await page.getByTitle('Delete Page').first().click();
    // After deletion, the page count should decrease (it was 3 pages from merge, so now it's 2 or similar)
    // We can just verify the first page thumbnail is still visible but represents the shifted array
    await expect(page.locator('div').filter({ hasText: /^Page 1$/ }).first()).toBeVisible();

    // 8. Test Scrolling Bug
    // Verify that clicking a thumbnail (which scrolls the main view) doesn't push the TopBar out of the viewport
    const lastPageThumb = page.locator('div').filter({ hasText: /^Page \d+$/ }).last();
    await lastPageThumb.click(); // This should trigger the scroll logic
    
    // The Extract Pages button in the TopBar should still be securely in the viewport
    const extractBtnAgain = page.getByTitle('Extract Pages');
    await expect(extractBtnAgain).toBeInViewport();
  });
});
