// ===== ONEDRIVE CUSTOM PATH INTEGRATION =====

// Sistema avanzado de OneDrive con selección de rutas personalizadas
class OneDriveCustomPathIntegration {
    constructor() {
        // Usar client_id válido registrado en Azure
        this.clientId = 'cc21cd9b-9a60-48c6-be12-268ca3ec7c74';
        this.redirectUri = 'https://pableitez.github.io/the-bridge/';
        this.scopes = ['onedrive.readwrite', 'offline_access'];
        this.accessToken = null;
        this.isAuthenticated = false;
        this.userConfig = this.loadUserConfig();
        
        console.log('🔧 OneDrive Custom Path Integration initialized');
    }
    
    // 1. Configuración del usuario
    loadUserConfig() {
        try {
            const config = localStorage.getItem('onedrive_user_config');
            return config ? JSON.parse(config) : {
                basePath: 'TheBridge',
                usersPath: 'users',
                teamsPath: 'teams',
                configurationsPath: 'configurations',
                backupsPath: 'backups',
                customPaths: {}
            };
        } catch (error) {
            console.warn('⚠️ Error loading user config, using defaults');
            return {
                basePath: 'TheBridge',
                usersPath: 'users',
                teamsPath: 'teams',
                configurationsPath: 'configurations',
                backupsPath: 'backups',
                customPaths: {}
            };
        }
    }
    
    // 2. Guardar configuración del usuario
    saveUserConfig(config) {
        try {
            this.userConfig = { ...this.userConfig, ...config };
            localStorage.setItem('onedrive_user_config', JSON.stringify(this.userConfig));
            console.log('✅ User configuration saved');
            return true;
        } catch (error) {
            console.error('❌ Error saving user config:', error);
            return false;
        }
    }
    
    // 3. Autenticación con Microsoft Graph
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
    
    // 4. Verificar si el token es válido
    isTokenValid() {
        const expiry = localStorage.getItem('onedrive_token_expiry');
        return expiry && Date.now() < parseInt(expiry);
    }
    
    // 5. Obtener token (autenticar si es necesario)
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
    
    // 6. Crear carpeta base personalizada
    async ensureBaseFolder() {
        try {
            const token = await this.getToken();
            
            // Verificar si la carpeta base existe
            const checkResponse = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/root:/${this.userConfig.basePath}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            
            if (checkResponse.ok) {
                console.log(`✅ Base folder '${this.userConfig.basePath}' already exists`);
                return true;
            }
            
            // Crear la carpeta base
            const createResponse = await fetch(
                'https://graph.microsoft.com/v1.0/me/drive/root/children',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: this.userConfig.basePath,
                        folder: {},
                        '@microsoft.graph.conflictBehavior': 'replace'
                    })
                }
            );
            
            if (createResponse.ok) {
                console.log(`✅ Base folder '${this.userConfig.basePath}' created successfully`);
                return true;
            } else {
                throw new Error(`Failed to create base folder '${this.userConfig.basePath}'`);
            }
            
        } catch (error) {
            console.error('❌ Error ensuring base folder:', error);
            return false;
        }
    }
    
    // 7. Crear subcarpetas personalizadas
    async ensureSubFolders() {
        try {
            const token = await this.getToken();
            const subFolders = [
                this.userConfig.usersPath,
                this.userConfig.teamsPath,
                this.userConfig.configurationsPath,
                this.userConfig.backupsPath
            ];
            
            for (const folder of subFolders) {
                const folderPath = `${this.userConfig.basePath}/${folder}`;
                
                // Verificar si existe
                const checkResponse = await fetch(
                    `https://graph.microsoft.com/v1.0/me/drive/root:/${folderPath}`,
                    {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }
                );
                
                if (!checkResponse.ok) {
                    // Crear la subcarpeta
                    const createResponse = await fetch(
                        'https://graph.microsoft.com/v1.0/me/drive/root/children',
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                name: folder,
                                folder: {},
                                '@microsoft.graph.conflictBehavior': 'replace'
                            })
                        }
                    );
                    
                    if (createResponse.ok) {
                        console.log(`✅ Subfolder '${folder}' created successfully`);
                    } else {
                        console.warn(`⚠️ Failed to create subfolder '${folder}'`);
                    }
                } else {
                    console.log(`✅ Subfolder '${folder}' already exists`);
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Error ensuring subfolders:', error);
            return false;
        }
    }
    
    // 8. Guardar usuario con ruta personalizada
    async saveUser(userData, customPath = null) {
        try {
            console.log('💾 Saving user to OneDrive with custom path:', userData.email);
            
            // Asegurar que las carpetas existen
            await this.ensureBaseFolder();
            await this.ensureSubFolders();
            
            const token = await this.getToken();
            
            // Determinar la ruta del archivo
            let filePath;
            if (customPath) {
                // Usar ruta personalizada
                filePath = `${this.userConfig.basePath}/${customPath}/${userData.email}.json`;
            } else {
                // Usar ruta por defecto
                filePath = `${this.userConfig.basePath}/${this.userConfig.usersPath}/${userData.email}.json`;
            }
            
            const response = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/root:/${filePath}:/content`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...userData,
                        lastSync: new Date().toISOString(),
                        syncSource: 'TheBridge',
                        filePath: filePath
                    })
                }
            );
            
            if (response.ok) {
                console.log(`✅ User saved to OneDrive at: ${filePath}`);
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
    
    // 9. Cargar usuario desde ruta personalizada
    async loadUser(email, customPath = null) {
        try {
            console.log('📂 Loading user from OneDrive with custom path:', email);
            
            const token = await this.getToken();
            
            // Determinar la ruta del archivo
            let filePath;
            if (customPath) {
                filePath = `${this.userConfig.basePath}/${customPath}/${email}.json`;
            } else {
                filePath = `${this.userConfig.basePath}/${this.userConfig.usersPath}/${email}.json`;
            }
            
            const response = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/root:/${filePath}:/content`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            
            if (response.ok) {
                const userData = await response.json();
                console.log(`✅ User loaded from OneDrive at: ${filePath}`);
                return userData;
            } else {
                console.warn(`⚠️ User not found in OneDrive at: ${filePath}`);
                return null;
            }
            
        } catch (error) {
            console.error('❌ Error loading user from OneDrive:', error);
            return null;
        }
    }
    
    // 10. Guardar equipo con ruta personalizada
    async saveTeam(teamData, customPath = null) {
        try {
            console.log('💾 Saving team to OneDrive with custom path:', teamData.id);
            
            await this.ensureBaseFolder();
            await this.ensureSubFolders();
            
            const token = await this.getToken();
            
            // Determinar la ruta del archivo
            let filePath;
            if (customPath) {
                filePath = `${this.userConfig.basePath}/${customPath}/${teamData.id}.json`;
            } else {
                filePath = `${this.userConfig.basePath}/${this.userConfig.teamsPath}/${teamData.id}.json`;
            }
            
            const response = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/root:/${filePath}:/content`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...teamData,
                        lastSync: new Date().toISOString(),
                        syncSource: 'TheBridge',
                        filePath: filePath
                    })
                }
            );
            
            if (response.ok) {
                console.log(`✅ Team saved to OneDrive at: ${filePath}`);
                return true;
            } else {
                const error = await response.text();
                throw new Error(`OneDrive save failed: ${error}`);
            }
            
        } catch (error) {
            console.error('❌ Error saving team to OneDrive:', error);
            return false;
        }
    }
    
    // 11. Cargar equipo desde ruta personalizada
    async loadTeam(teamId, customPath = null) {
        try {
            console.log('📂 Loading team from OneDrive with custom path:', teamId);
            
            const token = await this.getToken();
            
            // Determinar la ruta del archivo
            let filePath;
            if (customPath) {
                filePath = `${this.userConfig.basePath}/${customPath}/${teamId}.json`;
            } else {
                filePath = `${this.userConfig.basePath}/${this.userConfig.teamsPath}/${teamId}.json`;
            }
            
            const response = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/root:/${filePath}:/content`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            
            if (response.ok) {
                const teamData = await response.json();
                console.log(`✅ Team loaded from OneDrive at: ${filePath}`);
                return teamData;
            } else {
                console.warn(`⚠️ Team not found in OneDrive at: ${filePath}`);
                return null;
            }
            
        } catch (error) {
            console.error('❌ Error loading team from OneDrive:', error);
            return null;
        }
    }
    
    // 12. Listar archivos en una ruta personalizada
    async listFiles(path = null) {
        try {
            console.log('📋 Listing files from OneDrive path:', path);
            
            const token = await this.getToken();
            
            // Determinar la ruta
            let listPath;
            if (path) {
                listPath = `${this.userConfig.basePath}/${path}`;
            } else {
                listPath = this.userConfig.basePath;
            }
            
            const response = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/root:/${listPath}:/children`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            
            if (response.ok) {
                const result = await response.json();
                const files = result.value.map(file => ({
                    name: file.name,
                    id: file.id,
                    type: file.folder ? 'folder' : 'file',
                    size: file.size,
                    lastModified: file.lastModifiedDateTime
                }));
                
                console.log(`✅ Files listed from OneDrive path: ${listPath}`);
                return files;
            } else {
                throw new Error('Failed to list files from OneDrive');
            }
            
        } catch (error) {
            console.error('❌ Error listing files from OneDrive:', error);
            return [];
        }
    }
    
    // 13. Crear backup con ruta personalizada
    async createBackup(customPath = null) {
        try {
            console.log('🛡️ Creating backup in OneDrive with custom path...');
            
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                source: 'OneDriveCustomPathIntegration',
                config: this.userConfig,
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
            
            const token = await this.getToken();
            
            // Determinar la ruta del backup
            let backupPath;
            if (customPath) {
                backupPath = `${this.userConfig.basePath}/${customPath}/backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            } else {
                backupPath = `${this.userConfig.basePath}/${this.userConfig.backupsPath}/backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            }
            
            const response = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/root:/${backupPath}:/content`,
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
                console.log(`✅ Backup created in OneDrive at: ${backupPath}`);
                return true;
            } else {
                throw new Error('Failed to create backup in OneDrive');
            }
            
        } catch (error) {
            console.error('❌ Error creating backup in OneDrive:', error);
            return false;
        }
    }
    
    // 14. Configurar rutas personalizadas
    async configurePaths(config) {
        try {
            console.log('⚙️ Configuring custom paths:', config);
            
            // Validar configuración
            const requiredFields = ['basePath', 'usersPath', 'teamsPath', 'configurationsPath', 'backupsPath'];
            for (const field of requiredFields) {
                if (!config[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }
            
            // Guardar configuración
            this.saveUserConfig(config);
            
            // Crear las nuevas carpetas
            await this.ensureBaseFolder();
            await this.ensureSubFolders();
            
            console.log('✅ Custom paths configured successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Error configuring custom paths:', error);
            return false;
        }
    }
    
    // 15. Obtener información de la configuración actual
    getCurrentConfig() {
        return { ...this.userConfig };
    }
    
    // 16. Test connection (para el modal)
    async testConnection() {
        try {
            console.log('🔍 Testing OneDrive connection...');
            
            // Verificar si ya estamos autenticados
            if (this.isAuthenticated && this.accessToken) {
                console.log('✅ Already authenticated with OneDrive');
                return true;
            }
            
            // Intentar obtener token
            const token = await this.getToken();
            if (token) {
                console.log('✅ OneDrive connection test successful');
                return true;
            } else {
                console.log('❌ OneDrive connection test failed');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error testing OneDrive connection:', error);
            return false;
        }
    }
    
    // 17. Migrar datos a nueva ruta
    async migrateData(oldPath, newPath) {
        try {
            console.log(`🔄 Migrating data from '${oldPath}' to '${newPath}'`);
            
            const token = await this.getToken();
            
            // Listar archivos en la ruta antigua
            const oldFiles = await this.listFiles(oldPath);
            
            for (const file of oldFiles) {
                if (file.type === 'file') {
                    // Descargar archivo
                    const downloadResponse = await fetch(
                        `https://graph.microsoft.com/v1.0/me/drive/items/${file.id}/content`,
                        {
                            headers: { 'Authorization': `Bearer ${token}` }
                        }
                    );
                    
                    if (downloadResponse.ok) {
                        const fileData = await downloadResponse.json();
                        
                        // Subir a nueva ubicación
                        const newFilePath = `${this.userConfig.basePath}/${newPath}/${file.name}`;
                        const uploadResponse = await fetch(
                            `https://graph.microsoft.com/v1.0/me/drive/root:/${newFilePath}:/content`,
                            {
                                method: 'PUT',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(fileData)
                            }
                        );
                        
                        if (uploadResponse.ok) {
                            console.log(`✅ Migrated: ${file.name}`);
                        } else {
                            console.warn(`⚠️ Failed to migrate: ${file.name}`);
                        }
                    }
                }
            }
            
            console.log('✅ Data migration completed');
            return true;
            
        } catch (error) {
            console.error('❌ Error migrating data:', error);
            return false;
        }
    }
    
    // Save file to OneDrive
    async saveFile(filePath, content) {
        try {
            console.log(`💾 Saving file to OneDrive: ${filePath}`);
            
            if (!this.isAuthenticated) {
                throw new Error('Not authenticated with OneDrive');
            }
            
            const token = await this.getToken();
            
            // Use Microsoft Graph API to upload file
            const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${filePath}:/content`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: content
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save file: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log(`✅ File saved successfully: ${result.name}`);
            return result;
        } catch (error) {
            console.error('❌ Error saving file to OneDrive:', error);
            throw error;
        }
    }
    
    // Load file from OneDrive
    async loadFile(filePath) {
        try {
            console.log(`📂 Loading file from OneDrive: ${filePath}`);
            
            if (!this.isAuthenticated) {
                throw new Error('Not authenticated with OneDrive');
            }
            
            const token = await this.getToken();
            
            // Use Microsoft Graph API to download file
            const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${filePath}:/content`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load file: ${response.statusText}`);
            }
            
            const content = await response.text();
            console.log(`✅ File loaded successfully: ${filePath}`);
            return content;
        } catch (error) {
            console.error('❌ Error loading file from OneDrive:', error);
            throw error;
        }
    }
    
    // Ensure folder exists
    async ensureFolder(folderPath) {
        try {
            const folders = folderPath.split('/').filter(f => f);
            let currentPath = '';
            
            for (const folder of folders) {
                currentPath += `/${folder}`;
                
                try {
                    const token = await this.getToken();
                    
                    // Try to create folder
                    await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:${currentPath}:/children`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: folder,
                            folder: {},
                            '@microsoft.graph.conflictBehavior': 'replace'
                        })
                    });
                } catch (error) {
                    // Folder might already exist, continue
                    console.log(`📁 Folder might already exist: ${currentPath}`);
                }
            }
        } catch (error) {
            console.error('❌ Error ensuring folder:', error);
            throw error;
        }
    }
    
    // Delete file from OneDrive
    async deleteFile(filePath) {
        try {
            console.log(`🗑️ Deleting file from OneDrive: ${filePath}`);
            
            if (!this.isAuthenticated) {
                throw new Error('Not authenticated with OneDrive');
            }
            
            const token = await this.getToken();
            
            const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${filePath}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete file: ${response.statusText}`);
            }
            
            console.log(`✅ File deleted successfully: ${filePath}`);
            return true;
        } catch (error) {
            console.error('❌ Error deleting file from OneDrive:', error);
            throw error;
        }
    }
}

// Exportar la clase al window object
window.OneDriveCustomPathIntegration = OneDriveCustomPathIntegration;

// Inicializar OneDrive Custom Path Integration
window.oneDriveCustomPath = new OneDriveCustomPathIntegration();

// Override funciones existentes para usar el sistema personalizado
window.saveUserToOneDriveCustom = async function(userData, customPath) {
    return await window.oneDriveCustomPath.saveUser(userData, customPath);
};

window.loadUserFromOneDriveCustom = async function(email, customPath) {
    return await window.oneDriveCustomPath.loadUser(email, customPath);
};

window.saveTeamToOneDriveCustom = async function(teamData, customPath) {
    return await window.oneDriveCustomPath.saveTeam(teamData, customPath);
};

window.loadTeamFromOneDriveCustom = async function(teamId, customPath) {
    return await window.oneDriveCustomPath.loadTeam(teamId, customPath);
};

window.configureOneDrivePaths = async function(config) {
    return await window.oneDriveCustomPath.configurePaths(config);
};

window.getOneDriveConfig = function() {
    return window.oneDriveCustomPath.getCurrentConfig();
};

window.createOneDriveBackupCustom = async function(customPath) {
    return await window.oneDriveCustomPath.createBackup(customPath);
};

window.migrateOneDriveData = async function(oldPath, newPath) {
    return await window.oneDriveCustomPath.migrateData(oldPath, newPath);
};

console.log('🔧 OneDrive Custom Path Integration loaded and ready'); 