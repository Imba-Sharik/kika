const { contextBridge, ipcRenderer } = require('electron')

function listener(channel) {
  return (callback) => {
    const handler = () => callback()
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  setCompact: (compact) => ipcRenderer.send('set-compact', compact),
  pasteText: (text) => ipcRenderer.send('paste-text', text),
  moveWindowBy: (dx, dy) => ipcRenderer.send('move-window-by', dx, dy),
  openMemoryFolder: () => ipcRenderer.send('open-memory-folder'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  copyImageToClipboard: (dataUrl) => ipcRenderer.send('copy-image-to-clipboard', dataUrl),
  simulatePaste: () => ipcRenderer.send('simulate-paste'),
  readMemoryFile: (relPath) => ipcRenderer.invoke('read-memory-file', relPath),
  writeMemoryFile: (relPath, content) => ipcRenderer.invoke('write-memory-file', relPath, content),
  appendMemoryFile: (relPath, text) => ipcRenderer.invoke('append-memory-file', relPath, text),
  listMemoryFiles: (relDir) => ipcRenderer.invoke('list-memory-files', relDir),
  onDictationStart: listener('dictation-start'),
  onDictationStop: listener('dictation-stop'),
  onMusicStart: listener('music-start'),
  onMusicStop: listener('music-stop'),
  onMicToggle: listener('mic-toggle'),
  getDesktopAudioSource: () => ipcRenderer.invoke('get-desktop-audio-source'),
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  captureRegion: () => ipcRenderer.invoke('capture-region'),
})
