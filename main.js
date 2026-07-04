const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const { autoUpdater } = require('electron-updater');
const { Client, Authenticator } = require('minecraft-launcher-core');

const APP_ROOT = app ? app.getPath('userData') : path.join(os.homedir(), '.minecraft-launcher-electron');
const LAUNCH_ROOT = path.join(APP_ROOT, 'launcher-root');
const WORKSPACE_MODS_DIR = path.join(__dirname, 'mods');
const WORKSPACE_FORGE_JAR = path.join(__dirname, 'forge-1.20.1-47.4.10-installer.jar');
const DEFAULT_VERSION = '1.20.1';

function ensureLaunchRoot() {
  if (!fs.existsSync(LAUNCH_ROOT)) {
    fs.mkdirSync(LAUNCH_ROOT, { recursive: true });
  }
}

async function installModsManifest() {
  const modsFolder = path.join(LAUNCH_ROOT, 'mods');
  if (!fs.existsSync(modsFolder)) {
    fs.mkdirSync(modsFolder, { recursive: true });
  }

  let totalInstalled = 0;
  let messages = [];

  if (fs.existsSync(WORKSPACE_MODS_DIR)) {
    const files = fs.readdirSync(WORKSPACE_MODS_DIR).filter((file) => file.toLowerCase().endsWith('.jar'));
    for (const file of files) {
      const sourcePath = path.join(WORKSPACE_MODS_DIR, file);
      const targetPath = path.join(modsFolder, file);
      fs.copyFileSync(sourcePath, targetPath);
      totalInstalled += 1;
    }
    if (totalInstalled > 0) {
      messages.push(`${totalInstalled} mod(s) copiés depuis le dossier mods/.`);
    }
  }

  if (totalInstalled === 0) {
    messages.push('Aucun mod trouvé dans le dossier mods/.');
  }

  return { installed: totalInstalled > 0, message: messages.join(' ') };
}

function getForgePath() {
  if (fs.existsSync(WORKSPACE_FORGE_JAR)) {
    return WORKSPACE_FORGE_JAR;
  }
  return null;
}

function sha256File(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
      file.on('error', reject);
    }).on('error', reject);
  });
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function downloadModsFromManifest(manifestUrl, event) {
  const modsFolder = path.join(LAUNCH_ROOT, 'mods');
  if (!fs.existsSync(modsFolder)) {
    fs.mkdirSync(modsFolder, { recursive: true });
  }

  try {
    if (event) event.sender.send('launcher-debug', `📥 Téléchargement du manifest: ${manifestUrl}`);
    const manifest = await fetchJSON(manifestUrl);

    // Validation du manifest attendu:
    // { mods: [ { name: string, url: string, sha256: string } ] }
    if (!manifest || !Array.isArray(manifest.mods)) {
      throw new Error('Manifest invalide (mods absent ou non tableau)');
    }

    const mods = manifest.mods;
    if (mods.length === 0) {
      throw new Error('Manifest invalide (mods vide)');
    }

    for (const [idx, mod] of mods.entries()) {
      if (!mod || typeof mod !== 'object') {
        throw new Error(`Manifest invalide (mod[${idx}] est invalide)`);
      }
      if (!mod.name || !mod.url || !mod.sha256) {
        throw new Error(`Manifest invalide (mod[${idx}] manque name/url/sha256)`);
      }
    }

    const messages = [];
    let downloaded = 0;
    let skipped = 0;

    for (let i = 0; i < mods.length; i++) {
      const mod = mods[i];
      const targetPath = path.join(modsFolder, mod.name);
      const progress = { current: i + 1, total: mods.length, name: mod.name, percent: (i + 1) / mods.length };

      if (event) event.sender.send('launcher-progress', progress);

      // Check if file exists and validate checksum
      if (fs.existsSync(targetPath)) {
        const fileHash = sha256File(targetPath);
        if (fileHash === mod.sha256) {
          skipped += 1;
          if (event) event.sender.send('launcher-debug', `⏭️  Skipped (valid): ${mod.name}`);
          continue;
        } else {
          if (event) event.sender.send('launcher-debug', `🔄 Checksum mismatch: ${mod.name}, re-downloading...`);
          fs.unlinkSync(targetPath);
        }
      }

      if (event) event.sender.send('launcher-debug', `⬇️  Downloading: ${mod.name}`);
      await downloadFile(mod.url, targetPath);

      const downloadedHash = sha256File(targetPath);
      if (downloadedHash !== mod.sha256) {
        fs.unlinkSync(targetPath);
        throw new Error(`Checksum invalid for ${mod.name}`);
      }

      downloaded += 1;
      if (event) event.sender.send('launcher-debug', `✅ Downloaded: ${mod.name}`);
    }

    messages.push(`${downloaded} mod(s) téléchargés, ${skipped} déjà à jour.`);
    return { installed: downloaded > 0, downloaded, skipped, message: messages.join(' ') };
  } catch (err) {
    if (event) event.sender.send('launcher-debug', `❌ Erreur: ${err.message}`);
    throw err;
  }
}

let mainWindow = null;
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    resizable: true,
    frame: false,
    autoHideMenuBar: true,
    show: false,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setMenuBarVisibility(false);
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function emitRendererMessage(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function setupAutoUpdater() {
  if (process.env.NODE_ENV === 'development') {
    emitRendererMessage('launcher-debug', '🛠️ Auto-update désactivée en mode développement.');
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => {
    emitRendererMessage('launcher-debug', '🔎 Vérification des mises à jour...');
  });

  autoUpdater.on('update-available', (info) => {
    emitRendererMessage('launcher-debug', `⬇️ Mise à jour disponible : v${info.version}`);
  });

  autoUpdater.on('update-not-available', () => {
    emitRendererMessage('launcher-debug', '✅ Aucune mise à jour disponible.');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const transferredMb = (progressObj.transferred / (1024 * 1024)).toFixed(1);
    const totalMb = (progressObj.total / (1024 * 1024)).toFixed(1);
    emitRendererMessage('launcher-progress', {
      task: 'Mise à jour',
      percent: progressObj.percent / 100,
      current: Number(transferredMb),
      total: Number(totalMb)
    });
  });

  autoUpdater.on('update-downloaded', () => {
    emitRendererMessage('launcher-debug', '✅ Mise à jour téléchargée. Redémarrage en cours...');
    autoUpdater.quitAndInstall(false, true);
  });

  autoUpdater.on('error', (err) => {
    emitRendererMessage('launcher-debug', `❌ Erreur lors de la mise à jour : ${err.message || String(err)}`);
  });

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      emitRendererMessage('launcher-debug', `⚠️ Vérification de mise à jour impossible : ${err.message || String(err)}`);
    });
  }, 5000);
}

ipcMain.on('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('window-maximize', () => { if (mainWindow) mainWindow.maximize(); });
ipcMain.on('window-unmaximize', () => { if (mainWindow) mainWindow.unmaximize(); });
ipcMain.on('window-toggle-maximize', () => { if (!mainWindow) return; if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); });
ipcMain.on('window-close', () => { if (mainWindow) mainWindow.close(); });

app.whenReady().then(() => {
  ensureLaunchRoot();
  createMainWindow();
  setupAutoUpdater();

  // remove default menu (File/Edit/View...)
  try { Menu.setApplicationMenu(null); } catch (e) {}

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('installMods', async () => {
  ensureLaunchRoot();
  const modsResult = await installModsManifest();
  return {
    ...modsResult,
    message: `${modsResult.message} Forge jar utilisé : ${fs.existsSync(WORKSPACE_FORGE_JAR) ? 'oui' : 'non'}`
  };
});

ipcMain.handle('downloadModsFromManifest', async (event, manifestUrl) => {
  ensureLaunchRoot();
  try {
    const result = await downloadModsFromManifest(manifestUrl, event);
    return { ok: true, ...result };
  } catch (err) {
    // Ne pas throw => renderer.js gère les fallbacks tranquillement
    return { ok: false, error: err.message || String(err), message: `Erreur téléchargement mods: ${err.message}` };
  }
});

ipcMain.handle('checkForUpdates', async () => {
  try {
    const result = await autoUpdater.checkForUpdatesAndNotify();
    return { ok: true, result };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
});

// Return list of background images (file:// URIs) from workspace/backgrounds
ipcMain.handle('getBackgroundImages', async () => {
  const dirs = [path.join(__dirname, 'backgrounds'), path.join(__dirname, 'images')];
  let out = [];
  for (const backgroundsDir of dirs) {
    if (!fs.existsSync(backgroundsDir)) continue;
    const files = fs.readdirSync(backgroundsDir).filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f));
    out = out.concat(files.map((f) => 'file://' + path.join(backgroundsDir, f).replace(/\\/g, '/')));
  }
  return out;
});

// Return server logo path if exists
ipcMain.handle('getServerLogo', async () => {
  const candidates = [
    path.join(__dirname, 'assets', 'logo.png'),
    path.join(__dirname, 'images', 'logo.png'),
    path.join(__dirname, 'images', 'logo.jpg'),
    path.join(__dirname, 'images', 'logo.webp'),
    path.join(__dirname, 'logo.png')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return 'file://' + p.replace(/\\/g, '/');
  }
  return null;
});

ipcMain.handle('launchMinecraft', async (event, settings) => {
  ensureLaunchRoot();
  const forgePath = getForgePath();
  const modsResult = await installModsManifest();

  if (!forgePath) {
    throw new Error('Le fichier Forge 1.20.1-47.4.10-installer.jar est introuvable dans le workspace.');
  }

  const launcher = new Client();
  const username = settings.username || 'Player';
  const javaPath = settings.javaPath || (process.platform === 'win32' ? 'javaw' : 'java');

  const authorization = await Authenticator.getAuth(username, null);

  const launchOptions = {
    root: LAUNCH_ROOT,
    authorization,
    version: {
      number: DEFAULT_VERSION,
      type: 'release'
    },
    javaPath,
    forge: forgePath,
    memory: {
      min: '2G',
      max: settings.memoryMax || '4G'
    }
  };

  return new Promise((resolve, reject) => {
    launcher.on('debug', (message) => {
      event.sender.send('launcher-debug', message);
    });

    launcher.on('data', (data) => {
      event.sender.send('launcher-data', data.toString());
    });

    launcher.on('progress', (progress) => {
      event.sender.send('launcher-progress', progress);
    });

    launcher.launch(launchOptions)
      .then(() => resolve({ success: true, message: modsResult.message }))
      .catch((error) => reject({ success: false, message: error.message || String(error) }));
  });
});
