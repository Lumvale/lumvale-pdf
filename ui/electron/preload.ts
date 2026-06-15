import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  setTheme: (theme: string) => ipcRenderer.send('app:setTheme', theme),
  quitApp: () => ipcRenderer.send('app:quit')
});
