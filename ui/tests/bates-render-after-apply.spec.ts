import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HEAVY_PDF = path.join(__dirname, 'fixtures', 'demo-heavy.pdf');

// Reproduce the real-world conditions under which "apply page number" failed:
//  - a high-DPI display (deviceScaleFactor: 2) → 4x the canvas pixels to paint
//  - a slow CPU (throttled) → each pdf.js render takes real time
//  - an image-heavy, many-page document → lots of competing renders
//
// Under these conditions the previous implementation (a) starved the main
// viewer because the ~80 sidebar thumbnails shared one render queue and grabbed
// every slot, and (b) blanked already-rendered pages to white. The headless
// default-config tests never caught it because they run at deviceScaleFactor 1,
// only ever inspect page 1, and simply wait out any delay.
test.use({ deviceScaleFactor: 2, viewport: { width: 1400, height: 900 } });

async function pageHasContent(page: any, pageId: string): Promise<boolean> {
  return await page.evaluate((id: string) => {
    const c = document.querySelector(`#${id} canvas`) as HTMLCanvasElement | null;
    if (!c || !c.width || !c.height) return false;
    const ctx = c.getContext('2d');
    if (!ctx) return false;
    const d = ctx.getImageData(0, Math.floor(c.height / 2), c.width, 1).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] < 245 || d[i + 1] < 245 || d[i + 2] < 245) return true;
    }
    return false;
  }, pageId);
}

test('main viewer shows page numbers and keeps rendering after apply', async ({ page, browserName }) => {
  // This test emulates a throttled CPU via the Chrome DevTools Protocol, which
  // Playwright only exposes on Chromium.
  test.skip(browserName !== 'chromium', 'CDP CPU throttling is Chromium-only');
  test.setTimeout(180000);

  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await page.goto('/');
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('browse files').click();
  (await fileChooserPromise).setFiles(HEAVY_PDF);

  await expect(page.getByText('Pages (80)')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 30000 });
  // Let the first visible page finish its initial render.
  await expect.poll(() => pageHasContent(page, 'pdf-page-1'), { timeout: 30000 }).toBe(true);

  const before = await page.locator('#pdf-page-1 canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());

  await page.getByTitle('Toggle Edit Mode').click();
  await expect(page.getByText('Edit Mode Active')).toBeVisible();
  await page.getByTitle('Page Numbering').click();
  await expect(page.getByText('Page Numbering', { exact: true })).toBeVisible();

  const applyStart = Date.now();
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('Page Numbering', { exact: true })).not.toBeVisible({ timeout: 60000 });

  // 1) The page the user is looking at must update IN PLACE — it must not be
  //    torn down to the "Rendering Canvas..." placeholder while the new render
  //    is in flight. The old code called setHasRendered(false)/setLoading(true)
  //    on every re-render, so after an edit every visible page flipped to the
  //    loading placeholder (and, under load, stayed there a long time). The fix
  //    keeps the existing pixels and repaints over them. Poll the re-render
  //    window: the overlay must never appear on the already-rendered page.
  const page1Overlay = page.locator('#pdf-page-1').getByText('Rendering Canvas...');
  let overlaySamples = 0;
  const sampleDeadline = Date.now() + 8000;
  while (Date.now() < sampleDeadline) {
    if (await page1Overlay.count() > 0) overlaySamples++;
    await page.waitForTimeout(150);
  }
  console.log(`page 1 showed re-render placeholder on ${overlaySamples} samples`);
  expect(overlaySamples, 'visible page was torn down to a loading placeholder on re-render').toBe(0);

  // 2) ...and it must actually end up showing the number (not just the old pixels).
  await expect.poll(async () => {
    const now = await page.locator('#pdf-page-1 canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
    return now !== before;
  }, { timeout: 25000, message: 'main viewer never repainted page 1 with the number' }).toBe(true);
  console.log(`main viewer updated in ${Date.now() - applyStart}ms`);

  // 2) Pages the user scrolls to AFTER applying must still render — they must
  //    not be stuck blank/white because the render pipeline stalled.
  const sc = page.locator('#main-scroll-container');
  await sc.evaluate(el => el.scrollTo({ top: el.scrollHeight * 0.6, behavior: 'instant' }));

  await expect.poll(async () => {
    return await page.evaluate(() => {
      let painted = 0;
      document.querySelectorAll('[id^="pdf-page-"]').forEach((w) => {
        const r = (w as HTMLElement).getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return; // only in viewport
        const c = w.querySelector('canvas') as HTMLCanvasElement | null;
        if (!c || !c.width) return;
        const ctx = c.getContext('2d'); if (!ctx) return;
        const d = ctx.getImageData(0, Math.floor(c.height / 2), c.width, 1).data;
        for (let i = 0; i < d.length; i += 4) if (d[i] < 245 || d[i + 1] < 245 || d[i + 2] < 245) { painted++; break; }
      });
      return painted;
    });
  }, { timeout: 30000, message: 'pages scrolled to after apply stayed blank' }).toBeGreaterThan(0);
});
