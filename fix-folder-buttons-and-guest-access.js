// ===== FIX FOLDER BUTTONS AND GUEST ACCESS =====

// Función principal para arreglar todos los problemas
function fixFolderButtonsAndGuestAccess() {
    console.log('🔧 Fixing folder buttons and guest access...');
    
    // 1. Cambiar el color del botón "Save to Folder" de azul a gris
    function fixSaveToFolderButtonColor() {
        console.log('🎨 Fixing Save to Folder button color...');
        
        // Buscar todos los botones "Save to Folder"
        const saveButtons = document.querySelectorAll('#saveToFolderBtn, #saveToFolderBtn_user');
        
        saveButtons.forEach(button => {
            if (button) {
                // Cambiar de primary (azul) a secondary (gris)
                button.classList.remove('primary');
                button.classList.add('secondary');
                
                // Aplicar estilos específicos para que se vea bien
                button.style.cssText = `
                    background-color: #2a2a2a !important;
                    color: #ffffff !important;
                    border: 1px solid #404040 !important;
                    cursor: pointer !important;
                    font-weight: 600 !important;
                    font-size: 0.95em !important;
                    padding: 0.8rem 1.2rem !important;
                    border-radius: 8px !important;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
                    transition: all 0.3s ease !important;
                `;
                
                // Agregar hover effect
                button.addEventListener('mouseenter', () => {
                    button.style.backgroundColor = '#404040 !important';
                    button.style.borderColor = '#606060 !important';
                });
                
                button.addEventListener('mouseleave', () => {
                    button.style.backgroundColor = '#2a2a2a !important';
                    button.style.borderColor = '#404040 !important';
                });
                
                console.log('✅ Save to Folder button color fixed');
            }
        });
    }
    
    // 2. Arreglar la funcionalidad de Save/Load from Folder
    function fixFolderFunctions() {
        console.log('📁 Fixing folder functions...');
        
        // Override executeSaveToFolder para que funcione correctamente
        window.executeSaveToFolder = async function() {
            console.log('💾 Executing Save to Folder (FIXED)...');
            
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
        
        // Override executeLoadFromFolder para que funcione correctamente
        window.executeLoadFromFolder = async function() {
            console.log('📂 Executing Load from Folder (FIXED)...');
            
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
        
        // Función para aplicar configuración desde archivo
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
                
                // Recargar la página para aplicar los cambios
                setTimeout(() => {
                    if (confirm('Configuration loaded successfully! The page will reload to apply all changes. Continue?')) {
                        window.location.reload();
                    }
                }, 1000);
                
            } catch (error) {
                console.error('❌ Error applying configuration:', error);
                throw error;
            }
        };
        
        console.log('✅ Folder functions fixed');
    }
    
    // 3. Permitir acceso a User Setup para usuarios guest
    function fixGuestUserSetupAccess() {
        console.log('👤 Fixing guest user setup access...');
        
        // Override showLoginRegisterModal para permitir acceso a User Setup
        const originalShowLoginRegisterModal = window.showLoginRegisterModal;
        if (originalShowLoginRegisterModal) {
            window.showLoginRegisterModal = function() {
                console.log('🔧 Enhanced showLoginRegisterModal - allowing guest access to User Setup');
                originalShowLoginRegisterModal.call(this);
                
                // Agregar botón de acceso directo para guest
                setTimeout(() => {
                    const modalContent = document.querySelector('.modal-content');
                    if (modalContent) {
                        // Buscar si ya existe el botón de guest
                        let guestButton = document.getElementById('guestUserSetupBtn');
                        if (!guestButton) {
                            guestButton = document.createElement('button');
                            guestButton.id = 'guestUserSetupBtn';
                            guestButton.className = 'modal-btn secondary';
                            guestButton.style.cssText = `
                                background-color: #2a2a2a !important;
                                color: #ffffff !important;
                                border: 1px solid #404040 !important;
                                margin-top: 1rem !important;
                                width: 100% !important;
                                padding: 0.8rem !important;
                                border-radius: 8px !important;
                                font-weight: 600 !important;
                            `;
                            guestButton.textContent = 'Access User Setup as Guest';
                            
                            guestButton.onclick = function() {
                                console.log('👤 Guest accessing User Setup...');
                                
                                // Cerrar el modal de login/registro
                                const loginModal = document.querySelector('.modal-overlay:not(.hidden)');
                                if (loginModal) {
                                    loginModal.classList.add('hidden');
                                }
                                
                                // Mostrar el modal de User Setup
                                if (window.showUserSetUpModal) {
                                    window.showUserSetUpModal();
                                } else {
                                    // Fallback: buscar y mostrar el modal manualmente
                                    const userSetupModal = document.getElementById('userSetUpModal');
                                    if (userSetupModal) {
                                        userSetupModal.classList.remove('hidden');
                                    }
                                }
                            };
                            
                            modalContent.appendChild(guestButton);
                            console.log('✅ Guest User Setup button added');
                        }
                    }
                }, 100);
            };
        }
        
        // También permitir acceso directo al botón User Setup
        const userSetUpBtn = document.getElementById('userSetUpBtn');
        if (userSetUpBtn) {
            const originalClick = userSetUpBtn.onclick;
            userSetUpBtn.onclick = function(e) {
                console.log('🔧 User Setup button clicked - checking if guest access is allowed');
                
                // Permitir acceso para guest
                if (window.showUserSetUpModal) {
                    window.showUserSetUpModal();
                } else {
                    // Fallback: mostrar modal manualmente
                    const userSetupModal = document.getElementById('userSetUpModal');
                    if (userSetupModal) {
                        userSetupModal.classList.remove('hidden');
                    }
                }
            };
            console.log('✅ User Setup button access fixed for guests');
        }
        
        console.log('✅ Guest user setup access fixed');
    }
    
    // 4. Configurar los botones cuando el DOM esté listo
    function setupButtons() {
        console.log('🔧 Setting up buttons...');
        
        // Configurar Save to Folder button
        const saveToFolderBtn = document.getElementById('saveToFolderBtn');
        if (saveToFolderBtn) {
            saveToFolderBtn.onclick = function() {
                console.log('💾 Save to Folder button clicked');
                if (window.executeSaveToFolder) {
                    window.executeSaveToFolder();
                }
            };
            console.log('✅ Save to Folder button configured');
        }
        
        // Configurar Load from Folder button
        const loadFromFolderBtn = document.getElementById('loadFromFolderBtn');
        if (loadFromFolderBtn) {
            loadFromFolderBtn.onclick = function() {
                console.log('📂 Load from Folder button clicked');
                if (window.executeLoadFromFolder) {
                    window.executeLoadFromFolder();
                }
            };
            console.log('✅ Load from Folder button configured');
        }
    }
    
    // 5. Aplicar todos los fixes
    function applyAllFixes() {
        console.log('🔧 Applying all fixes...');
        
        // Aplicar fixes inmediatamente
        fixSaveToFolderButtonColor();
        fixFolderFunctions();
        fixGuestUserSetupAccess();
        setupButtons();
        
        // También aplicar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    fixSaveToFolderButtonColor();
                    setupButtons();
                }, 1000);
            });
        } else {
            setTimeout(() => {
                fixSaveToFolderButtonColor();
                setupButtons();
            }, 1000);
        }
        
        console.log('✅ All fixes applied successfully');
    }
    
    // Aplicar todos los fixes
    applyAllFixes();
}

// Exportar la función para uso global
window.fixFolderButtonsAndGuestAccess = fixFolderButtonsAndGuestAccess;

// Aplicar el fix automáticamente
fixFolderButtonsAndGuestAccess();

console.log('🔧 Folder buttons and guest access fix script loaded and applied'); 