// Java Manager for automatic Java installation
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class JavaManager {
    constructor(appDataPath) {
        this.appDataPath = appDataPath;
        this.javaPath = path.join(appDataPath, 'runtime', 'java');
        this.requiredVersion = '17';
    }

    async checkJavaInstallation() {
        try {
            // Check if Java is already installed in our runtime
            const localJava = await this.findLocalJava();
            if (localJava) {
                return { installed: true, path: localJava };
            }

            // Check system Java
            const systemJava = await this.findSystemJava();
            if (systemJava) {
                const version = await this.getJavaVersion(systemJava);
                if (this.isVersionCompatible(version)) {
                    return { installed: true, path: systemJava };
                }
            }

            return { installed: false };
        } catch (error) {
            console.error('Error checking Java installation:', error);
            return { installed: false, error: error.message };
        }
    }

    async findLocalJava() {
        const javaExe = process.platform === 'win32' ? 'java.exe' : 'java';
        const possiblePaths = [
            path.join(this.javaPath, 'bin', javaExe),
            path.join(this.javaPath, 'bin', 'javaw.exe') // Windows
        ];

        for (const javaPath of possiblePaths) {
            if (fs.existsSync(javaPath)) {
                return javaPath;
            }
        }

        return null;
    }

    async findSystemJava() {
        try {
            const result = await execAsync('java -version 2>&1');
            if (result.stderr) {
                const versionMatch = result.stderr.match(/version "(.*?)"/);
                if (versionMatch) {
                    return 'java'; // Use system java
                }
            }
        } catch (error) {
            // Java not found in PATH
        }

        return null;
    }

    async getJavaVersion(javaPath) {
        try {
            const result = await execAsync(`"${javaPath}" -version 2>&1`);
            if (result.stderr) {
                const versionMatch = result.stderr.match(/version "(.*?)"/);
                if (versionMatch) {
                    return versionMatch[1];
                }
            }
        } catch (error) {
            console.error('Error getting Java version:', error);
        }

        return null;
    }

    isVersionCompatible(version) {
        if (!version) return false;
        
        // Extract major version
        const majorVersion = parseInt(version.split('.')[0]);
        if (isNaN(majorVersion)) {
            // Handle older versions like 1.8.0
            const legacyMatch = version.match(/1\.(\d+)\./);
            if (legacyMatch) {
                return parseInt(legacyMatch[1]) >= 8;
            }
            return false;
        }

        return majorVersion >= this.requiredVersion;
    }

    async installJava(progressCallback) {
        const platform = process.platform;
        const arch = process.arch;
        
        // Determine the appropriate Java distribution URL
        const javaUrl = this.getJavaDownloadUrl(platform, arch);
        
        if (!javaUrl) {
            throw new Error('Unsupported platform or architecture for Java installation');
        }

        // Create runtime directory
        if (!fs.existsSync(this.javaPath)) {
            fs.mkdirSync(this.javaPath, { recursive: true });
        }

        // Download Java
        const installerPath = path.join(this.javaPath, 'java-installer.exe');
        await this.downloadFile(javaUrl, installerPath, progressCallback);

        // Install Java (simplified - in production you'd want proper installer handling)
        if (platform === 'win32') {
            await this.installJavaWindows(installerPath, progressCallback);
        } else {
            throw new Error('Automatic Java installation not implemented for this platform');
        }

        // Clean up installer
        if (fs.existsSync(installerPath)) {
            fs.unlinkSync(installerPath);
        }

        return await this.findLocalJava();
    }

    getJavaDownloadUrl(platform, arch) {
        // Simplified Java download URLs - in production use Adoptium or similar
        const javaVersion = '17';
        
        if (platform === 'win32') {
            if (arch === 'x64') {
                return `https://github.com/adoptium/temurin${javaVersion}-binaries/releases/download/jdk-${javaVersion}%2Blatest/jdk-${javaVersion}_windows-x64_bin.zip`;
            }
        }
        
        return null;
    }

    async downloadFile(url, dest, progressCallback) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(dest);
            let downloadedBytes = 0;
            let totalBytes = 0;

            https.get(url, (response) => {
                totalBytes = parseInt(response.headers['content-length'], 10);
                
                response.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    if (progressCallback) {
                        progressCallback(downloadedBytes, totalBytes);
                    }
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    resolve();
                });

                file.on('error', (err) => {
                    fs.unlink(dest, () => {});
                    reject(err);
                });
            }).on('error', reject);
        });
    }

    async installJavaWindows(installerPath, progressCallback) {
        // This is a simplified installation process
        // In production, you'd want to use proper MSI/EXE installation
        
        if (progressCallback) {
            progressCallback(0, 100, 'Extracting Java...');
        }

        // For now, we'll assume the user has Java or we'll provide manual installation instructions
        throw new Error('Automatic Java installation requires manual setup. Please install Java 17 or higher manually.');
    }
}

module.exports = JavaManager;