const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayApi', {
  onSpawnWalker: (cb) => ipcRenderer.on('spawn-walker', (_e, payload) => cb(payload)),
});
