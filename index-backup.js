// Requirements
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const autoUpdater = require('electron-updater').autoUpdater;
const fs = require('fs');
const path = require('path');
const semver = require('semver');
const { pathToFileURL } = require('url');

// Microsoft Auth Constants
const MSFT_OPCODE = {
    OPEN_LOGIN: 'msft_open_login',
    OPEN_LOGOUT: 'msft_open_logout',
    REPLY_LOGIN: 'msft_reply_login',
    REPLY_LOGOUT: 'msft_reply_logout'
};

const MSFT_REPLY_TYPE = {
    SUCCESS: 'success',
    ERROR: 'error'
};

const MSFT_ERROR = {
    ALREADY_OPEN: 'already_open',
    NOT_FINISHED: 'not_finished'
};

const AZURE_CLIENT_ID = '00000000-0000-0000-0000-000000000000'; // Replace with your Azure client ID

// Configuration des chemins
const DEFAULT_APP_ROOT = path.join(require('os').homedir(), 'AppData', 'Roaming', '.DominationWorld');
const DEFAULT_CACHE_DIR = path.join(DEFAULT_APP_ROOT, 'cache');

// Création des dossiers avec gestion d'erreur
async function ensureDirectory(dirPath) {
  try {
    await fs.promises.access(dirPath);
  } catch {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
}

// Initialisation synchrone pour le démarrage
if (!fs.existsSync(DEFAULT_APP_ROOT)) {
  fs.mkdirSync(DEFAULT_APP_ROOT, { recursive: true });
}
if (!fs.existsSync(DEFAULT_CACHE_DIR)) {
  fs.mkdirSync(DEFAULT_CACHE_DIR, { recursive: true });
}

app.setPath('userData', DEFAULT_APP_ROOT);
app.setPath('cache', DEFAULT_CACHE_DIR);
app.setAppUserModelId('fr.dominationworld.launcher');

// Optimisations GPU
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-vsync');
app.commandLine.appendSwitch('disable-background-timer-throttling');

// Logging structuré
const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`),
  error: (msg, err) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err || ''),
  debug: (msg) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`);
    }
  }
};

// Setup auto updater.
function initAutoUpdater(event, data) {
  if (data) {
    autoUpdater.allowPrerelease = true;
  } else {
    const preRelComp = semver.prerelease(app.getVersion());
    if (preRelComp != null && preRelComp.length > 0) {
      autoUpdater.allowPrerelease = true;
    }
  }

  if (process.env.NODE_ENV === 'development') {
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml');
  }
  if (process.platform === 'darwin') {
    autoUpdater.autoDownload = false;
  }
  autoUpdater.on('update-available', (info) => {
    event.sender.send('autoUpdateNotification', 'update-available', info);
  });
  autoUpdater.on('update-downloaded', (info) => {
    event.sender.send('autoUpdateNotification', 'update-downloaded', info);
  });
  autoUpdater.on('update-not-available', (info) => {
    event.sender.send('autoUpdateNotification', 'update-not-available', info);
  });
  autoUpdater.on('checking-for-update', () => {
    event.sender.send('autoUpdateNotification', 'checking-for-update');
  });
  autoUpdater.on('error', (err) => {
    event.sender.send('autoUpdateNotification', 'realerror', err);
  });
}

// Shell operations
const SHELL_OPCODE = {
  TRASH_ITEM: 'shell_trash_item'
};

// Open channel to listen for update actions.
ipcMain.on('autoUpdateAction', (event, arg, data) => {
  switch (arg) {
    case 'initAutoUpdater':
      logger.info('Initializing auto updater.');
      initAutoUpdater(event, data);
      event.sender.send('autoUpdateNotification', 'ready');
      break;
    case 'checkForUpdate':
      autoUpdater.checkForUpdates()
        .catch(err => {
          event.sender.send('autoUpdateNotification', 'realerror', err);
        });
      break;
    case 'allowPrereleaseChange':
      if (!data) {
        const preRelComp = semver.prerelease(app.getVersion());
        if (preRelComp != null && preRelComp.length > 0) {
          autoUpdater.allowPrerelease = true;
        } else {
          autoUpdater.allowPrerelease = data;
        }
      } else {
        autoUpdater.allowPrerelease = data;
      }
      break;
    case 'installUpdateNow':
      autoUpdater.quitAndInstall();
      break;
    default:
      logger.warn('Unknown argument', arg);
      break;
  }
});

// Redirect distribution index event from preloader to renderer.
ipcMain.on('distributionIndexDone', (event, res) => {
  event.sender.send('distributionIndexDone', res);
});

// Handle distribution index request (simplified)
ipcMain.handle('getDistributionIndex', async () => {
  try {
    // For now, return local distribution data
    const distributionPath = path.join(__dirname, 'distribution.json');
    if (fs.existsSync(distributionPath)) {
      const data = fs.readFileSync(distributionPath, 'utf8');
      return { success: true, data: JSON.parse(data) };
    }
    return { success: false, error: 'Distribution file not found' };
  } catch (error) {
    logger.error('Failed to fetch distribution:', error);
    return { success: false, error: error.message };
  }
});

// Handle trash item.
ipcMain.handle('shell_trash_item', async (event, ...args) => {
  try {
    await shell.trashItem(args[0]);
    return {
      result: true
    };
  } catch (error) {
    return {
      result: false,
      error: error
    };
  }
});

const REDIRECT_URI_PREFIX = 'https://login.microsoftonline.com/common/oauth2/nativeclient?';

// Microsoft Auth Login (simplified)
let msftAuthWindow;
let msftAuthSuccess;
let msftAuthViewSuccess;
let msftAuthViewOnClose;
ipcMain.on('msft_open_login', (ipcEvent, ...arguments_) => {
  if (msftAuthWindow) {
    ipcEvent.reply('msft_reply_login', 'error', 'already_open', msftAuthViewOnClose);
    return;
  }
  msftAuthSuccess = false;
  msftAuthViewSuccess = arguments_[0];
  msftAuthViewOnClose = arguments_[1];
  msftAuthWindow = new BrowserWindow({
    title: 'Connexion Microsoft',
    backgroundColor: '#222222',
    width: 520,
    height: 600,
    frame: true,
    icon: getPlatformIcon('logo')
  });

  msftAuthWindow.on('closed', () => {
    msftAuthWindow = undefined;
  });

  msftAuthWindow.on('close', () => {
    if (!msftAuthSuccess) {
      ipcEvent.reply('msft_reply_login', 'error', 'not_finished', msftAuthViewOnClose);
    }
  });

  msftAuthWindow.webContents.on('did-navigate', (_, uri) => {
    if (uri.startsWith(REDIRECT_URI_PREFIX)) {
      let queryMap = {};

      new URL(uri).searchParams.forEach((v, k) => {
        queryMap[k] = v;
      });

      ipcEvent.reply('msft_reply_login', 'success', queryMap, msftAuthViewSuccess);

      msftAuthSuccess = true;
      msftAuthWindow.close();
      msftAuthWindow = null;
    }
  });

  msftAuthWindow.removeMenu();
  msftAuthWindow.loadURL(`https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?prompt=select_account&client_id=${AZURE_CLIENT_ID}&response_type=code&scope=XboxLive.signin%20offline_access&redirect_uri=https://login.microsoftonline.com/common/oauth2/nativeclient`);
});

// Microsoft Auth Logout (simplified)
let msftLogoutWindow;
let msftLogoutSuccess;
let msftLogoutSuccessSent;
ipcMain.on('msft_open_logout', (ipcEvent, uuid, isLastAccount) => {
  if (msftLogoutWindow) {
    ipcEvent.reply('msft_reply_logout', 'error', 'already_open');
    return;
  }

  msftLogoutSuccess = false;
  msftLogoutSuccessSent = false;
  msftLogoutWindow = new BrowserWindow({
    title: 'Déconnexion Microsoft',
    backgroundColor: '#222222',
    width: 520,
    height: 600,
    frame: true,
    icon: getPlatformIcon('logo')
  });

  msftLogoutWindow.on('closed', () => {
    msftLogoutWindow = undefined;
  });

  msftLogoutWindow.on('close', () => {
    if (!msftLogoutSuccess) {
      ipcEvent.reply('msft_reply_logout', 'error', 'not_finished');
    } else if (!msftLogoutSuccessSent) {
      msftLogoutSuccessSent = true;
      ipcEvent.reply('msft_reply_logout', 'success', uuid, isLastAccount);
    }
  });

  msftLogoutWindow.webContents.on('did-navigate', (_, uri) => {
    if (uri.startsWith('https://login.microsoftonline.com/common/oauth2/v2.0/logoutsession')) {
      msftLogoutSuccess = true;
      setTimeout(() => {
        if (!msftLogoutSuccessSent) {
          msftLogoutSuccessSent = true;
          ipcEvent.reply('msft_reply_logout', 'success', uuid, isLastAccount);
        }

        if (msftLogoutWindow) {
          msftLogoutWindow.close();
          msftLogoutWindow = null;
        }
      }, 5000);
    }
  });

  msftLogoutWindow.removeMenu();
  msftLogoutWindow.loadURL('https://login.microsoftonline.com/common/oauth2/v2.0/logout');
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
  win = new BrowserWindow({
    width: 980,
    height: 552,
    icon: getPlatformIcon('logo'),
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'app', 'assets', 'js', 'preloader.js'),
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: '#171614'
  });

  win.loadURL(pathToFileURL(path.join(__dirname, 'app', 'app.ejs')).toString());

  win.removeMenu();

  win.resizable = true;

  win.on('closed', () => {
    win = null;
  });
}

function createMenu() {
  if (process.platform === 'darwin') {
    // Extend default included application menu to continue support for quit keyboard shortcut
    let applicationSubMenu = {
      label: 'Application',
      submenu: [{
        label: 'About Application',
        selector: 'orderFrontStandardAboutPanel:'
      }, {
        type: 'separator'
      }, {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: () => {
          app.quit();
        }
      }]
    };

    // New edit menu adds support for text-editing keyboard shortcuts
    let editSubMenu = {
      label: 'Edit',
      submenu: [{
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        selector: 'undo:'
      }, {
        label: 'Redo',
        accelerator: 'Shift+CmdOrCtrl+Z',
        selector: 'redo:'
      }, {
        type: 'separator'
      }, {
        label: 'Cut',
        accelerator: 'CmdOrCtrl+X',
        selector: 'cut:'
      }, {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        selector: 'copy:'
      }, {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+V',
        selector: 'paste:'
      }, {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        selector: 'selectAll:'
      }]
    };

    let template = [applicationSubMenu, editSubMenu];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }
}

function getPlatformIcon(name) {
  const ext = process.platform === 'win32' ? 'ico' : process.platform === 'darwin' ? 'icns' : 'png';
  return path.join(__dirname, 'app', 'assets', 'images', 'icons', `${name}.${ext}`);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();
  createMenu();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});