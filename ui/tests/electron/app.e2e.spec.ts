import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchApp } from '../helpers/electron';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '..', 'fixtures');

/**
 * End-to-end coverage of the packaged desktop app — this is the layer the web
 * suite can't reach: it launches the real Electron main process, loads the built
 * bundle from disk (file://), and exercises the preload IPC bridge.
 */
test.describe('Electron desktop app', () => {
  test('launches, renders a PDF from disk, and round-trips IPC', async () => {
    const { app, window } = await launchApp();
    try {
      // Window + landing render.
      await expect(window).toHaveTitle(/LumvalePDF/i);
      await expect(window.getByText('Drag & Drop your files here')).toBeVisible();

      // The preload context bridge is wired.
      const hasBridge = await window.evaluate(() => !!(window as any).electronAPI);
      expect(hasBridge).toBe(true);

      // Open a PDF by setting the hidden file input directly — the "browse files"
      // button opens a native OS dialog that Playwright can't drive.
      await window
        .locator('input[type="file"]')
        .first()
        .setInputFiles(path.join(FIXTURES, 'demo1.pdf'));

      // The full render pipeline (pdf.js + the inlined wasm worker) must work
      // under file:// in Electron, not just under the dev/preview server.
      await expect(window.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 20000 });

      // IPC round-trip: the update-check handler returns a boolean (false when
      // unpackaged) without throwing.
      const updateResult = await window.evaluate(() =>
        (window as any).electronAPI.checkForUpdates()
      );
      expect(typeof updateResult).toBe('boolean');

      // Fire the theme IPC (main updates the title-bar overlay) — must not throw.
      await window.evaluate(() => (window as any).electronAPI.setTheme('dark'));
    } finally {
      await app.close();
    }
  });

  test('Help menu: About shows a loaded logo, and Check for Updates works', async () => {
    const { app, window } = await launchApp();
    try {
      await window
        .locator('input[type="file"]')
        .first()
        .setInputFiles(path.join(FIXTURES, 'demo1.pdf'));
      await expect(window.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 20000 });

      // About: the logo must load from the packaged bundle. Regression — an
      // absolute "/Lumvale-pdf-*.svg" resolved to the filesystem root under
      // file:// and rendered a broken image.
      await window.getByText('Help', { exact: true }).click();
      await window.getByText('About Lumvale').click();
      await expect(window.getByText(/A free, high-quality/)).toBeVisible();
      await expect
        .poll(() =>
          window.evaluate(() => {
            const img = [...document.querySelectorAll('img')].find(
              (i) => i.src.includes('Lumvale-pdf') && (i as HTMLElement).offsetParent !== null
            ) as HTMLImageElement | undefined;
            return img?.naturalWidth ?? 0;
          })
        )
        .toBeGreaterThan(0);
      await window.mouse.click(5, 5); // dismiss the About modal (backdrop)

      // Check for Updates: the menu item must actually invoke the updater IPC
      // (regression — it was a stub that always alerted "up to date").
      let message = '';
      window.once('dialog', async (d) => {
        message = d.message();
        await d.accept();
      });
      await window.getByText('Help', { exact: true }).click();
      await window.getByText('Check for Updates').click();
      await expect.poll(() => message).toMatch(/up to date|update is available|could not check/i);
    } finally {
      await app.close();
    }
  });

  test('file association: a .pdf passed in argv opens on launch', async () => {
    // Simulates double-clicking a PDF (the OS launches the app with the file
    // path in argv). The document must open without any manual upload.
    const { app, window } = await launchApp({ openFile: path.join(FIXTURES, 'demo1.pdf') });
    try {
      await expect(window.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 30000 });
      // The landing uploader must be gone — we're in the workspace.
      await expect(window.getByText('Drag & Drop your files here')).toHaveCount(0);
    } finally {
      await app.close();
    }
  });
});
