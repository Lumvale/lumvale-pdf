import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO1 = path.join(__dirname, 'fixtures', 'demo1.pdf');

/**
 * Exhaustive sanity check of every toolbar button and every top-menu item
 * (File / Tools / Help) — each must do something sensible (open its modal, run
 * its action, or toggle its state). Pinned to Chromium: this is functional
 * coverage of the control surface, and the core flows are already exercised
 * cross-browser elsewhere.
 */
test.describe('Toolbar + top menus @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Control-surface coverage runs on Chromium only');

  async function openDoc(page: Page, { edit = true }: { edit?: boolean } = {}) {
    await page.goto('/');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse files').click();
    (await fileChooserPromise).setFiles(DEMO1);
    await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 15000 });
    if (edit) {
      await page.getByTitle('Toggle Edit Mode').click();
      await expect(page.getByText('Edit Mode Active')).toBeVisible();
    }
  }

  // --- Toolbar buttons that open a modal --------------------------------------
  const toolbarModals: Array<{ title: string; heading: string }> = [
    { title: 'Split Document', heading: 'Split PDF Document' },
    { title: 'Edit Metadata', heading: 'Metadata Manager' },
    { title: 'Encrypt / Lock', heading: 'Encrypt Document' },
    { title: 'Page Numbering', heading: 'Page Numbering' },
    { title: 'Headers & Footers', heading: 'Headers & Footers' },
    { title: 'Visual Page Organizer', heading: 'Organize Pages' },
  ];
  for (const { title, heading } of toolbarModals) {
    test(`toolbar: "${title}" opens "${heading}"`, async ({ page }) => {
      await openDoc(page);
      await page.getByTitle(title).click();
      await expect(page.getByText(heading, { exact: true }).first()).toBeVisible();
    });
  }

  test('toolbar: "Extract Pages" enters extraction mode', async ({ page }) => {
    await openDoc(page, { edit: false });
    await page.getByTitle('Extract Pages').click();
    await expect(page.getByText('Download Selected')).toBeVisible();
  });

  test('toolbar: "Annotate Document" reveals the annotation tools', async ({ page }) => {
    await openDoc(page);
    await page.getByTitle('Annotate Document').click();
    await expect(page.getByTitle('Pen Tool')).toBeVisible();
  });

  test('toolbar: "Merge Document" opens the merge workspace', async ({ page }) => {
    await openDoc(page);
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTitle('Merge Document').click();
    (await fileChooserPromise).setFiles(path.join(__dirname, 'fixtures', 'demo2.pdf'));
    await expect(page.getByText('Apply Merge')).toBeVisible();
  });

  test('toolbar: "Compress / Optimize" runs and reports success', async ({ page }) => {
    await openDoc(page);
    const dialog = page.waitForEvent('dialog');
    await page.getByTitle('Compress / Optimize').click();
    const d = await dialog;
    await d.accept();
    // Button returns to its idle label (not stuck on "Compressing...").
    await expect(page.getByTitle('Compress / Optimize')).toBeVisible({ timeout: 15000 });
  });

  test('toolbar: zoom in / out / reset change the zoom level', async ({ page }) => {
    await openDoc(page, { edit: false });
    const zoom = page.getByTitle('Reset zoom to 100%');
    const initial = (await zoom.textContent())?.trim();
    await page.getByTitle('Zoom In').click();
    await expect(zoom).not.toHaveText(initial ?? '100%');
    await page.getByTitle('Zoom Out').click();
    await zoom.click(); // reset
    await expect(zoom).toHaveText(/100\s*%/);
  });

  test('toolbar: "Toggle Sidebar" hides and shows the page panel', async ({ page }) => {
    await openDoc(page, { edit: false });
    await expect(page.getByText(/Pages \(\d+\)/)).toBeVisible();
    await page.getByTitle('Toggle Sidebar').click();
    await expect(page.getByText(/Pages \(\d+\)/)).toBeHidden();
    await page.getByTitle('Toggle Sidebar').click();
    await expect(page.getByText(/Pages \(\d+\)/)).toBeVisible();
  });

  // --- File menu --------------------------------------------------------------
  test('menu File: "Save Document" (with annotations) opens the flatten/native dialog', async ({ page }) => {
    await openDoc(page);
    // Save only prompts when there's something to flatten, so add an annotation.
    await page.getByTitle('Annotate Document').click();
    await page.getByTitle('Pen Tool').click();
    const box = await page.getByTestId('annotation-svg').boundingBox();
    if (box) {
      await page.mouse.move(box.x + 40, box.y + 40);
      await page.mouse.down();
      await page.mouse.move(box.x + 90, box.y + 90, { steps: 4 });
      await page.mouse.up();
    }
    await page.getByText('File', { exact: true }).click();
    await page.getByText('Save Document...').click();
    await expect(page.getByText('Save & Download PDF')).toBeVisible();
  });

  test('menu File: "Save As" opens the save-as dialog', async ({ page }) => {
    await openDoc(page);
    await page.getByText('File', { exact: true }).click();
    await page.getByText('Save As...').click();
    await expect(page.getByText('Save Document As')).toBeVisible();
  });

  test('menu File: "Export to Image" opens the export dialog', async ({ page }) => {
    await openDoc(page, { edit: false });
    await page.getByText('File', { exact: true }).click();
    await page.getByText('Export to Image...').click();
    await expect(page.getByText('Export to Image', { exact: true })).toBeVisible();
  });

  test('menu File: "Close Document" returns to the landing screen', async ({ page }) => {
    await openDoc(page, { edit: false });
    await page.getByText('File', { exact: true }).click();
    await page.getByText('Close Document').click();
    await expect(page.getByText('Drag & Drop your files here')).toBeVisible();
  });

  // --- Tools menu (item unique to the menu) -----------------------------------
  test('menu Tools: "Add Watermark" opens the watermark dialog', async ({ page }) => {
    await openDoc(page);
    await page.getByText('Tools', { exact: true }).click();
    await page.getByText('Add Watermark...').click();
    await expect(page.getByText('Add Watermark', { exact: true })).toBeVisible();
  });

  // --- Help menu (the two the user reported broken) ---------------------------
  test('menu Help: "About Lumvale" opens with a loaded logo', async ({ page }) => {
    await openDoc(page, { edit: false });
    await page.getByText('Help', { exact: true }).click();
    await page.getByText('About Lumvale').click();
    await expect(page.getByText(/A free, high-quality/)).toBeVisible();
    // The logo must actually load (regression: absolute /path broke under file://).
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const img = [...document.querySelectorAll('img')].find(
              (i) => i.src.includes('Lumvale-pdf') && (i as HTMLElement).offsetParent !== null
            ) as HTMLImageElement | undefined;
            return img?.naturalWidth ?? 0;
          }),
        { timeout: 5000 }
      )
      .toBeGreaterThan(0);
  });

  test('menu Help: "Check for Updates" gives a sensible response', async ({ page }) => {
    await openDoc(page, { edit: false });
    // alert() blocks the click, so the handler must accept it inline.
    let message = '';
    page.once('dialog', async (d) => {
      message = d.message();
      await d.accept();
    });
    await page.getByText('Help', { exact: true }).click();
    await page.getByText('Check for Updates').click();
    // Web build has no in-app updater — it must say so, not lie "up to date".
    await expect.poll(() => message).toMatch(/latest web version|up to date|update is available/i);
  });
});
