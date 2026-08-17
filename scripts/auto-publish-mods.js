const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    modsDir: path.join(__dirname, '..', 'mods'),
    outputFile: path.join(__dirname, '..', 'mods.json'),
    githubRepo: 'Minecraft-ma/Launcheurs', // Repo par défaut, sera détecté automatiquement
    githubBranch: 'main'
};

// Détecter automatiquement le repo GitHub depuis git remote
try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
    const match = remoteUrl.match(/github\.com[:\/]([^\/]+\/[^\/\.]+)/);
    if (match) {
        CONFIG.githubRepo = match[1];
        console.log(`🔗 Repo GitHub détecté: ${CONFIG.githubRepo}`);
    }
} catch (error) {
    console.log(`⚠️  Impossible de détecter le repo GitHub, utilisation de: ${CONFIG.githubRepo}`);
}

console.log('🚀 Script d\'automatisation de publication de mods');
console.log('================================================\n');

// Vérifier si le dossier mods existe
if (!fs.existsSync(CONFIG.modsDir)) {
    console.error(`❌ Le dossier ${CONFIG.modsDir} n'existe pas`);
    console.log('💡 Créez le dossier et ajoutez vos mods .jar dedans');
    process.exit(1);
}

// Lister les fichiers .jar
const jarFiles = fs.readdirSync(CONFIG.modsDir).filter(file => file.endsWith('.jar'));

if (jarFiles.length === 0) {
    console.error(`❌ Aucun fichier .jar trouvé dans ${CONFIG.modsDir}`);
    process.exit(1);
}

console.log(`📦 ${jarFiles.length} mod(s) trouvé(s):`);
jarFiles.forEach(file => console.log(`   - ${file}`));
console.log('');

// Calculer les SHA256 et générer le manifest
console.log('🔐 Calcul des SHA256...');
const mods = jarFiles.map(fileName => {
    const filePath = path.join(CONFIG.modsDir, fileName);
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const stats = fs.statSync(filePath);
    
    console.log(`   ✅ ${fileName}: ${hash.substring(0, 16)}...`);
    
    return {
        name: fileName,
        version: fileName.match(/[\d.]+/)?.[0] || 'unknown',
        url: `https://github.com/${CONFIG.githubRepo}/releases/download/mods-latest/${fileName}`,
        sha256: hash,
        size: stats.size
    };
});

const manifest = {
    version: new Date().toISOString(),
    mods: mods
};

// Écrire le manifest
fs.writeFileSync(CONFIG.outputFile, JSON.stringify(manifest, null, 2));
console.log(`\n📄 Manifest généré: ${CONFIG.outputFile}`);
console.log(`📊 Version: ${manifest.version}`);
console.log(`📦 Nombre de mods: ${mods.length}\n`);

// Afficher le résumé
console.log('📋 Résumé du manifest:');
mods.forEach(mod => {
    console.log(`   - ${mod.name}`);
    console.log(`     Version: ${mod.version}`);
    console.log(`     Taille: ${(mod.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`     SHA256: ${mod.sha256.substring(0, 32)}...`);
    console.log(`     URL: ${mod.url}`);
});

console.log('\n✅ Script terminé avec succès!');
console.log('📝 Prochaines étapes:');
console.log('   1. Commit et push sur GitHub');
console.log('   2. Le workflow créera automatiquement la release');
console.log('   3. Le launcher téléchargera les mods depuis la release');