// ===== FIXED LOAD FROM BACKEND FUNCTION =====

// Función corregida para cargar desde backend cuando no hay info de usuario
async function executeLoadFromBackend() {
    console.log('🔄 Executing Load from Backend (FIXED)...');
    
    // Ensure backendUrl is set
    if (!window.backendUrl) {
        initializeBackendConfig();
    }
    
    // Get current user info - try multiple sources
    let userEmail = null;
    let teamId = null;
    
    console.log('🔍 Detecting user info for loading...', {
        'window.currentUser': window.currentUser,
        'window.currentTeam': window.currentTeam,
        'localStorage thebridge_current_user': localStorage.getItem('thebridge_current_user'),
        'localStorage thebridge_current_team': localStorage.getItem('thebridge_current_team')
    });
    
    // Try to get user from window object first
    if (window.currentUser && window.currentUser.email) {
        userEmail = window.currentUser.email;
        console.log('✅ Found user in window.currentUser:', userEmail);
    } else {
        // Try localStorage as fallback
        try {
            const storedUser = localStorage.getItem('thebridge_current_user');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser && parsedUser.email) {
                    userEmail = parsedUser.email;
                    console.log('✅ Found user in localStorage:', userEmail);
                }
            }
        } catch (e) {
            console.log('⚠️ Error parsing stored user:', e);
        }
    }
    
    // Try to get team info
    if (window.currentTeam && window.currentTeam.id) {
        teamId = window.currentTeam.id;
        console.log('✅ Found team in window.currentTeam:', teamId);
    } else {
        // Try localStorage as fallback
        try {
            const storedTeam = localStorage.getItem('thebridge_current_team');
            if (storedTeam) {
                const parsedTeam = JSON.parse(storedTeam);
                if (parsedTeam && parsedTeam.id) {
                    teamId = parsedTeam.id;
                    console.log('✅ Found team in localStorage:', teamId);
                }
            }
        } catch (e) {
            console.log('⚠️ Error parsing stored team:', e);
        }
    }
    
    // If no user or team info found, show identification modal
    if (!userEmail || !teamId) {
        console.log('⚠️ No user/team info found, showing identification modal');
        
        // Create and show identification modal
        const modal = createIdentificationModal();
        document.body.appendChild(modal);
        
        // Wait for user to provide info
        const userInfo = await waitForUserIdentification(modal);
        
        if (!userInfo) {
            console.log('❌ User cancelled identification');
            return;
        }
        
        userEmail = userInfo.email;
        teamId = userInfo.teamId;
        
        console.log('✅ User identified:', { userEmail, teamId });
    }
    
    console.log('🎯 Using user info for loading:', { userEmail, teamId });
    
    try {
        // First, get list of available configurations
        console.log('Fetching available configurations...');
        
        const listResponse = await fetch(`${window.backendUrl}/api/dashboard/list?teamId=${teamId}&userEmail=${userEmail}`);
        
        if (!listResponse.ok) {
            throw new Error('Failed to fetch configurations list');
        }
        
        const listResult = await listResponse.json();
        console.log('Available configurations:', listResult);
        
        if (!listResult.success) {
            throw new Error(listResult.error || 'Failed to get configurations list');
        }
        
        if (!listResult.files || listResult.files.length === 0) {
            if (typeof showNotification === 'function') {
                showNotification('No saved configurations found for this user/team. Save a configuration first!', 'warning');
            } else {
                alert(`📁 No saved configurations found for:\nUser: ${userEmail}\nTeam: ${teamId}\n\nUse "Save to Backend" to save a configuration first!`);
            }
            return;
        }
        
        // Sort files by modification date (newest first)
        const sortedFiles = listResult.files.sort((a, b) => new Date(b.modified) - new Date(a.modified));
        
        // Load the most recent configuration
        const latestConfig = sortedFiles[0];
        console.log('Loading latest configuration:', latestConfig.filename);
        
        // Load the configuration
        const loadResponse = await fetch(`${window.backendUrl}/api/dashboard/load/${latestConfig.filename}?teamId=${teamId}&userEmail=${userEmail}`);
        
        if (!loadResponse.ok) {
            throw new Error('Failed to load configuration');
        }
        
        const loadResult = await loadResponse.json();
        
        if (!loadResult.success) {
            throw new Error(loadResult.error || 'Failed to load configuration');
        }
        
        console.log('✅ Configuration loaded successfully:', loadResult);
        
        // Apply the loaded configuration
        if (loadResult.configuration) {
            await applyDashboardConfiguration(loadResult.configuration);
            
            if (typeof showNotification === 'function') {
                showNotification('Configuration loaded successfully!', 'success');
            } else {
                alert('✅ Configuration loaded successfully!');
            }
        } else {
            throw new Error('No configuration data in response');
        }
        
    } catch (error) {
        console.error('❌ Error loading from backend:', error);
        if (typeof showNotification === 'function') {
            showNotification(`Error loading configuration: ${error.message}`, 'error');
        } else {
            alert(`❌ Error loading configuration:\n${error.message}`);
        }
    }
}

// Función para crear modal de login completo
function createIdentificationModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 30px;
        border-radius: 15px;
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        max-width: 450px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    content.innerHTML = `
        <h3 style="margin-top: 0; color: #E8F4F8;">🔐 Login to Load Configurations</h3>
        <p style="margin-bottom: 20px; color: #B8D4DA;">Please login to access your saved configurations from the backend.</p>
        
        <div id="loginStep" style="display: block;">
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #47B2E5;">Email:</label>
                <input type="email" id="loginEmail" placeholder="your@email.com" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    font-size: 14px;
                ">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #47B2E5;">Password:</label>
                <input type="password" id="loginPassword" placeholder="your password" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    font-size: 14px;
                ">
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancelLogin" style="
                    padding: 10px 20px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    cursor: pointer;
                ">Cancel</button>
                <button id="loginBtn" style="
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    background: linear-gradient(135deg, #47B2E5, #0B36AD);
                    color: white;
                    cursor: pointer;
                    font-weight: 600;
                ">Login</button>
            </div>
        </div>
        
        <div id="teamSelectionStep" style="display: none;">
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #47B2E5;">Select Team:</label>
                <select id="teamSelect" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    font-size: 14px;
                ">
                    <option value="">Loading teams...</option>
                </select>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="backToLogin" style="
                    padding: 10px 20px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    cursor: pointer;
                ">Back</button>
                <button id="loadConfigBtn" style="
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    background: linear-gradient(135deg, #47B2E5, #0B36AD);
                    color: white;
                    cursor: pointer;
                    font-weight: 600;
                ">Load Configurations</button>
            </div>
        </div>
        
        <div id="loadingStep" style="display: none; text-align: center;">
            <div style="margin: 20px 0;">
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(255, 255, 255, 0.3);
                    border-top: 4px solid #47B2E5;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                "></div>
            </div>
            <p style="color: #B8D4DA;">Loading...</p>
        </div>
        
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    modal.appendChild(content);
    return modal;
}

// Función para esperar la identificación del usuario con login completo
function waitForUserIdentification(modal) {
    return new Promise(async (resolve) => {
        const loginStep = modal.querySelector('#loginStep');
        const teamSelectionStep = modal.querySelector('#teamSelectionStep');
        const loadingStep = modal.querySelector('#loadingStep');
        
        const loginEmail = modal.querySelector('#loginEmail');
        const loginPassword = modal.querySelector('#loginPassword');
        const teamSelect = modal.querySelector('#teamSelect');
        
        const loginBtn = modal.querySelector('#loginBtn');
        const cancelLogin = modal.querySelector('#cancelLogin');
        const backToLogin = modal.querySelector('#backToLogin');
        const loadConfigBtn = modal.querySelector('#loadConfigBtn');
        
        let userTeams = [];
        let selectedTeam = null;
        
        // Login button handler
        loginBtn.addEventListener('click', async () => {
            const email = loginEmail.value.trim();
            const password = loginPassword.value.trim();
            
            if (!email || !password) {
                alert('Please provide both email and password');
                return;
            }
            
            // Show loading
            loginStep.style.display = 'none';
            loadingStep.style.display = 'block';
            
            try {
                // Attempt login
                const loginResult = await performLogin(email, password);
                
                if (loginResult.success) {
                    // Get user teams
                    userTeams = await getUserTeams(email);
                    
                    // Populate team select
                    teamSelect.innerHTML = '';
                    userTeams.forEach(team => {
                        const option = document.createElement('option');
                        option.value = team.id;
                        option.textContent = team.name;
                        teamSelect.appendChild(option);
                    });
                    
                    // Show team selection
                    loadingStep.style.display = 'none';
                    teamSelectionStep.style.display = 'block';
                    
                } else {
                    alert(`Login failed: ${loginResult.error}`);
                    loadingStep.style.display = 'none';
                    loginStep.style.display = 'block';
                }
                
            } catch (error) {
                console.error('Login error:', error);
                alert(`Login error: ${error.message}`);
                loadingStep.style.display = 'none';
                loginStep.style.display = 'block';
            }
        });
        
        // Back to login button
        backToLogin.addEventListener('click', () => {
            teamSelectionStep.style.display = 'none';
            loginStep.style.display = 'block';
        });
        
        // Load config button
        loadConfigBtn.addEventListener('click', () => {
            const teamId = teamSelect.value;
            if (!teamId) {
                alert('Please select a team');
                return;
            }
            
            selectedTeam = userTeams.find(team => team.id === teamId);
            document.body.removeChild(modal);
            resolve({
                email: loginEmail.value.trim(),
                teamId: teamId,
                teamName: selectedTeam.name,
                userTeams: userTeams
            });
        });
        
        // Cancel button
        cancelLogin.addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(null);
        });
        
        // Allow Enter key to login
        loginEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginPassword.focus();
            }
        });
        
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginBtn.click();
            }
        });
        
        // Focus on email input
        loginEmail.focus();
    });
}

// Función para realizar login
async function performLogin(email, password) {
    console.log('🔐 Attempting login for:', email);
    
    try {
        // Ensure backendUrl is set
        if (!window.backendUrl) {
            initializeBackendConfig();
        }
        
        const response = await fetch(`${window.backendUrl}/api/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            throw new Error('Login request failed');
        }
        
        const result = await response.json();
        console.log('Login result:', result);
        
        return result;
        
    } catch (error) {
        console.error('Login error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Función para obtener equipos del usuario
async function getUserTeams(email) {
    console.log('👥 Getting teams for user:', email);
    
    try {
        // Ensure backendUrl is set
        if (!window.backendUrl) {
            initializeBackendConfig();
        }
        
        const response = await fetch(`${window.backendUrl}/api/teams/user/${encodeURIComponent(email)}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch user teams');
        }
        
        const result = await response.json();
        console.log('User teams result:', result);
        
        if (result.success && result.teams) {
            return result.teams;
        } else {
            // Return default teams if API fails
            return [
                { id: 'default-team', name: 'Default Team' },
                { id: 'guest-team', name: 'Guest Team' }
            ];
        }
        
    } catch (error) {
        console.error('Get teams error:', error);
        // Return default teams if API fails
        return [
            { id: 'default-team', name: 'Default Team' },
            { id: 'guest-team', name: 'Guest Team' }
        ];
    }
}

// Override the original function
window.executeLoadFromBackend = executeLoadFromBackend; 