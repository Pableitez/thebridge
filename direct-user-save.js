// ===== DIRECT USER SAVE TO BACKEND =====

// Función directa para guardar usuarios en el backend
async function saveUserDirectlyToBackend(email, password, name) {
    console.log('🚀 Saving user directly to backend:', email);
    
    try {
        // 1. Ensure backend URL is set
        if (!window.backendUrl) {
            const hostname = window.location.hostname;
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                window.backendUrl = 'http://localhost:3000';
            } else {
                window.backendUrl = 'https://the-bridge-9g01.onrender.com';
            }
            console.log('🌐 Backend URL set to:', window.backendUrl);
        }
        
        // 2. Test backend connectivity
        console.log('🧪 Testing backend connectivity...');
        const healthResponse = await fetch(`${window.backendUrl}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000)
        });
        
        if (!healthResponse.ok) {
            throw new Error(`Backend health check failed: ${healthResponse.status}`);
        }
        
        console.log('✅ Backend is healthy');
        
        // 3. Create user profile data
        const userProfile = {
            teamId: 'default-team',
            userId: email,
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
        
        console.log('📤 Sending user profile:', userProfile);
        
        // 4. Save user profile to backend
        const saveResponse = await fetch(`${window.backendUrl}/api/users/${email}/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userProfile)
        });
        
        console.log('📥 Save response status:', saveResponse.status);
        
        if (!saveResponse.ok) {
            const errorText = await saveResponse.text();
            console.error('❌ Save response error:', errorText);
            throw new Error(`Save failed: ${saveResponse.status} - ${errorText}`);
        }
        
        const saveResult = await saveResponse.json();
        console.log('📥 Save result:', saveResult);
        
        if (!saveResult.success) {
            throw new Error(`Save failed: ${saveResult.error}`);
        }
        
        console.log('✅ User saved to backend successfully');
        
        // 5. Verify user was saved by trying to load it
        console.log('🔍 Verifying user was saved...');
        const verifyResponse = await fetch(`${window.backendUrl}/api/users/${email}/profile?teamId=default-team`);
        
        if (verifyResponse.ok) {
            const verifyResult = await verifyResponse.json();
            if (verifyResult.success && verifyResult.profile) {
                console.log('✅ User verification successful:', verifyResult.profile);
                return true;
            }
        }
        
        console.warn('⚠️ User verification failed, but save was successful');
        return true;
        
    } catch (error) {
        console.error('❌ Error saving user to backend:', error);
        return false;
    }
}

// Override the registration process completely
function overrideRegistrationProcess() {
    console.log('🔧 Overriding registration process...');
    
    // Find and override the registration button
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        console.log('🔧 Found registration button, overriding...');
        
        // Remove existing listeners
        const newRegisterBtn = registerBtn.cloneNode(true);
        registerBtn.parentNode.replaceChild(newRegisterBtn, registerBtn);
        
        // Add new click handler
        newRegisterBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('👤 Registration button clicked - using direct save');
            
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
            
            // Show loading state
            if (registerError) {
                registerError.textContent = 'Creating account...';
                registerError.style.color = '#FFC107';
            }
            
            try {
                // 1. Save locally first
                console.log('💾 Saving user locally...');
                const userData = {
                    email: email,
                    password: password,
                    name: email.split('@')[0],
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
                console.log('✅ User saved locally');
                
                // 2. Save to backend with retries
                console.log('🌐 Saving user to backend...');
                let backendSaved = false;
                let retryCount = 0;
                const maxRetries = 3;
                
                while (!backendSaved && retryCount < maxRetries) {
                    try {
                        console.log(`🔄 Backend save attempt ${retryCount + 1}/${maxRetries}`);
                        
                        backendSaved = await saveUserDirectlyToBackend(email, password, email.split('@')[0]);
                        
                        if (backendSaved) {
                            console.log('✅ User saved to backend successfully');
                            break;
                        } else {
                            console.warn(`⚠️ Backend save attempt ${retryCount + 1} failed`);
                            retryCount++;
                            
                            if (retryCount < maxRetries) {
                                console.log(`⏳ Waiting 3 seconds before retry...`);
                                await new Promise(resolve => setTimeout(resolve, 3000));
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Backend save attempt ${retryCount + 1} error:`, error);
                        retryCount++;
                        
                        if (retryCount < maxRetries) {
                            console.log(`⏳ Waiting 3 seconds before retry...`);
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        }
                    }
                }
                
                // 3. Set current user
                console.log('👤 Setting current user...');
                if (typeof window.setCurrentUserEmail === 'function') {
                    window.setCurrentUserEmail(email);
                } else {
                    localStorage.setItem('userEmail', email);
                }
                
                const userObject = {
                    id: email,
                    name: email.split('@')[0],
                    email: email,
                    role: 'user',
                    createdAt: new Date().toISOString(),
                    teams: []
                };
                
                window.currentUser = userObject;
                localStorage.setItem('thebridge_current_user', JSON.stringify(userObject));
                
                // 4. Show success message
                if (registerError) {
                    if (backendSaved) {
                        registerError.textContent = 'Account created successfully! (Backend + Local)';
                        registerError.style.color = '#10B981';
                    } else {
                        registerError.textContent = 'Account created locally. Backend sync failed.';
                        registerError.style.color = '#FF9800';
                    }
                }
                
                // 5. Show user buttons
                if (typeof window.showLogoutBtn === 'function') {
                    window.showLogoutBtn();
                }
                
                console.log('✅ Registration completed successfully');
                
                // 6. Close modal after delay
                setTimeout(() => {
                    const modal = document.querySelector('.modal-overlay');
                    if (modal) {
                        modal.classList.add('hidden');
                        setTimeout(() => {
                            modal.style.display = 'none';
                        }, 300);
                    }
                }, 2000);
                
            } catch (error) {
                console.error('❌ Registration error:', error);
                if (registerError) {
                    registerError.textContent = 'Registration failed. Please try again.';
                    registerError.style.color = '#d32f2f';
                }
            }
        });
        
        console.log('✅ Registration button overridden');
    } else {
        console.warn('⚠️ Registration button not found');
    }
}

// Test function to verify backend user save
async function testBackendUserSave() {
    console.log('🧪 Testing backend user save...');
    
    try {
        const testEmail = 'test-direct-save@example.com';
        const testPassword = 'test123';
        const testName = 'Test Direct Save';
        
        console.log('🧪 Testing with:', testEmail);
        
        const saved = await saveUserDirectlyToBackend(testEmail, testPassword, testName);
        
        if (saved) {
            console.log('✅ Backend user save test PASSED');
            return true;
        } else {
            console.error('❌ Backend user save test FAILED');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Backend user save test ERROR:', error);
        return false;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 DOM loaded, initializing direct user save...');
    
    // Wait a bit for other scripts to load
    setTimeout(() => {
        overrideRegistrationProcess();
        
        // Test backend user save
        setTimeout(() => {
            testBackendUserSave();
        }, 2000);
    }, 2000);
});

// Make functions available globally
window.saveUserDirectlyToBackend = saveUserDirectlyToBackend;
window.overrideRegistrationProcess = overrideRegistrationProcess;
window.testBackendUserSave = testBackendUserSave; 