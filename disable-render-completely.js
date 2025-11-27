// ===== DISABLE RENDER COMPLETELY - ONE DRIVE ONLY =====

// Desactivar completamente Render y usar solo OneDrive
function disableRenderCompletely() {
    console.log('🚫 DISABLING RENDER COMPLETELY - ONE DRIVE ONLY MODE');
    
    // 1. Desactivar todas las funciones de backend
    function disableBackendFunctions() {
        console.log('🔧 Disabling all backend functions...');
        
        // Override todas las funciones de backend para que fallen inmediatamente
        const backendFunctions = [
            'saveUserProfile',
            'loadUserProfile',
            'registerUserWithBackend',
            'saveUserCredentials',
            'getUserCredentials',
            'saveTeamToBackend',
            'loadTeamFromBackend',
            'saveConfigurationToBackend',
            'loadConfigurationFromBackend'
        ];
        
        backendFunctions.forEach(funcName => {
            if (window[funcName]) {
                const originalFunc = window[funcName];
                window[funcName] = async function(...args) {
                    console.log(`🚫 BLOCKED: ${funcName} - Backend disabled, using OneDrive only`);
                    throw new Error(`Backend function ${funcName} is disabled. Use OneDrive instead.`);
                };
                console.log(`✅ Disabled: ${funcName}`);
            }
        });
        
        // Override fetch para bloquear llamadas al backend
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            if (typeof url === 'string' && (url.includes('localhost:3000') || url.includes('render.com') || url.includes('/api/'))) {
                console.log(`🚫 BLOCKED: Backend request to ${url}`);
                throw new Error('Backend requests are disabled. Use OneDrive instead.');
            }
            return originalFetch(url, options);
        };
        
        console.log('✅ All backend functions disabled');
    }
    
    // 2. Forzar configuración de OneDrive
    function forceOneDriveConfiguration() {
        console.log('☁️ Forcing OneDrive configuration...');
        
        // Establecer configuración por defecto de OneDrive
        const defaultConfig = {
            basePath: 'TheBridge',
            usersPath: 'users',
            teamsPath: 'teams',
            configurationsPath: 'configurations',
            backupsPath: 'backups',
            customPaths: {}
        };
        
        // Guardar configuración por defecto
        localStorage.setItem('onedrive_user_config', JSON.stringify(defaultConfig));
        
        // Marcar OneDrive como configurado
        localStorage.setItem('onedrive_configured', 'true');
        
        console.log('✅ OneDrive configuration forced');
    }
    
    // 3. Override funciones de registro para usar solo OneDrive
    function overrideRegistrationForOneDriveOnly() {
        console.log('🔧 Overriding registration for OneDrive only...');
        
        // Override saveUserCredentials para usar OneDrive
        window.saveUserCredentials = async function(email, password, name) {
            console.log('☁️ Using OneDrive for user registration:', email);
            
            const userData = {
                id: email,
                email: email,
                password: password,
                name: name || email.split('@')[0],
                role: 'user',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                storageType: 'onedrive'
            };
            
            // Guardar localmente
            localStorage.setItem(`user_${email}`, JSON.stringify(userData));
            
            // Agregar a array de usuarios
            const users = JSON.parse(localStorage.getItem('thebridge_users') || '[]');
            const existingIndex = users.findIndex(u => u.email === email);
            
            if (existingIndex !== -1) {
                users[existingIndex] = userData;
            } else {
                users.push(userData);
            }
            
            localStorage.setItem('thebridge_users', JSON.stringify(users));
            
            // Intentar guardar en OneDrive si está disponible
            if (window.saveUserToOneDriveCustom) {
                try {
                    await window.saveUserToOneDriveCustom(userData);
                    console.log('✅ User saved to OneDrive');
                } catch (error) {
                    console.warn('⚠️ OneDrive save failed, but user saved locally:', error);
                }
            }
            
            return true;
        };
        
        // Override getUserCredentials para usar OneDrive
        window.getUserCredentials = function(email) {
            console.log('☁️ Loading user from OneDrive/local:', email);
            
            // Intentar cargar desde OneDrive primero
            if (window.loadUserFromOneDriveCustom) {
                // Esto se manejará de forma asíncrona
                return null; // Por ahora, cargar desde local
            }
            
            // Cargar desde local storage
            const userData = localStorage.getItem(`user_${email}`);
            return userData ? JSON.parse(userData) : null;
        };
        
        // Override saveUserProfile para usar OneDrive
        window.saveUserProfile = async function(userData) {
            console.log('☁️ Saving user profile to OneDrive:', userData.email);
            
            // Guardar localmente
            localStorage.setItem(`user_${userData.email}`, JSON.stringify(userData));
            
            // Intentar guardar en OneDrive
            if (window.saveUserToOneDriveCustom) {
                try {
                    await window.saveUserToOneDriveCustom(userData);
                    console.log('✅ User profile saved to OneDrive');
                    return true;
                } catch (error) {
                    console.warn('⚠️ OneDrive save failed, but profile saved locally:', error);
                    return false;
                }
            }
            
            return true;
        };
        
        // Override loadUserProfile para usar OneDrive
        window.loadUserProfile = async function(email) {
            console.log('☁️ Loading user profile from OneDrive:', email);
            
            // Intentar cargar desde OneDrive primero
            if (window.loadUserFromOneDriveCustom) {
                try {
                    const userData = await window.loadUserFromOneDriveCustom(email);
                    if (userData) {
                        console.log('✅ User profile loaded from OneDrive');
                        return userData;
                    }
                } catch (error) {
                    console.warn('⚠️ OneDrive load failed, trying local:', error);
                }
            }
            
            // Cargar desde local storage
            const userData = localStorage.getItem(`user_${email}`);
            if (userData) {
                console.log('✅ User profile loaded from local storage');
                return JSON.parse(userData);
            }
            
            return null;
        };
        
        console.log('✅ Registration functions overridden for OneDrive only');
    }
    
    // 4. Desactivar verificaciones de backend
    function disableBackendChecks() {
        console.log('🔧 Disabling backend connectivity checks...');
        
        // Override funciones de verificación de backend
        window.checkBackendHealth = function() {
            console.log('🚫 Backend health check disabled - OneDrive only mode');
            return false;
        };
        
        window.testBackendConnection = function() {
            console.log('🚫 Backend connection test disabled - OneDrive only mode');
            return false;
        };
        
        // Override window.backendUrl para que no se use
        Object.defineProperty(window, 'backendUrl', {
            get: function() {
                console.log('🚫 Backend URL access blocked - OneDrive only mode');
                return null;
            },
            set: function(value) {
                console.log('🚫 Backend URL setting blocked - OneDrive only mode');
            }
        });
        
        console.log('✅ Backend checks disabled');
    }
    
    // 5. Forzar modo offline/OneDrive
    function forceOfflineMode() {
        console.log('🔧 Forcing offline/OneDrive mode...');
        
        // Marcar como modo offline
        localStorage.setItem('thebridge_offline_mode', 'true');
        localStorage.setItem('thebridge_storage_type', 'onedrive');
        
        // Override navigator.onLine para simular offline
        Object.defineProperty(navigator, 'onLine', {
            get: function() {
                return false; // Forzar modo offline
            }
        });
        
        console.log('✅ Offline/OneDrive mode forced');
    }
    
    // 6. Mostrar mensaje de estado
    function showOneDriveOnlyStatus() {
        console.log('☁️ ONE DRIVE ONLY MODE ACTIVATED');
        console.log('✅ Backend completely disabled');
        console.log('✅ All data will be stored in OneDrive + local storage');
        console.log('✅ No more Render dependencies');
        
        // Crear elemento de estado en la página
        const statusDiv = document.createElement('div');
        statusDiv.id = 'onedriveOnlyStatus';
        statusDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #059669;
            color: white;
            padding: 10px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        statusDiv.innerHTML = `
            ☁️ ONE DRIVE ONLY MODE<br>
            🚫 Backend disabled<br>
            ✅ OneDrive active
        `;
        
        document.body.appendChild(statusDiv);
        
        // Remover después de 5 segundos
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.parentNode.removeChild(statusDiv);
            }
        }, 5000);
    }
    
    // 7. Aplicar todas las desactivaciones
    function applyAllDisablements() {
        console.log('🚫 APPLYING COMPLETE RENDER DISABLEMENT...');
        
        disableBackendFunctions();
        forceOneDriveConfiguration();
        overrideRegistrationForOneDriveOnly();
        disableBackendChecks();
        forceOfflineMode();
        showOneDriveOnlyStatus();
        
        console.log('✅ RENDER COMPLETELY DISABLED - ONE DRIVE ONLY MODE ACTIVE');
    }
    
    // 8. Aplicar inmediatamente
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(applyAllDisablements, 1000);
        });
    } else {
        setTimeout(applyAllDisablements, 1000);
    }
    
    // 9. Aplicar también después de un delay para asegurar
    setTimeout(applyAllDisablements, 2000);
    setTimeout(applyAllDisablements, 5000);
    
    console.log('🚫 Render disablement system ready');
}

// Aplicar desactivación automáticamente
disableRenderCompletely();

console.log('🚫 RENDER COMPLETELY DISABLED - ONE DRIVE ONLY MODE'); 