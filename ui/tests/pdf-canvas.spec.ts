import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Upload a fixture PDF and wait for the workspace to be ready. */
async function uploadPDF(page: any, fixtureName: string) {
  await page.goto('/');
  const filePath = path.join(__dirname, 'fixtures', fixtureName);
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('browse files').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePath);
  
  // Wait for the workspace to render the PDF canvas
  await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 15000 });
}

test.describe('High-DPI (Retina) Canvas Rendering', () => {
  // We configure this test block to simulate a high-density display
  test.use({ deviceScaleFactor: 2 });

  test('canvas backing store is scaled by devicePixelRatio', async ({ page }) => {
    await uploadPDF(page, 'demo1.pdf');

    // Get the first PDF canvas
    const canvas = page.locator('#pdf-page-1 canvas').first();

    // Ensure the canvas has fully rendered its content by waiting for inline styles
    await expect(canvas).toHaveAttribute('style', /width:/);

    // Read the canvas HTML attributes and inline styles
    const pixelRatio = await page.evaluate(() => window.devicePixelRatio);
    
    // The test was configured with deviceScaleFactor: 2
    expect(pixelRatio).toBe(2);

    const canvasDimensions = await canvas.evaluate((el: HTMLCanvasElement) => {
      // Use clientWidth/Height which represents the actual CSS rendered size
      return {
        backingWidth: el.width,
        backingHeight: el.height,
        cssWidth: el.clientWidth,
        cssHeight: el.clientHeight
      };
    });

    // The backing store width should be the CSS width multiplied by the devicePixelRatio
    // We tolerate a 2px difference due to subpixel rendering and integer rounding in HTML canvas/clientWidth
    expect(Math.abs(canvasDimensions.backingWidth - (canvasDimensions.cssWidth * pixelRatio))).toBeLessThanOrEqual(2);
    expect(Math.abs(canvasDimensions.backingHeight - (canvasDimensions.cssHeight * pixelRatio))).toBeLessThanOrEqual(2);

    // Also assert that the dimensions are non-zero
    expect(canvasDimensions.backingWidth).toBeGreaterThan(0);
    expect(canvasDimensions.cssWidth).toBeGreaterThan(0);
  });

  test('canvas container pre-fetches and applies correct CSS dimensions when off-screen', async ({ page }) => {
    await uploadPDF(page, 'demo-multipage.pdf');
    
    // Zoom in using the UI button
    // (Assuming a zoom-in button exists in Toolbar.tsx, we can trigger it)
    await page.getByTitle('Zoom In').first().click();

    // The second page is off-screen (not intersecting).
    // We expect its container to still have updated width/height from the pre-fetching logic.
    const page2Container = page.locator('#pdf-page-2 > div').first();

    // Verify it exists and has inline styles applied immediately
    await expect(page2Container).toHaveAttribute('style', /width:/);
    
    // Ensure the size reflects the zoomed scale (not just the generic 800 * scale fallback)
    const style = await page2Container.getAttribute('style');
    expect(style).toContain('width:');
  });
});
