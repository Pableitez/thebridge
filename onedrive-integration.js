// ===== ONEDRIVE INTEGRATION FOR THE BRIDGE =====

// Sistema de sincronización con OneDrive para reemplazar el backend problemático
class OneDriveIntegration {
    constructor() {
        this.clientId = 'cc21cd9b-9a60-48c6-be12-268ca3ec7c74';
        this.redirectUri = 'https://pableitez.github.io/the-bridge/';
        this.scopes = ['onedrive.readwrite', 'offline_access'];
        this.accessToken = null;
        this.isAuthenticated = false;
        
        console.log('🔧 OneDrive Integration initialized');
    }
    
    // 1. Autenticación con Microsoft Graph
    async authenticate() {
        try {
            console.log('🔐 Starting OneDrive authentication...');
            
            // Verificar si ya tenemos un token válido
            if (this.accessToken && this.isTokenValid()) {
                console.log('✅ Using existing OneDrive token');
                return true;
            }
            
            // Crear URL de autorización
            const authUrl = `https://login.live.com/oauth20_authorize.srf?` +
                `client_id=${this.clientId}&` +
                `response_type=token&` +
                `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
                `scope=${encodeURIComponent(this.scopes.join(' '))}&` +
                `response_mode=fragment`;
            
            // Abrir ventana de autenticación
            const authWindow = window.open(authUrl, 'OneDrive Auth', 
                'width=500,height=600,scrollbars=yes,resizable=yes');
            
            // Esperar respuesta
            return new Promise((resolve, reject) => {
                const checkAuth = setInterval(() => {
                    try {
                        if (authWindow.closed) {
                            clearInterval(checkAuth);
                            reject(new Error('Authentication cancelled'));
                            return;
                        }
                        
                        // Verificar si tenemos el token en la URL
                        const hash = authWindow.location.hash;
                        if (hash && hash.includes('access_token')) {
                            clearInterval(checkAuth);
                            authWindow.close();
                            
                            // Extraer token
                            const params = new URLSearchParams(hash.substring(1));
                            this.accessToken = params.get('access_token');
                            this.isAuthenticated = true;
                            
                            // Guardar token en localStorage
                            localStorage.setItem('onedrive_token', this.accessToken);
                            localStorage.setItem('onedrive_token_expiry', 
                                Date.now() + (3600 * 1000)); // 1 hora
                            
                            console.log('✅ OneDrive authentication successful');
                            resolve(true);
                        }
                    } catch (error) {
                        // Ventana aún cargando
                    }
                }, 100);
            });
            
        } catch (error) {
            console.error('❌ OneDrive authentication failed:', error);
            return false;
        }
    }
    
    // 2. Verificar si el token es válido
    isTokenValid() {
        const expiry = localStorage.getItem('onedrive_token_expiry');
        return expiry && Date.now() < parseInt(expiry);
    }
    
    // 3. Obtener token (autenticar si es necesario)
    async getToken() {
        if (!this.accessToken || !this.isTokenValid()) {
            this.accessToken = localStorage.getItem('onedrive_token');
            if (!this.accessToken || !this.isTokenValid()) {
                const authenticated = await this.authenticate();
                if (!authenticated) {
                    throw new Error('OneDrive authentication failed');
                }
            }
        }
        return this.accessToken;
    }
    
    // 4. Crear carpeta TheBridge en OneDrive
    async ensureTheBridgeFolder() {
        try {
            const token = await this.getToken();
            
            // Verificar si la carpeta existe
            const checkResponse = await fetch(
                'https://graph.microsoft.com/v1.0/me/drive/root:/TheBridge',
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            
            if (checkResponse.ok) {
                console.log('✅ TheBridge folder already exists');
                return true;
            }
            
            // Crear la carpeta
            const createResponse = await fetch(
                'https://graph.microsoft.com/v1.0/me/drive/root/children',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: 'TheBridge',
                        folder: {},
                        '@microsoft.graph.conflictBehavior': 'replace'
                    })
                }
            );
            
            if (createResponse.ok) {
                console.log('✅ TheBridge folder created successfully');
                return true;
            } else {
                throw new Error('Failed to create TheBridge folder');
            }
            
        } catch (error) {
            console.error('❌ Error ensuring TheBridge folder:', error);
            return false;
        }
    }
    
    // 5. Guardar usuario en OneDrive
    async saveUser(userData) {
        try {
            console.log('💾 Saving user to OneDrive:', userData.email);
            
            // Asegurar que la carpeta existe
            await this.ensureTheBridgeFolder();
            
            const token = await this.getToken();
            const filename = `users/${userData.email}.json`;
            
            const response = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/root:/TheBridge/${filename}:/content`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...userData,
                        lastSync: new Date().toISOString(),
                        syncSource: 'TheBridge'
                    })
                }
            );
            
            if (response.ok) {
                console.log('✅ User saved to OneDrive successfully');
                return true;
            } else {
                const error = await response.text();
                throw new Error(`OneDrive save failed: ${error}`);
            }
            
        } catch (error) {
            console.error('❌ Error saving user to OneDrive:', error);
            return false;
        }
    }
    
    // 6. Cargar usuario desde OneDrive
    async loadUser(email) {
        try {
            console.log('📂 Loading user from OneDrive:', email);
            
            const token = await this.getToken();
            const filename = `users/${email}.json`;
            
            const response = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/root:/TheBridge/${filename}:/content`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            
            if (response.ok) {
                const userData = await response.json();
                console.log('✅ User loaded from OneDrive successfully');
                return userData;
            } else {
                console.warn('⚠️ User not found in OneDrive:', email);
                return null;
            }
            
        } catch (error) {
            console.error('❌ Error loading user from OneDrive:', error);
            return null;
        }
    }
    
    // 7. Guardar configuración en OneDrive
    async saveConfiguration(configData, configName = 'default') {
        try {
            console.log('💾 Saving configuration to OneDrive:', configName);
            
            await this.ensureTheBridgeFolder();
            
            const token = await this.getToken();
            const filename = `configurations/${configName}-${new Date().toISOString().split('T')[0]}.json`;
            
            const response = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/root:/TheBridge/${filename}:/content`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...configData,
                        lastSync: new Date().toISOString(),
                        syncSource: 'TheBridge'
                    })
                }
            );
            
            if (response.ok) {
                console.log('✅ Configuration saved to OneDrive successfully');
                return true;
            } else {
                const error = await response.text();
                throw new Error(`OneDrive save failed: ${error}`);
            }
            
        } catch (error) {
            console.error('❌ Error saving configuration to OneDrive:', error);
            return false;
        }
    }
    
    // 8. Cargar configuración desde OneDrive
    async loadConfiguration(configName = 'default') {
        try {
            console.log('📂 Loading configuration from OneDrive:', configName);
            
            const token = await this.getToken();
            
            // Buscar el archivo más reciente
            const response = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/root:/TheBridge/configurations:/children?$filter=startswith(name,'${configName}')&$orderby=lastModifiedDateTime desc&$top=1`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            
            if (response.ok) {
                const result = await response.json();
                if (result.value && result.value.length > 0) {
                    const file = result.value[0];
                    
                    // Descargar el contenido del archivo
                    const contentResponse = await fetch(
                        `https://graph.microsoft.com/v1.0/me/drive/items/${file.id}/content`,
                        {
                            headers: { 'Authorization': `Bearer ${token}` }
                        }
                    );
                    
                    if (contentResponse.ok) {
                        const configData = await contentResponse.json();
                        console.log('✅ Configuration loaded from OneDrive successfully');
                        return configData;
                    }
                }
            }
            
            console.warn('⚠️ Configuration not found in OneDrive:', configName);
            return null;
            
        } catch (error) {
            console.error('❌ Error loading configuration from OneDrive:', error);
            return null;
        }
    }
    
    // 9. Listar todos los usuarios en OneDrive
    async listUsers() {
        try {
            console.log('📋 Listing users from OneDrive...');
            
            const token = await this.getToken();
            
            const response = await fetch(
                'https://graph.microsoft.com/v1.0/me/drive/root:/TheBridge/users:/children',
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            
            if (response.ok) {
                const result = await response.json();
                const users = result.value.map(file => file.name.replace('.json', ''));
                console.log('✅ Users listed from OneDrive:', users);
                return users;
            } else {
                throw new Error('Failed to list users from OneDrive');
            }
            
        } catch (error) {
            console.error('❌ Error listing users from OneDrive:', error);
            return [];
        }
    }
    
    // 10. Crear backup automático
    async createBackup() {
        try {
            console.log('🛡️ Creating backup in OneDrive...');
            
            const backupData = {
                timestamp: new Date().toISOString(),
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
            };
            
            const token = await this.getToken();
            const filename = `backups/backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            
            const response = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/root:/TheBridge/${filename}:/content`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(backupData)
                }
            );
            
            if (response.ok) {
                console.log('✅ Backup created in OneDrive successfully');
                return true;
            } else {
                throw new Error('Failed to create backup in OneDrive');
            }
            
        } catch (error) {
            console.error('❌ Error creating backup in OneDrive:', error);
            return false;
        }
    }
}

// Inicializar OneDrive Integration
window.oneDriveIntegration = new OneDriveIntegration();

// Override funciones existentes para usar OneDrive
window.saveUserToOneDrive = async function(userData) {
    return await window.oneDriveIntegration.saveUser(userData);
};

window.loadUserFromOneDrive = async function(email) {
    return await window.oneDriveIntegration.loadUser(email);
};

window.saveConfigurationToOneDrive = async function(configData, configName) {
    return await window.oneDriveIntegration.saveConfiguration(configData, configName);
};

window.loadConfigurationFromOneDrive = async function(configName) {
    return await window.oneDriveIntegration.loadConfiguration(configName);
};

window.createOneDriveBackup = async function() {
    return await window.oneDriveIntegration.createBackup();
};

console.log('🔧 OneDrive Integration loaded and ready'); 