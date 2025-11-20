const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('backup', {
  export: () => ipcRenderer.invoke('backup:export')
});
