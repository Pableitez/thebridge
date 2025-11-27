// ===== ONEDRIVE CONFIGURATION FUNCTIONS =====

// Global OneDrive configuration
window.oneDriveConfig = {
    path: localStorage.getItem('onedrive_folder_path') || 'MyApp/Data',
    isConnected: false,
    lastSync: null
};

// Initialize OneDrive configuration
function initializeOneDriveConfig() {
    console.log('🔧 Initializing OneDrive configuration...');
    
    // Load saved path
    const savedPath = localStorage.getItem('onedrive_folder_path');
    if (savedPath) {
        window.oneDriveConfig.path = savedPath;
    }
    
    // Check OneDrive connection status
    checkOneDriveConnection();
    
    // Setup event listeners
    setupOneDriveEventListeners();
    
    console.log('✅ OneDrive configuration initialized');
}

// Check OneDrive connection status
async function checkOneDriveConnection() {
    try {
        // Check if OneDrive integration is available
        if (window.OneDriveCustomPathIntegration) {
            const onedrive = new window.OneDriveCustomPathIntegration();
            // Use the property instead of method
            const isConnected = onedrive.isAuthenticated;
            window.oneDriveConfig.isConnected = isConnected;
            console.log('✅ OneDrive connection status:', isConnected);
        } else {
            window.oneDriveConfig.isConnected = false;
            console.log('⚠️ OneDrive integration not available');
        }
    } catch (error) {
        window.oneDriveConfig.isConnected = false;
        console.error('❌ Error checking OneDrive connection:', error);
    }
    
    updateOneDriveUI();
}

// Setup event listeners for OneDrive configuration
function setupOneDriveEventListeners() {
    // Set OneDrive path button
    const setPathBtn = document.getElementById('setOneDrivePathBtn');
    if (setPathBtn) {
        setPathBtn.addEventListener('click', setOneDrivePath);
    }
    
    // Save to OneDrive button
    const saveBtn = document.getElementById('saveDashboardConfigBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveToOneDrive);
    }
    
    // Load from OneDrive button
    const loadBtn = document.getElementById('loadDashboardConfigBtn');
    if (loadBtn) {
        loadBtn.addEventListener('click', loadFromOneDrive);
    }
    
    // Load saved path when modal opens
    const pathInput = document.getElementById('onedrivePathInput');
    if (pathInput) {
        pathInput.value = window.oneDriveConfig.path;
    }
}

// Set OneDrive storage path
function setOneDrivePath() {
    const pathInput = document.getElementById('onedrivePathInput');
    const statusDiv = document.getElementById('userSetUpStatus_user');
    
    if (!pathInput) {
        console.error('❌ OneDrive path input not found');
        return;
    }
    
    const newPath = pathInput.value.trim();
    
    if (!newPath) {
        if (statusDiv) {
            statusDiv.textContent = '❌ Please enter a valid OneDrive path';
            statusDiv.style.color = '#ef4444';
        }
        return;
    }
    
    // Save path to localStorage and global config
    localStorage.setItem('onedrive_folder_path', newPath);
    window.oneDriveConfig.path = newPath;
    
    // Show success message
    if (statusDiv) {
        statusDiv.textContent = `✅ OneDrive path set to: ${newPath}`;
        statusDiv.style.color = '#10b981';
    }
    
    console.log('✅ OneDrive path updated:', newPath);
    
    // Clear message after 3 seconds
    setTimeout(() => {
        if (statusDiv) {
            statusDiv.textContent = '';
        }
    }, 3000);
}

// Save configuration to OneDrive
async function saveToOneDrive() {
    const statusDiv = document.getElementById('userSetUpStatus_user');
    
    try {
        // Check if OneDrive is connected
        if (!window.oneDriveConfig.isConnected) {
            if (statusDiv) {
                statusDiv.textContent = '❌ OneDrive not connected. Please login to OneDrive first.';
                statusDiv.style.color = '#ef4444';
            }
            return;
        }
        
        // Show loading message
        if (statusDiv) {
            statusDiv.textContent = '🔄 Saving configuration to OneDrive...';
            statusDiv.style.color = '#f59e0b';
        }
        
        // Get current configuration
        const dashboardConfig = getDashboardConfig();
        const filters = JSON.parse(localStorage.getItem('myFilters') || '[]');
        const quickFilters = JSON.parse(localStorage.getItem('quickFilters') || '{}');
        const customSummaries = JSON.parse(localStorage.getItem('customSummaries') || '{}');
        
        // Create configuration object
        const config = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            description: 'Dashboard configuration saved to OneDrive',
            userEmail: window.currentUser?.email || 'default@user.com',
            userName: window.currentUser?.name || 'Default User',
            teamId: window.currentTeam?.id || 'default-team',
            teamName: window.currentTeam?.name || 'Default Team',
            onedrivePath: window.oneDriveConfig.path,
            dashboard: dashboardConfig,
            filters: filters,
            quickFilters: quickFilters,
            customSummaries: customSummaries,
            currentSession: {
                lastActivity: new Date().toISOString(),
                dataVersion: 'v1.0'
            }
        };
        
        // Create filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `dashboard-config-${config.userEmail}-${timestamp}.json`;
        
        // Save to OneDrive using the integration
        if (window.OneDriveCustomPathIntegration) {
            const onedrive = new window.OneDriveCustomPathIntegration();
            const filePath = `${window.oneDriveConfig.path}/${filename}`;
            
            const success = await onedrive.saveFile(filePath, JSON.stringify(config, null, 2));
            
            if (success) {
                window.oneDriveConfig.lastSync = new Date().toISOString();
                
                if (statusDiv) {
                    statusDiv.textContent = `✅ Configuration saved to OneDrive: ${filePath}`;
                    statusDiv.style.color = '#10b981';
                }
                
                console.log('✅ Configuration saved to OneDrive:', filePath);
            } else {
                throw new Error('Failed to save to OneDrive');
            }
        } else {
            throw new Error('OneDrive integration not available');
        }
        
    } catch (error) {
        console.error('❌ Error saving to OneDrive:', error);
        
        if (statusDiv) {
            statusDiv.textContent = `❌ Error saving to OneDrive: ${error.message}`;
            statusDiv.style.color = '#ef4444';
        }
    }
    
    // Clear message after 5 seconds
    setTimeout(() => {
        if (statusDiv) {
            statusDiv.textContent = '';
        }
    }, 5000);
}

// Load configuration from OneDrive
async function loadFromOneDrive() {
    const statusDiv = document.getElementById('userSetUpStatus_user');
    
    try {
        // Check if OneDrive is connected
        if (!window.oneDriveConfig.isConnected) {
            if (statusDiv) {
                statusDiv.textContent = '❌ OneDrive not connected. Please login to OneDrive first.';
                statusDiv.style.color = '#ef4444';
            }
            return;
        }
        
        // Show loading message
        if (statusDiv) {
            statusDiv.textContent = '🔄 Loading configuration from OneDrive...';
            statusDiv.style.color = '#f59e0b';
        }
        
        // Load from OneDrive using the integration
        if (window.OneDriveCustomPathIntegration) {
            const onedrive = new window.OneDriveCustomPathIntegration();
            const folderPath = window.oneDriveConfig.path;
            
            // List files in the OneDrive folder
            const files = await onedrive.listFiles(folderPath);
            
            if (!files || files.length === 0) {
                if (statusDiv) {
                    statusDiv.textContent = '📁 No saved configurations found in OneDrive. Save a configuration first!';
                    statusDiv.style.color = '#f59e0b';
                }
                return;
            }
            
            // Find the most recent configuration file
            const configFiles = files.filter(file => 
                file.name.startsWith('dashboard-config-') && file.name.endsWith('.json')
            );
            
            if (configFiles.length === 0) {
                if (statusDiv) {
                    statusDiv.textContent = '📁 No dashboard configurations found in OneDrive.';
                    statusDiv.style.color = '#f59e0b';
                }
                return;
            }
            
            // Sort by modification date (newest first)
            configFiles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
            const latestFile = configFiles[0];
            
            // Load the configuration file
            const filePath = `${folderPath}/${latestFile.name}`;
            const fileContent = await onedrive.readFile(filePath);
            
            if (!fileContent) {
                throw new Error('Failed to read configuration file');
            }
            
            const config = JSON.parse(fileContent);
            
            // Apply the loaded configuration
            await applyOneDriveConfiguration(config);
            
            if (statusDiv) {
                statusDiv.textContent = `✅ Configuration loaded from OneDrive: ${latestFile.name}`;
                statusDiv.style.color = '#10b981';
            }
            
            console.log('✅ Configuration loaded from OneDrive:', latestFile.name);
            
        } else {
            throw new Error('OneDrive integration not available');
        }
        
    } catch (error) {
        console.error('❌ Error loading from OneDrive:', error);
        
        if (statusDiv) {
            statusDiv.textContent = `❌ Error loading from OneDrive: ${error.message}`;
            statusDiv.style.color = '#ef4444';
        }
    }
    
    // Clear message after 5 seconds
    setTimeout(() => {
        if (statusDiv) {
            statusDiv.textContent = '';
        }
    }, 5000);
}

// Apply configuration loaded from OneDrive
async function applyOneDriveConfiguration(config) {
    try {
        console.log('🔄 Applying OneDrive configuration...');
        
        // Apply dashboard configuration
        if (config.dashboard) {
            localStorage.setItem('dashboardConfig', JSON.stringify(config.dashboard));
            console.log('✅ Dashboard config applied');
        }
        
        // Apply filters
        if (config.filters) {
            localStorage.setItem('myFilters', JSON.stringify(config.filters));
            console.log('✅ Filters applied');
        }
        
        // Apply quick filters
        if (config.quickFilters) {
            localStorage.setItem('quickFilters', JSON.stringify(config.quickFilters));
            console.log('✅ Quick filters applied');
        }
        
        // Apply custom summaries
        if (config.customSummaries) {
            localStorage.setItem('customSummaries', JSON.stringify(config.customSummaries));
            console.log('✅ Custom summaries applied');
        }
        
        // Apply OneDrive path
        if (config.onedrivePath) {
            localStorage.setItem('onedrive_folder_path', config.onedrivePath);
            window.oneDriveConfig.path = config.onedrivePath;
            console.log('✅ OneDrive path applied');
        }
        
        // Update UI
        updateOneDriveUI();
        
        // Refresh the application if needed
        if (typeof displayTable === 'function' && window.currentTableData) {
            displayTable(window.currentTableData);
        }
        
        console.log('✅ OneDrive configuration applied successfully');
        
    } catch (error) {
        console.error('❌ Error applying OneDrive configuration:', error);
        throw error;
    }
}

// Update OneDrive UI elements
function updateOneDriveUI() {
    // Update path input
    const pathInput = document.getElementById('onedrivePathInput');
    if (pathInput) {
        pathInput.value = window.oneDriveConfig.path;
    }
    
    // Update button states based on connection
    const saveBtn = document.getElementById('saveDashboardConfigBtn');
    const loadBtn = document.getElementById('loadDashboardConfigBtn');
    
    if (saveBtn) {
        saveBtn.disabled = !window.oneDriveConfig.isConnected;
        saveBtn.style.opacity = window.oneDriveConfig.isConnected ? '1' : '0.5';
    }
    
    if (loadBtn) {
        loadBtn.disabled = !window.oneDriveConfig.isConnected;
        loadBtn.style.opacity = window.oneDriveConfig.isConnected ? '1' : '0.5';
    }
}

// Get dashboard configuration (helper function)
function getDashboardConfig() {
    try {
        const config = localStorage.getItem('dashboardConfig');
        return config ? JSON.parse(config) : {};
    } catch (error) {
        console.error('Error getting dashboard config:', error);
        return {};
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOneDriveConfig);
} else {
    initializeOneDriveConfig();
}

// Export functions for global access
window.oneDriveFunctions = {
    initializeOneDriveConfig,
    checkOneDriveConnection,
    setOneDrivePath,
    saveToOneDrive,
    loadFromOneDrive,
    applyOneDriveConfiguration,
    updateOneDriveUI
};

console.log('✅ OneDrive configuration functions loaded'); 