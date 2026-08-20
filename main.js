const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const { Client, Authenticator } = require('minecraft-launcher-core');

const APP_ROOT = app ? app.getPath('userData') : path.join(os.homedir(), '.minecraft-launcher-electron');
const LAUNCH_ROOT = path.join(APP_ROOT, 'launcher-root');
const WORKSPACE_MODS_DIR = path.join(__dirname, 'mods');
const WORKSPACE_FORGE_JAR = path.join(__dirname, 'forge-1.20.1-47.4.10-installer.jar');
const DEFAULT_VERSION = '1.20.1';

// URLs de manifests de mods GitHub
const MODS_MANIFEST_URLS = [
  'https://github.com/Minecraft-ma/Launcheurs/releases/download/mods-latest/mods.json',
  'https://raw.githubusercontent.com/Minecraft-ma/Launcheurs/main/mods.json'
];

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
      preload: path.join(__dirname, 'app', 'assets', 'js', 'preloader.js'),
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
  // electron-updater désactivé temporairement
  if (app && mainWindow) {
    emitRendererMessage('launcher-debug', '✅ Auto-update désactivée (électron-updater non installé).');
  }
}

if (app) {
  app.whenReady().then(() => {
    ensureLaunchRoot();
    createMainWindow();
    setupAutoUpdater();

    try { Menu.setApplicationMenu(null); } catch (e) {}

    // Window controls (must be after createMainWindow)
    ipcMain.on('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
    ipcMain.on('window-maximize', () => { if (mainWindow) mainWindow.maximize(); });
    ipcMain.on('window-unmaximize', () => { if (mainWindow) mainWindow.unmaximize(); });
    ipcMain.on('window-toggle-maximize', () => { if (!mainWindow) return; if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); });
    ipcMain.on('window-close', () => { if (mainWindow) mainWindow.close(); });

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
}

// Register IPC handlers outside app.whenReady for immediate availability
if (typeof ipcMain !== 'undefined') {
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
      return { ok: false, error: err.message || String(err), message: `Erreur téléchargement mods: ${err.message}` };
    }
  });

  ipcMain.handle('checkForUpdates', async () => {
    return { ok: true, result: { message: 'Auto-update désactivé' } };
  });

  ipcMain.handle('getDistributionIndex', async () => {
    return {
      success: true,
      data: {
        news: [
          {
            title: 'Bienvenue sur Domination World !',
            date: new Date().toISOString().split('T')[0],
            content: 'Connectez-vous et découvrez notre serveur Minecraft avec plus de 70 mods !'
          }
        ],
        servers: [
          {
            name: 'Domination World',
            ip: 'play.domination-world.fr',
            port: 25565,
            players: {
              online: Math.floor(Math.random() * 20),
              max: 50
            }
          }
        ]
      }
    };
  });

  ipcMain.handle('getModsList', async () => {
    const modsFolder = path.join(LAUNCH_ROOT, 'mods');
    if (fs.existsSync(modsFolder)) {
      const mods = fs.readdirSync(modsFolder).filter(file => file.endsWith('.jar'));
      return { ok: true, mods: mods.map(name => ({ name, size: fs.statSync(path.join(modsFolder, name)).size })) };
    }
    return { ok: true, mods: [] };
  });

  ipcMain.handle('deleteMod', async (event, name) => {
    const modsFolder = path.join(LAUNCH_ROOT, 'mods');
    const modPath = path.join(modsFolder, name);
    if (fs.existsSync(modPath)) {
      fs.unlinkSync(modPath);
      return { ok: true };
    }
    return { ok: false, error: 'Mod non trouvé' };
  });

  ipcMain.handle('importMods', async (event, paths) => {
    const modsFolder = path.join(LAUNCH_ROOT, 'mods');
    if (!fs.existsSync(modsFolder)) {
      fs.mkdirSync(modsFolder, { recursive: true });
    }
    let imported = 0;
    for (const srcPath of paths) {
      if (fs.existsSync(srcPath) && srcPath.endsWith('.jar')) {
        const fileName = path.basename(srcPath);
        const destPath = path.join(modsFolder, fileName);
        fs.copyFileSync(srcPath, destPath);
        imported++;
      }
    }
    return { ok: true, imported };
  });

  ipcMain.handle('clearMods', async () => {
    const modsFolder = path.join(LAUNCH_ROOT, 'mods');
    if (fs.existsSync(modsFolder)) {
      const files = fs.readdirSync(modsFolder).filter(file => file.endsWith('.jar'));
      for (const file of files) {
        fs.unlinkSync(path.join(modsFolder, file));
      }
      return { ok: true };
    }
    return { ok: true };
  });

  ipcMain.handle('openModsFolder', async () => {
    const { shell } = require('electron');
    const modsFolder = path.join(LAUNCH_ROOT, 'mods');
    if (!fs.existsSync(modsFolder)) {
      fs.mkdirSync(modsFolder, { recursive: true });
    }
    shell.openPath(modsFolder);
    return { ok: true };
  });

  ipcMain.handle('getSystemRam', async () => {
    return os.totalmem() / 1073741824; // GB
  });

  ipcMain.handle('getAppVersion', async () => {
    return { ok: true, version: app.getVersion() };
  });

  ipcMain.handle('launchMinecraft', async (event, settings) => {
    console.log('=== MAIN: launchMinecraft appelé ===');
    console.log('Settings:', settings);
    
    try {
      ensureLaunchRoot();
      const forgePath = getForgePath();
      
      console.log('Forge path:', forgePath);
      console.log('Forge exists:', forgePath ? fs.existsSync(forgePath) : false);
      
      if (!forgePath) {
        console.error('Forge jar introuvable');
        return { success: false, message: 'Forge jar introuvable' };
      }

      console.log('Creating launcher...');
      const launcher = new Client();
      const username = settings.username || 'Player';
      const javaPath = settings.javaPath || (process.platform === 'win32' ? 'javaw' : 'java');

      console.log('Username:', username);
      console.log('Java path:', javaPath);

      // Simple offline authentication
      const uuid = crypto.createHash('md5').update(username).digest('hex').substring(0, 32);
      console.log('Generated UUID:', uuid);
      
      const authorization = {
        access_token: '0',
        client_token: '0',
        uuid: uuid,
        name: username,
        user_type: 'mojang',
        meta: { type: 'offline', xuid: '0' }
      };
      
      console.log('Authorization:', authorization);
      
      const launchOptions = {
        root: LAUNCH_ROOT,
        authorization,
        version: { number: DEFAULT_VERSION, type: 'release' },
        javaPath,
        forge: forgePath,
        memory: { min: '2G', max: settings.memoryMax || '4G' },
        customArgs: ['--width=1280', '--height=720']
      };
      
      console.log('Launch options:', launchOptions);

      launcher.on('debug', (message) => {
        console.log('[DEBUG]', message);
        event.sender.send('launcher-debug', message);
      });

      launcher.on('data', (data) => {
        console.log('[DATA]', data.toString());
        event.sender.send('launcher-data', data.toString());
      });

      launcher.on('progress', (progress) => {
        console.log('[PROGRESS]', progress);
        event.sender.send('launcher-progress', progress);
      });

      console.log('Launching...');
      await launcher.launch(launchOptions);
      console.log('Launch successful');
      return { success: true, message: 'Minecraft lancé' };
      
    } catch (error) {
      console.error('=== ERREUR LANCEMENT ===');
      console.error('Error:', error);
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      return { success: false, message: error.message || String(error) };
    }
  });

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
}