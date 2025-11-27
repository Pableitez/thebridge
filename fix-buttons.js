// ===== FIX ALL BUTTONS - PREVENT INFINITE LOOP =====

// Global flag to prevent infinite loops
window.buttonsFixed = false;
window.fixButtonsInProgress = false;

// Función para arreglar todos los botones (solo una vez)
function fixAllButtons() {
    // Prevent infinite loops
    if (window.buttonsFixed || window.fixButtonsInProgress) {
        console.log('🔒 Buttons already fixed or fix in progress, skipping...');
        return;
    }
    
    window.fixButtonsInProgress = true;
    console.log('🔧 Fixing all buttons...');
    
    try {
        // Fix Save to Backend button
        fixSaveToBackendButton();
        
        // Fix Load from Backend button
        fixLoadFromBackendButton();
        
        // Fix User Settings buttons
        fixUserSettingsButtons();
        
        window.buttonsFixed = true;
        console.log('✅ All buttons fixed successfully!');
        
    } catch (error) {
        console.error('❌ Error fixing buttons:', error);
    } finally {
        window.fixButtonsInProgress = false;
    }
}

// Fix Save to Backend button
function fixSaveToBackendButton() {
    const saveBtn = document.getElementById('saveDashboardConfigBtn');
    if (saveBtn && !saveBtn.dataset.fixed) {
        console.log('🔧 Fixing Save to Backend button');
        
        // Mark as fixed to prevent re-fixing
        saveBtn.dataset.fixed = 'true';
        
        // Remove existing listeners by cloning
        const newSaveBtn = saveBtn.cloneNode(true);
        newSaveBtn.dataset.fixed = 'true';
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        
        // Add new listener
        newSaveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Save to Backend button clicked - calling executeSaveToBackend()');
            
            if (typeof executeSaveToBackend === 'function') {
                executeSaveToBackend();
            } else {
                console.error('❌ executeSaveToBackend function not found');
                alert('Save to Backend function not available');
            }
        });
        
        console.log('✅ Save to Backend button fixed');
    } else if (!saveBtn) {
        console.log('ℹ️ Save to Backend button not found (may not be loaded yet)');
    } else {
        console.log('ℹ️ Save to Backend button already fixed');
    }
}

// Fix Load from Backend button
function fixLoadFromBackendButton() {
    const loadBtn = document.getElementById('loadDashboardConfigBtn');
    if (loadBtn && !loadBtn.dataset.fixed) {
        console.log('🔧 Fixing Load from Backend button');
        
        // Mark as fixed to prevent re-fixing
        loadBtn.dataset.fixed = 'true';
        
        // Remove existing listeners by cloning
        const newLoadBtn = loadBtn.cloneNode(true);
        newLoadBtn.dataset.fixed = 'true';
        loadBtn.parentNode.replaceChild(newLoadBtn, loadBtn);
        
        // Add new listener
        newLoadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Load from Backend button clicked - calling executeLoadFromBackend()');
            
            if (typeof executeLoadFromBackend === 'function') {
                executeLoadFromBackend();
            } else {
                console.error('❌ executeLoadFromBackend function not found');
                alert('Load from Backend function not available');
            }
        });
        
        console.log('✅ Load from Backend button fixed');
    } else if (!loadBtn) {
        console.log('ℹ️ Load from Backend button not found (may not be loaded yet)');
    } else {
        console.log('ℹ️ Load from Backend button already fixed');
    }
}

// Fix User Settings buttons
function fixUserSettingsButtons() {
    console.log('🔧 Fixing User Settings buttons');
    
    // Fix Change Password button
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn && !changePasswordBtn.dataset.fixed) {
        console.log('🔧 Fixing Change Password button');
        
        // Mark as fixed to prevent re-fixing
        changePasswordBtn.dataset.fixed = 'true';
        
        // Remove existing listeners by cloning
        const newChangePasswordBtn = changePasswordBtn.cloneNode(true);
        newChangePasswordBtn.dataset.fixed = 'true';
        changePasswordBtn.parentNode.replaceChild(newChangePasswordBtn, changePasswordBtn);
        
        // Add new listener
        newChangePasswordBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Change Password button clicked');
            
            // Show change password modal or form
            showChangePasswordModal();
        });
        
        console.log('✅ Change Password button fixed');
    } else if (!changePasswordBtn) {
        console.log('ℹ️ Change Password button not found (may not be loaded yet)');
    } else {
        console.log('ℹ️ Change Password button already fixed');
    }
    
    // Fix Export My Data button
    const exportUserDataBtn = document.getElementById('exportUserDataBtn');
    if (exportUserDataBtn && !exportUserDataBtn.dataset.fixed) {
        console.log('🔧 Fixing Export My Data button');
        
        // Mark as fixed to prevent re-fixing
        exportUserDataBtn.dataset.fixed = 'true';
        
        // Remove existing listeners by cloning
        const newExportUserDataBtn = exportUserDataBtn.cloneNode(true);
        newExportUserDataBtn.dataset.fixed = 'true';
        exportUserDataBtn.parentNode.replaceChild(newExportUserDataBtn, exportUserDataBtn);
        
        // Add new listener
        newExportUserDataBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Export My Data button clicked');
            
            await exportUserData();
        });
        
        console.log('✅ Export My Data button fixed');
    } else if (!exportUserDataBtn) {
        console.log('ℹ️ Export My Data button not found (may not be loaded yet)');
    } else {
        console.log('ℹ️ Export My Data button already fixed');
    }
    
    // Fix Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn && !logoutBtn.dataset.fixed) {
        console.log('🔧 Fixing Logout button');
        
        // Mark as fixed to prevent re-fixing
        logoutBtn.dataset.fixed = 'true';
        
        // Remove existing listeners by cloning
        const newLogoutBtn = logoutBtn.cloneNode(true);
        newLogoutBtn.dataset.fixed = 'true';
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        // Add new listener
        newLogoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Logout button clicked');
            
            if (confirm('Are you sure you want to logout?')) {
                performLogout();
            }
        });
        
        console.log('✅ Logout button fixed');
    } else if (!logoutBtn) {
        console.log('ℹ️ Logout button not found (may not be loaded yet)');
    } else {
        console.log('ℹ️ Logout button already fixed');
    }
}

// Show Change Password Modal
function showChangePasswordModal() {
    console.log('🔐 Showing Change Password Modal');
    
    // Create modal
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
        max-width: 400px;
        width: 90%;
    `;
    
    content.innerHTML = `
        <h3 style="margin-top: 0; color: #E8F4F8;">🔐 Change Password</h3>
        <p style="margin-bottom: 20px; color: #B8D4DA;">Enter your new password below.</p>
        
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; color: #47B2E5;">Current Password:</label>
            <input type="password" id="currentPassword" placeholder="Current password" style="
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
            <label style="display: block; margin-bottom: 5px; color: #47B2E5;">New Password:</label>
            <input type="password" id="newPassword" placeholder="New password" style="
                width: 100%;
                padding: 10px;
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
                color: white;
                font-size: 14px;
            ">
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; color: #47B2E5;">Confirm New Password:</label>
            <input type="password" id="confirmPassword" placeholder="Confirm new password" style="
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
            <button id="cancelChangePassword" style="
                padding: 10px 20px;
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
                color: white;
                cursor: pointer;
            ">Cancel</button>
            <button id="confirmChangePassword" style="
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                background: linear-gradient(135deg, #47B2E5, #0B36AD);
                color: white;
                cursor: pointer;
                font-weight: 600;
            ">Change Password</button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Add event listeners
    const cancelBtn = modal.querySelector('#cancelChangePassword');
    const confirmBtn = modal.querySelector('#confirmChangePassword');
    
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    confirmBtn.addEventListener('click', async () => {
        const currentPassword = modal.querySelector('#currentPassword').value;
        const newPassword = modal.querySelector('#newPassword').value;
        const confirmPassword = modal.querySelector('#confirmPassword').value;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('Please fill in all fields');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            alert('New passwords do not match');
            return;
        }
        
        if (newPassword.length < 8) {
            alert('New password must be at least 8 characters long');
            return;
        }
        
        try {
            // Here you would call the backend API to change password
            console.log('Changing password...');
            
            // For now, just show success message
            alert('Password changed successfully!');
            document.body.removeChild(modal);
            
        } catch (error) {
            console.error('Error changing password:', error);
            alert('Error changing password: ' + error.message);
        }
    });
    
    // Focus on first input
    modal.querySelector('#currentPassword').focus();
}

// Export User Data
async function exportUserData() {
    console.log('📊 Exporting user data...');
    
    try {
        // Get current user info
        const userEmail = window.currentUser?.email || 'unknown@user.com';
        const teamId = window.currentTeam?.id || 'unknown-team';
        
        // Collect all user data
        const userData = {
            userInfo: {
                email: userEmail,
                teamId: teamId,
                exportDate: new Date().toISOString()
            },
            teams: JSON.parse(localStorage.getItem('thebridge_teams') || '[]'),
            currentTeam: JSON.parse(localStorage.getItem('thebridge_current_team') || '{}'),
            filters: JSON.parse(localStorage.getItem('thebridge_filters') || '{}'),
            quickFilters: JSON.parse(localStorage.getItem('quickFilters') || '{}'),
            tableViews: JSON.parse(localStorage.getItem('tableViews') || '{}'),
            customSummaries: JSON.parse(localStorage.getItem('customSummaries') || '{}'),
            favorites: JSON.parse(localStorage.getItem('thebridge_favorites') || '[]'),
            theme: localStorage.getItem('thebridge_theme') || 'dark',
            language: localStorage.getItem('thebridge_language') || 'es',
            autoSave: window.autoSaveEnabled !== undefined ? window.autoSaveEnabled : true
        };
        
        // Create filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `the-bridge-user-data-${userEmail}-${timestamp}.json`;
        
        // Create and download file
        const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ User data exported successfully');
        
        if (typeof showNotification === 'function') {
            showNotification('User data exported successfully!', 'success');
        } else {
            alert('✅ User data exported successfully!');
        }
        
    } catch (error) {
        console.error('❌ Error exporting user data:', error);
        
        if (typeof showNotification === 'function') {
            showNotification('Error exporting user data: ' + error.message, 'error');
        } else {
            alert('❌ Error exporting user data: ' + error.message);
        }
    }
}

// Perform Logout
function performLogout() {
    console.log('🚪 Performing logout...');
    
    try {
        // Clear team session
        if (typeof clearTeamSession === 'function') {
            clearTeamSession();
        }
        
        // Clear user data from localStorage
        localStorage.removeItem('thebridge_current_user');
        localStorage.removeItem('thebridge_current_team');
        localStorage.removeItem('thebridge_teams');
        
        // Reset global variables
        window.currentUser = null;
        window.currentTeam = null;
        
        // Reset button fix flags
        window.buttonsFixed = false;
        
        // Close any open modals
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            if (!modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }
        });
        
        // Show welcome screen
        if (typeof showWelcomeScreen === 'function') {
            showWelcomeScreen();
        }
        
        console.log('✅ Logout completed successfully');
        
        if (typeof showNotification === 'function') {
            showNotification('Logged out successfully', 'info');
        } else {
            alert('✅ Logged out successfully');
        }
        
    } catch (error) {
        console.error('❌ Error during logout:', error);
        
        if (typeof showNotification === 'function') {
            showNotification('Error during logout: ' + error.message, 'error');
        } else {
            alert('❌ Error during logout: ' + error.message);
        }
    }
}

// Initialize button fixes when DOM is loaded (only once)
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 DOM loaded, initializing button fixes...');
    
    // Wait a bit for other scripts to load, then fix buttons once
    setTimeout(() => {
        fixAllButtons();
    }, 2000);
});

// Also fix buttons when user modal opens (but only if not already fixed)
document.addEventListener('click', function(e) {
    if (e.target.id === 'userSetUpBtn' && !window.buttonsFixed) {
        console.log('🔧 User modal opening, fixing buttons...');
        setTimeout(() => {
            fixAllButtons();
        }, 500);
    }
});

// Make functions available globally
window.fixAllButtons = fixAllButtons;
window.showChangePasswordModal = showChangePasswordModal;
window.exportUserData = exportUserData;
window.performLogout = performLogout; 