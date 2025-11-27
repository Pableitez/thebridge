// ===== FIX USER REGISTRATION BACKEND =====

// Función para arreglar el registro de usuarios en el backend
async function fixUserRegistrationBackend() {
    console.log('🔧 Fixing user registration backend...');
    
    // Override the saveUserCredentials function to ensure backend sync
    window.saveUserCredentials = async function(email, password, name = null) {
        try {
            console.log('💾 Saving user credentials for:', email);
            
            const userData = { 
                email, 
                password,
                name: name || email.split('@')[0],
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };
            
            // 1. Save to localStorage with key
            localStorage.setItem(getUserKey(email), JSON.stringify(userData));
            
            // 2. Save to users array for easier management
            const users = JSON.parse(localStorage.getItem('thebridge_users') || '[]');
            const existingUserIndex = users.findIndex(user => user.email === email);
            
            if (existingUserIndex !== -1) {
                // Update existing user
                users[existingUserIndex] = { ...users[existingUserIndex], ...userData };
            } else {
                // Add new user
                users.push(userData);
            }
            
            localStorage.setItem('thebridge_users', JSON.stringify(users));
            
            // 3. Save to IndexedDB for persistence
            saveUserToIndexedDB(userData);
            
            // 4. Save to persistent cookies
            saveUserToCookies(userData);
            
            // 5. CRITICAL: Save to backend immediately
            await saveUserToBackend(userData);
            
            console.log('✅ User credentials saved to ALL locations successfully');
            return true;
        } catch (error) {
            console.error('❌ Error saving user credentials:', error);
            return false;
        }
    };
    
    // Override the saveUserProfile function to ensure it works correctly
    window.saveUserProfile = async function(userId, teamId, profileData) {
        try {
            console.log('💾 Saving user profile to backend:', { userId, teamId });
            
            if (!window.backendUrl) {
                console.warn('⚠️ Backend URL not configured');
                return false;
            }
            
            const response = await fetch(`${window.backendUrl}/api/users/${userId}/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    teamId,
                    userId,
                    email: userId, // Use userId as email
                    name: profileData.name || userId.split('@')[0],
                    role: profileData.role || 'user',
                    preferences: profileData.preferences || {},
                    ...profileData
                })
            });
            
            if (!response.ok) {
                console.error('❌ Backend response not ok:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);
                return false;
            }
            
            const result = await response.json();
            if (result.success) {
                console.log('✅ User profile saved to backend successfully');
                return true;
            } else {
                console.error('❌ Error saving user profile:', result.error);
                return false;
            }
        } catch (error) {
            console.error('❌ Error saving user profile:', error);
            return false;
        }
    };
    
    // New function to save user to backend
    window.saveUserToBackend = async function(userData) {
        try {
            console.log('🌐 Saving user to backend:', userData.email);
            
            if (!window.backendUrl) {
                console.warn('⚠️ Backend URL not configured');
                return false;
            }
            
            // Create user profile for backend
            const userProfile = {
                name: userData.name || userData.email.split('@')[0],
                email: userData.email,
                role: 'user',
                preferences: {
                    theme: 'dark',
                    language: 'es',
                    notifications: true
                },
                createdAt: userData.createdAt,
                lastLogin: userData.lastLogin
            };
            
            // Save to backend with default team
            const defaultTeamId = 'default-team';
            const saved = await window.saveUserProfile(userData.email, defaultTeamId, userProfile);
            
            if (saved) {
                console.log('✅ User saved to backend successfully');
                return true;
            } else {
                console.warn('⚠️ Could not save user to backend');
                return false;
            }
        } catch (error) {
            console.error('❌ Error saving user to backend:', error);
            return false;
        }
    };
    
    // Override the registration process to ensure backend sync
    window.registerUserWithBackend = async function(email, password, name) {
        try {
            console.log('👤 Registering user with backend:', email);
            
            // 1. Save credentials locally
            const saved = await window.saveUserCredentials(email, password, name);
            
            if (!saved) {
                throw new Error('Failed to save user credentials locally');
            }
            
            // 2. Create user profile
            const userProfile = {
                id: generateUserId(),
                name: name || email.split('@')[0],
                email: email,
                role: 'member',
                createdAt: new Date().toISOString(),
                teams: []
            };
            
            // 3. Save to backend immediately
            const backendSaved = await window.saveUserToBackend({
                email: email,
                name: name || email.split('@')[0],
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            });
            
            if (backendSaved) {
                console.log('✅ User registered successfully with backend');
            } else {
                console.warn('⚠️ User registered locally but backend sync failed');
            }
            
            // 4. Set current user
            window.currentUser = userProfile;
            localStorage.setItem('thebridge_current_user', JSON.stringify(userProfile));
            
            // 5. Show user buttons
            if (typeof showLogoutBtn === 'function') {
                showLogoutBtn();
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error registering user:', error);
            return false;
        }
    };
    
    // Override the login process to check backend
    window.loginUserWithBackend = async function(email, password) {
        try {
            console.log('🔐 Logging in user with backend:', email);
            
            // 1. Check local credentials first
            const localUser = getUserCredentials(email);
            
            if (localUser && localUser.password === password) {
                console.log('✅ User found locally');
                
                // Update last login
                localUser.lastLogin = new Date().toISOString();
                await window.saveUserCredentials(email, password, localUser.name);
                
                // Set current user
                setCurrentUserEmail(email);
                
                // Show user buttons
                if (typeof showLogoutBtn === 'function') {
                    showLogoutBtn();
                }
                
                return true;
            }
            
            // 2. If not found locally, try backend
            console.log('🔍 User not found locally, checking backend...');
            
            if (!window.backendUrl) {
                console.warn('⚠️ Backend URL not configured');
                return false;
            }
            
            // Try to load user profile from backend
            const userProfile = await window.loadUserProfile(email, 'default-team');
            
            if (userProfile && userProfile.email === email) {
                console.log('✅ User found in backend');
                
                // Create local user entry
                await window.saveUserCredentials(email, password, userProfile.name);
                
                // Set current user
                setCurrentUserEmail(email);
                
                // Show user buttons
                if (typeof showLogoutBtn === 'function') {
                    showLogoutBtn();
                }
                
                return true;
            }
            
            console.log('❌ User not found in backend either');
            return false;
            
        } catch (error) {
            console.error('❌ Error logging in user:', error);
            return false;
        }
    };
    
    // Override the loadUserProfile function to handle errors better
    window.loadUserProfile = async function(userId, teamId) {
        try {
            console.log('📥 Loading user profile from backend:', { userId, teamId });
            
            if (!window.backendUrl) {
                console.warn('⚠️ Backend URL not configured');
                return null;
            }
            
            const response = await fetch(`${window.backendUrl}/api/users/${userId}/profile?teamId=${teamId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('ℹ️ User profile not found in backend');
                    return null;
                }
                console.error('❌ Backend response not ok:', response.status, response.statusText);
                return null;
            }
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ User profile loaded from backend successfully');
                return result.profile;
            } else {
                console.error('❌ Error loading user profile:', result.error);
                return null;
            }
        } catch (error) {
            console.error('❌ Error loading user profile:', error);
            return null;
        }
    };
    
    console.log('✅ User registration backend fixed!');
}

// Test function to verify backend connectivity
window.testBackendUserRegistration = async function() {
    console.log('🧪 Testing backend user registration...');
    
    try {
        if (!window.backendUrl) {
            console.error('❌ Backend URL not configured');
            return false;
        }
        
        // Test backend health
        const healthResponse = await fetch(`${window.backendUrl}/health`);
        if (!healthResponse.ok) {
            console.error('❌ Backend health check failed');
            return false;
        }
        
        console.log('✅ Backend is healthy');
        
        // Test user profile endpoint
        const testEmail = 'test@example.com';
        const testTeamId = 'default-team';
        
        const testProfile = {
            name: 'Test User',
            email: testEmail,
            role: 'user',
            preferences: {
                theme: 'dark',
                language: 'es'
            }
        };
        
        const saveResponse = await fetch(`${window.backendUrl}/api/users/${testEmail}/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                teamId: testTeamId,
                ...testProfile
            })
        });
        
        if (!saveResponse.ok) {
            console.error('❌ User profile save test failed:', saveResponse.status);
            return false;
        }
        
        const saveResult = await saveResponse.json();
        if (!saveResult.success) {
            console.error('❌ User profile save test failed:', saveResult.error);
            return false;
        }
        
        console.log('✅ User profile save test passed');
        
        // Test user profile load
        const loadResponse = await fetch(`${window.backendUrl}/api/users/${testEmail}/profile?teamId=${testTeamId}`);
        
        if (!loadResponse.ok) {
            console.error('❌ User profile load test failed:', loadResponse.status);
            return false;
        }
        
        const loadResult = await loadResponse.json();
        if (!loadResult.success) {
            console.error('❌ User profile load test failed:', loadResult.error);
            return false;
        }
        
        console.log('✅ User profile load test passed');
        console.log('✅ Backend user registration test completed successfully!');
        
        return true;
        
    } catch (error) {
        console.error('❌ Backend user registration test failed:', error);
        return false;
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 DOM loaded, initializing user registration backend fix...');
    
    // Wait a bit for other scripts to load
    setTimeout(() => {
        fixUserRegistrationBackend();
        
        // Test backend connectivity
        setTimeout(() => {
            window.testBackendUserRegistration();
        }, 1000);
    }, 2000);
});

// Make functions available globally
window.fixUserRegistrationBackend = fixUserRegistrationBackend;
window.testBackendUserRegistration = window.testBackendUserRegistration; 