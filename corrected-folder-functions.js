// ===== CORRECTED SAVE/LOAD TO/FROM FOLDER FUNCTIONS =====

// Función para guardar configuración a archivo JSON (CORREGIDA)
async function executeSaveToFolder() {
    console.log('💾 Executing Save to Folder (CORRECTED)...');
    
    try {
        // Obtener información del usuario y equipo
        let userEmail = 'default@user.com';
        let teamId = 'default-team';
        let userName = 'Default User';
        let teamName = 'Default Team';
        
        // Obtener información del usuario
        if (window.currentUser && window.currentUser.email) {
            userEmail = window.currentUser.email;
            userName = window.currentUser.name || 'User';
        } else {
            try {
                const storedUser = localStorage.getItem('thebridge_current_user');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    if (parsedUser && parsedUser.email) {
                        userEmail = parsedUser.email;
                        userName = parsedUser.name || 'User';
                    }
                }
            } catch (e) {
                console.log('⚠️ Error parsing stored user:', e);
            }
        }
        
        // Obtener información del equipo
        if (window.currentTeam && window.currentTeam.id) {
            teamId = window.currentTeam.id;
            teamName = window.currentTeam.name || 'Team';
        } else {
            try {
                const storedTeam = localStorage.getItem('thebridge_current_team');
                if (storedTeam) {
                    const parsedTeam = JSON.parse(storedTeam);
                    if (parsedTeam && parsedTeam.id) {
                        teamId = parsedTeam.id;
                        teamName = parsedTeam.name || 'Team';
                    }
                }
            } catch (e) {
                console.log('⚠️ Error parsing stored team:', e);
            }
        }
        
        // Recopilar toda la configuración actual (CON CLAVES CORRECTAS)
        const config = {
            // Información del usuario y equipo
            userInfo: {
                email: userEmail,
                name: userName,
                teamId: teamId,
                teamName: teamName
            },
            
            // Configuración de equipos (todos los equipos del usuario)
            teams: JSON.parse(localStorage.getItem('thebridge_teams') || '[]'),
            currentTeam: JSON.parse(localStorage.getItem('thebridge_current_team') || '{}'),
            
            // Configuración de filtros
            filters: JSON.parse(localStorage.getItem('thebridge_filters') || '{}'),
            quickFilters: JSON.parse(localStorage.getItem('quickFilters') || '{}'),
            
            // Configuración de vistas de tabla (usar la clave correcta)
            tableViews: JSON.parse(localStorage.getItem('tableViews') || '{}'),
            currentTableView: localStorage.getItem('thebridge_current_table_view'),
            
            // Configuración de columnas
            columnConfig: JSON.parse(localStorage.getItem('thebridge_column_config') || '{}'),
            visibleColumns: JSON.parse(localStorage.getItem('thebridge_visible_columns') || '[]'),
            columnOrder: JSON.parse(localStorage.getItem('thebridge_column_order') || '[]'),
            
            // Configuración de resúmenes personalizados (usar la clave correcta)
            customSummaries: JSON.parse(localStorage.getItem('customSummaries') || '{}'),
            
            // Favoritos
            favorites: JSON.parse(localStorage.getItem('thebridge_favorites') || '[]'),
            
            // Configuración de tema y idioma
            theme: localStorage.getItem('thebridge_theme') || 'dark',
            language: localStorage.getItem('thebridge_language') || 'es',
            
            // Configuración de auto-save
            autoSave: window.autoSaveEnabled !== undefined ? window.autoSaveEnabled : true,
            
            // Configuración de backend
            backendUrl: window.backendUrl || 'https://the-bridge-9g01.onrender.com',
            
            // Metadatos
            timestamp: new Date().toISOString(),
            version: '1.0',
            description: `Configuration exported from The Bridge for ${userName} (${userEmail}) in team ${teamName}`
        };
        
        console.log('📊 Configuration to save:', config);
        
        // Crear nombre de archivo con timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `the-bridge-config-${userEmail}-${teamId}-${timestamp}.json`;
        
        // Crear blob y descargar
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ Configuration saved to file:', filename);
        
        // Mostrar notificación de éxito
        if (typeof showNotification === 'function') {
            showNotification('Configuration saved to file successfully!', 'success');
        } else {
            alert('✅ Configuration saved to file successfully!');
        }
        
    } catch (error) {
        console.error('❌ Error saving to file:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error saving configuration to file.', 'error');
        } else {
            alert('❌ Error saving configuration to file.');
        }
    }
}

// Función para cargar configuración desde archivo JSON
async function executeLoadFromFolder() {
    console.log('📂 Executing Load from Folder...');
    
    try {
        // Crear input file oculto
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        
        // Manejar la selección de archivo
        fileInput.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                // Leer el archivo
                const text = await file.text();
                const config = JSON.parse(text);
                
                console.log('📂 Loading configuration from file:', file.name);
                console.log('📊 Configuration loaded:', config);
                
                // Validar que es un archivo de configuración válido
                if (!config.userInfo || !config.timestamp) {
                    throw new Error('Invalid configuration file format');
                }
                
                // Aplicar la configuración
                await applyConfigurationFromFile(config);
                
                // Mostrar notificación de éxito
                if (typeof showNotification === 'function') {
                    showNotification('Configuration loaded from file successfully!', 'success');
                } else {
                    alert('✅ Configuration loaded from file successfully!');
                }
                
            } catch (error) {
                console.error('❌ Error loading from file:', error);
                if (typeof showNotification === 'function') {
                    showNotification('Error loading configuration from file. Invalid format.', 'error');
                } else {
                    alert('❌ Error loading configuration from file. Invalid format.');
                }
            }
            
            // Limpiar el input
            document.body.removeChild(fileInput);
        };
        
        // Agregar al DOM y hacer click
        document.body.appendChild(fileInput);
        fileInput.click();
        
    } catch (error) {
        console.error('❌ Error setting up file input:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error setting up file selection.', 'error');
        } else {
            alert('❌ Error setting up file selection.');
        }
    }
}

// Función para aplicar configuración desde archivo (CORREGIDA)
async function applyConfigurationFromFile(config) {
    console.log('🔄 Applying configuration from file (CORRECTED)...');
    
    try {
        // Aplicar configuración de equipos
        if (config.teams) {
            localStorage.setItem('thebridge_teams', JSON.stringify(config.teams));
            console.log('✅ Teams applied:', config.teams);
        }
        
        if (config.currentTeam) {
            localStorage.setItem('thebridge_current_team', JSON.stringify(config.currentTeam));
            console.log('✅ Current team applied:', config.currentTeam);
        }
        
        // Aplicar configuración de filtros
        if (config.filters) {
            localStorage.setItem('thebridge_filters', JSON.stringify(config.filters));
            console.log('✅ Filters applied');
        }
        
        if (config.quickFilters) {
            localStorage.setItem('quickFilters', JSON.stringify(config.quickFilters));
            console.log('✅ Quick filters applied');
        }
        
        // Aplicar configuración de vistas de tabla (usar la clave correcta)
        if (config.tableViews) {
            localStorage.setItem('tableViews', JSON.stringify(config.tableViews));
            console.log('✅ Table views applied:', config.tableViews);
        }
        
        if (config.currentTableView) {
            localStorage.setItem('thebridge_current_table_view', config.currentTableView);
            console.log('✅ Current table view applied:', config.currentTableView);
        }
        
        // Aplicar configuración de columnas
        if (config.columnConfig) {
            localStorage.setItem('thebridge_column_config', JSON.stringify(config.columnConfig));
            console.log('✅ Column config applied');
        }
        
        if (config.visibleColumns) {
            localStorage.setItem('thebridge_visible_columns', JSON.stringify(config.visibleColumns));
            console.log('✅ Visible columns applied:', config.visibleColumns);
        }
        
        if (config.columnOrder) {
            localStorage.setItem('thebridge_column_order', JSON.stringify(config.columnOrder));
            console.log('✅ Column order applied');
        }
        
        // Aplicar configuración de resúmenes personalizados (usar la clave correcta)
        if (config.customSummaries) {
            localStorage.setItem('customSummaries', JSON.stringify(config.customSummaries));
            console.log('✅ Custom summaries applied:', config.customSummaries);
        }
        
        // Aplicar favoritos
        if (config.favorites) {
            localStorage.setItem('thebridge_favorites', JSON.stringify(config.favorites));
            console.log('✅ Favorites applied');
        }
        
        // Aplicar configuración de tema y idioma
        if (config.theme) {
            localStorage.setItem('thebridge_theme', config.theme);
            console.log('✅ Theme applied:', config.theme);
        }
        
        if (config.language) {
            localStorage.setItem('thebridge_language', config.language);
            console.log('✅ Language applied:', config.language);
        }
        
        // Aplicar configuración de auto-save
        if (config.autoSave !== undefined) {
            window.autoSaveEnabled = config.autoSave;
            if (typeof window.toggleAutoSave === 'function') {
                window.toggleAutoSave(config.autoSave);
            }
            console.log('✅ Auto-save applied:', config.autoSave);
        }
        
        // Aplicar configuración de backend
        if (config.backendUrl) {
            window.backendUrl = config.backendUrl;
            console.log('✅ Backend URL applied:', config.backendUrl);
        }
        
        // Recargar la página para aplicar todos los cambios
        console.log('🔄 Configuration applied, reloading page...');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error applying configuration:', error);
        throw error;
    }
}

// Make corrected folder functions available globally
window.executeSaveToFolder = executeSaveToFolder;
window.executeLoadFromFolder = executeLoadFromFolder; 