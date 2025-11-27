// ===== FIX ONEDRIVE PATH CONSISTENCY =====

// Fix OneDrive path consistency between sessions
function fixOneDrivePathConsistency() {
    console.log('🔧 Fixing OneDrive path consistency...');
    
    // 1. Default path configuration
    const DEFAULT_PATHS = {
        personal: 'TheBridge/Data',
        corporate: 'TheBridge/CorporateData',
        team: 'TheBridge/TeamData',
        backup: 'TheBridge/Backup'
    };
    
    // 2. Path validation and normalization
    function normalizePath(path) {
        if (!path) return DEFAULT_PATHS.personal;
        
        // Remove leading/trailing slashes and normalize
        let normalized = path.trim().replace(/^\/+|\/+$/g, '');
        
        // Ensure it starts with a valid folder name
        if (!normalized || normalized === '.') {
            normalized = DEFAULT_PATHS.personal;
        }
        
        // Replace invalid characters
        normalized = normalized.replace(/[<>:"|?*]/g, '_');
        
        // Limit length
        if (normalized.length > 100) {
            normalized = normalized.substring(0, 100);
        }
        
        return normalized;
    }
    
    // 3. Enhanced path saving with validation
    function saveOneDrivePath(path, userType = 'personal') {
        console.log('💾 Saving OneDrive path:', path);
        
        const normalizedPath = normalizePath(path);
        
        // Save to localStorage with metadata
        const pathData = {
            path: normalizedPath,
            userType: userType,
            timestamp: Date.now(),
            version: '2.0'
        };
        
        localStorage.setItem('onedrive_folder_path', normalizedPath);
        localStorage.setItem('onedrive_path_data', JSON.stringify(pathData));
        
        // Update global config
        if (window.oneDriveConfig) {
            window.oneDriveConfig.path = normalizedPath;
            window.oneDriveConfig.userType = userType;
            window.oneDriveConfig.lastPathUpdate = Date.now();
        }
        
        console.log('✅ OneDrive path saved:', normalizedPath);
        return normalizedPath;
    }
    
    // 4. Enhanced path loading with fallbacks
    function loadOneDrivePath() {
        console.log('📂 Loading OneDrive path...');
        
        // Try to load from localStorage
        const savedPath = localStorage.getItem('onedrive_folder_path');
        const pathData = localStorage.getItem('onedrive_path_data');
        
        let path = DEFAULT_PATHS.personal;
        let userType = 'personal';
        
        if (savedPath && pathData) {
            try {
                const data = JSON.parse(pathData);
                path = data.path || savedPath;
                userType = data.userType || 'personal';
                
                // Validate the loaded path
                if (path && path.length > 0) {
                    path = normalizePath(path);
                } else {
                    path = DEFAULT_PATHS.personal;
                }
            } catch (error) {
                console.warn('⚠️ Error parsing path data, using fallback:', error);
                path = normalizePath(savedPath) || DEFAULT_PATHS.personal;
            }
        } else if (savedPath) {
            // Legacy support for old format
            path = normalizePath(savedPath);
        }
        
        // Update global config
        if (window.oneDriveConfig) {
            window.oneDriveConfig.path = path;
            window.oneDriveConfig.userType = userType;
        }
        
        console.log('✅ OneDrive path loaded:', path);
        return path;
    }
    
    // 5. Auto-detect user type and suggest appropriate path
    function suggestPathForUser() {
        const userEmail = window.currentUser?.email || '';
        const teamName = window.currentTeam?.name || '';
        
        let suggestedPath = DEFAULT_PATHS.personal;
        let userType = 'personal';
        
        // Detect corporate email
        if (userEmail.includes('@company.com') || 
            userEmail.includes('@corporate') || 
            userEmail.includes('@company')) {
            suggestedPath = DEFAULT_PATHS.corporate;
            userType = 'corporate';
        }
        
        // Detect team usage
        if (teamName && teamName !== 'Default Team') {
            suggestedPath = `${DEFAULT_PATHS.team}/${teamName.replace(/[^a-zA-Z0-9]/g, '_')}`;
            userType = 'team';
        }
        
        return { path: suggestedPath, userType };
    }
    
    // 6. Enhanced path input handling
    function enhancePathInput() {
        const pathInput = document.getElementById('onedrivePathInput');
        if (!pathInput) return;
        
        // Load current path
        const currentPath = loadOneDrivePath();
        pathInput.value = currentPath;
        
        // Add placeholder and helper text
        pathInput.placeholder = 'Ej: TheBridge/Data o MiCarpeta/Configuracion';
        
        // Add validation on input
        pathInput.addEventListener('input', function() {
            const value = this.value.trim();
            if (value.length > 100) {
                this.value = value.substring(0, 100);
            }
        });
        
        // Add suggestion button
        const suggestionBtn = document.createElement('button');
        suggestionBtn.type = 'button';
        suggestionBtn.textContent = '💡 Sugerir';
        suggestionBtn.style.cssText = `
            margin-left: 8px;
            padding: 8px 12px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
        `;
        
        suggestionBtn.onclick = function() {
            const suggestion = suggestPathForUser();
            pathInput.value = suggestion.path;
            console.log('💡 Path suggestion applied:', suggestion.path);
        };
        
        // Insert suggestion button after input
        if (pathInput.parentNode) {
            pathInput.parentNode.insertBefore(suggestionBtn, pathInput.nextSibling);
        }
        
        console.log('✅ Path input enhanced');
    }
    
    // 7. Override the original setOneDrivePath function
    function overrideSetOneDrivePath() {
        if (window.setOneDrivePath) {
            const originalSetOneDrivePath = window.setOneDrivePath;
            
            window.setOneDrivePath = function() {
                const pathInput = document.getElementById('onedrivePathInput');
                const statusDiv = document.getElementById('userSetUpStatus_user');
                
                if (!pathInput) {
                    console.error('❌ OneDrive path input not found');
                    return;
                }
                
                const newPath = pathInput.value.trim();
                
                if (!newPath) {
                    if (statusDiv) {
                        statusDiv.textContent = '❌ Por favor ingresa una ruta válida para OneDrive';
                        statusDiv.style.color = '#ef4444';
                    }
                    return;
                }
                
                // Use enhanced saving
                const normalizedPath = saveOneDrivePath(newPath);
                
                // Show success message
                if (statusDiv) {
                    statusDiv.textContent = `✅ Ruta de OneDrive configurada: ${normalizedPath}`;
                    statusDiv.style.color = '#10b981';
                }
                
                console.log('✅ OneDrive path updated:', normalizedPath);
                
                // Clear message after 3 seconds
                setTimeout(() => {
                    if (statusDiv) {
                        statusDiv.textContent = '';
                    }
                }, 3000);
            };
            
            console.log('✅ Original setOneDrivePath overridden');
        }
    }
    
    // 8. Path consistency checker
    function checkPathConsistency() {
        const savedPath = localStorage.getItem('onedrive_folder_path');
        const pathData = localStorage.getItem('onedrive_path_data');
        
        if (savedPath && !pathData) {
            console.log('🔄 Migrating legacy path data...');
            saveOneDrivePath(savedPath, 'personal');
        }
        
        // Check if global config is consistent
        if (window.oneDriveConfig && window.oneDriveConfig.path !== savedPath) {
            console.log('🔄 Fixing global config consistency...');
            window.oneDriveConfig.path = savedPath || DEFAULT_PATHS.personal;
        }
        
        console.log('✅ Path consistency checked');
    }
    
    // 9. Session persistence verification
    function verifySessionPersistence() {
        console.log('🔍 Verifying session persistence...');
        
        const path = loadOneDrivePath();
        const pathData = localStorage.getItem('onedrive_path_data');
        
        if (pathData) {
            try {
                const data = JSON.parse(pathData);
                const age = Date.now() - data.timestamp;
                const daysOld = age / (1000 * 60 * 60 * 24);
                
                console.log(`📊 Path data age: ${daysOld.toFixed(1)} days`);
                
                // If path is very old, suggest update
                if (daysOld > 30) {
                    console.log('⚠️ Path data is old, suggesting refresh...');
                    const suggestion = suggestPathForUser();
                    if (suggestion.path !== path) {
                        console.log('💡 New path suggestion:', suggestion.path);
                    }
                }
            } catch (error) {
                console.warn('⚠️ Error parsing path data:', error);
            }
        }
        
        console.log('✅ Session persistence verified');
    }
    
    // 10. Initialize the fix
    function initializePathConsistencyFix() {
        console.log('🔧 Initializing OneDrive path consistency fix...');
        
        // Check consistency
        checkPathConsistency();
        
        // Verify persistence
        verifySessionPersistence();
        
        // Override functions
        overrideSetOneDrivePath();
        
        // Enhance UI when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(enhancePathInput, 1000);
            });
        } else {
            setTimeout(enhancePathInput, 1000);
        }
        
        // Monitor for path input creation
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.querySelector && node.querySelector('#onedrivePathInput')) {
                                console.log('🔍 OneDrive path input detected, enhancing...');
                                setTimeout(enhancePathInput, 100);
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('✅ OneDrive path consistency fix initialized');
    }
    
    // Initialize when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePathConsistencyFix);
    } else {
        initializePathConsistencyFix();
    }
}

// Apply the fix
fixOneDrivePathConsistency();

console.log('🔧 OneDrive Path Consistency Fix loaded'); 