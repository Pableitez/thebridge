// ===== LOCAL USER SYSTEM - NO BACKEND NEEDED =====

// Sistema de usuarios completamente local
function setupLocalUserSystem() {
    console.log('🔧 Setting up local user system...');
    
    // Override user registration to work locally only
    window.registerUserLocally = async function(email, password, name) {
        try {
            console.log('👤 Registering user locally:', email);
            
            // 1. Create user data
            const userData = {
                id: email,
                email: email,
                password: password, // In production, this should be hashed
                name: name || email.split('@')[0],
                role: 'user',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                preferences: {
                    theme: 'dark',
                    language: 'es',
                    notifications: true
                }
            };
            
            // 2. Save to localStorage
            localStorage.setItem(`user_${email}`, JSON.stringify(userData));
            
            // 3. Add to users array
            const users = JSON.parse(localStorage.getItem('thebridge_users') || '[]');
            const existingUserIndex = users.findIndex(user => user.email === email);
            
            if (existingUserIndex !== -1) {
                users[existingUserIndex] = { ...users[existingUserIndex], ...userData };
            } else {
                users.push(userData);
            }
            
            localStorage.setItem('thebridge_users', JSON.stringify(users));
            
            // 4. Save to IndexedDB for persistence
            try {
                const request = indexedDB.open('TheBridgeDB', 1);
                
                request.onerror = () => {
                    console.warn('⚠️ IndexedDB not available');
                };
                
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction(['users'], 'readwrite');
                    const store = transaction.objectStore('users');
                    
                    const putRequest = store.put(userData);
                    putRequest.onsuccess = () => {
                        console.log('✅ User saved to IndexedDB');
                    };
                    putRequest.onerror = () => {
                        console.warn('⚠️ Error saving to IndexedDB');
                    };
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('users')) {
                        db.createObjectStore('users', { keyPath: 'email' });
                    }
                };
            } catch (error) {
                console.warn('⚠️ IndexedDB error:', error);
            }
            
            // 5. Set current user
            window.currentUser = userData;
            localStorage.setItem('thebridge_current_user', JSON.stringify(userData));
            localStorage.setItem('userEmail', email);
            
            // 6. Show user buttons
            if (typeof window.showLogoutBtn === 'function') {
                window.showLogoutBtn();
            }
            
            console.log('✅ User registered locally successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Error registering user locally:', error);
            return false;
        }
    };
    
    // Override user login to work locally only
    window.loginUserLocally = async function(email, password) {
        try {
            console.log('🔐 Logging in user locally:', email);
            
            // 1. Check local storage first
            const userData = localStorage.getItem(`user_${email}`);
            if (userData) {
                const user = JSON.parse(userData);
                if (user.password === password) {
                    console.log('✅ User found in localStorage');
                    
                    // Update last login
                    user.lastLogin = new Date().toISOString();
                    localStorage.setItem(`user_${email}`, JSON.stringify(user));
                    
                    // Set current user
                    window.currentUser = user;
                    localStorage.setItem('thebridge_current_user', JSON.stringify(user));
                    localStorage.setItem('userEmail', email);
                    
                    // Show user buttons
                    if (typeof window.showLogoutBtn === 'function') {
                        window.showLogoutBtn();
                    }
                    
                    return true;
                }
            }
            
            // 2. Check users array
            const users = JSON.parse(localStorage.getItem('thebridge_users') || '[]');
            const user = users.find(u => u.email === email && u.password === password);
            
            if (user) {
                console.log('✅ User found in users array');
                
                // Update last login
                user.lastLogin = new Date().toISOString();
                localStorage.setItem(`user_${email}`, JSON.stringify(user));
                
                // Set current user
                window.currentUser = user;
                localStorage.setItem('thebridge_current_user', JSON.stringify(user));
                localStorage.setItem('userEmail', email);
                
                // Show user buttons
                if (typeof window.showLogoutBtn === 'function') {
                    window.showLogoutBtn();
                }
                
                return true;
            }
            
            console.log('❌ User not found locally');
            return false;
            
        } catch (error) {
            console.error('❌ Error logging in user locally:', error);
            return false;
        }
    };
    
    // Override user credentials getter
    window.getUserCredentials = function(email) {
        try {
            // Check localStorage first
            const userData = localStorage.getItem(`user_${email}`);
            if (userData) {
                return JSON.parse(userData);
            }
            
            // Check users array
            const users = JSON.parse(localStorage.getItem('thebridge_users') || '[]');
            return users.find(user => user.email === email);
            
        } catch (error) {
            console.error('❌ Error getting user credentials:', error);
            return null;
        }
    };
    
    // Override registration button
    window.fixRegistrationButtonLocal = function() {
        console.log('🔧 Fixing registration button for local system...');
        
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
            console.log('🔧 Found registration button, overriding for local system...');
            
            // Remove existing listeners
            const newRegisterBtn = registerBtn.cloneNode(true);
            registerBtn.parentNode.replaceChild(newRegisterBtn, registerBtn);
            
            // Add new click handler
            newRegisterBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('👤 Registration button clicked - using local system');
                
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
                const existingUser = window.getUserCredentials(email);
                if (existingUser) {
                    if (registerError) {
                        registerError.textContent = 'This email is already registered.';
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
                    // Register user locally
                    const success = await window.registerUserLocally(email, password, email.split('@')[0]);
                    
                    if (success) {
                        if (registerError) {
                            registerError.textContent = 'Account created successfully! (Local Storage)';
                            registerError.style.color = '#10B981';
                        }
                        
                        // Close modal after delay
                        setTimeout(() => {
                            const modal = document.querySelector('.modal-overlay');
                            if (modal) {
                                modal.classList.add('hidden');
                                setTimeout(() => {
                                    modal.style.display = 'none';
                                }, 300);
                            }
                        }, 2000);
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
            
            console.log('✅ Registration button fixed for local system');
        } else {
            console.warn('⚠️ Registration button not found');
        }
    };
    
    // Override login button
    window.fixLoginButtonLocal = function() {
        console.log('🔧 Fixing login button for local system...');
        
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            console.log('🔧 Found login button, overriding for local system...');
            
            // Remove existing listeners
            const newLoginBtn = loginBtn.cloneNode(true);
            loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
            
            // Add new click handler
            newLoginBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('🔐 Login button clicked - using local system');
                
                // Get form values
                const loginEmail = document.getElementById('loginEmailInput');
                const loginPassword = document.getElementById('loginPasswordInput');
                const loginError = document.getElementById('loginError');
                
                const email = loginEmail?.value.trim().toLowerCase();
                const password = loginPassword?.value;
                
                // Validation
                if (!email || !password) {
                    if (loginError) {
                        loginError.textContent = 'Please fill in all fields';
                        loginError.style.color = '#d32f2f';
                    }
                    return;
                }
                
                try {
                    // Login user locally
                    const success = await window.loginUserLocally(email, password);
                    
                    if (success) {
                        if (loginError) {
                            loginError.textContent = 'Login successful!';
                            loginError.style.color = '#10B981';
                        }
                        
                        // Close modal after delay
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
                        if (loginError) {
                            loginError.textContent = 'Incorrect email or password.';
                            loginError.style.color = '#d32f2f';
                        }
                    }
                } catch (error) {
                    console.error('❌ Login error:', error);
                    if (loginError) {
                        loginError.textContent = 'Login error. Please try again.';
                        loginError.style.color = '#d32f2f';
                    }
                }
            });
            
            console.log('✅ Login button fixed for local system');
        } else {
            console.warn('⚠️ Login button not found');
        }
    };
    
    console.log('✅ Local user system setup complete');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 DOM loaded, setting up local user system...');
    
    // Wait a bit for other scripts to load
    setTimeout(() => {
        setupLocalUserSystem();
        
        // Fix buttons
        setTimeout(() => {
            window.fixRegistrationButtonLocal();
            window.fixLoginButtonLocal();
        }, 1000);
    }, 2000);
});

// Make functions available globally
window.setupLocalUserSystem = setupLocalUserSystem; 