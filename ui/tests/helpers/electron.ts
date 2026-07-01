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
    // `--disable-gpu` forces software rendering: GitHub's headless macOS runners
    // have no usable GPU, and Chromium's compositor can otherwise stall so the
    // first window never reaches `domcontentloaded`. `--no-sandbox` avoids the
    // sandbox-helper handshake that also flakes on CI runners.
    args: ['.', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
    env: {
      ...process.env,
      // Ensure the main process takes the production branch (loadFile
      // dist/index.html) rather than looking for a Vite dev server.
      NODE_ENV: 'production',
      VITE_DEV_SERVER_URL: '',
      // Signals main.ts to skip the startup auto-updater and to actually quit on
      // window-all-closed (so `app.close()` teardown doesn't hang on macOS).
      E2E_TEST: '1',
    },
  });
  // macOS CI runners are slow to show the first window and load file:// content,
  // so use generous timeouts rather than the 30s defaults.
  const window = await app.firstWindow({ timeout: 60_000 });
  // Wait on the renderer's own readyState rather than only the load-state event.
  // When the main process is briefly busy at startup the `domcontentloaded`
  // lifecycle event can be delivered before Playwright attaches and then be
  // missed, leaving `waitForLoadState` hanging even though the document loaded
  // (the failing runs logged "networkidle fired" while still timing out here).
  // Polling readyState is level-triggered and immune to that race.
  await window.waitForFunction(
    () => document.readyState === 'interactive' || document.readyState === 'complete',
    undefined,
    { timeout: 60_000 }
  );
  return { app, window };
}
