// ===== FIX REGISTRATION BACKEND URL =====

// Función para asegurar que el backendUrl esté configurado correctamente
function fixRegistrationBackendUrl() {
    console.log('🔧 Fixing registration backend URL...');
    
    // 1. Asegurar que backendUrl esté configurado
    function ensureBackendUrl() {
        if (!window.backendUrl) {
            // Detectar si estamos en desarrollo o producción
            const isLocalhost = window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1' ||
                               window.location.hostname === '';
            
            if (isLocalhost) {
                window.backendUrl = 'http://localhost:3000';
                console.log('🏠 Development mode - Backend URL set to:', window.backendUrl);
            } else {
                window.backendUrl = 'https://the-bridge-9g01.onrender.com';
                console.log('🌍 Production mode - Backend URL set to:', window.backendUrl);
            }
        }
        
        console.log('✅ Current backendUrl:', window.backendUrl);
        return window.backendUrl;
    }
    
    // 2. Override saveUserProfile para incluir verificación de backendUrl
    const originalSaveUserProfile = window.saveUserProfile;
    window.saveUserProfile = async function(userId, teamId, profileData) {
        console.log('🔧 Enhanced saveUserProfile called for:', userId);
        
        // Asegurar que backendUrl esté configurado
        const backendUrl = ensureBackendUrl();
        
        try {
            console.log('📡 Attempting to save user profile to backend...');
            console.log('URL:', `${backendUrl}/api/users/${userId}/profile`);
            console.log('Data:', { teamId, ...profileData });
            
            const response = await fetch(`${backendUrl}/api/users/${userId}/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    teamId,
                    ...profileData
                })
            });
            
            console.log('📡 Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📡 Response data:', result);
            
            if (result.success) {
                console.log('✅ User profile saved successfully to backend');
                return true;
            } else {
                console.error('❌ Backend returned error:', result.error);
                return false;
            }
        } catch (error) {
            console.error('❌ Error saving user profile to backend:', error);
            console.log('⚠️ Falling back to local storage only');
            return false;
        }
    };
    
    // 3. Override loadUserProfile para incluir verificación de backendUrl
    const originalLoadUserProfile = window.loadUserProfile;
    window.loadUserProfile = async function(userId, teamId) {
        console.log('🔧 Enhanced loadUserProfile called for:', userId);
        
        // Asegurar que backendUrl esté configurado
        const backendUrl = ensureBackendUrl();
        
        try {
            console.log('📡 Attempting to load user profile from backend...');
            console.log('URL:', `${backendUrl}/api/users/${userId}/profile?teamId=${teamId}`);
            
            const response = await fetch(`${backendUrl}/api/users/${userId}/profile?teamId=${teamId}`);
            
            console.log('📡 Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📡 Response data:', result);
            
            if (result.success) {
                console.log('✅ User profile loaded successfully from backend');
                return result.profile;
            } else {
                console.error('❌ Backend returned error:', result.error);
                return null;
            }
        } catch (error) {
            console.error('❌ Error loading user profile from backend:', error);
            return null;
        }
    };
    
    // 4. Override el botón de registro para incluir verificación
    function overrideRegisterButton() {
        const registerBtn = document.getElementById('registerBtn');
        if (!registerBtn) {
            console.log('⚠️ Register button not found');
            return false;
        }
        
        // Remove existing listeners by cloning
        const newRegisterBtn = registerBtn.cloneNode(true);
        registerBtn.parentNode.replaceChild(newRegisterBtn, registerBtn);
        
        // Add new click handler
        newRegisterBtn.onclick = async () => {
            console.log('🔧 Enhanced register button clicked');
            
            const registerEmail = document.getElementById('registerEmailInput');
            const registerPassword = document.getElementById('registerPasswordInput');
            const registerPasswordRepeat = document.getElementById('registerPasswordRepeatInput');
            const registerError = document.getElementById('registerError');
            
            const email = registerEmail?.value.trim().toLowerCase();
            const password = registerPassword?.value;
            const passwordRepeat = registerPasswordRepeat?.value;
            
            // Validaciones
            if (!isValidEmail(email)) {
                if (registerError) registerError.textContent = 'Enter a valid email.';
                return;
            }
            
            if (!password || password.length < 6 ||
                !/[A-Z]/.test(password) ||
                !/[a-z]/.test(password) ||
                !/[0-9]/.test(password)) {
                if (registerError) registerError.textContent = 'Password must be at least 6 characters, contain an uppercase letter, a lowercase letter, and a number.';
                return;
            }
            
            if (password !== passwordRepeat) {
                if (registerError) registerError.textContent = 'Passwords do not match.';
                return;
            }
            
            if (getUserCredentials(email)) {
                if (registerError) registerError.textContent = 'This email is already registered.';
                return;
            }
            
            // Asegurar que backendUrl esté configurado
            const backendUrl = ensureBackendUrl();
            console.log('🌐 Using backend URL for registration:', backendUrl);
            
            // Save to localStorage first
            console.log('💾 Saving user credentials to localStorage...');
            saveUserCredentials(email, password);
            
            // Create immediate backup
            console.log('🛡️ Creating immediate backup for new user...');
            if (window.createBackup) {
                window.createBackup();
            }
            
            // Save to backend
            try {
                const userProfile = {
                    name: email.split('@')[0],
                    email: email,
                    role: 'user',
                    createdAt: new Date().toISOString()
                };
                
                console.log('📡 Saving user profile to backend...');
                const saved = await window.saveUserProfile(email, 'default-team', userProfile);
                
                if (saved) {
                    console.log('✅ User profile saved to backend successfully');
                } else {
                    console.warn('⚠️ Could not save to backend, but user registered locally');
                }
            } catch (error) {
                console.error('❌ Error during backend save:', error);
                console.log('⚠️ User registered locally only');
            }
            
            // Show success message
            if (registerError) {
                registerError.style.color = '#10B981';
                registerError.textContent = 'User registered successfully. You can now sign in.';
                setTimeout(() => {
                    registerError.style.color = '#d32f2f';
                    showLogin();
                }, 1800);
            }
        };
        
        console.log('✅ Register button override applied');
        return true;
    }
    
    // 5. Aplicar el fix
    function applyFix() {
        console.log('🔧 Applying registration backend URL fix...');
        
        // Asegurar backendUrl
        ensureBackendUrl();
        
        // Override functions
        console.log('✅ Enhanced saveUserProfile and loadUserProfile functions applied');
        
        // Override register button
        if (overrideRegisterButton()) {
            console.log('✅ Register button override applied');
        }
        
        console.log('✅ Registration backend URL fix applied successfully');
    }
    
    // 6. Aplicar el fix cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyFix);
    } else {
        applyFix();
    }
    
    // 7. También aplicar cuando se muestre el modal de login/registro
    const originalShowLoginRegisterModal = window.showLoginRegisterModal;
    if (originalShowLoginRegisterModal) {
        window.showLoginRegisterModal = function() {
            console.log('🔧 Enhanced showLoginRegisterModal called');
            originalShowLoginRegisterModal.call(this);
            
            // Aplicar override del botón después de que se muestre el modal
            setTimeout(() => {
                overrideRegisterButton();
            }, 100);
        };
    }
}

// Exportar la función para uso global
window.fixRegistrationBackendUrl = fixRegistrationBackendUrl;

// Aplicar el fix automáticamente
fixRegistrationBackendUrl();

console.log('🔧 Registration backend URL fix script loaded and applied'); 