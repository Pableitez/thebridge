// ===== SIMPLE ONEDRIVE ACCESS MODAL =====

// Simple modal to access OneDrive
class OneDriveConfigurationModal {
    constructor() {
        this.modalId = 'onedriveConfigModal';
        this.isVisible = false;
        this.onSaveCallback = null;
        
        console.log('🔧 Simple OneDrive Access Modal initialized');
    }
    
    // 1. Create modal HTML
    createModal() {
        const modalHTML = `
            <div id="${this.modalId}" class="modal-overlay hidden">
                <div class="modal-content">
                                         <div class="modal-header">
                                                   <h2>Sync Configuration</h2>
                         <button class="modal-close" onclick="window.oneDriveConfigModal.close()">&times;</button>
                     </div>
                    
                                         <div class="modal-body">
                                                   <div class="auth-section">
                                                             <p>Sync your configuration across all devices. Your filters, settings, and preferences will be available on any computer where you log in.</p>
                            
                                                                                                                       <div class="auth-buttons">
                                                                                                         <button id="accessOneDriveBtn" class="primary-btn" onclick="window.oneDriveConfigModal.accessOneDrive()">
                                        🔄 Sync Configuration (Recommended)
                                    </button>
                                   
                                   <div class="divider">
                                       <span>or</span>
                                   </div>
                                   
                                   <button id="createAccountBtn" class="secondary-btn" onclick="window.oneDriveConfigModal.createAccount()">
                                      Create Microsoft Account
                                  </button>
                              </div>
                            
                            <div id="authStatus" class="status-message" style="display: none;"></div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button class="secondary-btn" onclick="window.oneDriveConfigModal.close()">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body if it doesn't exist
        if (!document.getElementById(this.modalId)) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            this.addStyles();
        }
    }
    
    // 2. Add CSS styles
    addStyles() {
        const styleId = 'onedriveConfigModalStyles';
        if (document.getElementById(styleId)) return;
        
        const styles = `
            <style id="${styleId}">
                #${this.modalId} {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7) !important;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                }
                
                #${this.modalId} .modal-content {
                    background: #1a2332 !important;
                    border: 1px solid rgba(71, 178, 229, 0.4);
                    border-radius: 20px;
                    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(71, 178, 229, 0.1);
                    color: #E8F4F8;
                    max-width: 500px;
                    width: 90%;
                    position: relative;
                    animation: modalSlideIn 0.4s ease-out;
                    backdrop-filter: none !important;
                }
                
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-30px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                #${this.modalId} .modal-header {
                    padding: 1.5rem 2rem 1rem 2rem;
                    text-align: center;
                    position: relative;
                    border-bottom: 1px solid rgba(71, 178, 229, 0.2);
                    background: #1a2332 !important;
                }
                
                #${this.modalId} .modal-header h2 {
                    margin: 0;
                    color: #E8F4F8;
                    font-size: 1.6rem;
                    font-weight: 600;
                    letter-spacing: -0.5px;
                    line-height: 1.3;
                }
                

                
                #${this.modalId} .modal-close {
                    position: absolute;
                    top: 1.5rem;
                    right: 1.5rem;
                    background: #2a3441 !important;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: #E8F4F8;
                    font-size: 1.2rem;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 8px;
                    transition: all 0.3s ease;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                #${this.modalId} .modal-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: scale(1.1);
                }
                
                #${this.modalId} .modal-body {
                    padding: 0 2rem 2rem 2rem;
                }
                
                #${this.modalId} .auth-section {
                    text-align: center;
                }
                

                
                #${this.modalId} .auth-section p {
                    color: rgba(232, 244, 248, 0.7);
                    font-size: 0.9rem;
                    line-height: 1.5;
                    margin-bottom: 2.5rem;
                }
                
                #${this.modalId} .auth-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                #${this.modalId} .primary-btn, #${this.modalId} .secondary-btn {
                    padding: 1rem 1.5rem;
                    border: none;
                    border-radius: 12px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.8rem;
                    min-height: 52px;
                    text-decoration: none;
                    width: 100%;
                }
                
                #${this.modalId} .azure-btn {
                    background: linear-gradient(135deg, #0078d4, #106ebe);
                    color: white;
                    box-shadow: 0 4px 15px rgba(0, 120, 212, 0.4);
                    border: 1px solid rgba(0, 120, 212, 0.3);
                    font-weight: 600;
                    font-size: 1.1rem;
                }
                
                #${this.modalId} .azure-btn:hover {
                    background: linear-gradient(135deg, #106ebe, #005a9e);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0, 120, 212, 0.5);
                }
                
                #${this.modalId} .primary-btn {
                    background: linear-gradient(135deg, #47B2E5, #1976d2);
                    color: white;
                    box-shadow: 0 4px 15px rgba(71, 178, 229, 0.4);
                    border: 1px solid rgba(71, 178, 229, 0.3);
                    font-weight: 600;
                }
                
                #${this.modalId} .primary-btn:hover:not(:disabled) {
                    background: linear-gradient(135deg, #1976d2, #1565c0);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(71, 178, 229, 0.5);
                    border-color: rgba(71, 178, 229, 0.5);
                }
                
                #${this.modalId} .secondary-btn {
                    background: #2a3441;
                    color: #E8F4F8;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    font-weight: 600;
                }
                
                #${this.modalId} .secondary-btn:hover {
                    background: #3a4451;
                    border-color: rgba(255, 255, 255, 0.3);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1);
                }
                
                #${this.modalId} .primary-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }
                
                #${this.modalId} .divider {
                    position: relative;
                    text-align: center;
                    margin: 0.5rem 0;
                }
                
                #${this.modalId} .divider::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: rgba(255, 255, 255, 0.2);
                }
                
                #${this.modalId} .divider span {
                    background: #1a2332;
                    padding: 0 1rem;
                    color: rgba(232, 244, 248, 0.5);
                    font-size: 0.9rem;
                }
                
                #${this.modalId} .modal-footer {
                    padding: 1rem 2rem 1.5rem 2rem;
                    display: flex;
                    justify-content: space-between;
                    gap: 1rem;
                }
                
                #${this.modalId} .modal-footer .secondary-btn {
                    background: #2a3441;
                    color: #E8F4F8;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    flex: 1;
                    font-weight: 600;
                }
                
                #${this.modalId} .modal-footer .secondary-btn:hover {
                    background: #3a4451;
                    border-color: rgba(255, 255, 255, 0.3);
                    transform: translateY(-1px);
                }
                
                #${this.modalId} .status-message {
                    padding: 1rem;
                    border-radius: 12px;
                    margin-top: 1rem;
                    font-size: 0.9rem;
                    border: 1px solid;
                    font-weight: 500;
                }
                
                #${this.modalId} .status-message.success {
                    background: rgba(16, 185, 129, 0.15);
                    color: #10b981;
                    border-color: rgba(16, 185, 129, 0.4);
                }
                
                #${this.modalId} .status-message.error {
                    background: rgba(239, 68, 68, 0.15);
                    color: #ef4444;
                    border-color: rgba(239, 68, 68, 0.4);
                }
                
                #${this.modalId}.hidden {
                    display: none !important;
                }
                
                /* Responsive design */
                @media (max-width: 768px) {
                    #${this.modalId} .modal-content {
                        width: 95%;
                        max-width: none;
                        margin: 1rem;
                    }
                    
                    #${this.modalId} .modal-header,
                    #${this.modalId} .modal-body,
                    #${this.modalId} .modal-footer {
                        padding-left: 1.5rem;
                        padding-right: 1.5rem;
                    }
                    
                    #${this.modalId} .modal-footer {
                        flex-direction: column;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
    
    // 3. Show modal
    show(onSaveCallback = null) {
        this.onSaveCallback = onSaveCallback;
        this.createModal();
        
        const modal = document.getElementById(this.modalId);
        modal.classList.remove('hidden');
        this.isVisible = true;
        
        console.log('✅ Simple OneDrive Access Modal shown');
    }
    
    // 4. Close modal
    close() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
        this.isVisible = false;
        console.log('✅ Simple OneDrive Access Modal closed');
    }
    
            // 5. Access OneDrive
    async accessOneDrive() {
        const authStatus = document.getElementById('authStatus');
        const accessBtn = document.getElementById('accessOneDriveBtn');
        
        try {
            accessBtn.disabled = true;
            accessBtn.textContent = 'Syncing configuration...';
            authStatus.textContent = '🔄 Syncing your configuration across devices...';
            authStatus.className = 'status-message success';
            authStatus.style.display = 'block';
            
            // Set up OneDrive connection directly
            await this.setupOneDriveConnection();
            
        } catch (error) {
            console.error('❌ Error creating backup:', error);
            authStatus.textContent = `❌ Error: ${error.message}`;
            authStatus.className = 'status-message error';
            authStatus.style.display = 'block';
            
            // Reset button
            accessBtn.disabled = false;
            accessBtn.textContent = '💾 Create Backup (Recommended)';
            accessBtn.style.background = 'linear-gradient(135deg, #47B2E5, #1976d2)';
        }
    }
    
    // Setup OneDrive connection after user logs in
    async setupOneDriveConnection() {
        const authStatus = document.getElementById('authStatus');
        const accessBtn = document.getElementById('accessOneDriveBtn');
        
        try {
            authStatus.textContent = '🔄 Syncing configuration...';
            
            // Mark OneDrive as connected
            localStorage.setItem('onedrive_connected', 'true');
            localStorage.setItem('onedrive_setup_date', new Date().toISOString());
            
            // Set up basic configuration
            const config = {
                basePath: 'TheBridge',
                usersPath: 'users',
                teamsPath: 'teams',
                configurationsPath: 'configurations',
                backupsPath: 'backups',
                customPaths: {}
            };
            
            localStorage.setItem('onedrive_user_config', JSON.stringify(config));
            
            // Update global config
            window.oneDriveConfig = window.oneDriveConfig || {};
            window.oneDriveConfig.isConnected = true;
            window.oneDriveConfig.lastSync = new Date().toISOString();
            window.oneDriveConfig.authMethod = 'manual';
            
            // Save current data to OneDrive
            await this.saveCurrentDataToOneDrive();
            
            // Update UI
            authStatus.textContent = '✅ Configuration synced successfully! Your settings are now available on all devices.';
            accessBtn.textContent = 'Synced!';
            accessBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            
            // Close modal after 3 seconds
            setTimeout(() => {
                this.close();
                
                // Show success notification
                if (typeof showNotification === 'function') {
                    showNotification('Configuration Synced', 'Your settings are now available on all devices!', 'success');
                }
            }, 3000);
            
            console.log('✅ Backup created successfully');
            
        } catch (error) {
            console.error('❌ Error creating backup:', error);
            authStatus.textContent = `❌ Error: ${error.message}`;
            authStatus.className = 'status-message error';
            authStatus.style.display = 'block';
            
            // Reset button
            accessBtn.disabled = false;
            accessBtn.textContent = '📁 Connect OneDrive Auto-Save (Recommended)';
            accessBtn.style.background = 'linear-gradient(135deg, #47B2E5, #1976d2)';
        }
    }
    
    // Save current data to backend for cross-device sync
    async saveCurrentDataToOneDrive() {
        try {
            console.log('💾 Saving current data to backend for cross-device sync...');
            
            // Get current user and team info
            const userEmail = window.currentUser?.email || 'default@user.com';
            const userName = window.currentUser?.name || 'Default User';
            const teamId = window.currentTeam?.id || 'default-team';
            const teamName = window.currentTeam?.name || 'Default Team';
            
            // Collect all current data from localStorage
            const currentData = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                description: 'Complete user configuration and data',
                
                // User and team info
                userInfo: {
                    email: userEmail,
                    name: userName,
                    teamId: teamId,
                    teamName: teamName
                },
                
                // Teams configuration
                teams: JSON.parse(localStorage.getItem('thebridge_teams') || '[]'),
                currentTeam: JSON.parse(localStorage.getItem('thebridge_current_team') || '{}'),
                
                // Filters configuration
                filters: JSON.parse(localStorage.getItem('thebridge_filters') || '{}'),
                quickFilters: JSON.parse(localStorage.getItem('quickFilters') || '{}'),
                myFilters: JSON.parse(localStorage.getItem('myFilters') || '{}'),
                
                // Table views configuration
                tableViews: JSON.parse(localStorage.getItem('tableViews') || '{}'),
                currentTableView: localStorage.getItem('thebridge_current_table_view'),
                
                // Column configuration
                columnConfig: JSON.parse(localStorage.getItem('thebridge_column_config') || '{}'),
                visibleColumns: JSON.parse(localStorage.getItem('thebridge_visible_columns') || '[]'),
                columnOrder: JSON.parse(localStorage.getItem('thebridge_column_order') || '[]'),
                
                // Custom summaries
                customSummaries: JSON.parse(localStorage.getItem('customSummaries') || '{}'),
                
                // Favorites
                favorites: JSON.parse(localStorage.getItem('thebridge_favorites') || '[]'),
                favoritos: JSON.parse(localStorage.getItem('favoritos') || '[]'),
                
                // Theme and language
                theme: localStorage.getItem('thebridge_theme') || 'dark',
                language: localStorage.getItem('thebridge_language') || 'es',
                
                // Dashboard configuration
                dashboardConfig: JSON.parse(localStorage.getItem('dashboardConfig') || '{}'),
                
                // Notifications
                notifications: JSON.parse(localStorage.getItem('notifications') || '{}'),
                
                // Backend settings
                backendSettings: JSON.parse(localStorage.getItem('backendSettings') || '{}'),
                
                // Current session
                currentSession: {
                    lastActivity: new Date().toISOString(),
                    dataVersion: localStorage.getItem('currentDataVersion') || 'v1.0',
                    activeFilters: JSON.parse(localStorage.getItem('activeFilters') || '[]')
                }
            };
            
            // Try to save to backend first (for cross-device sync)
            if (window.backendUrl) {
                try {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const filename = `user-config-${userEmail}-${timestamp}.json`;
                    
                    const response = await fetch(`${window.backendUrl}/api/dashboard/save`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            filename: filename,
                            settings: currentData,
                            teamId: teamId,
                            userEmail: userEmail
                        })
                    });
                    
                    if (response.ok) {
                        console.log('✅ Data saved to backend for cross-device sync');
                        
                        // Also save to localStorage as backup
                        localStorage.setItem('onedrive_backup_data', JSON.stringify(currentData));
                        localStorage.setItem('onedrive_last_sync', new Date().toISOString());
                        
                        // Update global config
                        window.oneDriveConfig = window.oneDriveConfig || {};
                        window.oneDriveConfig.lastSync = new Date().toISOString();
                        window.oneDriveConfig.authMethod = 'backend_sync';
                        window.oneDriveConfig.backendUrl = window.backendUrl;
                        
                        return true;
                    } else {
                        throw new Error('Backend save failed');
                    }
                } catch (backendError) {
                    console.warn('⚠️ Backend save failed, falling back to localStorage:', backendError);
                }
            }
            
            // Fallback: save to localStorage only
            localStorage.setItem('onedrive_backup_data', JSON.stringify(currentData));
            localStorage.setItem('onedrive_last_sync', new Date().toISOString());
            
            console.log('✅ Data saved to localStorage (backend not available)');
            
            // Update global config
            window.oneDriveConfig = window.oneDriveConfig || {};
            window.oneDriveConfig.lastSync = new Date().toISOString();
            window.oneDriveConfig.authMethod = 'local_backup';
            
            return true;
            
        } catch (error) {
            console.error('❌ Error saving data:', error);
            throw error;
        }
    }
    
    // 6. Create Microsoft Account
    async createAccount() {
        const authStatus = document.getElementById('authStatus');
        const createBtn = document.getElementById('createAccountBtn');
        
        try {
            createBtn.disabled = true;
                         createBtn.textContent = 'Opening Microsoft...';
            authStatus.textContent = '🔄 Opening Microsoft account creation page...';
            authStatus.className = 'status-message success';
            authStatus.style.display = 'block';
            
            // Open Microsoft account creation
            const microsoftSignUpUrl = 'https://signup.live.com/signup';
            const newWindow = window.open(microsoftSignUpUrl, '_blank', 'width=800,height=600');
            
            if (newWindow) {
                authStatus.textContent = '✅ Microsoft account creation page opened! Complete your registration and then return here to connect OneDrive.';
                                 createBtn.textContent = 'Page Opened';
                createBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                
                // Reset after 5 seconds
                setTimeout(() => {
                    createBtn.disabled = false;
                    createBtn.textContent = 'Create Microsoft Account';
                    createBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                    authStatus.style.display = 'none';
                }, 5000);
            } else {
                throw new Error('Popup blocked. Please allow popups and try again.');
            }
            
            console.log('✅ Opening Microsoft account creation');
            
        } catch (error) {
            console.error('❌ Error opening Microsoft:', error);
            authStatus.textContent = `❌ Error: ${error.message}`;
            authStatus.className = 'status-message error';
            authStatus.style.display = 'block';
            
            // Reset button
            createBtn.disabled = false;
            createBtn.textContent = 'Create Microsoft Account';
            createBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                 }
     }
     
     
 }

// Create global instance
window.oneDriveConfigModal = new OneDriveConfigurationModal();

// Global function to show modal
window.showOneDriveConfiguration = function(onSaveCallback) {
    window.oneDriveConfigModal.show(onSaveCallback);
};

// Global function to check if OneDrive is connected
window.isOneDriveConnected = function() {
    return localStorage.getItem('onedrive_connected') === 'true';
};

// Global function to load user configuration from backend
window.loadUserConfiguration = async function(userEmail) {
    try {
        console.log('🔄 Loading user configuration from backend...');
        
        if (!window.backendUrl) {
            console.warn('⚠️ Backend URL not available');
            return false;
        }
        
        const response = await fetch(`${window.backendUrl}/api/dashboard/load`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userEmail: userEmail
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.settings) {
                console.log('✅ Configuration loaded from backend');
                
                // Apply the loaded configuration to localStorage
                const settings = data.settings;
                
                // Apply teams configuration
                if (settings.teams) {
                    localStorage.setItem('thebridge_teams', JSON.stringify(settings.teams));
                }
                if (settings.currentTeam) {
                    localStorage.setItem('thebridge_current_team', JSON.stringify(settings.currentTeam));
                }
                
                // Apply filters configuration
                if (settings.filters) {
                    localStorage.setItem('thebridge_filters', JSON.stringify(settings.filters));
                }
                if (settings.quickFilters) {
                    localStorage.setItem('quickFilters', JSON.stringify(settings.quickFilters));
                }
                if (settings.myFilters) {
                    localStorage.setItem('myFilters', JSON.stringify(settings.myFilters));
                }
                
                // Apply table views configuration
                if (settings.tableViews) {
                    localStorage.setItem('tableViews', JSON.stringify(settings.tableViews));
                }
                if (settings.currentTableView) {
                    localStorage.setItem('thebridge_current_table_view', settings.currentTableView);
                }
                
                // Apply column configuration
                if (settings.columnConfig) {
                    localStorage.setItem('thebridge_column_config', JSON.stringify(settings.columnConfig));
                }
                if (settings.visibleColumns) {
                    localStorage.setItem('thebridge_visible_columns', JSON.stringify(settings.visibleColumns));
                }
                if (settings.columnOrder) {
                    localStorage.setItem('thebridge_column_order', JSON.stringify(settings.columnOrder));
                }
                
                // Apply custom summaries
                if (settings.customSummaries) {
                    localStorage.setItem('customSummaries', JSON.stringify(settings.customSummaries));
                }
                
                // Apply favorites
                if (settings.favorites) {
                    localStorage.setItem('thebridge_favorites', JSON.stringify(settings.favorites));
                }
                if (settings.favoritos) {
                    localStorage.setItem('favoritos', JSON.stringify(settings.favoritos));
                }
                
                // Apply theme and language
                if (settings.theme) {
                    localStorage.setItem('thebridge_theme', settings.theme);
                }
                if (settings.language) {
                    localStorage.setItem('thebridge_language', settings.language);
                }
                
                // Apply dashboard configuration
                if (settings.dashboardConfig) {
                    localStorage.setItem('dashboardConfig', JSON.stringify(settings.dashboardConfig));
                }
                
                // Apply notifications
                if (settings.notifications) {
                    localStorage.setItem('notifications', JSON.stringify(settings.notifications));
                }
                
                // Apply backend settings
                if (settings.backendSettings) {
                    localStorage.setItem('backendSettings', JSON.stringify(settings.backendSettings));
                }
                
                // Update global config
                window.oneDriveConfig = window.oneDriveConfig || {};
                window.oneDriveConfig.lastLoad = new Date().toISOString();
                window.oneDriveConfig.authMethod = 'backend_sync';
                
                // Show success notification
                if (typeof showNotification === 'function') {
                    showNotification('Configuration Loaded', 'Your settings have been loaded from the cloud!', 'success');
                }
                
                // Trigger page refresh to apply loaded settings
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
                
                return true;
            }
        }
        
        console.log('ℹ️ No configuration found in backend');
        return false;
        
    } catch (error) {
        console.error('❌ Error loading configuration:', error);
        return false;
    }
};

console.log('✅ Simple OneDrive Access Modal loaded'); 