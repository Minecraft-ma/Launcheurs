const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // Window controls
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    unmaximize: () => ipcRenderer.send('window-unmaximize'),
    toggleMaximize: () => ipcRenderer.send('window-toggle-maximize'),
    close: () => ipcRenderer.send('window-close'),
    
    // Minecraft launch
    launchMinecraft: (settings) => ipcRenderer.invoke('launchMinecraft', settings),
    
    // Mods management
    downloadModsFromManifest: (manifestUrl) => ipcRenderer.invoke('downloadModsFromManifest', manifestUrl),
    
    // Progress and debug messages
    onProgress: (callback) => ipcRenderer.on('launcher-progress', (event, data) => callback(data)),
    onDebug: (callback) => ipcRenderer.on('launcher-debug', (event, data) => callback(data)),
    onData: (callback) => ipcRenderer.on('launcher-data', (event, data) => callback(data))
});

contextBridge.exposeInMainWorld('LauncherAPI', {
    // Microsoft Auth
    msft_open_login: (successCallback, closeCallback) => ipcRenderer.send('msft_open_login', successCallback, closeCallback),
    msft_reply_login: (callback) => ipcRenderer.on('msft_reply_login', callback),
    
    // Distribution
    getDistributionIndex: () => ipcRenderer.invoke('getDistributionIndex'),
    
    // Mods
    installMods: () => ipcRenderer.invoke('installMods'),
    getModsList: () => ipcRenderer.invoke('getModsList'),
    
    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});