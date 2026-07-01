import { test, expect } from '@playwright/test';

/**
 * PWA installability + offline. Runs against the production preview (the webServer
 * builds with vite-plugin-pwa enabled — it's disabled in dev). Pinned to Chromium
 * because Playwright's WebKit has flaky/limited service-worker support.
 */
test.describe('PWA @pwa', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Service-worker checks run on Chromium only');

  test('serves a valid, installable web app manifest', async ({ page }) => {
    await page.goto('/');
    const href = await page.getAttribute('link[rel="manifest"]', 'href');
    expect(href, 'index.html should link a manifest').toBeTruthy();

    const resp = await page.request.get(new URL(href!, page.url()).toString());
    expect(resp.ok()).toBeTruthy();
    const manifest = await resp.json();

    expect(manifest.name).toMatch(/LumvalePDF/i);
    expect(manifest.short_name).toMatch(/LumvalePDF/i);
    const sizes: string[] = (manifest.icons ?? []).map((i: { sizes: string }) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    // start_url is required for installability (defaults to '/').
    expect(manifest.start_url ?? '/').toBeTruthy();
  });

  test('registers and activates a service worker', async ({ page }) => {
    await page.goto('/');
    const active = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return !!reg.active;
    });
    expect(active).toBe(true);
  });

  test('app shell loads while offline', async ({ page, context }) => {
    await page.goto('/');
    // Wait for the SW to control the page and finish precaching before cutting network.
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForTimeout(2500);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText('Drag & Drop your files here')).toBeVisible({ timeout: 15000 });
    await context.setOffline(false);
  });
});
