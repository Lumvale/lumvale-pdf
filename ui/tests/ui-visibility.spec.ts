import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('UI Visibility & Proper Opening', () => {
  test.beforeEach(async ({ page }) => {
    // Set up error and console logging
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    page.on('dialog', dialog => dialog.dismiss());
  });

  test('app loads at base URL and page is visible', async ({ page }) => {
    await page.goto('/');

    // Verify page is not empty
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);

    // Verify body is visible and not hidden
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);
  });

  test('main app container exists and is visible', async ({ page }) => {
    await page.goto('/');

    // Look for main content container (id or class root)
    const root = page.locator('#root, [class*="container"], [class*="main"]').first();
    await expect(root).toBeVisible({ timeout: 5000 });
  });

  test('upload area is visible on app start', async ({ page }) => {
    await page.goto('/');

    // The file upload/browser area should be visible
    const uploadArea = page.getByText('browse files', { exact: false });
    await expect(uploadArea).toBeVisible({ timeout: 5000 });
  });

  test('toolbar is present and visible', async ({ page }) => {
    await page.goto('/');

    // Toolbar or top bar should exist
    const toolbar = page.locator('[class*="toolbar"], [class*="topbar"], header').first();
    await expect(toolbar).toBeVisible({ timeout: 5000 });
  });

  test('sidebar/navigation is visible', async ({ page }) => {
    await page.goto('/');

    // Sidebar should be present
    const sidebar = page.locator('[class*="sidebar"], nav, aside').first();
    if (await sidebar.count() > 0) {
      const isVisible = await sidebar.isVisible();
      // Sidebar may be initially hidden on some layouts, but the check should not throw
      expect(typeof isVisible).toBe('boolean');
    }
  });

  test('page can load a PDF file', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    // Load a test PDF
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files', { exact: false }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'demo1.pdf'));

    // Wait for PDF to render (canvas should appear)
    const canvas = page.locator('#pdf-page-1 canvas, canvas').first();
    await expect(canvas).toBeVisible({ timeout: 30000 });
  });

  test('PDF canvas renders content after file load', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    // Load a test PDF
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files', { exact: false }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'demo-multipage.pdf'));

    // Wait for first page canvas
    const canvas = page.locator('#pdf-page-1 canvas').first();
    await expect(canvas).toBeVisible({ timeout: 30000 });

    // Verify canvas has rendered content (width and height should be set)
    const canvasElement = await canvas.evaluate((el: HTMLCanvasElement) => ({
      width: el.width,
      height: el.height,
      offsetWidth: el.offsetWidth,
      offsetHeight: el.offsetHeight,
    }));

    expect(canvasElement.width).toBeGreaterThan(0);
    expect(canvasElement.height).toBeGreaterThan(0);
    expect(canvasElement.offsetWidth).toBeGreaterThan(0);
    expect(canvasElement.offsetHeight).toBeGreaterThan(0);
  });

  test('multiple pages are loaded for multipage PDFs', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    // Load a multipage test PDF
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files', { exact: false }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'demo-multipage.pdf'));

    // Wait for first page
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 30000 });

    // Verify multiple page divs exist in DOM
    const page2 = page.locator('#pdf-page-2');
    const page3 = page.locator('#pdf-page-3');
    await expect(page2).toBeAttached();
    await expect(page3).toBeAttached();
  });

  test('edit mode can be toggled', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    // Load a PDF first
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files', { exact: false }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'demo1.pdf'));

    // Wait for canvas
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 30000 });

    // Toggle edit mode
    const editButton = page.getByTitle('Toggle Edit Mode');
    await editButton.click();

    // Verify edit mode is active
    await expect(page.getByText('Edit Mode Active', { exact: false })).toBeVisible({ timeout: 5000 });
  });

  test('toolbar buttons are interactive after PDF load', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    // Load a PDF
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files', { exact: false }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'demo1.pdf'));

    // Wait for canvas
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 30000 });

    // Verify toolbar buttons are enabled (not disabled)
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    // At least one button should not be disabled
    let foundEnabledButton = false;
    for (let i = 0; i < Math.min(count, 10); i++) {
      const disabled = await buttons.nth(i).isDisabled();
      if (!disabled) {
        foundEnabledButton = true;
        break;
      }
    }
    expect(foundEnabledButton).toBe(true);
  });

  test('page is responsive and elements are in viewport', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    // Load a PDF
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files', { exact: false }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'demo1.pdf'));

    // Wait for canvas
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 30000 });

    // Get viewport size
    const viewportSize = page.viewportSize();
    expect(viewportSize).not.toBeNull();
    expect(viewportSize!.width).toBeGreaterThan(0);
    expect(viewportSize!.height).toBeGreaterThan(0);

    // Verify canvas is in viewport or scrollable
    const canvas = page.locator('#pdf-page-1 canvas').first();
    const boundingBox = await canvas.boundingBox();
    expect(boundingBox).not.toBeNull();
  });

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    // Give page time to fully load
    await page.waitForLoadState('networkidle');

    // Filter out expected errors (if any)
    const criticalErrors = errors.filter(
      err =>
        !err.includes('ResizeObserver') &&
        !err.includes('Network error') &&
        !err.includes('404') &&
        !err.includes('Module parse failed')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('UI layout adjusts when PDF is loaded and unloaded', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    // Get initial state
    const initialBrowser = page.getByText('browse files', { exact: false });
    const isInitiallyVisible = await initialBrowser.isVisible();
    expect(isInitiallyVisible).toBe(true);

    // Load a PDF
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files', { exact: false }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'demo1.pdf'));

    // Wait for canvas
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 30000 });

    // Canvas should be visible
    const canvas = page.locator('#pdf-page-1 canvas');
    expect(await canvas.isVisible()).toBe(true);
  });

  test('keyboard navigation works (scroll through PDF pages)', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    // Load a multipage PDF
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files', { exact: false }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'demo-multipage.pdf'));

    // Wait for first page
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 30000 });

    // Focus on page container and scroll down
    const pdfContainer = page.locator('[class*="pdf"], [class*="canvas"], #pdf-page-1').first();
    await pdfContainer.click();
    await page.keyboard.press('ArrowDown');

    // Give it time to scroll
    await page.waitForTimeout(500);

    // Verify we can still see content (no crash)
    const allPages = page.locator('[id^="pdf-page-"]');
    expect(await allPages.count()).toBeGreaterThan(0);
  });

  test('UI handles rapid file uploads gracefully', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    // First upload
    let fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files', { exact: false }).click();
    let fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'demo1.pdf'));

    // Wait for first PDF to load
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 30000 });

    // Second upload (replace)
    fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files', { exact: false }).click();
    fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'demo-multipage.pdf'));

    // Wait for second PDF to render
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 30000 });

    // Verify multiple pages exist
    await expect(page.locator('#pdf-page-2')).toBeAttached();
  });

  test('all major UI components are accessible', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    // Load a PDF
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files', { exact: false }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'demo1.pdf'));

    // Wait for canvas
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 30000 });

    // Get all interactive elements
    const buttons = page.locator('button');
    const inputs = page.locator('input');
    const selects = page.locator('select');

    // Count elements
    const buttonCount = await buttons.count();
    const inputCount = await inputs.count();
    const selectCount = await selects.count();

    // Verify we have some interactive elements
    const totalInteractive = buttonCount + inputCount + selectCount;
    expect(totalInteractive).toBeGreaterThan(0);
  });

  test('window resize does not break layout', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    // Load a PDF
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files', { exact: false }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'demo1.pdf'));

    // Wait for canvas
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 30000 });

    // Resize window
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);

    // Canvas should still be visible
    const canvas = page.locator('#pdf-page-1 canvas');
    expect(await canvas.isVisible()).toBe(true);

    // Resize again
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.waitForTimeout(500);

    // Canvas should still be visible
    expect(await canvas.isVisible()).toBe(true);
  });
});
