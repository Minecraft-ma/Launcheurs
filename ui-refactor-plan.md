# Plan (ajout ~500 lignes) — UI / Options / Tabs

## Objectif
Passer d’un launcher monolithique à une UI plus structurée avec un système d’onglets :
- Accueil
- Options (grosse section)
- Mods (petit écran)
- Logs
- A propos

## Contraintes
- Ne pas toucher à `main.js` et `preload.js` (donc pas de nouvelles APIs IPC).
- Toutes les nouveautés doivent rester dans `index.html` + `renderer.js`.

## Étapes
1. `index.html`
   - Ajouter une barre Tabs (ou conteneurs) sous le header.
   - Séparer: conteneur Accueil (actuel), Options, Mods, Logs, A propos.
   - Ajouter sections “Profiles”, “Validation mémoire”, “Reset”, “Dossier mods”, “Forge jar”, etc.
   - Ajouter zones UI: Bouton Clear logs, liste mods (lecture locale si possible via existing API installMods).

2. `renderer.js`
   - Implémenter un routeur UI: `setActiveView(viewId)`.
   - Options:
     - Charger / sauvegarder profils depuis `localStorage`.
     - Validation mémoire (min/max) + feedback inline.
     - Normaliser Java path / memory format.
     - “Reset to defaults”.
     - Afficher état (forge trouvé via IPC existant? sinon via message local “à vérifier”).
   - Logs:
     - Basculer vue Logs pour afficher logOutput.
     - Ajouter bouton Clear.
   - Mods (limitée, sans nouvelle API):
     - Utiliser `installMods()` pour “Refresh état” et montrer “installation disponible”.

3. Nettoyage UX
   - Remplacer la modal Options par la vue Options (tabs) ou la garder mais synchronisée.

## Fichiers impactés
- `index.html`
- `renderer.js`

