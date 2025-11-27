// ===== FIX LOAD WITHOUT RELOAD AND GUEST LOGIN =====

// Función para arreglar la carga sin reload y evitar login en guest mode
function fixLoadWithoutReloadAndGuestLogin() {
    console.log('🔧 Fixing load without reload and guest login issues...');
    
    // 1. Arreglar la función applyConfigurationFromFile para no hacer reload
    function fixApplyConfigurationFromFile() {
        console.log('🔄 Fixing applyConfigurationFromFile to avoid page reload...');
        
        // Override la función applyConfigurationFromFile
        window.applyConfigurationFromFile = async function(config) {
            console.log('🔄 Applying configuration from file (NO RELOAD)...');
            
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
                
                // Aplicar cambios dinámicamente sin recargar la página
                try {
                    // Aplicar tema si cambió
                    if (config.theme && typeof applyTheme === 'function') {
                        applyTheme(config.theme);
                    }
                    
                    // Aplicar idioma si cambió
                    if (config.language && typeof applyLanguage === 'function') {
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
                    
                    // Recargar equipos si existen
                    if (config.teams && typeof loadTeams === 'function') {
                        loadTeams();
                    }
                    
                    // Recargar equipo actual si existe
                    if (config.currentTeam && typeof setCurrentTeam === 'function') {
                        setCurrentTeam(config.currentTeam);
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
        
        console.log('✅ applyConfigurationFromFile fixed to avoid page reload');
    }
    
    // 2. Evitar que aparezca el modal de login en guest mode
    function fixGuestModeLoginModal() {
        console.log('👤 Fixing guest mode login modal...');
        
        // Override showLoginRegisterModal para guest mode
        const originalShowLoginRegisterModal = window.showLoginRegisterModal;
        if (originalShowLoginRegisterModal) {
            window.showLoginRegisterModal = function() {
                console.log('🔧 Enhanced showLoginRegisterModal - checking guest mode...');
                
                // Verificar si estamos en guest mode
                const isGuestMode = !window.currentUser || 
                                   (window.currentUser && window.currentUser.role === 'guest') ||
                                   !localStorage.getItem('thebridge_current_user');
                
                if (isGuestMode) {
                    console.log('👤 Guest mode detected - showing User Setup directly');
                    
                    // En guest mode, mostrar User Setup directamente
                    if (window.showUserSetUpModal) {
                        window.showUserSetUpModal();
                    } else {
                        // Fallback: buscar y mostrar el modal manualmente
                        const userSetupModal = document.getElementById('userSetUpModal');
                        if (userSetupModal) {
                            userSetupModal.classList.remove('hidden');
                        }
                    }
                } else {
                    console.log('👤 Registered user mode - showing login modal');
                    // Para usuarios registrados, mostrar el modal normal
                    originalShowLoginRegisterModal.call(this);
                }
            };
        }
        
        // También arreglar el botón User Setup para guest mode
        const userSetUpBtn = document.getElementById('userSetUpBtn');
        if (userSetUpBtn) {
            const originalClick = userSetUpBtn.onclick;
            userSetUpBtn.onclick = function(e) {
                console.log('🔧 User Setup button clicked - checking guest mode...');
                
                // Verificar si estamos en guest mode
                const isGuestMode = !window.currentUser || 
                                   (window.currentUser && window.currentUser.role === 'guest') ||
                                   !localStorage.getItem('thebridge_current_user');
                
                if (isGuestMode) {
                    console.log('👤 Guest mode - showing User Setup directly');
                    // En guest mode, mostrar User Setup directamente
                    if (window.showUserSetUpModal) {
                        window.showUserSetUpModal();
                    } else {
                        // Fallback: mostrar modal manualmente
                        const userSetupModal = document.getElementById('userSetUpModal');
                        if (userSetupModal) {
                            userSetupModal.classList.remove('hidden');
                        }
                    }
                } else {
                    console.log('👤 Registered user - showing login modal');
                    // Para usuarios registrados, mostrar el modal normal
                    if (originalClick) {
                        originalClick.call(this, e);
                    } else {
                        if (window.showLoginRegisterModal) {
                            window.showLoginRegisterModal();
                        }
                    }
                }
            };
        }
        
        console.log('✅ Guest mode login modal fixed');
    }
    
    // 3. Aplicar todos los fixes
    function applyAllFixes() {
        console.log('🔧 Applying all load and guest fixes...');
        
        // Aplicar fixes inmediatamente
        fixApplyConfigurationFromFile();
        fixGuestModeLoginModal();
        
        // También aplicar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    fixApplyConfigurationFromFile();
                    fixGuestModeLoginModal();
                }, 1000);
            });
        } else {
            setTimeout(() => {
                fixApplyConfigurationFromFile();
                fixGuestModeLoginModal();
            }, 1000);
        }
        
        console.log('✅ All load and guest fixes applied');
    }
    
    // Aplicar todos los fixes
    applyAllFixes();
}

// Exportar la función para uso global
window.fixLoadWithoutReloadAndGuestLogin = fixLoadWithoutReloadAndGuestLogin;

// Aplicar el fix automáticamente
fixLoadWithoutReloadAndGuestLogin();

console.log('🔧 Load without reload and guest login fix script loaded and applied'); 