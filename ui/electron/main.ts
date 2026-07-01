import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import started from 'electron-squirrel-startup';
import electronUpdaterPkg from 'electron-updater';
const { autoUpdater } = electronUpdaterPkg;

if (started) {
  app.quit();
}

app.setName('LumvalePDF');
app.setAppUserModelId('com.lumvale.pdf');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

// The Window Controls Overlay (titleBarOverlay / setTitleBarOverlay) is a
// Windows + Linux feature; on macOS the setter throws ("@platform win32,linux").
const SUPPORTS_TITLE_BAR_OVERLAY = process.platform !== 'darwin';

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'LumvalePDF',
    titleBarStyle: 'hidden',
    ...(SUPPORTS_TITLE_BAR_OVERLAY
      ? { titleBarOverlay: { color: '#0b0f19', symbolColor: '#f8fafc' } }
      : {}),
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../public/pwa-512x512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.maximize();

  // Check if Vite is running in development
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // mainWindow.webContents.openDevTools(); // Disabled per user request
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

app.whenReady().then(() => {
  createWindow();

  // Startup auto-update check. Only run it in a real installed (packaged) build:
  // when unpackaged (dev, and the Playwright e2e harness that launches `electron .`)
  // electron-updater's macOS path does main-process network/IO work that can block
  // lifecycle delivery and leave the first window stuck before `domcontentloaded`,
  // which is exactly what wedged the packaged-app launch on GitHub macOS runners.
  // The on-demand `app:checkForUpdates` IPC handler below is unaffected and stays
  // available to the renderer's "Check for Updates" menu in every build.
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  ipcMain.handle('app:checkForUpdates', async () => {
    try {
      const result = await autoUpdater.checkForUpdatesAndNotify();
      return result !== null;
    } catch (err) {
      console.error('Update check failed', err);
      return false;
    }
  });

  ipcMain.on('app:setTheme', (event, theme) => {
    // macOS has no Window Controls Overlay: calling setTitleBarOverlay there
    // throws in the main process. The renderer fires this on first paint (via
    // initializeTheme), so the unguarded call wedged the whole app on macOS —
    // the window loaded but React never rendered and app.close() then hung.
    if (!mainWindow || !SUPPORTS_TITLE_BAR_OVERLAY) {
      return;
    }
    if (theme === 'dark') {
      mainWindow.setTitleBarOverlay({ color: '#0b0f19', symbolColor: '#f8fafc' });
    } else {
      mainWindow.setTitleBarOverlay({ color: '#FBFAF6', symbolColor: '#15110B' });
    }
  });

  ipcMain.on('app:quit', () => {
    app.quit();
  });

  autoUpdater.on('update-available', () => {
    console.log('Update available.');
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded. It will be installed on restart.');
    // Optionally prompt the user here or call autoUpdater.quitAndInstall()
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Standard macOS apps stay resident when the last window closes. Under the e2e
  // harness we must override that: Playwright's `app.close()` closes the window and
  // then waits for the process to exit, so keeping it resident on darwin hangs
  // worker teardown for the full 90s timeout. E2E_TEST is set by the launch helper.
  if (process.platform !== 'darwin' || process.env.E2E_TEST) {
    app.quit();
  }
});
