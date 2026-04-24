const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  finishSelection: (rect) => ipcRenderer.send('selection-done', rect),
  cancelSelection: () => ipcRenderer.send('selection-cancel'),
  getFrozenCapture: () => ipcRenderer.invoke('get-frozen-capture'),
})
