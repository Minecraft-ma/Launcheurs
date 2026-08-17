// Language loader for internationalization
const fs = require('fs');
const path = require('path');

const LangLoader = {
    currentLang: 'fr_FR',
    langData: null,

    setupLanguage() {
        // Set default language
        this.currentLang = 'fr_FR';
        this.loadLanguageFile();
    },

    loadLanguageFile() {
        try {
            const langPath = path.join(__dirname, '..', 'lang', `${this.currentLang}.json`);
            if (fs.existsSync(langPath)) {
                this.langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));
            } else {
                // Fallback to English
                const enPath = path.join(__dirname, '..', 'lang', 'en_US.json');
                if (fs.existsSync(enPath)) {
                    this.langData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
                }
            }
        } catch (error) {
            console.error('Error loading language file:', error);
            this.langData = {};
        }
    },

    queryJS(key, placeholders = {}) {
        if (!this.langData) return key;
        
        const keys = key.split('.');
        let value = this.langData;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return key;
            }
        }
        
        if (typeof value === 'string') {
            // Replace placeholders
            Object.keys(placeholders).forEach(placeholder => {
                value = value.replace(new RegExp(`{${placeholder}}`, 'g'), placeholders[placeholder]);
            });
            return value;
        }
        
        return key;
    },

    queryEJS(key, placeholders = {}) {
        return this.queryJS(key, placeholders);
    }
};

module.exports = LangLoader;