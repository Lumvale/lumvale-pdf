import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * End-to-end regression coverage for the @lumvale/pdf-browser document
 * converters (convertWordToPDF / convertMarkdownToPDF). These exercise the
 * rasterise-once-then-slice pipeline (the `pageOffsets` strip math) through the
 * real upload flow in headless Chromium.
 *
 * Scope note: the original bug was *content distortion* (vertical squish / chop)
 * inside correctly-sized A4 pages — that is not observable from a rendered
 * raster's aspect ratio, and is locked instead by the pageOffsets unit test plus
 * the proportional-draw code change. What these tests guard is the integration
 * behaviour the old per-element pagination could break: conversion succeeds and
 * yields a valid, multi-page, renderable PDF whose pages are true portrait A4.
 */

async function uploadAndConvert(page: import('@playwright/test').Page, fixture: string) {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('browse files', { exact: false }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, 'fixtures', fixture));
}

/**
 * Reads `#pdf-page-1`'s canvas dimensions, polling until pdf.js has actually
 * rendered into it. An un-rendered HTML canvas reports its 300×150 default
 * (ratio 0.5), so we wait for a real backing store before measuring.
 */
async function renderedCanvasDims(page: import('@playwright/test').Page) {
  const canvas = page.locator('#pdf-page-1 canvas').first();
  await expect(canvas).toBeVisible({ timeout: 60000 });
  let dims = { w: 0, h: 0 };
  await expect(async () => {
    dims = await canvas.evaluate((c: HTMLCanvasElement) => ({ w: c.width, h: c.height }));
    // Anything past the 300×150 default means pdf.js has sized & drawn the page.
    expect(dims.w).toBeGreaterThan(400);
  }).toPass({ timeout: 60000 });
  return dims;
}

test.describe('Document conversion (docx / markdown → PDF)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    page.on('dialog', dialog => dialog.dismiss());
  });

  test('Markdown converts to a valid multi-page PDF and renders', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/');

    await uploadAndConvert(page, 'test.md');

    // The converted PDF must render with a real (not default) canvas.
    const dims = await renderedCanvasDims(page);
    expect(dims.h).toBeGreaterThan(0);

    // The fixture is several A4 pages long; the slice pipeline must emit > 1 page
    // (the old path that chopped content could collapse this).
    await expect(page.locator('#pdf-page-2')).toBeAttached();
  });

  test('Word (.docx) converts to a valid PDF and renders', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/');

    await uploadAndConvert(page, 'test.docx');

    const dims = await renderedCanvasDims(page);
    expect(dims.h).toBeGreaterThan(0);
  });

  test('converted PDF pages use a portrait A4 aspect ratio', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/');

    await uploadAndConvert(page, 'test.md');

    // The PDF page itself must stay portrait A4 (height/width ≈ 1.414). This does
    // not prove the *content* is undistorted, but it catches a regression that
    // emitted landscape or wrongly-proportioned pages.
    const dims = await renderedCanvasDims(page);
    const ratio = dims.h / dims.w;
    expect(ratio).toBeGreaterThan(1.3);
    expect(ratio).toBeLessThan(1.55);
  });
});
