# 🚀 Guide de Setup - GitHub Mods Distribution

Voici comment intégrer la distribution des mods via GitHub Actions dans ton repo `DominationRoot`.

## 📋 Étape 1 : Copier les fichiers workflow

1. **Dans ton repo DominationRoot**, crée la structure `.github`:
   ```bash
   mkdir -p .github/workflows
   mkdir -p .github/scripts
   ```

2. **Copie les fichiers** depuis ce repo (Launcheurs):
   - Copie `.github/workflows/publish-mods.yml` vers ton repo
   - Copie `.github/scripts/generate-manifest.js` vers ton repo

3. **Commit et push**:
   ```bash
   cd DominationRoot
   git add .github/
   git commit -m "Add GitHub Actions workflow for mods distribution"
   git push origin main
   ```

## 🎯 Étape 2 : Ajouter tes mods

1. **Place tes fichiers `.jar`** dans le dossier `mods/`:
   ```
   DominationRoot/
   └── mods/
       ├── mod1.jar
       ├── mod2.jar
       └── ...
   ```

2. **Commit et push** les mods:
   ```bash
   git add mods/
   git commit -m "Add mods"
   git push origin main
   ```

## ⚙️ Étape 3 : Déclencher la première Release

### Option A : Via GitHub UI
1. Va sur `https://github.com/Minecraft-ma/DominationRoot/actions`
2. Tu devrait voir le workflow "Publish Mods Release"
3. Clique sur **"Run workflow"** → **"Run workflow"** pour forcer une exécution

### Option B : Via CLI
```bash
# Nécessite GitHub CLI installé
gh workflow run publish-mods.yml --repo Minecraft-ma/DominationRoot
```

### Option C : Attendre un push
Le workflow se déclenche automatiquement à chaque `git push` sur `main`.

## ✅ Vérifier la publication

1. **Onglet Releases**: `https://github.com/Minecraft-ma/DominationRoot/releases`
   - Tu dois voir une Release `mods-v<number>` avec les assets (fichiers `.jar` + `mods.json`)

2. **Fichier manifest**: `https://github.com/Minecraft-ma/DominationRoot/releases/download/mods-latest/mods.json`
   - Doit contenir la liste des mods avec checksums SHA256

## 🔄 Mettre à jour les mods

À chaque fois que tu ajoutes/modifies un mod:

```bash
# Dans DominationRoot
git add mods/
git commit -m "Update mods - add new version"
git push origin main
```

→ Le workflow se déclenche automatiquement et publie une nouvelle Release.

## 🛠️ Adapter l'URL du launcher

Si tu utilises un tag différent (au lieu de `mods-latest`), mets à jour `renderer.js`:

```javascript
// Dans renderer.js, ligne ~18
const MODS_MANIFEST_URL = 'https://github.com/Minecraft-ma/DominationRoot/releases/download/TAG-ICI/mods.json';
```

Exemples de tags stables:
- `mods-latest` (par défaut, pointe toujours vers la dernière version)
- `mods-v1.0.0` (spécifique à une version)
- `stable` (personnalisé)

## 🐛 Dépannage workflow

### Workflow ne se déclenche pas
- Vérifie que `.github/workflows/publish-mods.yml` existe dans le repo
- Vérifie la branche : le workflow ne s'active que sur `main` ou `master`
- Va dans **Settings** → **Actions** et vérifie que les workflows sont activés

### Erreur dans le script `generate-manifest.js`
- Assure-toi que Node.js 18+ est utilisé (configurable dans le workflow)
- Vérifie que le dossier `mods/` contient au moins un `.jar`
- Check les logs du workflow (Onglet Actions → log détaillé)

### Assets manquants dans la Release
- Le script a peut-être échoué ; va dans les logs
- Vérifie que les permissions GitHub Token sont correctes (par défaut, c'est OK)
- Re-lance manuellement le workflow après correction

## 📝 Fichier manifest généré (`mods.json`)

Le workflow génère automatiquement un fichier comme celui-ci :

```json
{
  "version": "2026-06-14T12:34:56.000Z",
  "mods": [
    {
      "name": "modexample-1.2.3.jar",
      "version": "1.2.3",
      "url": "https://github.com/Minecraft-ma/DominationRoot/releases/download/mods-latest/modexample-1.2.3.jar",
      "sha256": "d1234567890abcdef...",
      "size": 2048000
    }
  ]
}
```

Le launcher :
1. Télécharge ce manifest
2. Compare les checksums SHA256
3. Télécharge seulement les mods manquants ou modifiés
4. Valide après téléchargement

## 🔐 Sécurité

- Les releases sont publiques par défaut → les URLs sont accessibles sans authentification
- Les checksums SHA256 assurent l'intégrité des fichiers
- Pour les mods privés, utilise un repo privé + GitHub Actions (les assets restent public, mets une auth/token si besoin)

## 📞 Support

Si ça ne marche pas :
1. Vérifie les logs du workflow (Actions tab)
2. Assure-toi que `mods/` contient des `.jar`
3. Teste le script localement : `node .github/scripts/generate-manifest.js mods mods.json`
4. Ouvre une issue si problème persiste

---

**C'est tout !** Tes mods sont maintenant distribués via GitHub 🚀
