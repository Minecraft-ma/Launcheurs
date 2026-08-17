# 🚀 Scripts d'automatisation de publication de mods

Ces scripts automatisent complètement la publication de vos mods sur GitHub avec calcul automatique des SHA256.

## 📋 Prérequis

- **Node.js** (version 18 ou supérieure)
- **Git**
- **Compte GitHub** avec un repo pour vos mods

## 🎯 Utilisation rapide

### Option 1: Automatisation complète (Recommandée)

Le script PowerShell fait tout automatiquement:
1. Calcule les SHA256 de tous vos mods
2. Génère le manifest JSON
3. Commit les changements
4. Push sur GitHub
5. Déclenche le workflow de création de release

```powershell
# Depuis le dossier Launcheurs
.\scripts\auto-publish-mods.ps1
```

**Ou avec paramètres personnalisés:**
```powershell
.\scripts\auto-publish-mods.ps1 -GitHubRepo "votre-username/votre-repo" -Branch "main"
```

### Option 2: Génération du manifest seulement

Si vous voulez juste générer le manifest sans le push Git:

```bash
node scripts/auto-publish-mods.js
```

## 📁 Structure des fichiers

```
Launcheurs/
├── mods/                    # Vos mods .jar
├── scripts/
│   ├── auto-publish-mods.js      # Script Node.js (calcul SHA + manifest)
│   ├── auto-publish-mods.ps1     # Script PowerShell (automatisation complète)
│   └── README.md                 # Ce fichier
└── .github/
    ├── workflows/
    │   └── publish-mods.yml      # Workflow GitHub Actions
    └── scripts/
        └── generate-manifest.js  # Script utilisé par le workflow
```

## 🔧 Configuration

### Modifier le repo GitHub

Dans `scripts/auto-publish-mods.js`, modifiez cette ligne:

```javascript
const CONFIG = {
    githubRepo: 'Minecraft-ma/DominationRoot', // Changez selon votre repo
    // ...
};
```

Ou passez le paramètre au script PowerShell:

```powershell
.\scripts\auto-publish-mods.ps1 -GitHubRepo "votre-username/votre-repo"
```

## 🚀 Processus d'automatisation

### Ce que fait le script PowerShell:

1. **Vérification des prérequis**
   - Vérifie Node.js et Git
   - Vérifie que le dossier `mods/` existe et contient des .jar

2. **Génération du manifest**
   - Exécute le script Node.js
   - Calcule SHA256 pour chaque mod
   - Génère `mods.json` avec les URLs GitHub

3. **Opérations Git**
   - Initialise le repo si nécessaire
   - Configure le remote origin
   - Ajoute les fichiers (mods/, mods.json, workflows)
   - Commit avec message automatique
   - Push sur GitHub

4. **Déclenchement du workflow**
   - Le push déclenche automatiquement le workflow GitHub Actions
   - Le workflow crée la release `mods-latest`
   - Les mods sont disponibles au téléchargement

## 📦 Format du manifest généré

```json
{
  "version": "2026-08-12T14:30:00.000Z",
  "mods": [
    {
      "name": "ModName-1.0.0.jar",
      "version": "1.0.0",
      "url": "https://github.com/username/repo/releases/download/mods-latest/ModName-1.0.0.jar",
      "sha256": "abc123...",
      "size": 1024000
    }
  ]
}
```

## 🔍 Vérification

Après l'exécution du script:

1. **Vérifiez le workflow sur GitHub:**
   ```
   https://github.com/votre-username/votre-repo/actions
   ```

2. **Vérifiez la release:**
   ```
   https://github.com/votre-username/votre-repo/releases/tag/mods-latest
   ```

3. **Testez le launcher:**
   - Lancez votre launcher
   - Cliquez sur "Installer mods"
   - Les mods devraient se télécharger automatiquement

## 🐛 Dépannage

### Erreur "Node.js n'est pas installé"
Téléchargez et installez Node.js depuis https://nodejs.org/

### Erreur "Git n'est pas installé"
Téléchargez et installez Git depuis https://git-scm.com/

### Erreur "Pas de remote origin configuré"
Le script vous demandera l'URL du repo GitHub. Exemple:
```
https://github.com/votre-username/votre-repo.git
```

### Le workflow ne se déclenche pas
- Vérifiez que le fichier `.github/workflows/publish-mods.yml` existe
- Vérifiez que les Actions sont activées dans les settings du repo GitHub

### Les mods ne se téléchargent pas dans le launcher
- Vérifiez que la release `mods-latest` existe
- Vérifiez les URLs dans `mods.json`
- Vérifiez les SHA256 dans le launcher

## 🎉 Avantages

✅ **Automatisation complète** - Un seul commande pour tout faire  
✅ **Calcul SHA automatique** - Plus besoin de calculer manuellement  
✅ **Validation d'intégrité** - Garantit que les mods ne sont pas corrompus  
✅ **Versioning automatique** - Chaque publication est versionnée  
✅ **Fallback GitHub** - Le launcher peut télécharger depuis plusieurs sources  

## 📝 Exemple d'utilisation complète

```powershell
# 1. Placez vos mods dans le dossier mods/
# 2. Exécutez le script
cd C:\Users\Alexis\IdeaProjects\untitled1\Launcheurs
.\scripts\auto-publish-mods.ps1

# 3. Suivez les instructions si nécessaire
# 4. Attendez que le workflow se termine sur GitHub
# 5. Testez le launcher
```

C'est tout ! Vos mods sont maintenant automatiquement publiés sur GitHub avec validation SHA256. 🚀