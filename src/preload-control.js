const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  triggerWalker: (percent) => ipcRenderer.invoke('trigger-walker', percent),
  setMaxTokens: (max) => ipcRenderer.invoke('set-max-tokens', max),
  resetUsage: () => ipcRenderer.invoke('reset-usage'),
  getState: () => ipcRenderer.invoke('get-usage-state'),
  onStateUpdate: (cb) => ipcRenderer.on('usage-state-updated', (_e, state) => cb(state)),
});
