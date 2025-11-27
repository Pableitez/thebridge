// ===== FIX USER BACKEND SAVE - SOLUCIÓN COMPLETA =====

// Función para arreglar el guardado de usuarios en el backend
function fixUserBackendSave() {
    console.log('🔧 Fixing user backend save...');
    
    // 1. Asegurar que la configuración del backend esté correcta
    function ensureBackendConfig() {
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
    }
    
    // 2. Override the saveUserProfile function to be more robust
    window.saveUserProfile = async function(userId, teamId, profileData) {
        try {
            console.log('💾 Saving user profile to backend:', { userId, teamId, profileData });
            
            // Ensure backend URL is configured
            ensureBackendConfig();
            
            if (!window.backendUrl || window.backendUrl === 'offline') {
                console.warn('⚠️ Backend URL not configured or offline mode, saving locally only');
                return false;
            }
            
            console.log('🌐 Using backend URL:', window.backendUrl);
            
            // Test backend connectivity first
            console.log('🧪 Testing backend connectivity...');
            try {
                const healthResponse = await fetch(`${window.backendUrl}/health`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: AbortSignal.timeout(5000)
                });
                
                if (!healthResponse.ok) {
                    console.warn('⚠️ Backend health check failed, saving locally only');
                    return false;
                }
                
                console.log('✅ Backend is healthy');
            } catch (error) {
                console.warn('⚠️ Backend connectivity test failed, saving locally only:', error);
                return false;
            }
            
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
    
    // 3. Override the registration process to ensure backend save
    window.registerUserWithBackend = async function(email, password, name) {
        try {
            console.log('👤 Registering user with backend:', email);
            
            // Ensure backend config
            ensureBackendConfig();
            
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
    
    // 4. Override the original registration button click handler
    window.fixRegistrationButton = function() {
        console.log('🔧 Fixing registration button...');
        
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
        } else {
            console.warn('⚠️ Registration button not found');
        }
    };
    
    // 5. Test function to verify backend connectivity
    window.testBackendConnectivity = async function() {
        console.log('🧪 Testing backend connectivity...');
        
        ensureBackendConfig();
        
        // Don't test if backend URL is 'offline'
        if (window.backendUrl === 'offline') {
            console.log('📱 Offline mode detected, skipping connectivity test');
            return false;
        }
        
        try {
            const response = await fetch(`${window.backendUrl}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            if (response.ok) {
                console.log('✅ Backend connectivity test passed');
                return true;
            } else {
                console.log('❌ Backend connectivity test failed:', response.status);
                return false;
            }
        } catch (error) {
            console.log('❌ Backend connectivity test error:', error);
            return false;
        }
    };
    
    // 6. Test function to verify user save/load
    window.testUserSaveLoad = async function() {
        console.log('🧪 Testing user save/load...');
        
        const testEmail = 'test-user-save@example.com';
        const testTeamId = 'default-team';
        const testProfile = {
            name: 'Test User Save',
            email: testEmail,
            role: 'user',
            preferences: {
                theme: 'dark',
                language: 'es',
                notifications: true
            },
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
        try {
            // Test save
            console.log('📤 Testing user save...');
            const saved = await window.saveUserProfile(testEmail, testTeamId, testProfile);
            
            if (saved) {
                console.log('✅ User save test passed');
                
                // Test load
                console.log('📥 Testing user load...');
                const loadResponse = await fetch(`${window.backendUrl}/api/users/${testEmail}/profile?teamId=${testTeamId}`);
                
                if (loadResponse.ok) {
                    const loadResult = await loadResponse.json();
                    if (loadResult.success && loadResult.profile) {
                        console.log('✅ User load test passed:', loadResult.profile);
                        return true;
                    }
                }
                
                console.log('❌ User load test failed');
                return false;
            } else {
                console.log('❌ User save test failed');
                return false;
            }
        } catch (error) {
            console.error('❌ User save/load test error:', error);
            return false;
        }
    };
    
    // 7. Initialize the fix
    console.log('🚀 Initializing user backend save fix...');
    ensureBackendConfig();
    
    // Test connectivity
    window.testBackendConnectivity().then(isConnected => {
        if (isConnected) {
            console.log('✅ Backend is accessible');
        } else {
            console.warn('⚠️ Backend is not accessible, users will be saved locally only');
        }
    });
    
    console.log('✅ User backend save fix initialized');
}

// Auto-initialize the fix
if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixUserBackendSave);
    } else {
        fixUserBackendSave();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fixUserBackendSave };
} 