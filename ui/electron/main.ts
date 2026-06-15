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
app.setAppUserModelId('com.vaultos.lumvalepdf');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'LumvalePDF',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0b0f19',
      symbolColor: '#f8fafc',
    },
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

  // Setup auto-updater
  autoUpdater.checkForUpdatesAndNotify();

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
    if (mainWindow) {
      if (theme === 'dark') {
        mainWindow.setTitleBarOverlay({ color: '#0b0f19', symbolColor: '#f8fafc' });
      } else {
        mainWindow.setTitleBarOverlay({ color: '#FBFAF6', symbolColor: '#15110B' });
      }
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
