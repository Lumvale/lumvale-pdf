# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui\tests\workspace.spec.ts >> Workspace E2E >> has title and landing page
- Location: ui\tests\workspace.spec.ts:9:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import path from 'path';
  3   | import { fileURLToPath } from 'url';
  4   | 
  5   | const __filename = fileURLToPath(import.meta.url);
  6   | const __dirname = path.dirname(__filename);
  7   | 
  8   | test.describe('Workspace E2E', () => {
  9   |   test('has title and landing page', async ({ page }) => {
> 10  |     await page.goto('/');
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  11  |     await expect(page).toHaveTitle(/VaultPDF/i);
  12  |     await expect(page.getByText('Drop your PDF here')).toBeVisible();
  13  |   });
  14  | 
  15  |   test('can upload a PDF, extract, and merge', async ({ page }) => {
  16  |     await page.goto('/');
  17  | 
  18  |     const demo1Path = path.join(__dirname, 'fixtures', 'demo1.pdf');
  19  |     const demo2Path = path.join(__dirname, 'fixtures', 'demo2.pdf');
  20  | 
  21  |     // Upload first PDF
  22  |     const fileChooserPromise = page.waitForEvent('filechooser');
  23  |     await page.getByText('Click to browse').click();
  24  |     const fileChooser = await fileChooserPromise;
  25  |     await fileChooser.setFiles(demo1Path);
  26  | 
  27  |     // Verify transition to workspace
  28  |     await expect(page.getByText('Pages (1)')).toBeVisible();
  29  |     
  30  |     // Verify UI buttons
  31  |     const extractBtn = page.getByTitle('Extract Pages');
  32  |     await expect(extractBtn).toBeVisible();
  33  | 
  34  |     // Verify Zoom buttons
  35  |     await expect(page.getByTitle('Zoom In')).toBeVisible();
  36  |     await expect(page.getByTitle('Zoom Out')).toBeVisible();
  37  | 
  38  |     // 1. Test Extraction
  39  |     await extractBtn.click();
  40  |     await expect(page.getByText('Download Selected')).toBeVisible();
  41  |     
  42  |     // Click a page thumbnail to select it (in Extraction mode)
  43  |     await page.getByText('Page 1', { exact: true }).click();
  44  |     await expect(page.getByText('1 Selected')).toBeVisible();
  45  |     
  46  |     // We can't easily intercept the download in this simple flow without waiting for the event
  47  |     const downloadPromise = page.waitForEvent('download');
  48  |     await page.getByText('Download Selected').click();
  49  |     const download = await downloadPromise;
  50  |     expect(download.suggestedFilename()).toBe('vaultpdf-extracted.pdf');
  51  | 
  52  |     // Enable Edit Mode before modifying
  53  |     await page.getByTitle('Toggle Edit Mode').click();
  54  |     await expect(page.getByText('Edit Mode Active')).toBeVisible();
  55  | 
  56  |     // 2. Test Merging
  57  |     const mergeInputPromise = page.waitForEvent('filechooser');
  58  |     await page.getByTitle('Merge Document').click();
  59  |     const mergeChooser = await mergeInputPromise;
  60  |     await mergeChooser.setFiles(demo2Path);
  61  | 
  62  |     // We are in MergeWorkspace. Click the "+" button on the secondary page
  63  |     const secondaryPage = page.getByTestId('secondary-0');
  64  |     await secondaryPage.hover();
  65  |     await secondaryPage.getByRole('button', { name: '+' }).click();
  66  | 
  67  |     // Now click "Apply Merge"
  68  |     const applyMergeBtn = page.getByText('Apply Merge');
  69  |     await expect(applyMergeBtn).toBeVisible();
  70  |     await applyMergeBtn.click();
  71  | 
  72  |     // 3. Test Compress / Optimize
  73  |     page.once('dialog', dialog => dialog.accept()); // Accept the compression success alert
  74  |     await page.getByTitle('Compress / Optimize').click();
  75  |     
  76  |     // Wait for the button to return to its original state
  77  |     await expect(page.getByTitle('Compress / Optimize')).toBeVisible({ timeout: 10000 });
  78  | 
  79  |     // 4. Test Metadata Manager
  80  |     await page.getByTitle('Edit Metadata').click();
  81  |     await expect(page.getByText('Metadata Manager')).toBeVisible();
  82  |     
  83  |     // Fill in Author
  84  |     await page.getByTestId('meta-author').fill('VaultPDF Automator');
  85  |     await page.getByText('Save Changes').click();
  86  |     
  87  |     // Re-open to verify
  88  |     await page.getByTitle('Edit Metadata').click();
  89  |     await expect(page.getByTestId('meta-author')).toHaveValue('VaultPDF Automator');
  90  | 
  91  |     // Test Clear All Metadata
  92  |     await page.getByText('Clear All Metadata').click(); // First click arms the confirmation
  93  |     await page.getByText('Click again to confirm').click(); // Second click confirms
  94  |     await expect(page.getByTestId('meta-author')).toHaveValue('');
  95  |     
  96  |     await page.getByText('Save Changes').click();
  97  | 
  98  |     // 5. Test Encryption Manager
  99  |     // Accept the download/file action silently or just test the UI interaction
  100 |     await page.getByTitle('Encrypt / Lock').click();
  101 |     await expect(page.getByText('Encrypt Document')).toBeVisible();
  102 |     
  103 |     // Test passwords
  104 |     await page.getByTestId('meta-user-password').fill('testuser');
  105 |     await page.getByTestId('meta-owner-password').fill('testowner');
  106 |     
  107 |     // Toggle password visibility
  108 |     await page.getByText('Show Passwords').click();
  109 |     await expect(page.getByTestId('meta-user-password')).toHaveAttribute('type', 'text');
  110 |     
```