import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('Page Numbering: UI remains responsive and scrollable after apply', async ({ page, browserName }) => {
  // Responsiveness/perf regression on the 80-page heavy fixture — pinned to the
  // reference engine (Chromium) to keep it deterministic under parallel runs.
  test.skip(browserName !== 'chromium', 'Render-perf stress test runs on Chromium only');
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', err => { errors.push(err.message); console.log('BROWSER ERROR:', err.message); });
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER CONSOLE ERROR:', msg.text());
    else console.log('BROWSER CONSOLE:', msg.text());
  });
  page.on('dialog', dialog => dialog.dismiss());

  await page.goto('/');

  // Load the user document
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('browse files').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'demo-heavy.pdf'));

  // Wait for the first page to render
  await expect(page.locator('#pdf-page-1 canvas')).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(2000);

  // Verify we can scroll BEFORE applying (baseline check)
  const scrollContainer = page.locator('#main-scroll-container');
  const scrollTopBefore = await scrollContainer.evaluate(el => el.scrollTop);
  await scrollContainer.evaluate(el => el.scrollTo({ top: 300, behavior: 'instant' }));
  await page.waitForTimeout(200);
  const scrollTopAfterScroll = await scrollContainer.evaluate(el => el.scrollTop);
  expect(scrollTopAfterScroll).toBeGreaterThan(scrollTopBefore);
  console.log(`BASELINE: Scroll works. scrollTop went from ${scrollTopBefore} to ${scrollTopAfterScroll}`);

  // Scroll back to top
  await scrollContainer.evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(200);

  // Enable Edit Mode
  await page.getByTitle('Toggle Edit Mode').click();
  await expect(page.getByText('Edit Mode Active')).toBeVisible();
  await page.waitForTimeout(500);

  // Open the Page Numbering modal
  await page.getByTitle('Page Numbering').click();
  await expect(page.getByText('Page Numbering', { exact: true })).toBeVisible({ timeout: 5000 });

  // Capture canvas BEFORE applying
  const canvasLocator = page.locator('#pdf-page-1 canvas');
  const beforeData = await canvasLocator.evaluate((c: HTMLCanvasElement) => c.toDataURL());

  // Click Apply
  console.log('CLICKING APPLY...');
  const applyStart = Date.now();
  await page.getByRole('button', { name: 'Apply' }).click();

  // Wait for modal to close
  await expect(page.getByText('Page Numbering', { exact: true })).not.toBeVisible({ timeout: 60000 });
  const modalCloseTime = Date.now() - applyStart;
  console.log(`MODAL CLOSED after ${modalCloseTime}ms`);

  // Wait a bit for the document update to propagate
  await page.waitForTimeout(3000);

  // ---- THE CRITICAL TEST: Is scrolling still working? ----
  const scrollTopAfterApply = await scrollContainer.evaluate(el => el.scrollTop);
  console.log(`SCROLL TOP AFTER APPLY: ${scrollTopAfterApply}`);

  // Try to scroll down using wheel events (simulates real user scrolling)
  await scrollContainer.evaluate(el => el.scrollTo({ top: 500, behavior: 'instant' }));
  await page.waitForTimeout(500);
  const scrollTopAfterScrollAttempt = await scrollContainer.evaluate(el => el.scrollTop);
  console.log(`SCROLL TOP AFTER SCROLL ATTEMPT: ${scrollTopAfterScrollAttempt}`);

  // This is the key assertion: can we actually scroll?
  expect(scrollTopAfterScrollAttempt).toBeGreaterThan(0);

  // Also try mouse wheel scrolling
  await scrollContainer.evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(200);
  await page.mouse.move(600, 400); // Move mouse to center of scroll area
  await page.mouse.wheel(0, 500); // Scroll down
  await page.waitForTimeout(500);
  const scrollTopAfterWheel = await scrollContainer.evaluate(el => el.scrollTop);
  console.log(`SCROLL TOP AFTER WHEEL: ${scrollTopAfterWheel}`);
  expect(scrollTopAfterWheel).toBeGreaterThan(0);

  // ---- TEST: Are page numbers visible? ----
  // Wait for the canvas to re-render with page numbers
  await expect(async () => {
    const afterData = await canvasLocator.evaluate((c: HTMLCanvasElement) => c.toDataURL());
    expect(afterData).not.toEqual(beforeData);
  }).toPass({ timeout: 30000 });
  console.log('PAGE NUMBERS VERIFIED: Canvas data changed');

  // ---- TEST: Can we scroll to see other pages? ----
  await scrollContainer.evaluate(el => el.scrollTo({ top: 2000, behavior: 'instant' }));
  await page.waitForTimeout(1000);
  const scrollTopFar = await scrollContainer.evaluate(el => el.scrollTop);
  console.log(`SCROLL TO FAR: ${scrollTopFar}`);
  expect(scrollTopFar).toBeGreaterThan(1000);

  // ---- TEST: No JS errors ----
  expect(errors.filter(e => !e.includes('TT: undefined function'))).toHaveLength(0);
});
