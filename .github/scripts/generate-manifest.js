const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const modsDir = process.argv[2] || 'mods';
const outputFile = process.argv[3] || 'mods.json';

if (!fs.existsSync(modsDir)) {
  console.error(`Directory ${modsDir} does not exist`);
  process.exit(1);
}

const jarFiles = fs.readdirSync(modsDir).filter(file => file.endsWith('.jar'));

if (jarFiles.length === 0) {
  console.error(`No .jar files found in ${modsDir}`);
  process.exit(1);
}

const mods = jarFiles.map(fileName => {
  const filePath = path.join(modsDir, fileName);
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const stats = fs.statSync(filePath);
  
  return {
    name: fileName,
    version: fileName.match(/[\d.]+/)?.[0] || 'unknown',
    url: `https://github.com/${process.env.GITHUB_REPOSITORY || 'Minecraft-ma/DominationRoot'}/releases/download/mods-latest/${fileName}`,
    sha256: hash,
    size: stats.size
  };
});

const manifest = {
  version: new Date().toISOString(),
  mods: mods
};

fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2));
console.log(`Generated manifest with ${mods.length} mods: ${outputFile}`);