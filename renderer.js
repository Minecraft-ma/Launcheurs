// renderer.js — UI stable pour index.html (onglets)

// ---- debug guard (BlackboxAI) ----
try {
  // UI banner (visible sans DevTools)
  const el = document.createElement('div');
  el.id = 'bbxRendererBanner';
  el.textContent = 'RENDERER OK';
  el.style.position = 'fixed';
  el.style.top = '35px';
  el.style.left = '10px';
  el.style.zIndex = '99999';
  el.style.background = 'rgba(0,0,0,0.65)';
  el.style.border = '1px solid rgba(255,255,255,0.2)';
  el.style.color = '#fff';
  el.style.padding = '6px 10px';
  el.style.borderRadius = '999px';
  el.style.font = '12px/1.2 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas';
  document.body && document.body.appendChild(el);

} catch (e) {}

// (debug banner removed)


window.addEventListener('error', (ev) => {
  try { console.error('[LauncherUI] window error:', ev.message, ev.error?.stack || ''); } catch {}
});
window.addEventListener('unhandledrejection', (ev) => {
  try { console.error('[LauncherUI] unhandledrejection:', ev.reason); } catch {}
});
// ---- end debug guard ----

const $ = (id) => document.getElementById(id);


const playButton = $('playButton');
const installModsButton = $('installMods');
const updateButton = $('updateButton');
const logOutput = $('logOutput');
const status = $('status');
const background = $('background');
const serverLogo = $('serverLogo');
const optionsBtn = $('optionsBtn');
const minBtn = $('minBtn');
const maxBtn = $('maxBtn');
const closeBtn = $('closeBtn');

let bgList = [];
let bgIndex = 0;
let bgTimer = null;
let launcherListenersAttached = false;

const MODS_MANIFEST_URLS = [
  'https://github.com/Minecraft-ma/DominationRoot/releases/download/mods-latest/mods.json',
  'https://raw.githubusercontent.com/Minecraft-ma/DominationRoot/master/mods.json'
];

function normalizeMemory(value) {
  const v = (value || '').trim().toUpperCase();
  if (!v) return '4G';
  if (/^[0-9]+(G|M)$/.test(v)) return v;
  if (/^[0-9]+$/.test(v)) return v + 'G';
  return value;
}

function setLogText(text) {
  if (logOutput) logOutput.textContent = text;
}

function appendLog(line) {
  if (!logOutput) return;
  const maxLines = 350;
  const current = logOutput.textContent ? logOutput.textContent.split(/\r?\n/) : [];
  if (line !== undefined && line !== null && String(line).length) current.push(String(line));
  while (current.length && current[current.length - 1] === '') current.pop();
  const trimmed = current.slice(Math.max(0, current.length - maxLines));
  logOutput.textContent = trimmed.join('\n') + '\n';

  const isNearBottom = (logOutput.scrollHeight - logOutput.clientHeight - logOutput.scrollTop) < 40;
  if (isNearBottom) logOutput.scrollTop = logOutput.scrollHeight;
}

function setUiBusy(isBusy) {
  const disable = !!isBusy;
  if (playButton) playButton.disabled = disable;
  if (installModsButton) installModsButton.disabled = disable;

  const usernameEl = $('username');
  const memoryEl = $('memoryMax');
  if (usernameEl) usernameEl.disabled = disable;
  if (memoryEl) memoryEl.disabled = disable;

  if (optionsBtn) optionsBtn.disabled = disable;

  const statusEl = $('status');
  if (statusEl) statusEl.classList.toggle('status-busy', disable);

  document.body.style.filter = disable ? 'saturate(0.95) brightness(0.95)' : '';
}

function setProgress(stage, percent) {
  const stageEl = $('progressStage');
  const barEl = $('smallProgressBar');
  const pctEl = $('progressPercent');
  if (stageEl) stageEl.textContent = stage;
  if (barEl) barEl.style.width = Math.max(0, Math.min(100, percent)) + '%';
  if (pctEl) pctEl.textContent = Math.max(0, Math.min(100, percent)) + '%';
}

function attachLauncherListenersOnce() {
  if (launcherListenersAttached) return;
  launcherListenersAttached = true;

  window.launcherApi?.onDebug?.((m) => appendLog('[DEBUG] ' + m));
  window.launcherApi?.onData?.((d) => appendLog(String(d)));
  window.launcherApi?.onProgress?.((p) => {
    try {
      if (p && p.percent != null) {
        const percent = Math.round(p.percent * 100);
        setProgress(p.task || 'Telechargement', percent);
        if (p.current != null && p.total != null) {
          status.textContent = `${p.task || 'Telechargement'} ${percent}% (${p.current}/${p.total})`;
        } else {
          status.textContent = `${p.task || 'Telechargement'} ${percent}%`;
        }
      } else if (p && typeof p === 'string') {
        setProgress('Progress', 50);
        status.textContent = p;
      }
    } catch (e) {}
  });
}

async function startBackgroundCycle() {
  try {
    bgList = await window.launcherApi.getBackgroundImages();
  } catch (e) {
    bgList = [];
  }

  if (!bgList || !bgList.length) {
    if (background) background.style.background = 'linear-gradient(120deg,#0b1220,#1a2a3a)';
    return;
  }

  bgIndex = Math.floor(Math.random() * bgList.length);
  setBackground(bgIndex);

  if (bgTimer) clearInterval(bgTimer);
  bgTimer = setInterval(() => {
    bgIndex = (bgIndex + 1) % bgList.length;
    setBackground(bgIndex);
  }, 8000);
}

function setBackground(i) {
  if (!background || !bgList || !bgList.length) return;
  const url = bgList[i];
  background.style.backgroundImage = `url("${url}")`;
}

async function loadLogo() {
  try {
    const logo = await window.launcherApi.getServerLogo();
    if (!serverLogo) return;
    serverLogo.src = logo || 'images/logo.png';
  } catch (e) {
    if (serverLogo) serverLogo.src = 'images/logo.png';
  }
}

// Tabs
let activeView = 'accueil';

function setActiveView(viewKey) {
  activeView = viewKey;
  const map = {
    accueil: 'viewAccueil',
    options: 'viewOptions',
    mods: 'viewMods',
    logs: 'viewLogs',
    apropos: 'viewApropos'
  };

  Object.values(map).forEach((id) => {
    const el = $(id);
    if (el) el.classList.remove('active-view');
  });

  const target = $(map[viewKey] || 'viewAccueil');
  if (target) target.classList.add('active-view');

  document.querySelectorAll('#tabs .tab-btn').forEach((btn) => {
    const is = btn.getAttribute('data-view') === viewKey;
    btn.setAttribute('aria-selected', is ? 'true' : 'false');
  });
}

// Options (profiles)
const PROFILES_KEY = 'launcherProfiles';
const ACTIVE_PROFILE_KEY = 'launcherActiveProfile';

function loadProfiles() {
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveProfiles(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function getActiveProfile() {
  try {
    const name = localStorage.getItem(ACTIVE_PROFILE_KEY);
    const profiles = loadProfiles();
    return profiles.find((p) => p && p.name === name) || null;
  } catch {
    return null;
  }
}

function setActiveProfile(name) {
  localStorage.setItem(ACTIVE_PROFILE_KEY, name);
}

function normalizeProfile(profile) {
  return {
    name: String(profile?.name || '').trim(),
    username: String(profile?.username || '').trim() || 'Player',
    memoryMin: normalizeMemory(profile?.memoryMin || profile?.memoryMax || '2G'),
    memoryMax: normalizeMemory(profile?.memoryMax || '4G'),
    javaPath: String(profile?.javaPath || ''),
    launchDir: String(profile?.launchDir || '')
  };
}

function parseMemoryValue(v) {
  const out = (v || '').trim().toUpperCase();
  if (!out) return null;
  if (/^[0-9]+G$/.test(out) || /^[0-9]+M$/.test(out)) return out;
  if (/^[0-9]+$/.test(out)) return out + 'G';
  return out;
}

function validateMemoryRange(minV, maxV) {
  const minStr = parseMemoryValue(minV);
  const maxStr = parseMemoryValue(maxV);
  const ra = minStr && minStr.endsWith('G') ? Number(minStr.slice(0, -1)) : NaN;
  const rb = maxStr && maxStr.endsWith('G') ? Number(maxStr.slice(0, -1)) : NaN;
  if (Number.isNaN(ra) || Number.isNaN(rb)) return { ok: false, msg: 'Formats Min/Max: ex 2G, 6G' };
  if (ra > rb) return { ok: false, msg: 'Min doit être <= Max' };
  return { ok: true, msg: 'OK' };
}

function setValidationMessage(msg) {
  const el = $('optMemoryValidation');
  if (!el) return;
  el.textContent = msg || '—';
  el.style.color = 'rgba(255,255,255,0.6)';
  if (msg && msg !== 'OK') el.style.color = 'rgba(255,120,120,0.9)';
  if (msg === 'OK') el.style.color = 'rgba(95,176,255,0.9)';
}

function readOptionsFromUI() {
  const username = $('optUsername')?.value || 'Player';
  const memoryMin = $('optMemoryMin')?.value || '2G';
  const memoryMax = $('optMemoryMax')?.value || '4G';
  const javaPath = $('optJavaPath')?.value || '';
  const launchDir = $('optLaunchDir')?.value || '';
  return {
    username,
    memoryMin: normalizeMemory(memoryMin),
    memoryMax: normalizeMemory(memoryMax),
    javaPath,
    launchDir
  };
}

function fillUIFromProfile(profile) {
  const p = normalizeProfile(profile || {});
  if ($('optUsername')) $('optUsername').value = p.username;
  if ($('optMemoryMin')) $('optMemoryMin').value = p.memoryMin;
  if ($('optMemoryMax')) $('optMemoryMax').value = p.memoryMax;
  if ($('optJavaPath')) $('optJavaPath').value = p.javaPath;
  if ($('optLaunchDir')) $('optLaunchDir').value = p.launchDir;

  const v = validateMemoryRange(p.memoryMin, p.memoryMax);
  setValidationMessage(v.ok ? 'OK' : v.msg);
}

function ensureDefaultProfile() {
  const profiles = loadProfiles();
  if (!profiles.length) {
    const defaults = {
      name: 'Default',
      username: $('username')?.value || 'Player',
      memoryMin: '2G',
      memoryMax: '4G',
      javaPath: '',
      launchDir: ''
    };
    saveProfiles([defaults]);
    setActiveProfile('Default');
  }
}

function renderProfilesSelect() {
  const sel = $('optProfileSelect');
  if (!sel) return;
  ensureDefaultProfile();

  const profiles = loadProfiles();
  const active = getActiveProfile();

  sel.innerHTML = '';
  profiles.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });

  sel.value = active?.name || profiles[0]?.name || '';
}

let optionsBound = false;
function initOptionsProfilesUI() {
  const sel = $('optProfileSelect');
  if (!sel) return;
  if (optionsBound) return;
  optionsBound = true;

  renderProfilesSelect();
  const active = getActiveProfile();
  if (active) fillUIFromProfile(active);

  sel.addEventListener('change', () => {
    const selected = sel.value;
    setActiveProfile(selected);
    const p = loadProfiles().find((x) => x?.name === selected);
    fillUIFromProfile(p);
  });

  $('optProfileCreate')?.addEventListener('click', () => {
    const name = ($('optProfileName')?.value || '').trim();
    if (!name) return;
    const profiles = loadProfiles();
    if (profiles.some((p) => p?.name === name)) return;

    const ui = readOptionsFromUI();
    const profile = normalizeProfile({ name, ...ui });
    profiles.push(profile);
    saveProfiles(profiles);
    setActiveProfile(name);
    renderProfilesSelect();
    fillUIFromProfile(profile);
  });

  $('optMemoryMin')?.addEventListener('input', () => {
    const ui = readOptionsFromUI();
    const v = validateMemoryRange(ui.memoryMin, ui.memoryMax);
    setValidationMessage(v.ok ? 'OK' : v.msg);
  });
  $('optMemoryMax')?.addEventListener('input', () => {
    const ui = readOptionsFromUI();
    const v = validateMemoryRange(ui.memoryMin, ui.memoryMax);
    setValidationMessage(v.ok ? 'OK' : v.msg);
  });

  $('optApplyMemory')?.addEventListener('click', () => {
    const ui = readOptionsFromUI();
    const v = validateMemoryRange(ui.memoryMin, ui.memoryMax);
    if (!v.ok) return setValidationMessage(v.msg);
    if ($('memoryMax')) $('memoryMax').value = ui.memoryMax;
    setValidationMessage('OK');
  });

  $('optSave')?.addEventListener('click', () => {
    const activeName = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (!activeName) return;
    const profiles = loadProfiles();
    const idx = profiles.findIndex((p) => p?.name === activeName);
    if (idx < 0) return;

    const ui = readOptionsFromUI();
    profiles[idx] = normalizeProfile({ name: activeName, ...ui });
    saveProfiles(profiles);
  });

  $('optResetDefaults')?.addEventListener('click', () => {
    const p = getActiveProfile();
    if (!p) return;
    const updated = normalizeProfile({ ...p, username: 'Player', memoryMin: '2G', memoryMax: '4G', javaPath: '', launchDir: '' });
    const profiles = loadProfiles();
    const idx = profiles.findIndex((x) => x?.name === p.name);
    if (idx >= 0) profiles[idx] = updated;
    saveProfiles(profiles);
    fillUIFromProfile(updated);
  });

  $('optApply')?.addEventListener('click', () => {
    const ui = readOptionsFromUI();
    const v = validateMemoryRange(ui.memoryMin, ui.memoryMax);
    if (!v.ok) return setValidationMessage(v.msg);
    if ($('username')) $('username').value = ui.username;
    if ($('memoryMax')) $('memoryMax').value = ui.memoryMax;
    setValidationMessage('OK');
  });

  $('optCancel')?.addEventListener('click', () => {
    const p = getActiveProfile();
    if (p) fillUIFromProfile(p);
  });
}

// Buttons
function bindUI() {
  updateButton?.addEventListener('click', async () => {
    setUiBusy(true);
    const previousText = updateButton.textContent;
    updateButton.textContent = 'Vérification...';
    status.textContent = 'Vérification des mises à jour...';
    setProgress('Mise à jour', 0);

    try {
      const res = await window.launcherApi.checkForUpdates();
      if (res?.ok) {
        appendLog('[UPDATE] Vérification terminée.');
        status.textContent = 'Vérification terminée.';
      } else {
        throw new Error(res?.error || 'Vérification impossible');
      }
    } catch (err) {
      const msg = err?.message || String(err);
      appendLog(`[UPDATE] ${msg}`);
      status.textContent = 'Impossible de vérifier les mises à jour : ' + msg;
    } finally {
      updateButton.textContent = previousText;
      setUiBusy(false);
    }
  });

  $('tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    setActiveView(btn.getAttribute('data-view'));
  });

  optionsBtn?.addEventListener('click', () => setActiveView('options'));
  minBtn?.addEventListener('click', () => window.launcherApi.windowMinimize());
  maxBtn?.addEventListener('click', () => window.launcherApi.windowToggleMaximize());
  closeBtn?.addEventListener('click', () => window.launcherApi.windowClose());

  if (installModsButton) {
    installModsButton.addEventListener('click', async () => {
      setUiBusy(true);
      const prevText = installModsButton.textContent;
      installModsButton.textContent = 'Installation...';

      status.textContent = 'Telechargement des mods depuis GitHub...';
      setProgress('Installation', 0);
      setLogText('');

      try {
        let lastErr = null;
        let result = null;
        for (const url of MODS_MANIFEST_URLS) {
          try {
            result = await window.launcherApi.downloadModsFromManifest(url);
            break;
          } catch (e) {
            lastErr = e;
          }
        }
        if (!result) throw lastErr || new Error('Aucun manifest GitHub valide trouvé.');

        setProgress('Installation', 100);
        status.textContent = result.message || 'Mods telecharges.';
        appendLog(result.message || 'Mods telecharges.');
      } catch (err) {
        appendLog('[INFO] GitHub non disponible, utilisation des mods locaux...');
        try {
          const result = await window.launcherApi.installMods();
          setProgress('Installation', 100);
          status.textContent = result.message || 'Installation des mods locaux terminees.';
          appendLog(result.message || 'Installation des mods locaux terminees.');
        } catch (err2) {
          setProgress('Erreur', 0);
          status.textContent = 'Erreur installation mods : ' + (err2.message || String(err2));
          appendLog('[ERROR] ' + (err2.message || String(err2)));
        }
      } finally {
        installModsButton.textContent = prevText;
        setUiBusy(false);
      }
    });
  }

  playButton?.addEventListener('click', async () => {
    setUiBusy(true);
    const prevText = playButton.textContent;
    playButton.textContent = 'Lancement...';
    status.textContent = 'Lancement...';
    setLogText('');

    try {
      // UI refactor: username/mémoire sont dans le profil Options, pas dans #username/#memoryMax
      const activeProfileName = localStorage.getItem(ACTIVE_PROFILE_KEY);
      const profiles = loadProfiles();
      const activeProfile = profiles.find((p) => p?.name === activeProfileName) || null;

      const fallbackUsername = ($('username')?.value || '').trim() || 'Player';
      const fallbackMemoryMax = normalizeMemory($('memoryMax')?.value || '4G');

      const settings = {
        username: (activeProfile?.username || fallbackUsername).trim() || 'Player',
        // main.js n'utilise que memory.max
        memoryMax: normalizeMemory(activeProfile?.memoryMax || fallbackMemoryMax)
      };


      attachLauncherListenersOnce();
      setProgress('Preparation', 0);

      const res = await window.launcherApi.launchMinecraft(settings);
      if (res && res.success) {
        setProgress('Lancement', 100);
        status.textContent = 'Minecraft lance.';
      } else {
        const msg = (res && res.message) ? res.message : 'inconnue';
        status.textContent = 'Erreur: ' + msg;
      }
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      status.textContent = 'Erreur lors du lancement: ' + msg;
      appendLog('[ERROR] ' + msg);
    } finally {
      playButton.textContent = prevText;
      setUiBusy(false);
    }
  });

  $('clearLogs')?.addEventListener('click', () => {
    setLogText('');
    $('logOutputFull') && ($('logOutputFull').textContent = '');
  });

  $('refreshMods')?.addEventListener('click', async () => {
    setUiBusy(true);
    try {
      const result = await window.launcherApi.installMods();
      const el = $('modsList');
      if (el) el.textContent = result.message || 'OK';
      setActiveView('mods');
    } catch (e) {
      setActiveView('logs');
    } finally {
      setUiBusy(false);
    }
  });
}

function syncLogToLogsView() {
  const full = $('logOutputFull');
  const footer = $('logOutput');
  if (!full) return;
  if (footer) full.textContent = footer.textContent || '';
}

// Keep logs in sync (footer -> tab)
const _appendLog = appendLog;
appendLog = function(line) {
  _appendLog(line);
  syncLogToLogsView();
};

// Also keep in sync on view switch (covers cases where tab was opened after logs)
function maybeSyncLogsOnViewChange(viewKey) {
  if (viewKey === 'logs') syncLogToLogsView();
}


// Boot
(async () => {
  bindUI();
  await startBackgroundCycle();
  await loadLogo();
  setActiveView('accueil');
  initOptionsProfilesUI();

  // Initial sync
  syncLogToLogsView();
})();

