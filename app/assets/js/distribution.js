// Distribution system for remote configuration
const https = require('https');
const fs = require('fs');
const path = require('path');

class DistributionManager {
    constructor(distributionUrl) {
        this.distributionUrl = distributionUrl;
        this.distributionData = null;
    }

    async fetchDistribution() {
        return new Promise((resolve, reject) => {
            https.get(this.distributionUrl, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }

                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        this.distributionData = JSON.parse(data);
                        resolve(this.distributionData);
                    } catch (e) {
                        reject(new Error('Invalid JSON'));
                    }
                });
            }).on('error', reject);
        });
    }

    getServerConfig() {
        if (!this.distributionData) return null;
        return this.distributionData.servers || [];
    }

    getNews() {
        if (!this.distributionData) return [];
        return this.distributionData.news || [];
    }

    getMinecraftVersion() {
        if (!this.distributionData) return null;
        return this.distributionData.minecraftVersion || '1.20.1';
    }

    getForgeVersion() {
        if (!this.distributionData) return null;
        return this.distributionData.forgeVersion || '47.4.10';
    }
}

module.exports = DistributionManager;