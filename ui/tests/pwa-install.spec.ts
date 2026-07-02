import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { openFile } from './helpers/save';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * PWA install prompt (Phase 8, I1). Chromium only fires `beforeinstallprompt`
 * under real installability heuristics, so we dispatch a synthetic event and
 * assert the app's response: the Install App button appears in the top bar and
 * opens the install modal wired to prompt().
 */
test.describe('PWA install prompt @chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'beforeinstallprompt is Chromium-only');

  test('Install App appears after beforeinstallprompt and opens the modal', async ({ page }) => {
    await openFile(page, path.join(FIXTURES, 'demo1.pdf'));

    // No prompt captured yet → no button.
    await expect(page.getByText('Install App')).toHaveCount(0);

    await page.evaluate(() => {
      const e = new Event('beforeinstallprompt') as Event & {
        prompt?: () => Promise<void>;
        userChoice?: Promise<{ outcome: string; platform: string }>;
        platforms?: string[];
      };
      e.prompt = async () => {};
      e.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });
      e.platforms = ['web'];
      window.dispatchEvent(e);
    });

    const installBtn = page.getByText('Install App');
    await expect(installBtn).toBeVisible();
    await installBtn.click();
    await expect(page.getByRole('heading', { name: 'Install LumvalePDF' })).toBeVisible();
  });
});
