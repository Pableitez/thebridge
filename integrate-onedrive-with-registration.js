// ===== INTEGRATE ONEDRIVE WITH EXISTING REGISTRATION =====

// Integrar el sistema de OneDrive con el registro existente
function integrateOneDriveWithRegistration() {
    console.log('🔧 Integrating OneDrive with existing registration system...');
    
    // 1. Override el botón de registro existente
    function overrideRegisterButton() {
        const registerBtn = document.querySelector('#registerBtn, .register-btn, button[onclick*="register"]');
        if (registerBtn) {
            console.log('🔧 Overriding register button with OneDrive integration...');
            
            // Remover event listeners existentes
            const newRegisterBtn = registerBtn.cloneNode(true);
            registerBtn.parentNode.replaceChild(newRegisterBtn, registerBtn);
            
            // Agregar nuevo event listener
            newRegisterBtn.onclick = async function(e) {
                e.preventDefault();
                
                console.log('🚀 Register button clicked - using OneDrive system...');
                
                // Obtener datos del formulario
                const emailInput = document.querySelector('#registerEmail, input[type="email"], input[name="email"]');
                const passwordInput = document.querySelector('#registerPassword, input[type="password"], input[name="password"]');
                const passwordRepeatInput = document.querySelector('#registerPasswordRepeat, input[name="passwordRepeat"]');
                const nameInput = document.querySelector('#registerName, input[name="name"]');
                const errorElement = document.querySelector('#registerError, .error-message, .status-message');
                
                if (!emailInput || !passwordInput) {
                    console.error('❌ Required form elements not found');
                    return;
                }
                
                const email = emailInput.value.trim().toLowerCase();
                const password = passwordInput.value;
                const passwordRepeat = passwordRepeatInput ? passwordRepeatInput.value : password;
                const name = nameInput ? nameInput.value.trim() : email.split('@')[0];
                
                // Validaciones
                if (!email || !password) {
                    if (errorElement) {
                        errorElement.textContent = 'Email y contraseña son requeridos.';
                        errorElement.style.display = 'block';
                    }
                    return;
                }
                
                if (!isValidEmail(email)) {
                    if (errorElement) {
                        errorElement.textContent = 'Ingresa un email válido.';
                        errorElement.style.display = 'block';
                    }
                    return;
                }
                
                if (password !== passwordRepeat) {
                    if (errorElement) {
                        errorElement.textContent = 'Las contraseñas no coinciden.';
                        errorElement.style.display = 'block';
                    }
                    return;
                }
                
                if (password.length < 6) {
                    if (errorElement) {
                        errorElement.textContent = 'La contraseña debe tener al menos 6 caracteres.';
                        errorElement.style.display = 'block';
                    }
                    return;
                }
                
                // Verificar si el usuario ya existe
                const existingUser = getUserCredentials ? getUserCredentials(email) : null;
                if (existingUser) {
                    if (errorElement) {
                        errorElement.textContent = 'Este email ya está registrado.';
                        errorElement.style.display = 'block';
                    }
                    return;
                }
                
                try {
                    // Mostrar estado de carga
                    if (errorElement) {
                        errorElement.textContent = '🔄 Registrando usuario con OneDrive...';
                        errorElement.style.color = '#3b82f6';
                        errorElement.style.display = 'block';
                    }
                    
                    // Usar sistema de registro de OneDrive
                    if (window.registerUserWithOneDrive) {
                        const result = await window.registerUserWithOneDrive(email, password, name);
                        
                        if (result && result.success) {
                            // Mostrar éxito
                            if (errorElement) {
                                errorElement.textContent = '✅ Usuario registrado exitosamente con OneDrive!';
                                errorElement.style.color = '#10b981';
                                errorElement.style.display = 'block';
                            }
                            
                            // Cerrar modal después de un delay
                            setTimeout(() => {
                                const modal = document.querySelector('.modal-overlay');
                                if (modal) {
                                    modal.classList.add('hidden');
                                }
                            }, 2000);
                            
                            console.log('✅ OneDrive registration successful:', result);
                        } else {
                            throw new Error(result ? result.message : 'Registration failed');
                        }
                    } else {
                        // Fallback al sistema local si OneDrive no está disponible
                        console.warn('⚠️ OneDrive system not available, using local registration');
                        
                        const userData = {
                            id: email,
                            email: email,
                            password: password,
                            name: name,
                            role: 'user',
                            createdAt: new Date().toISOString(),
                            lastLogin: new Date().toISOString()
                        };
                        
                        // Guardar localmente
                        localStorage.setItem(`user_${email}`, JSON.stringify(userData));
                        
                        // Agregar a array de usuarios
                        const users = JSON.parse(localStorage.getItem('thebridge_users') || '[]');
                        users.push(userData);
                        localStorage.setItem('thebridge_users', JSON.stringify(users));
                        
                        // Establecer usuario actual
                        window.currentUser = userData;
                        localStorage.setItem('thebridge_current_user', JSON.stringify(userData));
                        
                        // Mostrar botones de usuario
                        if (typeof window.showLogoutBtn === 'function') {
                            window.showLogoutBtn();
                        }
                        
                        if (errorElement) {
                            errorElement.textContent = '✅ Usuario registrado localmente (OneDrive no disponible)';
                            errorElement.style.color = '#10b981';
                            errorElement.style.display = 'block';
                        }
                    }
                    
                } catch (error) {
                    console.error('❌ Registration error:', error);
                    
                    if (errorElement) {
                        errorElement.textContent = `❌ Error al registrar: ${error.message}`;
                        errorElement.style.color = '#ef4444';
                        errorElement.style.display = 'block';
                    }
                }
            };
            
            console.log('✅ Register button overridden with OneDrive integration');
        } else {
            console.warn('⚠️ Register button not found');
        }
    }
    
    // 2. Override el botón de login existente
    function overrideLoginButton() {
        const loginBtn = document.querySelector('#loginBtn, .login-btn, button[onclick*="login"]');
        if (loginBtn) {
            console.log('🔧 Overriding login button with OneDrive integration...');
            
            // Remover event listeners existentes
            const newLoginBtn = loginBtn.cloneNode(true);
            loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
            
            // Agregar nuevo event listener
            newLoginBtn.onclick = async function(e) {
                e.preventDefault();
                
                console.log('🔐 Login button clicked - using OneDrive system...');
                
                // Obtener datos del formulario
                const emailInput = document.querySelector('#loginEmail, input[type="email"], input[name="email"]');
                const passwordInput = document.querySelector('#loginPassword, input[type="password"], input[name="password"]');
                const errorElement = document.querySelector('#loginError, .error-message, .status-message');
                
                if (!emailInput || !passwordInput) {
                    console.error('❌ Required form elements not found');
                    return;
                }
                
                const email = emailInput.value.trim().toLowerCase();
                const password = passwordInput.value;
                
                // Validaciones
                if (!email || !password) {
                    if (errorElement) {
                        errorElement.textContent = 'Email y contraseña son requeridos.';
                        errorElement.style.display = 'block';
                    }
                    return;
                }
                
                try {
                    // Mostrar estado de carga
                    if (errorElement) {
                        errorElement.textContent = '🔄 Iniciando sesión con OneDrive...';
                        errorElement.style.color = '#3b82f6';
                        errorElement.style.display = 'block';
                    }
                    
                    // Usar sistema de login de OneDrive
                    if (window.loginUserWithOneDrive) {
                        const result = await window.loginUserWithOneDrive(email, password);
                        
                        if (result && result.success) {
                            // Mostrar éxito
                            if (errorElement) {
                                errorElement.textContent = '✅ Login exitoso con OneDrive!';
                                errorElement.style.color = '#10b981';
                                errorElement.style.display = 'block';
                            }
                            
                            // Cerrar modal después de un delay
                            setTimeout(() => {
                                const modal = document.querySelector('.modal-overlay');
                                if (modal) {
                                    modal.classList.add('hidden');
                                }
                            }, 2000);
                            
                            console.log('✅ OneDrive login successful:', result);
                        } else {
                            throw new Error(result ? result.message : 'Login failed');
                        }
                    } else {
                        // Fallback al sistema local
                        console.warn('⚠️ OneDrive system not available, using local login');
                        
                        const userData = localStorage.getItem(`user_${email}`);
                        if (!userData) {
                            throw new Error('Usuario no encontrado');
                        }
                        
                        const user = JSON.parse(userData);
                        if (user.password !== password) {
                            throw new Error('Contraseña incorrecta');
                        }
                        
                        // Establecer usuario actual
                        window.currentUser = user;
                        localStorage.setItem('thebridge_current_user', JSON.stringify(user));
                        
                        // Mostrar botones de usuario
                        if (typeof window.showLogoutBtn === 'function') {
                            window.showLogoutBtn();
                        }
                        
                        if (errorElement) {
                            errorElement.textContent = '✅ Login exitoso (sistema local)';
                            errorElement.style.color = '#10b981';
                            errorElement.style.display = 'block';
                        }
                    }
                    
                } catch (error) {
                    console.error('❌ Login error:', error);
                    
                    if (errorElement) {
                        errorElement.textContent = `❌ Error al iniciar sesión: ${error.message}`;
                        errorElement.style.color = '#ef4444';
                        errorElement.style.display = 'block';
                    }
                }
            };
            
            console.log('✅ Login button overridden with OneDrive integration');
        } else {
            console.warn('⚠️ Login button not found');
        }
    }
    
    // 3. Agregar botón de configuración de OneDrive
    function addOneDriveConfigButton() {
        // Buscar el modal de registro/login
        const modal = document.querySelector('.modal-overlay, .modal, #loginRegisterModal');
        if (modal) {
            // Verificar si ya existe el botón
            if (!document.getElementById('onedriveConfigBtn')) {
                const configBtn = document.createElement('button');
                configBtn.id = 'onedriveConfigBtn';
                configBtn.className = 'secondary-btn';
                configBtn.style.cssText = `
                    margin-top: 1rem;
                    background: #059669;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                `;
                configBtn.textContent = '☁️ Configurar OneDrive';
                configBtn.onclick = function() {
                    if (window.showOneDriveConfiguration) {
                        window.showOneDriveConfiguration();
                    } else {
                        alert('OneDrive Configuration Modal no está disponible');
                    }
                };
                
                // Agregar al modal
                const modalBody = modal.querySelector('.modal-body, .modal-content');
                if (modalBody) {
                    modalBody.appendChild(configBtn);
                    console.log('✅ OneDrive config button added to modal');
                }
            }
        }
    }
    
    // 4. Agregar información de OneDrive al sidebar
    function addOneDriveInfoToSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && !document.getElementById('onedriveInfo')) {
            const infoDiv = document.createElement('div');
            infoDiv.id = 'onedriveInfo';
            infoDiv.style.cssText = `
                padding: 1rem;
                margin: 1rem;
                background: #f0f9ff;
                border: 1px solid #0ea5e9;
                border-radius: 8px;
                font-size: 0.9rem;
            `;
            
            infoDiv.innerHTML = `
                <h4 style="margin: 0 0 0.5rem 0; color: #0c4a6e;">☁️ OneDrive Status</h4>
                <div id="onedriveStatus">Verificando...</div>
                <button onclick="window.syncDataWithOneDrive && window.syncDataWithOneDrive()" 
                        style="margin-top: 0.5rem; background: #0ea5e9; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                    🔄 Sincronizar
                </button>
            `;
            
            sidebar.appendChild(infoDiv);
            
            // Actualizar estado
            updateOneDriveStatus();
            
            console.log('✅ OneDrive info added to sidebar');
        }
    }
    
    // 5. Actualizar estado de OneDrive
    function updateOneDriveStatus() {
        const statusDiv = document.getElementById('onedriveStatus');
        if (statusDiv) {
            try {
                const info = window.getOneDriveRegistrationInfo ? window.getOneDriveRegistrationInfo() : null;
                
                if (info && info.isConfigured) {
                    statusDiv.innerHTML = `
                        <span style="color: #059669;">✅ Configurado</span><br>
                        <small>📁 ${info.config.basePath}</small><br>
                        <small>👤 ${info.currentUser ? info.currentUser.email : 'No logueado'}</small>
                    `;
                } else {
                    statusDiv.innerHTML = `
                        <span style="color: #dc2626;">❌ No configurado</span><br>
                        <small>Usar sistema local</small>
                    `;
                }
            } catch (error) {
                statusDiv.innerHTML = `
                    <span style="color: #dc2626;">❌ Error</span><br>
                    <small>${error.message}</small>
                `;
            }
        }
    }
    
    // 6. Aplicar todas las integraciones
    function applyAllIntegrations() {
        console.log('🔧 Applying all OneDrive integrations...');
        
        // Override botones
        overrideRegisterButton();
        overrideLoginButton();
        
        // Agregar elementos de UI
        addOneDriveConfigButton();
        addOneDriveInfoToSidebar();
        
        // Actualizar estado inicial
        setTimeout(updateOneDriveStatus, 1000);
        
        console.log('✅ All OneDrive integrations applied');
    }
    
    // 7. Aplicar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(applyAllIntegrations, 1000);
        });
    } else {
        setTimeout(applyAllIntegrations, 1000);
    }
    
    // 8. Observar cambios en el DOM para aplicar integraciones cuando aparezcan nuevos elementos
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Verificar si se agregó un modal de registro/login
                        if (node.classList && (node.classList.contains('modal-overlay') || node.classList.contains('modal'))) {
                            setTimeout(() => {
                                overrideRegisterButton();
                                overrideLoginButton();
                                addOneDriveConfigButton();
                            }, 100);
                        }
                        
                        // Verificar si se agregó un sidebar
                        if (node.classList && node.classList.contains('sidebar')) {
                            setTimeout(() => {
                                addOneDriveInfoToSidebar();
                            }, 100);
                        }
                    }
                });
            }
        });
    });
    
    // Observar el documento completo
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('🔧 OneDrive integration with registration system ready');
}

// Aplicar integración automáticamente
integrateOneDriveWithRegistration();

console.log('🔧 OneDrive Registration Integration loaded and applied'); 