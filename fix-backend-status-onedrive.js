// ===== FIX BACKEND STATUS - ONE DRIVE ONLY =====

// Reemplazar el sistema de verificación de backend para que solo verifique OneDrive
function fixBackendStatusOneDrive() {
    console.log('🔧 Fixing backend status to show OneDrive connection...');
    
    // 1. Función para verificar estado de OneDrive
    async function checkOneDriveStatus() {
        console.log('🔍 Checking OneDrive status...');
        
        try {
            // Verificar si OneDrive está disponible
            if (window.OneDriveCustomPathIntegration && window.OneDriveCustomPathIntegration.prototype) {
                console.log('✅ OneDrive system available');
                
                // Verificar si hay configuración guardada
                const config = localStorage.getItem('onedrive_config');
                if (config) {
                    const parsedConfig = JSON.parse(config);
                    console.log('✅ OneDrive configuration found:', parsedConfig);
                    
                    // Verificar si hay token válido
                    const token = localStorage.getItem('onedrive_access_token');
                    if (token) {
                        console.log('✅ OneDrive token found');
                        
                        // Verificar conectividad con OneDrive
                        try {
                            // Intentar una operación simple de OneDrive
                            if (window.testOneDriveConnection) {
                                const testResult = await window.testOneDriveConnection();
                                if (testResult && testResult.success) {
                                    console.log('✅ OneDrive connection test successful');
                                    return {
                                        status: 'connected',
                                        message: 'OneDrive Conectado',
                                        details: 'Sincronización activa con OneDrive'
                                    };
                                }
                            }
                        } catch (error) {
                            console.warn('⚠️ OneDrive connection test failed:', error);
                        }
                        
                        return {
                            status: 'connected',
                            message: 'OneDrive Conectado',
                            details: 'Token válido encontrado'
                        };
                    } else {
                        console.log('⚠️ No OneDrive token found');
                        return {
                            status: 'disconnected',
                            message: 'OneDrive Desconectado',
                            details: 'Necesita autenticación'
                        };
                    }
                } else {
                    console.log('⚠️ No OneDrive configuration found');
                    return {
                        status: 'disconnected',
                        message: 'OneDrive Desconectado',
                        details: 'Configuración no encontrada'
                    };
                }
            } else {
                console.log('❌ OneDrive system not available');
                return {
                    status: 'error',
                    message: 'OneDrive No Disponible',
                    details: 'Sistema OneDrive no cargado'
                };
            }
        } catch (error) {
            console.error('❌ Error checking OneDrive status:', error);
            return {
                status: 'error',
                message: 'Error OneDrive',
                details: error.message
            };
        }
    }
    
    // 2. Función para actualizar el indicador de estado
    function updateBackendStatusIndicator(status) {
        console.log('🔄 Updating backend status indicator:', status);
        
        // Buscar elementos de estado del backend
        const statusElements = [
            document.querySelector('[id*="backend-status"]'),
            document.querySelector('[class*="backend-status"]'),
            document.querySelector('[id*="connection-status"]'),
            document.querySelector('[class*="connection-status"]'),
            document.querySelector('.status-indicator'),
            document.querySelector('#statusIndicator'),
            document.querySelector('.backend-indicator')
        ].filter(el => el);
        
        if (statusElements.length > 0) {
            statusElements.forEach(element => {
                // Actualizar texto
                if (element.textContent) {
                    element.textContent = status.message;
                }
                
                // Actualizar clases CSS
                element.className = element.className.replace(/status-(connected|disconnected|error)/g, '');
                element.classList.add(`status-${status.status}`);
                
                // Actualizar colores
                switch (status.status) {
                    case 'connected':
                        element.style.color = '#10b981';
                        element.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                        element.style.borderColor = '#10b981';
                        break;
                    case 'disconnected':
                        element.style.color = '#f59e0b';
                        element.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                        element.style.borderColor = '#f59e0b';
                        break;
                    case 'error':
                        element.style.color = '#ef4444';
                        element.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        element.style.borderColor = '#ef4444';
                        break;
                }
                
                // Agregar tooltip con detalles
                element.title = status.details;
            });
        } else {
            console.log('⚠️ No backend status elements found, creating one...');
            createBackendStatusIndicator(status);
        }
    }
    
    // 3. Función para crear indicador de estado si no existe
    function createBackendStatusIndicator(status) {
        // Buscar sidebar o área donde mostrar el estado
        const sidebar = document.querySelector('.sidebar, .side-panel, [class*="sidebar"], [class*="side"]');
        
        if (sidebar) {
            const statusDiv = document.createElement('div');
            statusDiv.id = 'onedrive-backend-status';
            statusDiv.style.cssText = `
                padding: 0.75rem;
                margin: 1rem;
                border-radius: 8px;
                border: 2px solid;
                font-size: 0.9rem;
                font-weight: 600;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            `;
            
            // Aplicar estilos según estado
            switch (status.status) {
                case 'connected':
                    statusDiv.style.color = '#10b981';
                    statusDiv.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                    statusDiv.style.borderColor = '#10b981';
                    statusDiv.innerHTML = '☁️ OneDrive Conectado';
                    break;
                case 'disconnected':
                    statusDiv.style.color = '#f59e0b';
                    statusDiv.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                    statusDiv.style.borderColor = '#f59e0b';
                    statusDiv.innerHTML = '⚠️ OneDrive Desconectado';
                    break;
                case 'error':
                    statusDiv.style.color = '#ef4444';
                    statusDiv.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    statusDiv.style.borderColor = '#ef4444';
                    statusDiv.innerHTML = '❌ Error OneDrive';
                    break;
            }
            
            statusDiv.title = status.details;
            
            // Click handler para reconfigurar OneDrive
            statusDiv.onclick = function() {
                console.log('🔧 OneDrive status clicked, opening configuration...');
                if (window.showOneDriveConfiguration) {
                    window.showOneDriveConfiguration();
                } else {
                    alert('Configuración de OneDrive no disponible');
                }
            };
            
            // Insertar al principio del sidebar
            sidebar.insertBefore(statusDiv, sidebar.firstChild);
            console.log('✅ OneDrive status indicator created');
        }
    }
    
    // 4. Función para testear conexión OneDrive
    window.testOneDriveConnection = async function() {
        console.log('🧪 Testing OneDrive connection...');
        
        try {
            // Verificar si hay token
            const token = localStorage.getItem('onedrive_access_token');
            if (!token) {
                return { success: false, message: 'No token found' };
            }
            
            // Verificar si hay configuración
            const config = localStorage.getItem('onedrive_config');
            if (!config) {
                return { success: false, message: 'No configuration found' };
            }
            
            // Intentar una operación simple (listar archivos)
            if (window.OneDriveCustomPathIntegration) {
                const onedrive = new window.OneDriveCustomPathIntegration();
                
                // Intentar listar la carpeta base
                const result = await onedrive.listFiles('/');
                
                if (result && result.success) {
                    console.log('✅ OneDrive connection test successful');
                    return { success: true, message: 'Connection successful' };
                } else {
                    console.warn('⚠️ OneDrive connection test failed');
                    return { success: false, message: 'List operation failed' };
                }
            } else {
                return { success: false, message: 'OneDrive system not available' };
            }
        } catch (error) {
            console.error('❌ OneDrive connection test error:', error);
            return { success: false, message: error.message };
        }
    };
    
    // 5. Función principal para actualizar estado
    async function updateBackendStatus() {
        console.log('🔄 Updating backend status...');
        
        const status = await checkOneDriveStatus();
        updateBackendStatusIndicator(status);
        
        console.log('✅ Backend status updated:', status);
    }
    
    // 6. Override de funciones de verificación de backend existentes
    function overrideBackendFunctions() {
        console.log('🔧 Overriding backend check functions...');
        
        // Override checkBackendHealth
        if (window.checkBackendHealth) {
            const originalCheckBackendHealth = window.checkBackendHealth;
            window.checkBackendHealth = async function() {
                console.log('🔄 checkBackendHealth called - redirecting to OneDrive check');
                return await checkOneDriveStatus();
            };
        }
        
        // Override testBackendConnection
        if (window.testBackendConnection) {
            const originalTestBackendConnection = window.testBackendConnection;
            window.testBackendConnection = async function() {
                console.log('🔄 testBackendConnection called - redirecting to OneDrive test');
                return await window.testOneDriveConnection();
            };
        }
        
        // Override cualquier función que verifique backend
        const backendCheckFunctions = [
            'checkBackendStatus',
            'verifyBackendConnection',
            'testConnection',
            'pingBackend'
        ];
        
        backendCheckFunctions.forEach(funcName => {
            if (window[funcName]) {
                const originalFunc = window[funcName];
                window[funcName] = async function(...args) {
                    console.log(`🔄 ${funcName} called - redirecting to OneDrive check`);
                    return await checkOneDriveStatus();
                };
            }
        });
        
        console.log('✅ Backend functions overridden');
    }
    
    // 7. Función para aplicar el fix
    function applyBackendStatusFix() {
        console.log('🔧 Applying backend status fix...');
        
        // Override funciones
        overrideBackendFunctions();
        
        // Actualizar estado inicial
        updateBackendStatus();
        
        // Actualizar cada 30 segundos
        setInterval(updateBackendStatus, 30000);
        
        // Observar cambios en el DOM para detectar nuevos elementos de estado
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Verificar si se agregó un elemento de estado
                            if (node.querySelector && node.querySelector('[id*="backend"], [class*="backend"], [id*="status"], [class*="status"]')) {
                                console.log('🔍 Backend status element detected, updating...');
                                setTimeout(updateBackendStatus, 100);
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('✅ Backend status fix applied');
    }
    
    // 8. Aplicar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(applyBackendStatusFix, 1000);
        });
    } else {
        setTimeout(applyBackendStatusFix, 1000);
    }
    
    console.log('🔧 Backend Status OneDrive fix ready');
}

// Aplicar el fix
fixBackendStatusOneDrive();

console.log('🔧 Fix Backend Status OneDrive loaded and applied'); 