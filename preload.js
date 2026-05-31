const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectImages: () => ipcRenderer.invoke('select-images'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  saveCode: (code, filename) => ipcRenderer.invoke('save-code', code, filename),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  readImageBase64: (filePath) => ipcRenderer.invoke('read-image-base64', filePath),
});
