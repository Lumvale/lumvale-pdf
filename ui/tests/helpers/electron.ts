import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** ui/ — where package.json `main` points at dist-electron/main.js. */
const UI_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Launch the built desktop app (electron main = dist-electron/main.js, loading
 * dist/index.html). Requires `npm run build` first so both exist.
 */
export async function launchApp(): Promise<{ app: ElectronApplication; window: Page }> {
  const app = await electron.launch({
    cwd: UI_ROOT,
    args: ['.'],
    // Ensure the main process takes the production branch (loadFile dist/index.html)
    // rather than looking for a Vite dev server.
    env: { ...process.env, NODE_ENV: 'production', VITE_DEV_SERVER_URL: '' },
  });
  // macOS CI runners are slow to show the first window and load file:// content,
  // so use generous timeouts rather than the 30s defaults.
  const window = await app.firstWindow({ timeout: 60_000 });
  await window.waitForLoadState('domcontentloaded', { timeout: 60_000 });
  return { app, window };
}
