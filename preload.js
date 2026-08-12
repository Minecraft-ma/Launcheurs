const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcherApi', {
  installMods: () => ipcRenderer.invoke('installMods'),
  downloadModsFromManifest: (manifestUrl) => ipcRenderer.invoke('downloadModsFromManifest', manifestUrl),
  checkForUpdates: () => ipcRenderer.invoke('checkForUpdates'),
  getUpdateConfig: () => ipcRenderer.invoke('getUpdateConfig'),
  setUpdateConfig: (config) => ipcRenderer.invoke('setUpdateConfig', config),
  getAppVersion: () => ipcRenderer.invoke('getAppVersion'),
  getBackgroundImages: () => ipcRenderer.invoke('getBackgroundImages'),
  getServerLogo: () => ipcRenderer.invoke('getServerLogo'),
  launchMinecraft: (settings) => ipcRenderer.invoke('launchMinecraft', settings),
  onDebug: (callback) => ipcRenderer.on('launcher-debug', (_, message) => callback(message)),
  onData: (callback) => ipcRenderer.on('launcher-data', (_, message) => callback(message)),
  onProgress: (callback) => ipcRenderer.on('launcher-progress', (_, progress) => callback(progress)),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, info) => callback(info)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (_, info) => callback(info)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_, info) => callback(info)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (_, info) => callback(info)),
  // window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowUnmaximize: () => ipcRenderer.send('window-unmaximize'),
  windowToggleMaximize: () => ipcRenderer.send('window-toggle-maximize'),
  windowClose: () => ipcRenderer.send('window-close')
});
