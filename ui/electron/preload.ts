import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  setTheme: (theme: string) => ipcRenderer.send('app:setTheme', theme),
  quitApp: () => ipcRenderer.send('app:quit'),
  /**
   * File-association delivery: the main process pushes the bytes of a PDF the
   * OS asked us to open (argv on Windows/Linux, open-file on macOS). Returns an
   * unsubscribe function. The renderer signals readiness via appReady() so the
   * main process knows when it can deliver a pending startup file.
   */
  onOpenFile: (callback: (file: { name: string; data: Uint8Array }) => void) => {
    const listener = (_event: unknown, file: { name: string; data: Uint8Array }) => callback(file);
    ipcRenderer.on('app:openFile', listener);
    return () => ipcRenderer.removeListener('app:openFile', listener);
  },
  appReady: () => ipcRenderer.send('app:rendererReady'),
});
