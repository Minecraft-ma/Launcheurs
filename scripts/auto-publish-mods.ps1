# Script d'automatisation pour publier des mods sur GitHub
param(
    [string]$RepoPath = (Split-Path -Parent $PSScriptRoot),
    [string]$ModsDir = "mods",
    [string]$GitHubRepo = "",
    [string]$Branch = "main",
    [string]$CommitMessage = "Auto-publish mods $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

Write-Host "=== Script d'automatisation de publication de mods ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$RepoPath = Resolve-Path $RepoPath
$ModsDir = Join-Path $RepoPath $ModsDir
$NodeScript = Join-Path $PSScriptRoot "auto-publish-mods.js"

# Detecter automatiquement le repo GitHub
if (-not $GitHubRepo) {
    try {
        Push-Location $RepoPath
        $remoteUrl = git remote get-url origin 2>$null
        if ($remoteUrl) {
            if ($remoteUrl -match "github\.com[:/](.+)/(.+)") {
                $GitHubRepo = "$($Matches[1])/$($Matches[2])"
                if ($GitHubRepo -match "\.git$") {
                    $GitHubRepo = $GitHubRepo -replace "\.git$", ""
                }
                Write-Host "  Repo GitHub detecte: $GitHubRepo" -ForegroundColor Green
            }
        }
        Pop-Location
    } catch {
        # Si detection echoue, utiliser une valeur par defaut
        $GitHubRepo = "Minecraft-ma/Launcheurs"
        Write-Host "  Repo GitHub par defaut: $GitHubRepo" -ForegroundColor Yellow
    }
}

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Repo: $RepoPath"
Write-Host "  Mods: $ModsDir"
Write-Host "  GitHub: $GitHubRepo"
Write-Host "  Branch: $Branch"
Write-Host ""

# Verifier Node.js
Write-Host "Verification de Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  OK - Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERREUR - Node.js n'est pas installe" -ForegroundColor Red
    exit 1
}

# Verifier Git
Write-Host "Verification de Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "  OK - Git: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERREUR - Git n'est pas installe" -ForegroundColor Red
    exit 1
}

# Verifier le dossier mods
Write-Host "Verification du dossier mods..." -ForegroundColor Yellow
if (-not (Test-Path $ModsDir)) {
    Write-Host "  ERREUR - Le dossier $ModsDir n'existe pas" -ForegroundColor Red
    exit 1
}

$jarFiles = Get-ChildItem -Path $ModsDir -Filter "*.jar"
if ($jarFiles.Count -eq 0) {
    Write-Host "  ERREUR - Aucun fichier .jar trouve" -ForegroundColor Red
    exit 1
}

Write-Host "  OK - $($jarFiles.Count) mod(s) trouve(s)" -ForegroundColor Green
Write-Host ""

# Executer le script Node.js
Write-Host "Generation du manifest..." -ForegroundColor Yellow
try {
    Push-Location $RepoPath
    & node $NodeScript
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERREUR - Generation du manifest" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Host "  OK - Manifest genere" -ForegroundColor Green
} catch {
    Write-Host "  ERREUR: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Operations Git
Write-Host "Operations Git..." -ForegroundColor Yellow

try {
    Push-Location $RepoPath
    
    # Verifier si on est dans un repo git
    $gitDir = git rev-parse --git-dir 2>$null
    if (-not $gitDir) {
        Write-Host "  Initialisation du repo Git..." -ForegroundColor Yellow
        git init
        git branch -M $Branch
        Write-Host "  OK - Repo initialise" -ForegroundColor Green
    }
    
    # Verifier le remote
    $remote = git remote get-url origin 2>$null
    if (-not $remote) {
        Write-Host "  Pas de remote origin" -ForegroundColor Yellow
        $remoteUrl = Read-Host "  Entrez l'URL du repo GitHub (ex: https://github.com/$GitHubRepo.git)"
        if ($remoteUrl) {
            git remote add origin $remoteUrl
            Write-Host "  OK - Remote configure" -ForegroundColor Green
        } else {
            Write-Host "  Annulation" -ForegroundColor Red
            Pop-Location
            exit 1
        }
    } else {
        Write-Host "  OK - Remote: $remote" -ForegroundColor Green
    }
    
    # Ajouter les fichiers
    Write-Host "  Ajout des fichiers..." -ForegroundColor Gray
    git add mods/
    git add mods.json
    if (Test-Path ".github/workflows/publish-mods.yml") {
        git add .github/workflows/publish-mods.yml
    }
    if (Test-Path ".github/scripts/generate-manifest.js") {
        git add .github/scripts/generate-manifest.js
    }
    
    # Commit
    Write-Host "  Commit..." -ForegroundColor Gray
    git commit -m $CommitMessage
    
    # Push
    Write-Host "  Push vers GitHub..." -ForegroundColor Gray
    git push -u origin $Branch
    
    Pop-Location
    Write-Host "  OK - Operations Git terminees" -ForegroundColor Green
    
} catch {
    Write-Host "  ERREUR Git: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host ""
Write-Host "=== Automatisation terminee avec succes ===" -ForegroundColor Green
Write-Host ""
Write-Host "Resume:" -ForegroundColor Cyan
Write-Host "  - SHA256 calcules"
Write-Host "  - Manifest mods.json genere"
Write-Host "  - Fichiers commit et push sur GitHub"
Write-Host "  - Workflow GitHub Actions declenche"
Write-Host ""
Write-Host "Prochaines etapes:" -ForegroundColor Yellow
Write-Host "  1. Verifiez le workflow: https://github.com/$GitHubRepo/actions"
Write-Host "  2. Attendez la release 'mods-latest'"
Write-Host "  3. Votre launcher telechargera les mods automatiquement"
Write-Host ""
Write-Host "Release URL: https://github.com/$GitHubRepo/releases/tag/mods-latest" -ForegroundColor Cyan