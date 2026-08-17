// Account Manager for multi-account support
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AccountManager {
    constructor(appDataPath) {
        this.appDataPath = appDataPath;
        this.accountsFile = path.join(appDataPath, 'accounts.json');
        this.selectedAccountFile = path.join(appDataPath, 'selected-account.json');
        this.accounts = [];
        this.selectedAccount = null;
        
        this.loadAccounts();
    }

    loadAccounts() {
        try {
            if (fs.existsSync(this.accountsFile)) {
                const data = fs.readFileSync(this.accountsFile, 'utf8');
                this.accounts = JSON.parse(data);
            }
            
            if (fs.existsSync(this.selectedAccountFile)) {
                const data = fs.readFileSync(this.selectedAccountFile, 'utf8');
                this.selectedAccount = JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading accounts:', error);
            this.accounts = [];
            this.selectedAccount = null;
        }
    }

    saveAccounts() {
        try {
            fs.writeFileSync(this.accountsFile, JSON.stringify(this.accounts, null, 2));
        } catch (error) {
            console.error('Error saving accounts:', error);
        }
    }

    saveSelectedAccount() {
        try {
            if (this.selectedAccount) {
                fs.writeFileSync(this.selectedAccountFile, JSON.stringify(this.selectedAccount, null, 2));
            } else if (fs.existsSync(this.selectedAccountFile)) {
                fs.unlinkSync(this.selectedAccountFile);
            }
        } catch (error) {
            console.error('Error saving selected account:', error);
        }
    }

    addMicrosoftAccount(accountData) {
        const account = {
            id: this.generateAccountId(),
            type: 'microsoft',
            accessToken: accountData.accessToken,
            refreshToken: accountData.refreshToken,
            username: accountData.username,
            uuid: accountData.uuid,
            profile: accountData.profile || {},
            addedAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        };

        // Check if account already exists
        const existingIndex = this.accounts.findIndex(acc => acc.uuid === account.uuid);
        if (existingIndex >= 0) {
            // Update existing account
            this.accounts[existingIndex] = { ...this.accounts[existingIndex], ...account };
        } else {
            // Add new account
            this.accounts.push(account);
        }

        this.saveAccounts();
        this.selectAccount(account.id);
        
        return account;
    }

    addOfflineAccount(username) {
        const account = {
            id: this.generateAccountId(),
            type: 'offline',
            username: username,
            uuid: this.generateOfflineUUID(username),
            profile: {},
            addedAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        };

        // Check if account already exists
        const existingIndex = this.accounts.findIndex(acc => 
            acc.type === 'offline' && acc.username === username
        );
        if (existingIndex >= 0) {
            // Update existing account
            this.accounts[existingIndex] = { ...this.accounts[existingIndex], ...account };
        } else {
            // Add new account
            this.accounts.push(account);
        }

        this.saveAccounts();
        this.selectAccount(account.id);
        
        return account;
    }

    removeAccount(accountId) {
        const index = this.accounts.findIndex(acc => acc.id === accountId);
        if (index >= 0) {
            const isLastAccount = this.accounts.length === 1;
            const wasSelected = this.selectedAccount && this.selectedAccount.id === accountId;
            
            this.accounts.splice(index, 1);
            this.saveAccounts();
            
            if (wasSelected) {
                if (this.accounts.length > 0) {
                    this.selectAccount(this.accounts[0].id);
                } else {
                    this.selectedAccount = null;
                    this.saveSelectedAccount();
                }
            }
            
            return { success: true, isLastAccount };
        }
        
        return { success: false, error: 'Account not found' };
    }

    selectAccount(accountId) {
        const account = this.accounts.find(acc => acc.id === accountId);
        if (account) {
            this.selectedAccount = account;
            account.lastUsed = new Date().toISOString();
            this.saveAccounts();
            this.saveSelectedAccount();
            return true;
        }
        return false;
    }

    getSelectedAccount() {
        return this.selectedAccount;
    }

    getAllAccounts() {
        return this.accounts;
    }

    getAccountById(accountId) {
        return this.accounts.find(acc => acc.id === accountId);
    }

    updateAccount(accountId, updates) {
        const index = this.accounts.findIndex(acc => acc.id === accountId);
        if (index >= 0) {
            this.accounts[index] = { ...this.accounts[index], ...updates };
            this.saveAccounts();
            
            if (this.selectedAccount && this.selectedAccount.id === accountId) {
                this.selectedAccount = this.accounts[index];
                this.saveSelectedAccount();
            }
            
            return true;
        }
        return false;
    }

    generateAccountId() {
        return crypto.randomBytes(16).toString('hex');
    }

    generateOfflineUUID(username) {
        // Generate a consistent UUID for offline accounts based on username
        const data = `OfflinePlayer:${username}`;
        return crypto.createHash('md5').update(data).digest('hex').replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5');
    }

    refreshAccessToken(accountId) {
        // This would implement token refresh logic for Microsoft accounts
        // For now, it's a placeholder
        const account = this.getAccountById(accountId);
        if (account && account.type === 'microsoft') {
            // Implement token refresh here
            console.log('Token refresh would be implemented here');
        }
    }
}

module.exports = AccountManager;