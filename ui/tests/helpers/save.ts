import { expect, type Page } from '@playwright/test';
import path from 'path';

/**
 * Save/round-trip helpers. `executeSaveAs` prefers the File System Access API
 * (showSaveFilePicker), which a headless browser can't drive, so
 * `forceDownloadPath` deletes it to take the `<a download>` fallback that
 * Playwright can capture.
 */
export type SaveMode = 'Flatten Document' | 'Native Annotations (Recommended)';

/** Call before navigation so the app takes the capturable download path. */
export async function forceDownloadPath(page: Page) {
  await page.addInitScript(() => {
    try {
      delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker;
    } catch {
      /* ignore */
    }
  });
}

/** File → Save As → <mode>; returns the downloaded file path. */
export async function saveAs(page: Page, mode: SaveMode): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByText('File', { exact: true }).click();
  await page.getByText('Save As...').click();
  await page.getByText(mode).click();
  const download = await downloadPromise;
  const p = await download.path();
  expect(p, 'save produced a downloadable file').toBeTruthy();
  return p!;
}

/** Open a file (path) from the landing screen and wait for it to render. */
export async function openFile(page: Page, filePath: string) {
  await page.goto('/');
  const fc = page.waitForEvent('filechooser');
  await page.getByText('browse files').click();
  (await fc).setFiles(filePath);
  await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 15000 });
}

/** Upload a fixture by name and enter edit mode. */
export async function openInEditMode(page: Page, fixturesDir: string, fixture: string) {
  await openFile(page, path.join(fixturesDir, fixture));
  await page.getByTitle('Toggle Edit Mode').click();
  await expect(page.getByText('Edit Mode Active')).toBeVisible();
}
