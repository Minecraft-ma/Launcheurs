// renderer.js — UI logic for the launcher
const $ = (id) => document.getElementById(id);

const playButton = $('playButton');
const installModsButton = $('installMods');
const refreshModsButton = $('refreshMods');
const clearLogsButton = $('clearLogs');
const checkUpdateBtn = $('checkUpdateBtn');
const saveOptionsButton = $('optSave');
const minBtn = $('minBtn');
const closeBtn = $('closeBtn');
const applyOptionsButton = $('optApply');
const logOutput = $('logOutput');
const logOutputFull = $('logOutputFull');
const status = $('status');
const progressStage = $('progressStage');
const progressBar = $('smallProgressBar');
const progressPercent = $('progressPercent');
const background = $('background');
const serverLogo = $('serverLogo');
const usernameInput = $('username');
const memorySlider = $('memorySlider');
const memoryValue = $('memoryValue');
const optUsername = $('optUsername');
const optMemorySlider = $('optMemorySlider');
const optMemoryValue = $('optMemoryValue');
const optOnline = $('optOnline');
const optAutoUpdate = $('optAutoUpdate');
const optUpdateInterval = $('optUpdateInterval');
const updateConfigStatus = $('updateConfigStatus');
const modsList = $('modsList');
const currentVersionEl = $('currentVersion');
const latestVersionEl = $('latestVersion');

const MODS_MANIFEST_URLS = [
  'https://github.com/Minecraft-ma/DominationRoot/releases/download/mods-v1/mods.json'
];

let bgTimer = null;
let launcherListenersAttached = false;

function appendLog(message) {
  if (!logOutput) return;
  const line = String(message || '');
  const lines = logOutput.textContent ? logOutput.textContent.split(/\r?\n/) : [];
  if (line.trim()) lines.push(line);
  while (lines.length > 300) lines.shift();
  logOutput.textContent = lines.join('\n') + '\n';
  if (logOutputFull) logOutputFull.textContent = logOutput.textContent;
  if ((logOutput.scrollHeight - logOutput.scrollTop - logOutput.clientHeight) < 40) {
    logOutput.scrollTop = logOutput.scrollHeight;
  }
}

function updateStatus(text) {
  if (!status) return;
  status.innerHTML = '<span id="statusDot"></span>' + text;
}

function setProgress(stage, percent) {
  if (progressStage) progressStage.textContent = stage;
  if (progressBar) progressBar.style.width = Math.max(0, Math.min(100, percent)) + '%';
  if (progressPercent) progressPercent.textContent = Math.max(0, Math.min(100, percent)) + '%';
}

function setUiBusy(busy) {
  const disabled = !!busy;
  [playButton, installModsButton, refreshModsButton, checkUpdateBtn, memorySlider, optMemorySlider, usernameInput, optUsername, optOnline].forEach((el) => {
    if (el) el.disabled = disabled;
  });
  if (status) status.classList.toggle('status-busy', disabled);
  document.body.style.filter = disabled ? 'saturate(0.95) brightness(0.95)' : '';
}

function normalizeMemory(value) {
  const input = String(value || '').trim().toUpperCase();
  if (!input) return '4G';
  if (/^[0-9]+(G|M)$/.test(input)) return input;
  if (/^[0-9]+$/.test(input)) return input + 'G';
  return input;
}

function syncMemory(value) {
  if (!value) value = '4';
  const numeric = String(value).replace(/[^0-9]/g, '') || '4';
  if (memorySlider) memorySlider.value = numeric;
  if (optMemorySlider) optMemorySlider.value = numeric;
  if (memoryValue) memoryValue.textContent = numeric + 'G';
  if (optMemoryValue) optMemoryValue.textContent = numeric + 'G';
}

function syncUsername(value) {
  if (usernameInput) usernameInput.value = value;
  if (optUsername) optUsername.value = value;
}

function saveLocalSettings() {
  if (usernameInput) localStorage.setItem('launcher-username', usernameInput.value.trim() || 'Player');
  if (memorySlider) localStorage.setItem('launcher-memory', String(memorySlider.value || optMemorySlider?.value || '4'));
  if (optOnline) localStorage.setItem('launcher-online', optOnline.checked ? 'true' : 'false');
}

async function saveUpdateConfig() {
  if (!optAutoUpdate || !optUpdateInterval) return;
  try {
    const result = await window.launcherApi.setUpdateConfig({
      enabled: optAutoUpdate.checked,
      autoDownload: optAutoUpdate.checked,
      checkInterval: Number(optUpdateInterval.value) || 24
    });
    if (result.ok) {
      if (updateConfigStatus) updateConfigStatus.textContent = 'Configuration de mise à jour sauvegardée.';
      return true;
    }
  } catch (e) {
    // ignore
  }
  if (updateConfigStatus) updateConfigStatus.textContent = 'Échec de la sauvegarde de la configuration.';
  return false;
}

function loadLocalSettings() {
  const savedName = localStorage.getItem('launcher-username') || 'Player';
  const savedMemory = localStorage.getItem('launcher-memory') || '4';
  const savedOnline = localStorage.getItem('launcher-online') || 'false';
  syncUsername(savedName);
  syncMemory(savedMemory);
  if (optOnline) optOnline.checked = savedOnline === 'true';
}

async function loadUpdateConfig() {
  try {
    const result = await window.launcherApi.getUpdateConfig();
    if (!result.ok) throw new Error(result.error || 'Impossible de charger la config');
    const config = result.config || {};
    if (optAutoUpdate) optAutoUpdate.checked = config.enabled !== false;
    if (optUpdateInterval) optUpdateInterval.value = Number(config.checkInterval || 24);
    if (updateConfigStatus) {
      updateConfigStatus.textContent = 'Paramètres de mise à jour chargés.';
    }
  } catch (e) {
    if (updateConfigStatus) {
      updateConfigStatus.textContent = 'Impossible de charger la configuration de mise à jour.';
    }
  }
}

function getLaunchSettings() {
  const username = (usernameInput?.value || optUsername?.value || 'Player').trim() || 'Player';
  const memory = normalizeMemory((memorySlider?.value || optMemorySlider?.value || '4') + 'G');
  return {
    username,
    memoryMax: memory,
    online: !!(optOnline?.checked)
  };
}

function attachLauncherListeners() {
  if (launcherListenersAttached) return;
  launcherListenersAttached = true;
  window.launcherApi?.onDebug?.((message) => appendLog('[DEBUG] ' + String(message)));
  window.launcherApi?.onData?.((data) => appendLog(String(data)));
  window.launcherApi?.onProgress?.((payload) => {
    if (payload && typeof payload === 'object' && payload.percent != null) {
      const percent = Math.round(payload.percent * 100);
      setProgress(payload.task || 'Progress', percent);
      updateStatus(`${payload.task || 'Progress'} ${percent}%`);
    } else if (typeof payload === 'string') {
      updateStatus(payload);
    }
  });
  window.launcherApi?.onUpdateAvailable?.((info) => {
    if (latestVersionEl) {
      latestVersionEl.textContent = 'v' + info.version;
      latestVersionEl.style.color = '#5fb0ff';
    }
    appendLog('⬇️ Mise à jour disponible: v' + info.version);
  });
  window.launcherApi?.onUpdateNotAvailable?.((info) => {
    if (latestVersionEl) {
      latestVersionEl.textContent = 'v' + info.version + ' (à jour)';
      latestVersionEl.style.color = '#4ade80';
    }
    appendLog('✅ Version à jour.');
  });
  window.launcherApi?.onUpdateDownloaded?.((info) => {
    appendLog('✅ Mise à jour téléchargée: v' + info.version);
  });
  window.launcherApi?.onUpdateError?.((info) => {
    appendLog('❌ Erreur de mise à jour: ' + info.error);
  });
}

function setActiveView(viewKey) {
  const map = {
    accueil: 'viewAccueil',
    options: 'viewOptions',
    mods: 'viewMods',
    logs: 'viewLogs',
    apropos: 'viewApropos'
  };
  if (!viewKey || !map[viewKey]) {
    viewKey = 'accueil';
  }

  Object.values(map).forEach((id) => {
    const el = $(id);
    if (el) el.classList.remove('active-view');
  });

  const target = $(map[viewKey]);
  if (target) target.classList.add('active-view');

  document.querySelectorAll('#tabs .tab-btn').forEach((btn) => {
    const dataView = String(btn.dataset.view || '').trim();
    const selected = dataView === viewKey;
    btn.setAttribute('aria-selected', selected ? 'true' : 'false');
    btn.classList.toggle('active', selected);
  });
}

async function loadBackgrounds() {
  try {
    const list = await window.launcherApi.getBackgroundImages();
    if (!list || !list.length) throw new Error('no backgrounds');
    let index = Math.floor(Math.random() * list.length);
    if (background) background.style.backgroundImage = `url("${list[index]}")`;
    if (bgTimer) clearInterval(bgTimer);
    bgTimer = setInterval(() => {
      index = (index + 1) % list.length;
      if (background) background.style.backgroundImage = `url("${list[index]}")`;
    }, 8000);
  } catch (e) {
    if (background) background.style.background = 'linear-gradient(120deg,#0b1220,#1a2a3a)';
  }
}

async function loadLogo() {
  try {
    const logo = await window.launcherApi.getServerLogo();
    if (serverLogo && logo) serverLogo.src = logo;
  } catch (e) {
    // ignore
  }
}

async function loadVersion() {
  try {
    const result = await window.launcherApi.getAppVersion();
    if (result.ok && currentVersionEl) currentVersionEl.textContent = 'v' + result.version;
  } catch (e) {
    // ignore
  }
}

async function refreshModsList() {
  if (!modsList) return;
  modsList.textContent = 'Installation de mods depuis GitHub uniquement. Appuyez sur Installer pour télécharger le manifest et les mods.';
}

async function installMods() {
  setUiBusy(true);
  setProgress('Installation', 0);
  updateStatus('Téléchargement des mods depuis GitHub...');
  appendLog('Début de l’installation des mods depuis GitHub');
  try {
    let result = null;
    for (const url of MODS_MANIFEST_URLS) {
      appendLog('[INFO] Manifest: ' + url);
      result = await window.launcherApi.downloadModsFromManifest(url);
      if (result && result.ok) {
        break;
      }
      appendLog('[WARN] Échec manifest: ' + (result?.error || result?.message || 'Erreur inconnue'));
    }
    if (result && result.ok) {
      appendLog(result.message || 'Mods téléchargés depuis GitHub.');
      updateStatus(result.message || 'Mods téléchargés depuis GitHub.');
      setProgress('Installation', 100);
      return;
    }

    appendLog('[ERROR] Impossible d’installer les mods depuis GitHub.');
    updateStatus('Échec installation des mods GitHub');
    setProgress('Erreur', 0);
  } catch (e) {
    appendLog('[ERROR] ' + (e.message || String(e)));
    updateStatus('Erreur installation des mods');
    setProgress('Erreur', 0);
  } finally {
    await refreshModsList();
    setUiBusy(false);
  }
}

async function launchMinecraft() {
  setUiBusy(true);
  attachLauncherListeners();
  setProgress('Préparation', 0);
  updateStatus('Préparation du lancement...');
  appendLog('Préparation du lancement...');
  saveLocalSettings();
  const settings = getLaunchSettings();
  try {
    const result = await window.launcherApi.launchMinecraft(settings);
    if (result && result.success) {
      appendLog('✅ Minecraft lancé.');
      updateStatus('Minecraft lancé.');
      setProgress('Lancement', 100);
      setActiveView('logs');
    } else {
      appendLog('[ERROR] ' + (result?.message || 'Échec inconnu.'));
      updateStatus('Erreur: ' + (result?.message || 'Échec inconnu.'));
      setProgress('Erreur', 0);
    }
  } catch (e) {
    appendLog('[ERROR] ' + (e.message || String(e)));
    updateStatus('Erreur de lancement.');
    setProgress('Erreur', 0);
  } finally {
    setUiBusy(false);
  }
}

async function checkUpdates() {
  setUiBusy(true);
  updateStatus('Vérification des mises à jour...');
  appendLog('Vérification des mises à jour...');
  try {
    const result = await window.launcherApi.checkForUpdates();
    if (result.ok) {
      appendLog('Vérification de mise à jour terminée.');
      updateStatus('Vérification terminée.');
    } else {
      appendLog('[UPDATE] ' + (result.error || 'Erreur inconnue.'));
      updateStatus('Erreur mise à jour.');
    }
  } catch (e) {
    appendLog('[UPDATE] ' + (e.message || String(e)));
    updateStatus('Erreur mise à jour.');
  } finally {
    setUiBusy(false);
  }
}

function bindUI() {
  document.querySelectorAll('#tabs .tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => setActiveView(btn.getAttribute('data-view')));
  });
  if (playButton) playButton.addEventListener('click', launchMinecraft);
  if (installModsButton) installModsButton.addEventListener('click', installMods);
  if (checkUpdateBtn) checkUpdateBtn.addEventListener('click', checkUpdates);
  if (minBtn) minBtn.addEventListener('click', () => window.launcherApi.windowMinimize());
  if (closeBtn) closeBtn.addEventListener('click', () => window.launcherApi.windowClose());
  if (refreshModsButton) refreshModsButton.addEventListener('click', async () => {
    setUiBusy(true);
    updateStatus('Rafraîchissement mods...');
    await refreshModsList();
    setUiBusy(false);
    setActiveView('mods');
  });
  if (clearLogsButton) clearLogsButton.addEventListener('click', () => {
    if (logOutput) logOutput.textContent = '';
    if (logOutputFull) logOutputFull.textContent = '';
  });
  if (saveOptionsButton) saveOptionsButton.addEventListener('click', async () => {
    saveLocalSettings();
    await saveUpdateConfig();
    updateStatus('Options sauvegardées.');
    appendLog('Options sauvegardées.');
  });
  if (applyOptionsButton) applyOptionsButton.addEventListener('click', async () => {
    saveLocalSettings();
    await saveUpdateConfig();
    loadLocalSettings();
    updateStatus('Options appliquées.');
    appendLog('Options appliquées.');
  });
  if (memorySlider) {
    memorySlider.addEventListener('input', () => syncMemory(memorySlider.value));
  }
  if (optMemorySlider) {
    optMemorySlider.addEventListener('input', () => syncMemory(optMemorySlider.value));
  }
  if (usernameInput) usernameInput.addEventListener('change', saveLocalSettings);
  if (optUsername) optUsername.addEventListener('change', saveLocalSettings);
  if (optOnline) optOnline.addEventListener('change', saveLocalSettings);
}

(async () => {
  bindUI();
  loadLocalSettings();
  await loadUpdateConfig();
  await loadBackgrounds();
  await loadLogo();
  await loadVersion();
  await refreshModsList();
  setActiveView('accueil');
  updateStatus('✨ Prêt à jouer');
})();
