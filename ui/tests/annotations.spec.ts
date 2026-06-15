import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uploadPDF(page: any, fixtureName: string) {
  await page.goto('/');
  const filePath = path.join(__dirname, 'fixtures', fixtureName);
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator('.border-dashed').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePath);
  
  await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 15000 });
}

test.describe('Visual Annotations', () => {

  test('can open annotation toolbar and draw ink', async ({ page }) => {
    await uploadPDF(page, 'demo1.pdf');

    // Enter Edit Mode to reveal Annotate button
    await page.getByTitle('Toggle Edit Mode').click();

    // Click Annotate toggle
    await page.getByTitle('Annotate Document').click();

    // Toolbar should appear
    await expect(page.getByTitle('Pen Tool')).toBeVisible();

    // Select Pen Tool
    await page.getByTitle('Pen Tool').click();

    // Get the SVG overlay which covers the PDF canvas
    const overlay = page.getByTestId('annotation-svg');
    await expect(overlay).toBeVisible();

    // Draw a stroke using mouse events
    const box = await overlay.boundingBox();
    if (!box) throw new Error('Overlay has no bounding box');

    await page.mouse.move(box.x + 50, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 });
    await page.mouse.up();

    // Verify stroke was rendered in SVG
    const svgHTML = await overlay.innerHTML();
    console.log('SVG HTML:', svgHTML);
    const pathLocator = overlay.locator('path[stroke="#FF3B30"]'); // default color
    await expect(pathLocator).toBeVisible();

    await page.getByText('File').click();
    await page.getByText('Save Document').click();

    // Click Flatten save
    await page.getByRole('button', { name: /Flatten Document/i }).click();

    // Wait for the SVG to disappear (indicating PDF has been updated and re-rendered without the overlay state)
    // Actually the SVG path will disappear because annotations state is cleared
    await expect(pathLocator).not.toBeVisible();
  });

  test('can use redact tool to black out area', async ({ page }) => {
    await uploadPDF(page, 'demo1.pdf');

    await page.getByTitle('Toggle Edit Mode').click();
    await page.getByTitle('Annotate Document').click();

    // Select Redact Tool
    await page.getByTitle('Redact Tool').click();

    const overlay = page.getByTestId('annotation-svg');
    await expect(overlay).toBeVisible();

    const box = await overlay.boundingBox();
    if (!box) throw new Error('Overlay has no bounding box');

    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 });
    await page.mouse.up();

    // Verify black rectangle is rendered
    const rectLocator = overlay.locator('rect[fill="#000000"]');
    await expect(rectLocator).toBeVisible();

    // Click Save
    await page.getByText('File').click();
    await page.getByText('Save Document').click();
    await page.getByRole('button', { name: /Flatten Document/i }).click();
  });

});
