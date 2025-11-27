// ===== FIX DASHBOARD FOLDER BUTTONS =====

// Función para arreglar los botones de folder en el dashboard
function fixDashboardFolderButtons() {
    console.log('🔧 Fixing dashboard folder buttons...');
    
    // 1. Arreglar el estilo de los botones para que se vean iguales
    function fixButtonStyles() {
        console.log('🎨 Fixing button styles...');
        
        // Botones a arreglar
        const buttons = [
            'saveDashboardConfigBtn',
            'loadDashboardConfigBtn', 
            'saveToFolderBtn_user',
            'loadFromFolderBtn_user'
        ];
        
        buttons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                console.log(`🎨 Fixing style for ${buttonId}...`);
                
                // Remover estilos inline problemáticos
                button.removeAttribute('style');
                
                // Aplicar estilo consistente
                const isPrimary = buttonId.includes('Backend') || buttonId === 'saveToFolderBtn_user';
                const buttonClass = isPrimary ? 'primary' : 'secondary';
                
                // Remover clases existentes
                button.className = `modal-btn ${buttonClass}`;
                
                // Aplicar estilos consistentes
                button.style.cssText = `
                    cursor: pointer !important;
                    pointer-events: auto !important;
                    z-index: 9999 !important;
                    font-weight: 600 !important;
                    font-size: 0.9em !important;
                    padding: 0.8rem 1rem !important;
                    border-radius: 8px !important;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
                    transition: all 0.3s ease !important;
                    min-width: 140px !important;
                    max-width: 160px !important;
                    text-align: center !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    height: 44px !important;
                    box-sizing: border-box !important;
                `;
                
                console.log(`✅ Style fixed for ${buttonId}`);
            } else {
                console.log(`⚠️ Button ${buttonId} not found`);
            }
        });
    }
    
    // 2. Arreglar la funcionalidad de los botones
    function fixButtonFunctionality() {
        console.log('🔧 Fixing button functionality...');
        
        // Configurar Save to Folder button
        const saveToFolderBtn = document.getElementById('saveToFolderBtn_user');
        if (saveToFolderBtn) {
            // Remover event listeners existentes
            const newSaveBtn = saveToFolderBtn.cloneNode(true);
            saveToFolderBtn.parentNode.replaceChild(newSaveBtn, saveToFolderBtn);
            
            // Agregar nuevo event listener
            newSaveBtn.onclick = function() {
                console.log('💾 Save to Folder button clicked (dashboard)');
                if (window.executeSaveToFolder) {
                    window.executeSaveToFolder();
                } else {
                    console.error('❌ executeSaveToFolder function not found');
                    alert('Save to Folder function not available');
                }
            };
            console.log('✅ Save to Folder button functionality fixed');
        }
        
        // Configurar Load from Folder button
        const loadFromFolderBtn = document.getElementById('loadFromFolderBtn_user');
        if (loadFromFolderBtn) {
            // Remover event listeners existentes
            const newLoadBtn = loadFromFolderBtn.cloneNode(true);
            loadFromFolderBtn.parentNode.replaceChild(newLoadBtn, loadFromFolderBtn);
            
            // Agregar nuevo event listener
            newLoadBtn.onclick = function() {
                console.log('📂 Load from Folder button clicked (dashboard)');
                if (window.executeLoadFromFolder) {
                    window.executeLoadFromFolder();
                } else {
                    console.error('❌ executeLoadFromFolder function not found');
                    alert('Load from Folder function not available');
                }
            };
            console.log('✅ Load from Folder button functionality fixed');
        }
    }
    
    // 3. Asegurar que las funciones de folder estén disponibles
    function ensureFolderFunctions() {
        console.log('🔧 Ensuring folder functions are available...');
        
        // Si las funciones no existen, crearlas
        if (!window.executeSaveToFolder) {
            console.log('📁 Creating executeSaveToFolder function...');
            window.executeSaveToFolder = async function() {
                console.log('💾 Executing Save to Folder (DASHBOARD)...');
                
                try {
                    // Obtener información del usuario y equipo
                    let userEmail = 'guest@user.com';
                    let teamId = 'guest-team';
                    let userName = 'Guest User';
                    let teamName = 'Guest Team';
                    
                    // Obtener información del usuario si está disponible
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
                    
                    // Obtener información del equipo si está disponible
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
                    
                    // Recopilar toda la configuración actual
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
                        
                        // Configuración de vistas de tabla
                        tableViews: JSON.parse(localStorage.getItem('tableViews') || '{}'),
                        currentTableView: localStorage.getItem('thebridge_current_table_view'),
                        
                        // Configuración de columnas
                        columnConfig: JSON.parse(localStorage.getItem('thebridge_column_config') || '{}'),
                        visibleColumns: JSON.parse(localStorage.getItem('thebridge_visible_columns') || '[]'),
                        columnOrder: JSON.parse(localStorage.getItem('thebridge_column_order') || '[]'),
                        
                        // Configuración de resúmenes personalizados
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
            };
        }
        
        if (!window.executeLoadFromFolder) {
            console.log('📁 Creating executeLoadFromFolder function...');
            window.executeLoadFromFolder = async function() {
                console.log('📂 Executing Load from Folder (DASHBOARD)...');
                
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
            };
        }
        
        if (!window.applyConfigurationFromFile) {
            console.log('📁 Creating applyConfigurationFromFile function...');
            window.applyConfigurationFromFile = async function(config) {
                console.log('🔄 Applying configuration from file...');
                
                try {
                    // Aplicar configuración de filtros
                    if (config.filters) {
                        localStorage.setItem('thebridge_filters', JSON.stringify(config.filters));
                    }
                    
                    if (config.quickFilters) {
                        localStorage.setItem('quickFilters', JSON.stringify(config.quickFilters));
                    }
                    
                    // Aplicar configuración de vistas de tabla
                    if (config.tableViews) {
                        localStorage.setItem('tableViews', JSON.stringify(config.tableViews));
                    }
                    
                    if (config.currentTableView) {
                        localStorage.setItem('thebridge_current_table_view', config.currentTableView);
                    }
                    
                    // Aplicar configuración de columnas
                    if (config.columnConfig) {
                        localStorage.setItem('thebridge_column_config', JSON.stringify(config.columnConfig));
                    }
                    
                    if (config.visibleColumns) {
                        localStorage.setItem('thebridge_visible_columns', JSON.stringify(config.visibleColumns));
                    }
                    
                    if (config.columnOrder) {
                        localStorage.setItem('thebridge_column_order', JSON.stringify(config.columnOrder));
                    }
                    
                    // Aplicar configuración de resúmenes personalizados
                    if (config.customSummaries) {
                        localStorage.setItem('customSummaries', JSON.stringify(config.customSummaries));
                    }
                    
                    // Aplicar favoritos
                    if (config.favorites) {
                        localStorage.setItem('thebridge_favorites', JSON.stringify(config.favorites));
                    }
                    
                    // Aplicar configuración de tema y idioma
                    if (config.theme) {
                        localStorage.setItem('thebridge_theme', config.theme);
                    }
                    
                    if (config.language) {
                        localStorage.setItem('thebridge_language', config.language);
                    }
                    
                    // Aplicar configuración de auto-save
                    if (config.autoSave !== undefined) {
                        window.autoSaveEnabled = config.autoSave;
                        localStorage.setItem('thebridge_auto_save', JSON.stringify(config.autoSave));
                    }
                    
                    // Aplicar configuración de backend
                    if (config.backendUrl) {
                        window.backendUrl = config.backendUrl;
                        localStorage.setItem('thebridge_backend_url', config.backendUrl);
                    }
                    
                    console.log('✅ Configuration applied successfully');
                    
                    // Aplicar cambios sin recargar la página
                    try {
                        // Aplicar tema si cambió
                        if (config.theme) {
                            applyTheme(config.theme);
                        }
                        
                        // Aplicar idioma si cambió
                        if (config.language) {
                            applyLanguage(config.language);
                        }
                        
                        // Recargar filtros si existen
                        if (config.filters && typeof loadFilters === 'function') {
                            loadFilters();
                        }
                        
                        // Recargar vistas de tabla si existen
                        if (config.tableViews && typeof loadTableViews === 'function') {
                            loadTableViews();
                        }
                        
                        // Recargar columnas si existen
                        if (config.columnConfig && typeof applyColumnConfiguration === 'function') {
                            applyColumnConfiguration(config.columnConfig);
                        }
                        
                        // Recargar resúmenes si existen
                        if (config.customSummaries && typeof loadCustomSummaries === 'function') {
                            loadCustomSummaries();
                        }
                        
                        // Recargar favoritos si existen
                        if (config.favorites && typeof loadFavorites === 'function') {
                            loadFavorites();
                        }
                        
                        console.log('✅ All configuration changes applied without page reload');
                        
                        // Mostrar notificación de éxito
                        if (typeof showNotification === 'function') {
                            showNotification('Configuration loaded successfully! All changes applied.', 'success');
                        } else {
                            alert('✅ Configuration loaded successfully! All changes applied.');
                        }
                        
                    } catch (error) {
                        console.warn('⚠️ Some configuration changes may require manual refresh:', error);
                        
                        // Mostrar notificación con opción de recarga manual
                        if (typeof showNotification === 'function') {
                            showNotification('Configuration loaded! Some changes may require manual refresh.', 'info');
                        } else {
                            alert('✅ Configuration loaded! Some changes may require manual refresh.');
                        }
                    }
                    
                } catch (error) {
                    console.error('❌ Error applying configuration:', error);
                    throw error;
                }
            };
        }
        
        console.log('✅ Folder functions ensured');
    }
    
    // 4. Aplicar todos los fixes
    function applyAllFixes() {
        console.log('🔧 Applying all dashboard folder button fixes...');
        
        // Aplicar fixes inmediatamente
        fixButtonStyles();
        fixButtonFunctionality();
        ensureFolderFunctions();
        
        // También aplicar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    fixButtonStyles();
                    fixButtonFunctionality();
                }, 1000);
            });
        } else {
            setTimeout(() => {
                fixButtonStyles();
                fixButtonFunctionality();
            }, 1000);
        }
        
        // Observar cambios en el DOM para aplicar el fix si los botones se recrean
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.id === 'saveToFolderBtn_user' || 
                                node.id === 'loadFromFolderBtn_user' ||
                                (node.querySelector && (node.querySelector('#saveToFolderBtn_user') || node.querySelector('#loadFromFolderBtn_user')))) {
                                console.log('🔄 Dashboard folder buttons detected, applying fix...');
                                setTimeout(() => {
                                    fixButtonStyles();
                                    fixButtonFunctionality();
                                }, 50);
                            }
                        }
                    });
                }
            });
        });
        
        // Observar el modal de User Setup para detectar cambios
        const userSetupModal = document.getElementById('userSetUpModal');
        if (userSetupModal) {
            observer.observe(userSetupModal, {
                childList: true,
                subtree: true
            });
        }
        
        console.log('✅ All dashboard folder button fixes applied');
    }
    
    // Aplicar todos los fixes
    applyAllFixes();
}

// Exportar la función para uso global
window.fixDashboardFolderButtons = fixDashboardFolderButtons;

// Aplicar el fix automáticamente
fixDashboardFolderButtons();

console.log('🔧 Dashboard folder buttons fix script loaded and applied'); 