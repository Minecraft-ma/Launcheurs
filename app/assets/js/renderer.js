// Renderer process - UI logic
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the application
    initApp();
});

function initApp() {
    // Debug: Check if electron API is available
    console.log('Electron API available:', !!window.electron);
    console.log('LauncherAPI available:', !!window.LauncherAPI);
    
    if (window.electron) {
        console.log('Available electron functions:', Object.keys(window.electron));
    }
    
    // Initialize navigation
    initNavigation();
    
    // Initialize frame controls
    initFrameControls();
    
    // Initialize login view
    initLoginView();
    
    // Initialize landing view
    initLandingView();
    
    // Initialize settings view
    initSettingsView();
    
    // Initialize welcome view
    initWelcomeView();
    
    // Initialize account management
    initAccountManagement();
    
    // Initialize progress listeners
    initProgressListeners();
    
    // Load distribution data
    loadDistributionData();
    
    // Show welcome view initially
    showView('welcome');
}

function initNavigation() {
    // Navigation logic between views
    window.showView = function(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        
        // Show target view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
        }
    };
}

function initFrameControls() {
    const minimizeBtn = document.getElementById('frameBtnMinimize');
    const maximizeBtn = document.getElementById('frameBtnMaximize');
    const closeBtn = document.getElementById('frameBtnClose');
    
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            if (window.electron && window.electron.minimize) {
                window.electron.minimize();
            }
        });
    }
    
    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            if (window.electron && window.electron.maximize) {
                window.electron.maximize();
            }
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (window.electron && window.electron.close) {
                window.electron.close();
            }
        });
    }
}

function initLoginView() {
    const microsoftLoginBtn = document.getElementById('microsoftLoginButton');
    const offlineLoginBtn = document.getElementById('offlineLoginButton');
    
    if (microsoftLoginBtn) {
        microsoftLoginBtn.addEventListener('click', () => {
            handleMicrosoftLogin();
        });
    }
    
    if (offlineLoginBtn) {
        offlineLoginBtn.addEventListener('click', () => {
            handleOfflineLogin();
        });
    }
}

function handleMicrosoftLogin() {
    if (window.LauncherAPI && window.LauncherAPI.msft_open_login) {
        window.LauncherAPI.msft_open_login(
            (response) => {
                // Success callback
                console.log('Microsoft login success:', response);
                
                // Store account info in localStorage for now
                const username = response.username || 'Microsoft User';
                localStorage.setItem('currentAccount', JSON.stringify({
                    type: 'microsoft',
                    username: username,
                    status: 'Connecté'
                }));
                
                updatePlayerInfo(username, 'Connecté');
                showView('landing');
                
                // Show success notification
                window.showNotification(`Connecté en tant que ${username}`, 'success');
            },
            (response) => {
                // Close callback
                console.log('Microsoft login window closed');
            }
        );
        
        // Listen for login response
        window.LauncherAPI.msft_reply_login((event, replyType, errorOrData, callback) => {
            if (replyType === 'success') {
                if (callback) callback(errorOrData);
            } else {
                console.error('Microsoft login error:', errorOrData);
                window.showNotification('Erreur de connexion Microsoft', 'error');
            }
        });
    } else {
        // Fallback to offline login if Microsoft auth not available
        console.log('Microsoft auth not available, using offline login');
        handleOfflineLogin();
    }
}

function handleOfflineLogin() {
    // For offline login, we'll use a simple username prompt
    const username = prompt('Entrez votre nom d\'utilisateur:');
    if (username) {
        console.log('Offline login for:', username);
        
        // Store account info in localStorage for now
        localStorage.setItem('currentAccount', JSON.stringify({
            type: 'offline',
            username: username,
            status: 'Hors ligne'
        }));
        
        updatePlayerInfo(username, 'Hors ligne');
        showView('landing');
        
        // Show success notification
        window.showNotification(`Connecté en tant que ${username}`, 'success');
    }
}

function initLandingView() {
    const playButton = document.getElementById('playButton');
    const newsButton = document.getElementById('newsButton');
    const settingsButton = document.getElementById('settingsButton');
    const downloadModsButton = document.getElementById('downloadModsButton');
    
    if (playButton) {
        playButton.addEventListener('click', () => {
            handlePlay();
        });
    }
    
    if (newsButton) {
        newsButton.addEventListener('click', () => {
            // Scroll to news section or show news modal
            console.log('Show news');
        });
    }
    
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            showView('settings');
        });
    }
    
    if (downloadModsButton) {
        downloadModsButton.addEventListener('click', () => {
            handleDownloadMods();
        });
    }
}

async function handleDownloadMods() {
    console.log('Downloading mods from GitHub...');
    
    const downloadButton = document.getElementById('downloadModsButton');
    if (downloadButton) {
        downloadButton.disabled = true;
        downloadButton.textContent = 'Téléchargement...';
    }
    
    try {
        const electronAPI = window.electron;
        if (electronAPI && electronAPI.downloadModsFromManifest) {
            const manifestUrl = 'https://github.com/Minecraft-ma/Launcheurs/releases/download/mods-latest/mods.json';
            const result = await electronAPI.downloadModsFromManifest(manifestUrl);
            
            console.log('Download result:', result);
            
            if (result.ok) {
                window.showNotification('Mods téléchargés avec succès !', 'success');
                // Update mod count
                if (result.downloaded !== undefined) {
                    const modCount = document.getElementById('modCount');
                    if (modCount) {
                        modCount.textContent = result.downloaded + (result.skipped || 0);
                    }
                }
            } else {
                window.showNotification('Erreur: ' + (result.error || result.message), 'error');
            }
        } else {
            console.error('downloadModsFromManifest API not available');
            window.showNotification('Fonctionnalité de téléchargement non disponible', 'error');
        }
    } catch (error) {
        console.error('Error downloading mods:', error);
        window.showNotification('Erreur lors du téléchargement: ' + error.message, 'error');
    } finally {
        if (downloadButton) {
            downloadButton.disabled = false;
            downloadButton.textContent = 'Télécharger Mods';
        }
    }
}

async function handlePlay() {
    console.log('=== DÉBUT TEST LANCEMENT ===');
    console.log('Username:', document.getElementById('username')?.value);
    console.log('Electron API:', window.electron);
    console.log('Available functions:', window.electron ? Object.keys(window.electron) : 'none');
    
    const playButton = document.getElementById('playButton');
    const username = document.getElementById('username')?.value || 'Player';
    
    if (!username || username.trim() === '') {
        window.showNotification('Veuillez entrer un pseudo !', 'error');
        return;
    }
    
    if (playButton) {
        playButton.disabled = true;
        playButton.classList.add('launching');
        playButton.textContent = 'Test...';
    }
    
    try {
        // Test 1: Check if API is available
        if (!window.electron) {
            window.showNotification('❌ API non disponible', 'error');
            return;
        }
        
        console.log('✅ API disponible');
        window.showNotification('✅ API disponible', 'success');
        
        // Test 2: Check launchMinecraft function
        if (!window.electron.launchMinecraft) {
            window.showNotification('❌ launchMinecraft non disponible', 'error');
            return;
        }
        
        console.log('✅ launchMinecraft disponible');
        window.showNotification('✅ launchMinecraft disponible', 'success');
        
        // Test 3: Try simple launch without mods first
        const settings = {
            username: username.trim(),
            memoryMax: '4G',
            javaPath: ''
        };
        
        console.log('🚀 Test lancement avec settings:', settings);
        window.showNotification('🚀 Test lancement...', 'info');
        if (playButton) playButton.textContent = 'Lancement...';
        
        const result = await window.electron.launchMinecraft(settings);
        console.log('📊 Résultat:', result);
        
        if (result.success) {
            window.showNotification('🎉 ' + result.message, 'success');
            if (playButton) playButton.textContent = '✅ Succès';
        } else {
            window.showNotification('❌ ' + result.message, 'error');
            if (playButton) playButton.textContent = '❌ Erreur';
        }
        
    } catch (error) {
        console.error('❌ Erreur catch:', error);
        window.showNotification('❌ Erreur: ' + error.message, 'error');
    } finally {
        setTimeout(() => {
            if (playButton) {
                playButton.disabled = false;
                playButton.classList.remove('launching');
                playButton.textContent = '🎮 JOUER';
            }
        }, 5000);
    }
}

function updatePlayerInfo(name, status) {
    const playerName = document.getElementById('playerName');
    const playerStatus = document.getElementById('playerStatus');
    
    if (playerName) {
        playerName.textContent = name;
    }
    
    if (playerStatus) {
        playerStatus.textContent = status;
    }
}

function initSettingsView() {
    const backButton = document.getElementById('settingsBackButton');
    const saveButton = document.getElementById('saveSettingsButton');
    const resetButton = document.getElementById('resetSettingsButton');
    const memorySlider = document.getElementById('memorySlider');
    const memoryValue = document.getElementById('memoryValue');
    const browseJavaButton = document.getElementById('browseJavaButton');
    
    if (backButton) {
        backButton.addEventListener('click', () => {
            showView('landing');
        });
    }
    
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            saveSettings();
        });
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            resetSettings();
        });
    }
    
    if (memorySlider && memoryValue) {
        memorySlider.addEventListener('input', (e) => {
            memoryValue.textContent = `${e.target.value}GB`;
        });
    }
    
    if (browseJavaButton) {
        browseJavaButton.addEventListener('click', () => {
            browseJavaPath();
        });
    }
    
    // Load saved settings
    loadSettings();
}

function saveSettings() {
    const memorySlider = document.getElementById('memorySlider');
    const customJavaPath = document.getElementById('customJavaPath');
    const resolutionSelect = document.getElementById('resolutionSelect');
    const fullscreenCheckbox = document.getElementById('fullscreenCheckbox');
    const startMinimizedCheckbox = document.getElementById('startMinimizedCheckbox');
    const autoUpdateCheckbox = document.getElementById('autoUpdateCheckbox');
    
    const settings = {
        memory: memorySlider ? memorySlider.value : '4',
        customJavaPath: customJavaPath ? customJavaPath.value : '',
        resolution: resolutionSelect ? resolutionSelect.value : '1920x1080',
        fullscreen: fullscreenCheckbox ? fullscreenCheckbox.checked : false,
        startMinimized: startMinimizedCheckbox ? startMinimizedCheckbox.checked : false,
        autoUpdate: autoUpdateCheckbox ? autoUpdateCheckbox.checked : true
    };
    
    localStorage.setItem('launcherSettings', JSON.stringify(settings));
    console.log('Settings saved:', settings);
    
    // Show success notification
    if (window.showNotification) {
        window.showNotification('Paramètres enregistrés avec succès !', 'success');
    } else {
        alert('Paramètres enregistrés!');
    }
}

function loadSettings() {
    const savedSettings = localStorage.getItem('launcherSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        const memorySlider = document.getElementById('memorySlider');
        const memoryValue = document.getElementById('memoryValue');
        const customJavaPath = document.getElementById('customJavaPath');
        const resolutionSelect = document.getElementById('resolutionSelect');
        const fullscreenCheckbox = document.getElementById('fullscreenCheckbox');
        const startMinimizedCheckbox = document.getElementById('startMinimizedCheckbox');
        const autoUpdateCheckbox = document.getElementById('autoUpdateCheckbox');
        
        if (memorySlider) memorySlider.value = settings.memory || '4';
        if (memoryValue) memoryValue.textContent = `${settings.memory || '4'}GB`;
        if (customJavaPath) customJavaPath.value = settings.customJavaPath || '';
        if (resolutionSelect) resolutionSelect.value = settings.resolution || '1920x1080';
        if (fullscreenCheckbox) fullscreenCheckbox.checked = settings.fullscreen || false;
        if (startMinimizedCheckbox) startMinimizedCheckbox.checked = settings.startMinimized || false;
        if (autoUpdateCheckbox) autoUpdateCheckbox.checked = settings.autoUpdate !== false;
    }
}

function resetSettings() {
    localStorage.removeItem('launcherSettings');
    loadSettings();
    console.log('Settings reset to default');
    alert('Paramètres réinitialisés!');
}

function browseJavaPath() {
    // This would use the electron dialog to browse for Java
    console.log('Browse for Java path');
    
    if (window.electron && window.electron.browseFile) {
        window.electron.browseFile().then(path => {
            if (path) {
                const customJavaPath = document.getElementById('customJavaPath');
                if (customJavaPath) {
                    customJavaPath.value = path;
                }
            }
        });
    } else {
        // Fallback: prompt for path
        const path = prompt('Entrez le chemin vers Java (ex: C:\\Program Files\\Java\\jdk-17\\bin\\java.exe):');
        if (path) {
            const customJavaPath = document.getElementById('customJavaPath');
            if (customJavaPath) {
                customJavaPath.value = path;
            }
        }
    }
}

function initWelcomeView() {
    const welcomeButton = document.getElementById('welcomeButton');
    
    if (welcomeButton) {
        welcomeButton.addEventListener('click', () => {
            showView('login');
        });
    }
}

async function loadDistributionData() {
    try {
        if (window.LauncherAPI && window.LauncherAPI.getDistributionIndex) {
            const result = await window.LauncherAPI.getDistributionIndex();
            if (result.success && result.data) {
                console.log('Distribution data loaded:', result.data);
                updateNews(result.data.news);
                updateServerInfo(result.data.servers);
            }
        }
    } catch (error) {
        console.error('Failed to load distribution data:', error);
    }
}

function updateNews(newsItems) {
    const newsContent = document.getElementById('newsContent');
    if (!newsContent || !newsItems) return;
    
    newsContent.innerHTML = '';
    
    newsItems.forEach(news => {
        const newsItem = document.createElement('div');
        newsItem.className = 'news-item';
        newsItem.innerHTML = `
            <div class="news-item-title">${news.title}</div>
            <div class="news-item-date">${news.date}</div>
            <div class="news-item-description">${news.content}</div>
        `;
        newsContent.appendChild(newsItem);
    });
}

function updateServerInfo(servers) {
    if (!servers || servers.length === 0) return;
    
    const server = servers[0];
    const playerCount = document.getElementById('playerCount');
    const serverStatus = document.getElementById('serverStatus');
    
    if (playerCount && server.players) {
        playerCount.textContent = `${server.players.online}/${server.players.max}`;
    }
    
    if (serverStatus && server.players) {
        const statusText = serverStatus.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = server.players.online > 0 ? 'En ligne' : 'Hors ligne';
        }
    }
}

function initAccountManagement() {
    // Load selected account from localStorage on startup
    const savedAccount = localStorage.getItem('currentAccount');
    if (savedAccount) {
        try {
            const account = JSON.parse(savedAccount);
            console.log('Saved account loaded:', account);
            updatePlayerInfo(account.username, account.status);
        } catch (error) {
            console.error('Error loading saved account:', error);
        }
    }
}

// Auto updater integration
if (window.LauncherAPI && window.LauncherAPI.autoUpdateNotification) {
    window.LauncherAPI.autoUpdateNotification((event, status, info) => {
        console.log('Auto update notification:', status, info);
        
        switch (status) {
            case 'update-available':
                console.log('Update available:', info);
                break;
            case 'update-downloaded':
                console.log('Update downloaded:', info);
                break;
            case 'update-not-available':
                console.log('No update available');
                break;
            case 'checking-for-update':
                console.log('Checking for updates...');
                break;
            case 'realerror':
                console.error('Update error:', info);
                break;
        }
    });
    
    // Initialize auto updater
    if (window.LauncherAPI && window.LauncherAPI.autoUpdateAction) {
        window.LauncherAPI.autoUpdateAction('initAutoUpdater', false);
    }
}

// Progress listeners
function initProgressListeners() {
    if (window.electron) {
        // Listen for progress updates
        window.electron.onProgress((event, progress) => {
            console.log('Progress:', progress);
            updateProgressBar(progress);
        });
        
        // Listen for debug messages
        window.electron.onDebug((event, message) => {
            console.log('Debug:', message);
        });
        
        // Listen for data output
        window.electron.onData((event, data) => {
            console.log('Data:', data);
        });
    }
}

function updateProgressBar(progress) {
    const progressBar = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    const progressPercent = document.querySelector('.progress-percent');
    
    if (progressBar && progress) {
        const percent = progress.percent || (progress.current / progress.total * 100);
        progressBar.style.width = `${percent}%`;
        
        if (progressText && progress.name) {
            progressText.textContent = progress.name;
        }
        
        if (progressPercent) {
            progressPercent.textContent = `${Math.round(percent)}%`;
        }
    }
}

// Notification system
window.showNotification = function(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        // Create toast container if it doesn't exist
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    const container = document.querySelector('.toast-container') || document.body;
    container.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.2s ease';
        setTimeout(() => toast.remove(), 200);
    }, 3000);
}