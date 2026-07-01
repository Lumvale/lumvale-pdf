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
});
