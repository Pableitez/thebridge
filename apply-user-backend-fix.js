// ===== APPLY USER BACKEND FIX TO MAIN FILE =====

// Script para aplicar automáticamente el fix al archivo principal
function applyUserBackendFix() {
    console.log('🔧 Applying user backend fix to main file...');
    
    // 1. Verificar que estamos en el contexto correcto
    if (typeof window === 'undefined') {
        console.log('❌ This script must run in a browser environment');
        return false;
    }
    
    // 2. Aplicar el fix de configuración del backend
    function applyBackendConfigFix() {
        console.log('🔧 Applying backend configuration fix...');
        
        // Asegurar que la configuración del backend esté correcta
        if (!window.backendConfig) {
            console.log('⚠️ Backend config not found, creating fallback...');
            window.backendConfig = {
                isProduction: window.location.hostname === 'pableitez.github.io',
                isDevelopment: !(window.location.hostname === 'pableitez.github.io'),
                currentUrls: {
                    main: window.location.hostname === 'pableitez.github.io' 
                        ? 'https://the-bridge-9g01.onrender.com' 
                        : 'http://localhost:3000',
                    csv: window.location.hostname === 'pableitez.github.io' 
                        ? 'https://the-bridge-9g01.onrender.com' 
                        : 'http://localhost:3005'
                },
                getMainBackendUrl() { return this.currentUrls.main; },
                getCsvBackendUrl() { return this.currentUrls.csv; },
                isOfflineMode() { return false; }
            };
        }
        
        // Asegurar que window.backendUrl use la configuración correcta
        window.backendUrl = window.backendConfig.getMainBackendUrl();
        console.log('✅ Backend URL configured:', window.backendUrl);
        
        return true;
    }
    
    // 3. Aplicar el fix de la función saveUserProfile
    function applySaveUserProfileFix() {
        console.log('🔧 Applying saveUserProfile fix...');
        
        // Override the saveUserProfile function to be more robust
        window.saveUserProfile = async function(userId, teamId, profileData) {
            try {
                console.log('💾 Saving user profile to backend:', { userId, teamId, profileData });
                
                // Ensure backend URL is configured
                if (!window.backendUrl) {
                    console.log('🌐 Backend URL not configured, initializing...');
                    applyBackendConfigFix();
                }
                
                if (!window.backendUrl) {
                    console.error('❌ Backend URL not configured');
                    return false;
                }
                
                console.log('🌐 Using backend URL:', window.backendUrl);
                
                // Test backend connectivity first
                console.log('🧪 Testing backend connectivity...');
                const healthResponse = await fetch(`${window.backendUrl}/health`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: AbortSignal.timeout(10000)
                });
                
                if (!healthResponse.ok) {
                    console.warn('⚠️ Backend health check failed, saving locally only');
                    return false;
                }
                
                console.log('✅ Backend is healthy');
                
                // Save user profile to backend
                const response = await fetch(`${window.backendUrl}/api/users/${userId}/profile`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        teamId,
                        ...profileData
                    })
                });
                
                console.log('📥 Save response status:', response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Save response error:', errorText);
                    return false;
                }
                
                const result = await response.json();
                console.log('📥 Save result:', result);
                
                if (result.success) {
                    console.log('✅ User profile saved to backend successfully');
                    return true;
                } else {
                    console.error('❌ Backend save failed:', result.error);
                    return false;
                }
                
            } catch (error) {
                console.error('❌ Error saving user profile:', error);
                return false;
            }
        };
        
        console.log('✅ saveUserProfile function fixed');
        return true;
    }
    
    // 4. Aplicar el fix del proceso de registro
    function applyRegistrationFix() {
        console.log('🔧 Applying registration process fix...');
        
        // Override the registration process to ensure backend save
        window.registerUserWithBackend = async function(email, password, name) {
            try {
                console.log('👤 Registering user with backend:', email);
                
                // Ensure backend config
                if (!window.backendUrl) {
                    applyBackendConfigFix();
                }
                
                // 1. Save credentials locally first
                if (typeof window.saveUserCredentials === 'function') {
                    await window.saveUserCredentials(email, password, name);
                } else {
                    // Fallback local save
                    const userData = {
                        email: email,
                        password: password,
                        name: name || email.split('@')[0],
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString()
                    };
                    
                    localStorage.setItem(`user_${email}`, JSON.stringify(userData));
                    
                    // Add to users array
                    const users = JSON.parse(localStorage.getItem('thebridge_users') || '[]');
                    const existingUserIndex = users.findIndex(user => user.email === email);
                    
                    if (existingUserIndex !== -1) {
                        users[existingUserIndex] = { ...users[existingUserIndex], ...userData };
                    } else {
                        users.push(userData);
                    }
                    
                    localStorage.setItem('thebridge_users', JSON.stringify(users));
                }
                
                // 2. Create user profile for backend
                const userProfile = {
                    email: email,
                    name: name || email.split('@')[0],
                    role: 'user',
                    preferences: {
                        theme: 'dark',
                        language: 'es',
                        notifications: true
                    },
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                };
                
                // 3. Save to backend with retries
                console.log('🌐 Saving user to backend...');
                let backendSaved = false;
                let retryCount = 0;
                const maxRetries = 3;
                
                while (retryCount < maxRetries && !backendSaved) {
                    try {
                        backendSaved = await window.saveUserProfile(email, 'default-team', userProfile);
                        if (backendSaved) {
                            console.log('✅ User saved to backend on attempt', retryCount + 1);
                            break;
                        }
                    } catch (error) {
                        console.warn(`⚠️ Backend save attempt ${retryCount + 1} failed:`, error);
                    }
                    retryCount++;
                    if (retryCount < maxRetries) {
                        console.log(`🔄 Retrying in 2 seconds... (${retryCount}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
                
                // 4. Create user object for current session
                const userObject = {
                    id: email,
                    name: name || email.split('@')[0],
                    email: email,
                    role: 'user',
                    createdAt: new Date().toISOString(),
                    teams: []
                };
                
                window.currentUser = userObject;
                localStorage.setItem('thebridge_current_user', JSON.stringify(userObject));
                
                // 5. Show success message
                console.log('✅ Registration completed successfully');
                if (backendSaved) {
                    console.log('✅ User registered with backend sync');
                } else {
                    console.log('⚠️ User registered locally only (backend sync failed)');
                }
                
                return true;
            } catch (error) {
                console.error('❌ Error registering user:', error);
                return false;
            }
        };
        
        console.log('✅ Registration process fixed');
        return true;
    }
    
    // 5. Aplicar el fix del botón de registro
    function applyRegistrationButtonFix() {
        console.log('🔧 Applying registration button fix...');
        
        // Find the registration button
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
            console.log('🔧 Found registration button, overriding click handler...');
            
            // Remove existing listeners by cloning
            const newRegisterBtn = registerBtn.cloneNode(true);
            registerBtn.parentNode.replaceChild(newRegisterBtn, registerBtn);
            
            // Add new click handler
            newRegisterBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('👤 Registration button clicked');
                
                // Get form values
                const registerEmail = document.getElementById('registerEmailInput');
                const registerPassword = document.getElementById('registerPasswordInput');
                const registerPasswordRepeat = document.getElementById('registerPasswordRepeatInput');
                const registerError = document.getElementById('registerError');
                
                const email = registerEmail?.value.trim().toLowerCase();
                const password = registerPassword?.value;
                const passwordRepeat = registerPasswordRepeat?.value;
                
                // Validation
                if (!email || !password || !passwordRepeat) {
                    if (registerError) {
                        registerError.textContent = 'Please fill in all fields';
                        registerError.style.color = '#d32f2f';
                    }
                    return;
                }
                
                if (!isValidEmail(email)) {
                    if (registerError) {
                        registerError.textContent = 'Enter a valid email.';
                        registerError.style.color = '#d32f2f';
                    }
                    return;
                }
                
                if (!password || password.length < 6) {
                    if (registerError) {
                        registerError.textContent = 'Password must be at least 6 characters.';
                        registerError.style.color = '#d32f2f';
                    }
                    return;
                }
                
                if (password !== passwordRepeat) {
                    if (registerError) {
                        registerError.textContent = 'Passwords do not match.';
                        registerError.style.color = '#d32f2f';
                    }
                    return;
                }
                
                // Check if user already exists
                if (typeof window.getUserCredentials === 'function') {
                    const existingUser = window.getUserCredentials(email);
                    if (existingUser) {
                        if (registerError) {
                            registerError.textContent = 'This email is already registered.';
                            registerError.style.color = '#d32f2f';
                        }
                        return;
                    }
                }
                
                // Show loading state
                if (registerError) {
                    registerError.textContent = 'Creating account...';
                    registerError.style.color = '#FFC107';
                }
                
                // Register user with backend
                try {
                    const success = await window.registerUserWithBackend(email, password, email.split('@')[0]);
                    
                    if (success) {
                        if (registerError) {
                            registerError.style.color = '#10B981';
                            registerError.textContent = 'User registered successfully!';
                        }
                        
                        // Close modal and show success
                        setTimeout(() => {
                            const modal = document.querySelector('.modal-overlay');
                            if (modal) {
                                modal.classList.add('hidden');
                                setTimeout(() => {
                                    modal.style.display = 'none';
                                }, 300);
                            }
                        }, 1500);
                    } else {
                        if (registerError) {
                            registerError.textContent = 'Registration failed. Please try again.';
                            registerError.style.color = '#d32f2f';
                        }
                    }
                } catch (error) {
                    console.error('❌ Registration error:', error);
                    if (registerError) {
                        registerError.textContent = 'Registration error. Please try again.';
                        registerError.style.color = '#d32f2f';
                    }
                }
            });
            
            console.log('✅ Registration button fixed');
            return true;
        } else {
            console.warn('⚠️ Registration button not found');
            return false;
        }
    }
    
    // 6. Aplicar todos los fixes
    try {
        console.log('🚀 Starting to apply user backend fixes...');
        
        // Apply configuration fix
        const configFixed = applyBackendConfigFix();
        if (!configFixed) {
            console.error('❌ Failed to apply backend configuration fix');
            return false;
        }
        
        // Apply saveUserProfile fix
        const saveFixed = applySaveUserProfileFix();
        if (!saveFixed) {
            console.error('❌ Failed to apply saveUserProfile fix');
            return false;
        }
        
        // Apply registration process fix
        const regFixed = applyRegistrationFix();
        if (!regFixed) {
            console.error('❌ Failed to apply registration process fix');
            return false;
        }
        
        // Apply registration button fix
        const buttonFixed = applyRegistrationButtonFix();
        if (!buttonFixed) {
            console.warn('⚠️ Failed to apply registration button fix (button not found)');
        }
        
        console.log('✅ All user backend fixes applied successfully!');
        
        // Test connectivity
        setTimeout(async () => {
            try {
                const response = await fetch(`${window.backendUrl}/health`);
                if (response.ok) {
                    console.log('✅ Backend connectivity verified');
                } else {
                    console.warn('⚠️ Backend connectivity test failed');
                }
            } catch (error) {
                console.warn('⚠️ Backend connectivity test error:', error);
            }
        }, 1000);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error applying user backend fixes:', error);
        return false;
    }
}

// Auto-apply the fix when the script is loaded
if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🔧 DOM loaded, applying user backend fix...');
            setTimeout(applyUserBackendFix, 1000); // Wait a bit for other scripts
        });
    } else {
        console.log('🔧 DOM already loaded, applying user backend fix...');
        setTimeout(applyUserBackendFix, 1000); // Wait a bit for other scripts
    }
}

// Make the function available globally
window.applyUserBackendFix = applyUserBackendFix;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { applyUserBackendFix };
}

console.log('🔧 User backend fix script loaded and ready to apply'); 