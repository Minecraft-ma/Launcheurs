# build-launcher.ps1
# Script PowerShell pour construire et publier le launcher sur GitHub.

param(
  [switch]$Publish
)

Write-Host "[Launcher] Vérification des dépendances..."
if (-not (Test-Path package.json)) {
  Write-Error "package.json introuvable. Exécutez ce script depuis le dossier du projet."
  exit 1
}

Write-Host "[Launcher] Installation des dépendances..."
npm install
if ($LASTEXITCODE -ne 0) {
  Write-Error "npm install a échoué."
  exit $LASTEXITCODE
}

Write-Host "[Launcher] Construction du build Windows..."
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Error "npm run build a échoué."
  exit $LASTEXITCODE
}

Write-Host "[Launcher] Build terminé. Vérifiez le dossier dist/ pour les artefacts."

if ($Publish) {
  Write-Host "[Launcher] Publication automatique via GitHub Actions ou gh release..."
  Write-Host "Cette option suppose que vous avez déjà configuré un dépôt GitHub et un tag de version."
  Write-Host "Utilisez la commande suivante pour créer un tag et pousser :"
  Write-Host "  git tag v<version>"
  Write-Host "  git push origin v<version>"
  Write-Host "Le workflow GitHub se déclenchera et publiera l'artefact." 
}
