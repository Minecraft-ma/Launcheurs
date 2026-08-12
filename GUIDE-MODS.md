# 📦 Guide complet du système de Mods

Votre launcher dispose maintenant de **3 méthodes** pour gérer les mods !

## 🎯 Méthode 1: GitHub (Recommandée - Auto-update)

### Configuration
1. **Créez un repo GitHub** pour vos mods (ex: `DominationRoot`)
2. **Copiez les fichiers workflow** depuis votre launcher vers le repo mods :
   ```bash
   mkdir -p .github/workflows .github/scripts
   cp Launcheurs/.github/workflows/publish-mods.yml .github/workflows/
   cp Launcheurs/.github/scripts/generate-manifest.js .github/scripts/
   ```

3. **Ajoutez vos mods** dans le dossier `mods/` du repo
4. **Push sur GitHub** → Le workflow se déclenche automatiquement

### Avantages
✅ Auto-update automatique pour tous les utilisateurs  
✅ Validation SHA256 pour garantir l'intégrité  
✅ Téléchargement incrémental (seul ce qui change)  
✅ Versioning avec les releases GitHub  

### Configuration dans le launcher
Dans `renderer.js`, l'URL est déjà configurée :
```javascript
const MODS_MANIFEST_URLS = [
  'https://github.com/Minecraft-ma/DominationRoot/releases/download/mods-latest/mods.json',
  'https://raw.githubusercontent.com/Minecraft-ma/DominationRoot/master/mods.json'
];
```

## 🎯 Méthode 2: Dropbox (Alternative simple)

### Configuration Dropbox
1. **Créez un dossier Dropbox** avec vos mods
2. **Créez un fichier `mods.json`** avec ce format :
   ```json
   {
     "version": "2026-06-14T12:34:56.000Z",
     "mods": [
       {
         "name": "mod1.jar",
         "url": "https://www.dropbox.com/s/xxx/mod1.jar?dl=0",
         "sha256": "abcd1234..."
       }
     ]
   }
   ```
3. **Partagez le dossier** sur Dropbox
4. **Copiez l'URL du partage** du fichier `mods.json`

### Configuration dans le launcher
1. Allez dans **Options** → **Mods Dropbox**
2. Cochez **"Utiliser Dropbox pour les mods"**
3. Collez l'URL du manifest Dropbox
4. Sauvegardez automatiquement

### Avantages
✅ Pas besoin de GitHub  
✅ Modification facile des fichiers  
✅ fonctionne avec un simple lien de partage  

## 🎯 Méthode 3: Mods Personnalisés (Client-side)

### Pour les utilisateurs
1. Allez dans l'onglet **Mods**
2. Cliquez sur **"Ouvrir dossier"** dans la section "Mods Personnalisés"
3. Copiez vos mods `.jar` dans ce dossier
4. Ils seront automatiquement utilisés au prochain lancement

### Avantages
✅ Les utilisateurs peuvent ajouter leurs propres mods  
✅ Non écrasés par les mises à jour du serveur  
✅ Parfait pour les mods client-only (minimap, shaders...)  

## 🔄 Ordre de priorité

Quand vous cliquez sur "Installer mods" :

1. **Dropbox** (si configuré et activé)
2. **GitHub** (si Dropbox échoue)
3. **Mods locaux** (fallback si rien d'autre ne fonctionne)

## 📝 Structure des fichiers

### Structure du projet launcher
```
Launcheurs/
├── .github/
│   ├── workflows/
│   │   └── publish-mods.yml    # Workflow GitHub
│   └── scripts/
│       └── generate-manifest.js # Générateur de manifest
├── mods/                        # Mods locaux (fallback)
├── main.js                      # Processus principal
├── renderer.js                  # Interface
└── preload.js                   # Bridge IPC
```

### Structure des dossiers de l'utilisateur
```
~/.minecraft-launcher-electron/
├── launcher-root/
│   ├── mods/                    # Mods installés
│   └── mods-custom/            # Mods personnalisés utilisateur
└── update-config.json          # Configuration auto-update
```

## 🚀 Guide de mise en place rapide

### Pour vous (créateur du launcher)

1. **Créez le repo GitHub des mods** :
   ```bash
   mkdir DominationRoot
   cd DominationRoot
   git init
   mkdir mods
   # Copiez vos mods dans mods/
   ```

2. **Ajoutez les fichiers workflow** :
   ```bash
   mkdir -p .github/workflows .github/scripts
   # Copiez les fichiers depuis Launcheurs/.github/
   ```

3. **Push et publiez** :
   ```bash
   git add .
   git commit -m "Initial mods with workflow"
   git remote add origin https://github.com/Minecraft-ma/DominationRoot.git
   git push -u origin main
   ```

4. **Vérifiez la Release** :
   - Allez sur `https://github.com/Minecraft-ma/DominationRoot/releases`
   - Vous devriez voir une release `mods-v1` avec vos mods

### Pour les utilisateurs

1. **Lancez le launcher**
2. **Cliquez sur "Installer mods"** → Télécharge depuis GitHub
3. **Allez dans l'onglet "Mods"** → Voir les mods installés
4. **Ajoutez vos mods personnalisés** → Onglet Mods → "Ouvrir dossier"

## 🛠️ Génération du manifest Dropbox

Pour générer les SHA256 pour Dropbox :

```bash
# Sous Linux/Mac
sha256sum mod1.jar

# Sous Windows (PowerShell)
certutil -hashfile mod1.jar SHA256
```

## 📚 Exemple de manifest complet

```json
{
  "version": "2026-06-14T12:34:56.000Z",
  "mods": [
    {
      "name": "AppliedEnergistics2-15.4.10.jar",
      "version": "15.4.10",
      "url": "https://github.com/Minecraft-ma/DominationRoot/releases/download/mods-latest/AppliedEnergistics2-15.4.10.jar",
      "sha256": "d1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "size": 2048000
    },
    {
      "name": "Mekanism-10.4.16.80.jar",
      "version": "10.4.16.80",
      "url": "https://github.com/Minecraft-ma/DominationRoot/releases/download/mods-latest/Mekanism-10.4.16.80.jar",
      "sha256": "a9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
      "size": 3072000
    }
  ]
}
```

## 🐛 Dépannage

### GitHub ne fonctionne pas
- Vérifiez que le repo existe et est public
- Vérifiez que la release existe
- Vérifiez l'URL dans `renderer.js`

### Dropbox ne fonctionne pas
- Vérifiez que le lien est un lien de partage valide
- Vérifiez que l'URL contient `?dl=0` à la fin
- Le launcher convertit automatiquement en `?dl=1`

### Mods personnalisés ne s'installent pas
- Vérifiez que les fichiers sont `.jar`
- Vérifiez que le dossier `mods-custom/` existe
- Regardez les logs dans l'onglet "Logs"

## 🎉 C'est tout !

Votre launcher a maintenant un système de mods complet et flexible :
- **GitHub** pour l'auto-update automatique
- **Dropbox** pour une alternative simple
- **Mods personnalisés** pour les mods client-side

Les utilisateurs peuvent profiter de mods à jour tout en pouvant ajouter leurs propres mods !