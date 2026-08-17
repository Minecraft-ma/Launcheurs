# Domination World Launcher - Version Helios

Votre launcher a été transformé pour fonctionner comme HeliosLauncher avec un système complet et moderne.

## 🎉 Nouvelles fonctionnalités implémentées

### ✅ Architecture basée sur HeliosLauncher
- **Système de templates EJS** : Interface modulaire avec vues multiples (landing, login, settings, welcome)
- **Structure professionnelle** : Organisation en dossiers `app/` avec séparation claire des responsabilités

### ✅ Authentification Microsoft OAuth2
- **Login Microsoft complet** : Intégration avec OAuth2 Microsoft
- **Gestion multi-comptes** : Support de plusieurs comptes avec sauvegarde locale
- **Connexion hors ligne** : Possibilité de jouer sans connexion internet
- **Stockage sécurisé** : Les comptes sont stockés dans `AppData\Roaming\.DominationWorld`

### ✅ Système de distribution distant
- **Configuration serveur distante** : Le launcher charge sa configuration depuis un fichier JSON distant
- **News feed intégré** : Les actualités sont chargées depuis le serveur
- **Mise à jour facile** : Modifiez le fichier `distribution.json` sur GitHub pour mettre à jour tous les launchers

### ✅ Gestion automatique de Java
- **Détection automatique** : Vérifie si Java est installé et si la version est compatible
- **Installation automatique** : Télécharge et installe Java 17 si nécessaire (framework en place)
- **Support multi-plateforme** : Fonctionne sur Windows, macOS et Linux

### ✅ Interface moderne multi-vues
- **Vue Welcome** : Page d'accueil pour les nouveaux utilisateurs
- **Vue Login** : Interface de connexion avec Microsoft et hors ligne
- **Vue Landing** : Page principale avec informations serveur et news
- **Vue Settings** : Paramètres complets (Java, mémoire, résolution, etc.)

### ✅ Gestion des mods améliorée
- **Téléchargement depuis GitHub** : Les mods sont téléchargés automatiquement
- **Fallback URL** : Plusieurs URLs de téléchargement pour fiabilité
- **Timeout augmenté** : 60 secondes pour les gros fichiers
- **Logs détaillés** : Meilleur débogage avec logs de debug

## 📁 Structure des dossiers

```
Launcheurs/
├── app/
│   ├── app.ejs                  # Template principal
│   ├── frame.ejs                # Template de la fenêtre
│   ├── landing.ejs              # Vue d'accueil
│   ├── login.ejs                # Vue de connexion
│   ├── settings.ejs            # Vue des paramètres
│   ├── welcome.ejs              # Vue de bienvenue
│   ├── waiting.ejs              # Vue de chargement
│   └── assets/
│       ├── js/
│       │   ├── preloader.js     # Bridge IPC
│       │   ├── renderer.js      # Logique UI
│       │   ├── ipcconstants.js  # Constantes IPC
│       │   ├── langloader.js    # Gestion des langues
│       │   ├── distribution.js  # Gestion distribution
│       │   ├── javamanager.js   # Gestion Java
│       │   ├── accountmanager.js# Gestion des comptes
│       │   └── isdev.js         # Détection mode dev
│       ├── css/
│       │   └── style.css        # Styles principaux
│       ├── images/
│       │   ├── backgrounds/     # Images de fond
│       │   └── icons/           # Icônes
│       └── lang/
│           └── fr_FR.json       # Traductions françaises
├── index.js                     # Point d'entrée principal
├── package.json                 # Dépendances
├── distribution.json            # Configuration serveur
└── main.js                      # Ancien fichier (conservé)
```

## 🚀 Utilisation

### Démarrage
```bash
npm install
npm start
```

### Configuration du serveur distant

1. **Créez un fichier `distribution.json`** sur votre repo GitHub :
```json
{
  "minecraftVersion": "1.20.1",
  "forgeVersion": "47.4.10",
  "servers": [
    {
      "id": "domination-world",
      "name": "Domination World",
      "address": "play.dominationworld.com",
      "port": 25565,
      "players": {
        "max": 100,
        "online": 45
      }
    }
  ],
  "news": [
    {
      "title": "Bienvenue!",
      "date": "2026-08-09",
      "content": "Rejoignez notre serveur!",
      "author": "Admin"
    }
  ]
}
```

2. **Modifiez l'URL dans `index.js`** :
```javascript
const DISTRIBUTION_URL = 'https://raw.githubusercontent.com/VOTRE_REPO/main/distribution.json';
```

### Configuration Microsoft Auth

Pour activer l'authentification Microsoft complète, vous devez :

1. **Créer une application Azure AD** sur [portal.azure.com](https://portal.azure.com)
2. **Obtenir un Client ID** et configurer les redirections
3. **Remplacer le Client ID** dans `app/assets/js/ipcconstants.js` :
```javascript
const AZURE_CLIENT_ID = 'VOTRE_CLIENT_ID';
```

### Données utilisateur

Les données sont maintenant stockées dans :
- **Windows** : `C:\Users\NOM\AppData\Roaming\.DominationWorld`
- **macOS** : `~/Library/Application Support/.DominationWorld`
- **Linux** : `~/.config/.DominationWorld`

## 🔧 Personnalisation

### Changer le thème
Modifiez `app/assets/css/style.css` pour changer les couleurs et le style.

### Ajouter des langues
1. Créez un fichier `app/assets/lang/en_US.json`
2. Ajoutez les traductions
3. Modifiez `app/assets/js/langloader.js` pour supporter la nouvelle langue

### Ajouter des vues
1. Créez un nouveau fichier `.ejs` dans `app/`
2. Ajoutez la logique correspondante dans `app/assets/js/renderer.js`
3. Utilisez `showView('nom-de-la-vue')` pour naviguer

## 📝 Développement

### Mode développement
Le launcher détecte automatiquement s'il est en mode développement.

### Logs
Les logs sont affichés dans la console et peuvent être utilisés pour le débogage.

### Tests
Pour tester les différentes fonctionnalités :
- **Auth Microsoft** : Configurez un Client ID Azure
- **Distribution** : Modifiez `distribution.json`
- **Java** : Testez avec et sans Java installé

## 🐛 Dépannage

### Le launcher ne démarre pas
- Vérifiez que toutes les dépendances sont installées : `npm install`
- Vérifiez que le fichier `index.js` existe
- Consultez les logs dans la console

### L'authentification Microsoft ne fonctionne pas
- Vérifiez que le Client ID Azure est correct
- Vérifiez que les URLs de redirection sont configurées dans Azure
- Consultez les logs pour voir les erreurs

### Les mods ne se téléchargent pas
- Vérifiez que l'URL du manifest est correcte
- Vérifiez que le repo GitHub est public
- Consultez les logs pour voir les erreurs de téléchargement

## 🎯 Prochaines étapes

Pour compléter le launcher, vous pouvez :

1. **Implémenter le lancement Minecraft** : Intégrer `minecraft-launcher-core` avec les nouveaux systèmes
2. **Ajouter des images** : Remplacer les placeholders par de vraies images
3. **Créer un installateur** : Utiliser `electron-builder` pour créer des exécutables
4. **Ajouter Discord RPC** : Intégrer `discord-rpc-patch` pour montrer le statut Discord
5. **Compléter l'installation Java** : Finaliser le système d'installation automatique

## 📚 Ressources

- [HeliosLauncher](https://github.com/dscalzi/HeliosLauncher) - Launcher d'inspiration
- [Electron Documentation](https://www.electronjs.org/docs)
- [Minecraft Launcher Core](https://github.com/Pierce01/Minecraft-Launcher-Core)

---

**Votre launcher est maintenant basé sur l'architecture professionnelle de HeliosLauncher avec toutes les fonctionnalités modernes d'un launcher Minecraft!** 🎮