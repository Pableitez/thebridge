// ===== HYBRID STORAGE SYSTEM =====

// Sistema híbrido que combina OneDrive + Local Storage como solución al problema de backend
class HybridStorageSystem {
    constructor() {
        this.storagePriority = [
            'local',      // 1. Local Storage (inmediato)
            'onedrive',   // 2. OneDrive (sincronización)
            'indexeddb',  // 3. IndexedDB (persistencia)
            'cookies'     // 4. Cookies (backup)
        ];
        
        this.syncStatus = {
            local: true,
            onedrive: false,
            indexeddb: false,
            cookies: false
        };
        
        console.log('🔧 Hybrid Storage System initialized');
    }
    
    // 1. Sistema de registro de usuarios híbrido
    async registerUser(email, password, name) {
        try {
            console.log('👤 Registering user with hybrid system:', email);
            
            const userData = {
                id: email,
                email: email,
                password: password, // En producción, hashear
                name: name || email.split('@')[0],
                role: 'user',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                preferences: {
                    theme: 'dark',
                    language: 'es',
                    notifications: true
                }
            };
            
            // Guardar en todos los sistemas disponibles
            const results = await this.saveToAllSystems('user', userData);
            
            // Verificar éxito
            const successCount = Object.values(results).filter(Boolean).length;
            console.log(`✅ User registered in ${successCount}/${Object.keys(results).length} systems`);
            
            // Si al menos local storage funciona, considerar éxito
            if (results.local) {
                // Establecer usuario actual
                window.currentUser = userData;
                localStorage.setItem('thebridge_current_user', JSON.stringify(userData));
                
                // Mostrar botones de usuario
                if (typeof window.showLogoutBtn === 'function') {
                    window.showLogoutBtn();
                }
                
                return {
                    success: true,
                    message: `User registered successfully in ${successCount} systems`,
                    systems: results
                };
            } else {
                throw new Error('Failed to save user in any system');
            }
            
        } catch (error) {
            console.error('❌ Error registering user:', error);
            return {
                success: false,
                message: error.message,
                systems: {}
            };
        }
    }
    
    // 2. Sistema de login híbrido
    async loginUser(email, password) {
        try {
            console.log('🔐 Logging in user with hybrid system:', email);
            
            // Intentar cargar desde todos los sistemas
            const userData = await this.loadFromAllSystems('user', email);
            
            if (!userData) {
                throw new Error('User not found in any system');
            }
            
            // Verificar contraseña
            if (userData.password !== password) {
                throw new Error('Invalid password');
            }
            
            // Actualizar último login
            userData.lastLogin = new Date().toISOString();
            
            // Guardar actualización en todos los sistemas
            await this.saveToAllSystems('user', userData);
            
            // Establecer usuario actual
            window.currentUser = userData;
            localStorage.setItem('thebridge_current_user', JSON.stringify(userData));
            
            // Mostrar botones de usuario
            if (typeof window.showLogoutBtn === 'function') {
                window.showLogoutBtn();
            }
            
            return {
                success: true,
                message: 'Login successful',
                user: userData
            };
            
        } catch (error) {
            console.error('❌ Error logging in user:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // 3. Guardar en todos los sistemas disponibles
    async saveToAllSystems(type, data) {
        const results = {};
        
        for (const system of this.storagePriority) {
            try {
                switch (system) {
                    case 'local':
                        results.local = this.saveToLocalStorage(type, data);
                        break;
                    case 'onedrive':
                        if (window.oneDriveIntegration) {
                            results.onedrive = await this.saveToOneDrive(type, data);
                        } else {
                            results.onedrive = false;
                        }
                        break;
                    case 'indexeddb':
                        results.indexeddb = await this.saveToIndexedDB(type, data);
                        break;
                    case 'cookies':
                        results.cookies = this.saveToCookies(type, data);
                        break;
                }
            } catch (error) {
                console.warn(`⚠️ Failed to save to ${system}:`, error);
                results[system] = false;
            }
        }
        
        return results;
    }
    
    // 4. Cargar desde todos los sistemas disponibles
    async loadFromAllSystems(type, identifier) {
        for (const system of this.storagePriority) {
            try {
                let data = null;
                
                switch (system) {
                    case 'local':
                        data = this.loadFromLocalStorage(type, identifier);
                        break;
                    case 'onedrive':
                        if (window.oneDriveIntegration) {
                            data = await this.loadFromOneDrive(type, identifier);
                        }
                        break;
                    case 'indexeddb':
                        data = await this.loadFromIndexedDB(type, identifier);
                        break;
                    case 'cookies':
                        data = this.loadFromCookies(type, identifier);
                        break;
                }
                
                if (data) {
                    console.log(`✅ Data loaded from ${system}`);
                    return data;
                }
            } catch (error) {
                console.warn(`⚠️ Failed to load from ${system}:`, error);
            }
        }
        
        return null;
    }
    
    // 5. Guardar en Local Storage
    saveToLocalStorage(type, data) {
        try {
            const key = `${type}_${data.email || data.id}`;
            localStorage.setItem(key, JSON.stringify(data));
            
            // También guardar en arrays para fácil acceso
            if (type === 'user') {
                const users = JSON.parse(localStorage.getItem('thebridge_users') || '[]');
                const existingIndex = users.findIndex(u => u.email === data.email);
                
                if (existingIndex !== -1) {
                    users[existingIndex] = { ...users[existingIndex], ...data };
                } else {
                    users.push(data);
                }
                
                localStorage.setItem('thebridge_users', JSON.stringify(users));
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error saving to localStorage:', error);
            return false;
        }
    }
    
    // 6. Cargar desde Local Storage
    loadFromLocalStorage(type, identifier) {
        try {
            const key = `${type}_${identifier}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('❌ Error loading from localStorage:', error);
            return null;
        }
    }
    
    // 7. Guardar en OneDrive
    async saveToOneDrive(type, data) {
        try {
            if (!window.oneDriveIntegration) {
                return false;
            }
            
            if (type === 'user') {
                return await window.oneDriveIntegration.saveUser(data);
            } else if (type === 'configuration') {
                return await window.oneDriveIntegration.saveConfiguration(data, data.name || 'default');
            }
            
            return false;
        } catch (error) {
            console.error('❌ Error saving to OneDrive:', error);
            return false;
        }
    }
    
    // 8. Cargar desde OneDrive
    async loadFromOneDrive(type, identifier) {
        try {
            if (!window.oneDriveIntegration) {
                return null;
            }
            
            if (type === 'user') {
                return await window.oneDriveIntegration.loadUser(identifier);
            } else if (type === 'configuration') {
                return await window.oneDriveIntegration.loadConfiguration(identifier);
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error loading from OneDrive:', error);
            return null;
        }
    }
    
    // 9. Guardar en IndexedDB
    async saveToIndexedDB(type, data) {
        try {
            const db = await this.openIndexedDB();
            const transaction = db.transaction([type], 'readwrite');
            const store = transaction.objectStore(type);
            
            await store.put(data);
            return true;
        } catch (error) {
            console.error('❌ Error saving to IndexedDB:', error);
            return false;
        }
    }
    
    // 10. Cargar desde IndexedDB
    async loadFromIndexedDB(type, identifier) {
        try {
            const db = await this.openIndexedDB();
            const transaction = db.transaction([type], 'readonly');
            const store = transaction.objectStore(type);
            
            const data = await store.get(identifier);
            return data || null;
        } catch (error) {
            console.error('❌ Error loading from IndexedDB:', error);
            return null;
        }
    }
    
    // 11. Abrir IndexedDB
    async openIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('TheBridgeDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Crear object stores
                if (!db.objectStoreNames.contains('user')) {
                    db.createObjectStore('user', { keyPath: 'email' });
                }
                if (!db.objectStoreNames.contains('configuration')) {
                    db.createObjectStore('configuration', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('team')) {
                    db.createObjectStore('team', { keyPath: 'id' });
                }
            };
        });
    }
    
    // 12. Guardar en Cookies
    saveToCookies(type, data) {
        try {
            const key = `thebridge_${type}_${data.email || data.id}`;
            const value = JSON.stringify(data);
            
            // Cookie con expiración de 30 días
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 30);
            
            document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expiry.toUTCString()}; path=/`;
            return true;
        } catch (error) {
            console.error('❌ Error saving to cookies:', error);
            return false;
        }
    }
    
    // 13. Cargar desde Cookies
    loadFromCookies(type, identifier) {
        try {
            const key = `thebridge_${type}_${identifier}`;
            const cookies = document.cookie.split(';');
            
            for (const cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === key) {
                    return JSON.parse(decodeURIComponent(value));
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error loading from cookies:', error);
            return null;
        }
    }
    
    // 14. Sincronizar todos los sistemas
    async syncAllSystems() {
        console.log('🔄 Syncing all storage systems...');
        
        try {
            // Obtener datos del sistema principal (local storage)
            const users = JSON.parse(localStorage.getItem('thebridge_users') || '[]');
            const currentUser = JSON.parse(localStorage.getItem('thebridge_current_user') || '{}');
            const teams = JSON.parse(localStorage.getItem('thebridge_teams') || '[]');
            
            // Sincronizar usuarios
            for (const user of users) {
                await this.saveToAllSystems('user', user);
            }
            
            // Sincronizar equipo actual
            if (currentUser.id) {
                await this.saveToAllSystems('user', currentUser);
            }
            
            // Sincronizar equipos
            for (const team of teams) {
                await this.saveToAllSystems('team', team);
            }
            
            console.log('✅ All systems synced successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Error syncing systems:', error);
            return false;
        }
    }
    
    // 15. Crear backup completo
    async createBackup() {
        console.log('🛡️ Creating complete backup...');
        
        try {
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                source: 'HybridStorageSystem',
                data: {
                    users: JSON.parse(localStorage.getItem('thebridge_users') || '[]'),
                    currentUser: JSON.parse(localStorage.getItem('thebridge_current_user') || '{}'),
                    teams: JSON.parse(localStorage.getItem('thebridge_teams') || '[]'),
                    configurations: {
                        filters: JSON.parse(localStorage.getItem('thebridge_filters') || '{}'),
                        tableViews: JSON.parse(localStorage.getItem('tableViews') || '{}'),
                        columnConfig: JSON.parse(localStorage.getItem('thebridge_column_config') || '{}'),
                        customSummaries: JSON.parse(localStorage.getItem('customSummaries') || '{}'),
                        favorites: JSON.parse(localStorage.getItem('thebridge_favorites') || '[]')
                    }
                }
            };
            
            // Guardar backup en todos los sistemas
            const results = await this.saveToAllSystems('backup', backupData);
            
            // Si OneDrive está disponible, crear backup específico
            if (window.oneDriveIntegration) {
                await window.oneDriveIntegration.createBackup();
            }
            
            console.log('✅ Complete backup created successfully');
            return results;
            
        } catch (error) {
            console.error('❌ Error creating backup:', error);
            return false;
        }
    }
    
    // 16. Restaurar desde backup
    async restoreFromBackup(backupData) {
        console.log('🔄 Restoring from backup...');
        
        try {
            if (backupData.data) {
                // Restaurar usuarios
                if (backupData.data.users) {
                    localStorage.setItem('thebridge_users', JSON.stringify(backupData.data.users));
                }
                
                // Restaurar usuario actual
                if (backupData.data.currentUser) {
                    localStorage.setItem('thebridge_current_user', JSON.stringify(backupData.data.currentUser));
                    window.currentUser = backupData.data.currentUser;
                }
                
                // Restaurar equipos
                if (backupData.data.teams) {
                    localStorage.setItem('thebridge_teams', JSON.stringify(backupData.data.teams));
                }
                
                // Restaurar configuraciones
                if (backupData.data.configurations) {
                    const configs = backupData.data.configurations;
                    if (configs.filters) localStorage.setItem('thebridge_filters', JSON.stringify(configs.filters));
                    if (configs.tableViews) localStorage.setItem('tableViews', JSON.stringify(configs.tableViews));
                    if (configs.columnConfig) localStorage.setItem('thebridge_column_config', JSON.stringify(configs.columnConfig));
                    if (configs.customSummaries) localStorage.setItem('customSummaries', JSON.stringify(configs.customSummaries));
                    if (configs.favorites) localStorage.setItem('thebridge_favorites', JSON.stringify(configs.favorites));
                }
                
                console.log('✅ Backup restored successfully');
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Error restoring backup:', error);
            return false;
        }
    }
}

// Inicializar sistema híbrido
window.hybridStorage = new HybridStorageSystem();

// Override funciones existentes para usar el sistema híbrido
window.registerUserHybrid = async function(email, password, name) {
    return await window.hybridStorage.registerUser(email, password, name);
};

window.loginUserHybrid = async function(email, password) {
    return await window.hybridStorage.loginUser(email, password);
};

window.syncAllSystems = async function() {
    return await window.hybridStorage.syncAllSystems();
};

window.createHybridBackup = async function() {
    return await window.hybridStorage.createBackup();
};

window.restoreFromHybridBackup = async function(backupData) {
    return await window.hybridStorage.restoreFromBackup(backupData);
};

console.log('🔧 Hybrid Storage System loaded and ready'); 