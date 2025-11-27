// ===== FIX GUEST USER SETUP ACCESS =====

// Función para permitir acceso a User Setup para usuarios guest
function fixGuestUserSetupAccess() {
    console.log('🔧 Fixing guest user setup access...');
    
    // 1. Override the User Setup button click handler
    function overrideUserSetupButton() {
        const userSetUpBtn = document.getElementById('userSetUpBtn');
        if (!userSetUpBtn) {
            console.log('⚠️ User Setup button not found');
            return false;
        }
        
        // Remove existing listeners by cloning
        const newUserSetUpBtn = userSetUpBtn.cloneNode(true);
        userSetUpBtn.parentNode.replaceChild(newUserSetUpBtn, userSetUpBtn);
        
        // Add new click handler that allows guest access
        newUserSetUpBtn.addEventListener('click', () => {
            console.log('👤 User Setup button clicked');
            
            // Check if user is logged in
            const currentUserEmail = getCurrentUserEmail();
            
            if (!currentUserEmail) {
                // Guest user - show guest mode modal
                console.log('👤 Guest user detected, showing guest mode');
                showGuestUserSetupModal();
            } else {
                // Logged in user - use existing functionality
                console.log('👤 Logged in user detected, using existing functionality');
                showLoggedInUserSetupModal();
            }
        });
        
        console.log('✅ User Setup button fixed for guest access');
        return true;
    }
    
    // 2. Show guest mode modal
    function showGuestUserSetupModal() {
        const userSetUpModal = document.getElementById('userSetUpModal');
        if (!userSetUpModal) {
            console.log('❌ User Setup modal not found');
            return;
        }
        
        // Show modal
        userSetUpModal.style.display = 'flex';
        userSetUpModal.classList.remove('hidden');
        
        // Render guest content
        renderGuestUserSetupContent();
    }
    
    // 3. Show logged in user modal (existing functionality)
    function showLoggedInUserSetupModal() {
        const userSetUpModal = document.getElementById('userSetUpModal');
        if (!userSetUpModal) {
            console.log('❌ User Setup modal not found');
            return;
        }
        
        // Show modal
        userSetUpModal.style.display = 'flex';
        userSetUpModal.classList.remove('hidden');
        
        // Force refresh user data before rendering
        if (typeof refreshUserData === 'function') {
            refreshUserData();
        }
        
        // If still no user data, create a basic profile
        const currentUserEmail = getCurrentUserEmail();
        if (!window.currentUser && currentUserEmail) {
            const basicUser = getUserCredentials ? getUserCredentials(currentUserEmail) : null;
            if (basicUser) {
                window.currentUser = {
                    email: currentUserEmail,
                    name: basicUser.name || currentUserEmail.split('@')[0] || 'User',
                    role: 'member',
                    id: generateUserId ? generateUserId() : currentUserEmail
                };
                localStorage.setItem('thebridge_current_user', JSON.stringify(window.currentUser));
            }
        }
        
        // Use existing render function
        if (typeof renderUserSetUpModalContent === 'function') {
            renderUserSetUpModalContent();
        }
    }
    
    // 4. Render guest content
    function renderGuestUserSetupContent() {
        const userSetUpModal = document.getElementById('userSetUpModal');
        if (!userSetUpModal) return;
        
        const modalContent = userSetUpModal.querySelector('.modal-content');
        if (!modalContent) return;
        
        console.log('🎨 Rendering guest user setup content');
        
        // Create guest content
        const guestContent = `
            <div class="guest-user-setup">
                <div class="guest-header">
                    <h2>👤 Guest User Setup</h2>
                    <p class="guest-description">
                        You're currently using The Bridge as a guest. You can load JSON files and use the application without registration.
                    </p>
                </div>
                
                <div class="guest-actions">
                    <div class="action-section">
                        <h3>📁 Load Data</h3>
                        <p>Load JSON files to get started with The Bridge</p>
                        <button id="guestLoadFromFolderBtn" class="action-btn primary">
                            📂 Load from Folder
                        </button>
                        <button id="guestLoadFromFileBtn" class="action-btn secondary">
                            📄 Load from File
                        </button>
                    </div>
                    
                    <div class="action-section">
                        <h3>💾 Save Data</h3>
                        <p>Save your work to local storage or files</p>
                        <button id="guestSaveToFolderBtn" class="action-btn primary">
                            💾 Save to Folder
                        </button>
                        <button id="guestExportDataBtn" class="action-btn secondary">
                            📤 Export Data
                        </button>
                    </div>
                    
                    <div class="action-section">
                        <h3>🔧 Quick Actions</h3>
                        <p>Common actions for guest users</p>
                        <button id="guestClearDataBtn" class="action-btn warning">
                            🗑️ Clear All Data
                        </button>
                        <button id="guestResetAppBtn" class="action-btn warning">
                            🔄 Reset Application
                        </button>
                    </div>
                    
                    <div class="action-section">
                        <h3>👤 Account Options</h3>
                        <p>Register or login to save your data permanently</p>
                        <button id="guestRegisterBtn" class="action-btn primary">
                            📝 Register Account
                        </button>
                        <button id="guestLoginBtn" class="action-btn secondary">
                            🔑 Login
                        </button>
                    </div>
                </div>
                
                <div class="guest-status">
                    <div id="guestStatusMessage" class="status-message"></div>
                </div>
            </div>
        `;
        
        // Apply content
        modalContent.innerHTML = guestContent;
        
        // Setup guest button handlers
        setupGuestButtonHandlers();
        
        // Add guest styles
        addGuestStyles();
    }
    
    // 5. Setup guest button handlers
    function setupGuestButtonHandlers() {
        console.log('🔧 Setting up guest button handlers');
        
        // Load from folder
        const guestLoadFromFolderBtn = document.getElementById('guestLoadFromFolderBtn');
        if (guestLoadFromFolderBtn) {
            guestLoadFromFolderBtn.addEventListener('click', () => {
                console.log('📂 Guest: Load from folder clicked');
                if (typeof executeLoadFromFolder === 'function') {
                    executeLoadFromFolder();
                } else {
                    showGuestStatus('Load from folder function not available', 'error');
                }
            });
        }
        
        // Load from file
        const guestLoadFromFileBtn = document.getElementById('guestLoadFromFileBtn');
        if (guestLoadFromFileBtn) {
            guestLoadFromFileBtn.addEventListener('click', () => {
                console.log('📄 Guest: Load from file clicked');
                // Create file input
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.json';
                fileInput.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        loadGuestFile(file);
                    }
                };
                fileInput.click();
            });
        }
        
        // Save to folder
        const guestSaveToFolderBtn = document.getElementById('guestSaveToFolderBtn');
        if (guestSaveToFolderBtn) {
            guestSaveToFolderBtn.addEventListener('click', () => {
                console.log('💾 Guest: Save to folder clicked');
                if (typeof executeSaveToFolder === 'function') {
                    executeSaveToFolder();
                } else {
                    showGuestStatus('Save to folder function not available', 'error');
                }
            });
        }
        
        // Export data
        const guestExportDataBtn = document.getElementById('guestExportDataBtn');
        if (guestExportDataBtn) {
            guestExportDataBtn.addEventListener('click', () => {
                console.log('📤 Guest: Export data clicked');
                exportGuestData();
            });
        }
        
        // Clear data
        const guestClearDataBtn = document.getElementById('guestClearDataBtn');
        if (guestClearDataBtn) {
            guestClearDataBtn.addEventListener('click', () => {
                console.log('🗑️ Guest: Clear data clicked');
                if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
                    clearGuestData();
                }
            });
        }
        
        // Reset app
        const guestResetAppBtn = document.getElementById('guestResetAppBtn');
        if (guestResetAppBtn) {
            guestResetAppBtn.addEventListener('click', () => {
                console.log('🔄 Guest: Reset app clicked');
                if (confirm('Are you sure you want to reset the application? This will clear all data and reload the page.')) {
                    resetGuestApp();
                }
            });
        }
        
        // Register
        const guestRegisterBtn = document.getElementById('guestRegisterBtn');
        if (guestRegisterBtn) {
            guestRegisterBtn.addEventListener('click', () => {
                console.log('📝 Guest: Register clicked');
                // Close modal and show register modal
                const userSetUpModal = document.getElementById('userSetUpModal');
                if (userSetUpModal) {
                    userSetUpModal.classList.add('hidden');
                    setTimeout(() => { userSetUpModal.style.display = 'none'; }, 300);
                }
                
                // Show register modal
                const registerModal = document.querySelector('.modal-overlay[data-modal="register"]');
                if (registerModal) {
                    registerModal.style.display = 'flex';
                    registerModal.classList.remove('hidden');
                }
            });
        }
        
        // Login
        const guestLoginBtn = document.getElementById('guestLoginBtn');
        if (guestLoginBtn) {
            guestLoginBtn.addEventListener('click', () => {
                console.log('🔑 Guest: Login clicked');
                // Close modal and show login modal
                const userSetUpModal = document.getElementById('userSetUpModal');
                if (userSetUpModal) {
                    userSetUpModal.classList.add('hidden');
                    setTimeout(() => { userSetUpModal.style.display = 'none'; }, 300);
                }
                
                // Show login modal
                const loginModal = document.querySelector('.modal-overlay[data-modal="login"]');
                if (loginModal) {
                    loginModal.style.display = 'flex';
                    loginModal.classList.remove('hidden');
                }
            });
        }
    }
    
    // 6. Guest file loading function
    function loadGuestFile(file) {
        console.log('📄 Loading guest file:', file.name);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                console.log('✅ File loaded successfully:', data);
                
                // Process the data based on its structure
                if (data.type === 'dashboard-config') {
                    loadDashboardConfig(data);
                } else if (data.type === 'user-data') {
                    loadUserData(data);
                } else if (data.type === 'team-data') {
                    loadTeamData(data);
                } else {
                    // Generic data loading
                    loadGenericData(data);
                }
                
                showGuestStatus(`File "${file.name}" loaded successfully!`, 'success');
                
            } catch (error) {
                console.error('❌ Error loading file:', error);
                showGuestStatus(`Error loading file: ${error.message}`, 'error');
            }
        };
        
        reader.onerror = () => {
            console.error('❌ File reading error');
            showGuestStatus('Error reading file', 'error');
        };
        
        reader.readAsText(file);
    }
    
    // 7. Guest data loading functions
    function loadDashboardConfig(data) {
        console.log('📊 Loading dashboard config:', data);
        if (data.config) {
            localStorage.setItem('thebridge_dashboard_config', JSON.stringify(data.config));
            showGuestStatus('Dashboard configuration loaded!', 'success');
        }
    }
    
    function loadUserData(data) {
        console.log('👤 Loading user data:', data);
        if (data.users) {
            localStorage.setItem('thebridge_users', JSON.stringify(data.users));
            showGuestStatus('User data loaded!', 'success');
        }
    }
    
    function loadTeamData(data) {
        console.log('👥 Loading team data:', data);
        if (data.teams) {
            localStorage.setItem('thebridge_teams', JSON.stringify(data.teams));
            showGuestStatus('Team data loaded!', 'success');
        }
    }
    
    function loadGenericData(data) {
        console.log('📋 Loading generic data:', data);
        // Try to identify and load different types of data
        if (data.dashboard) {
            localStorage.setItem('thebridge_dashboard_config', JSON.stringify(data.dashboard));
        }
        if (data.users) {
            localStorage.setItem('thebridge_users', JSON.stringify(data.users));
        }
        if (data.teams) {
            localStorage.setItem('thebridge_teams', JSON.stringify(data.teams));
        }
        if (data.settings) {
            localStorage.setItem('thebridge_settings', JSON.stringify(data.settings));
        }
        showGuestStatus('Data loaded successfully!', 'success');
    }
    
    // 8. Guest data export function
    function exportGuestData() {
        console.log('📤 Exporting guest data');
        
        const exportData = {
            type: 'thebridge-export',
            timestamp: new Date().toISOString(),
            version: '1.0',
            data: {
                dashboard: JSON.parse(localStorage.getItem('thebridge_dashboard_config') || 'null'),
                users: JSON.parse(localStorage.getItem('thebridge_users') || '[]'),
                teams: JSON.parse(localStorage.getItem('thebridge_teams') || '[]'),
                settings: JSON.parse(localStorage.getItem('thebridge_settings') || '{}'),
                currentUser: JSON.parse(localStorage.getItem('thebridge_current_user') || 'null'),
                currentTeam: JSON.parse(localStorage.getItem('thebridge_current_team') || 'null')
            }
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thebridge-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showGuestStatus('Data exported successfully!', 'success');
    }
    
    // 9. Guest data clearing function
    function clearGuestData() {
        console.log('🗑️ Clearing guest data');
        
        const keysToClear = [
            'thebridge_dashboard_config',
            'thebridge_users',
            'thebridge_teams',
            'thebridge_settings',
            'thebridge_current_user',
            'thebridge_current_team'
        ];
        
        keysToClear.forEach(key => {
            localStorage.removeItem(key);
        });
        
        showGuestStatus('All data cleared successfully!', 'success');
    }
    
    // 10. Guest app reset function
    function resetGuestApp() {
        console.log('🔄 Resetting guest app');
        
        // Clear all data
        clearGuestData();
        
        // Reload page
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
    
    // 11. Show guest status function
    function showGuestStatus(message, type = 'info') {
        const statusElement = document.getElementById('guestStatusMessage');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-message ${type}`;
            
            // Auto-clear after 5 seconds
            setTimeout(() => {
                statusElement.textContent = '';
                statusElement.className = 'status-message';
            }, 5000);
        }
        
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    // 12. Add guest styles
    function addGuestStyles() {
        const styleId = 'guest-user-setup-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .guest-user-setup {
                padding: 1rem;
                color: #E8F4F8;
            }
            
            .guest-header {
                text-align: center;
                margin-bottom: 2rem;
            }
            
            .guest-header h2 {
                color: #47B2E5;
                margin-bottom: 0.5rem;
            }
            
            .guest-description {
                color: #B0BEC5;
                font-size: 0.95rem;
                line-height: 1.5;
            }
            
            .guest-actions {
                display: grid;
                gap: 1.5rem;
            }
            
            .action-section {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 1.5rem;
                border: 1px solid rgba(71, 178, 229, 0.2);
            }
            
            .action-section h3 {
                color: #47B2E5;
                margin-top: 0;
                margin-bottom: 0.5rem;
                font-size: 1.1rem;
            }
            
            .action-section p {
                color: #B0BEC5;
                margin-bottom: 1rem;
                font-size: 0.9rem;
            }
            
            .action-btn {
                display: inline-block;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                border: none;
                cursor: pointer;
                font-weight: 600;
                font-size: 0.95rem;
                transition: all 0.3s ease;
                margin-right: 0.5rem;
                margin-bottom: 0.5rem;
            }
            
            .action-btn.primary {
                background: linear-gradient(135deg, #47B2E5 0%, #1976d2 100%);
                color: white;
            }
            
            .action-btn.secondary {
                background: rgba(71, 178, 229, 0.1);
                color: #47B2E5;
                border: 1px solid rgba(71, 178, 229, 0.3);
            }
            
            .action-btn.warning {
                background: rgba(245, 158, 11, 0.1);
                color: #F59E0B;
                border: 1px solid rgba(245, 158, 11, 0.3);
            }
            
            .action-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(71, 178, 229, 0.3);
            }
            
            .action-btn.warning:hover {
                box-shadow: 0 8px 25px rgba(245, 158, 11, 0.3);
            }
            
            .guest-status {
                margin-top: 1.5rem;
                padding: 1rem;
                border-radius: 8px;
                background: rgba(0, 0, 0, 0.2);
            }
            
            .status-message {
                text-align: center;
                font-weight: 500;
                min-height: 1.5rem;
            }
            
            .status-message.success {
                color: #10B981;
            }
            
            .status-message.error {
                color: #EF4444;
            }
            
            .status-message.warning {
                color: #F59E0B;
            }
            
            .status-message.info {
                color: #3B82F6;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // 13. Helper functions
    function getCurrentUserEmail() {
        return localStorage.getItem('thebridge_current_user_email') || 
               (window.currentUser ? window.currentUser.email : null);
    }
    
    function getUserCredentials(email) {
        const users = JSON.parse(localStorage.getItem('thebridge_users') || '[]');
        return users.find(user => user.email === email);
    }
    
    function generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // 14. Initialize the fix
    function init() {
        console.log('🚀 Initializing guest user setup fix...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(initFix, 1000);
            });
        } else {
            setTimeout(initFix, 1000);
        }
    }
    
    function initFix() {
        const success = overrideUserSetupButton();
        
        if (success) {
            console.log('✅ Guest user setup fix applied successfully');
        } else {
            console.log('❌ Failed to apply guest user setup fix');
        }
    }
    
    // Start the fix
    init();
}

// Auto-apply the fix when the script is loaded
if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🔧 DOM loaded, applying guest user setup fix...');
            setTimeout(fixGuestUserSetupAccess, 1000);
        });
    } else {
        console.log('🔧 DOM already loaded, applying guest user setup fix...');
        setTimeout(fixGuestUserSetupAccess, 1000);
    }
}

// Make the function available globally
window.fixGuestUserSetupAccess = fixGuestUserSetupAccess;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fixGuestUserSetupAccess };
}

console.log('🔧 Guest user setup fix script loaded and ready to apply'); 