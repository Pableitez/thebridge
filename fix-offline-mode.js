// ===== FIX OFFLINE MODE ISSUE =====

// Función para arreglar el problema del modo offline
function fixOfflineModeIssue() {
    console.log('🔧 Fixing offline mode issue...');
    
    // Override the backend URL detection to be more robust
    window.initializeBackendConfig = function() {
        console.log('🌐 Initializing backend configuration...');
        
        // Clear any existing backend URL
        window.backendUrl = null;
        
        // Detect environment
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        const isGitHubPages = hostname.includes('github.io');
        const isProduction = isGitHubPages || hostname.includes('render.com');
        
        console.log('🔍 Environment detection:', {
            hostname,
            isLocalhost,
            isGitHubPages,
            isProduction
        });
        
        // Set backend URL based on environment
        if (isLocalhost) {
            window.backendUrl = 'http://localhost:3000';
            console.log('🏠 Local development mode - Backend URL:', window.backendUrl);
        } else if (isProduction) {
            window.backendUrl = 'https://the-bridge-9g01.onrender.com';
            console.log('🌍 Production mode - Backend URL:', window.backendUrl);
        } else {
            // Fallback to production
            window.backendUrl = 'https://the-bridge-9g01.onrender.com';
            console.log('🔄 Fallback to production - Backend URL:', window.backendUrl);
        }
        
        // Test backend connectivity immediately
        testBackendConnectivity();
        
        return window.backendUrl;
    };
    
    // Test backend connectivity
    window.testBackendConnectivity = async function() {
        try {
            console.log('🧪 Testing backend connectivity...');
            
            if (!window.backendUrl) {
                console.warn('⚠️ No backend URL configured');
                return false;
            }
            
            const response = await fetch(`${window.backendUrl}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Add timeout
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                console.log('✅ Backend is online and accessible');
                window.backendOnline = true;
                
                // Hide offline mode notification if it exists
                hideOfflineModeNotification();
                
                return true;
            } else {
                console.warn('⚠️ Backend responded but not ok:', response.status);
                window.backendOnline = false;
                showOfflineModeNotification();
                return false;
            }
            
        } catch (error) {
            console.warn('⚠️ Backend connectivity test failed:', error);
            window.backendOnline = false;
            showOfflineModeNotification();
            return false;
        }
    };
    
    // Show offline mode notification
    window.showOfflineModeNotification = function() {
        console.log('📱 Showing offline mode notification');
        
        // Remove existing notification if any
        hideOfflineModeNotification();
        
        const notification = document.createElement('div');
        notification.id = 'offlineModeNotification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #E3F2FD;
            color: #000000;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: 'Roboto', sans-serif;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            animation: slideInRight 0.3s ease-out;
            border: 1px solid rgba(0, 0, 0, 0.1);
        `;
        
        notification.innerHTML = `
            <span style="font-size: 16px;">📱</span>
            <div>
                <div style="font-weight: 600; margin-bottom: 2px; color: #000000;">Offline Mode</div>
                <div style="font-size: 12px; opacity: 0.8; color: #000000;">Using local storage</div>
            </div>
            <button id="closeOfflineNotification" style="
                background: none;
                border: none;
                color: #000000;
                cursor: pointer;
                font-size: 18px;
                padding: 0;
                margin-left: 8px;
            ">×</button>
        `;
        
        document.body.appendChild(notification);
        
        // Add close functionality
        const closeBtn = notification.querySelector('#closeOfflineNotification');
        closeBtn.addEventListener('click', () => {
            hideOfflineModeNotification();
        });
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            hideOfflineModeNotification();
        }, 10000);
    };
    
    // Hide offline mode notification
    window.hideOfflineModeNotification = function() {
        const notification = document.getElementById('offlineModeNotification');
        if (notification) {
            notification.remove();
        }
    };
    
    // Override the welcome screen to handle backend detection better
    window.showWelcomeScreen = function() {
        console.log('🏠 Showing welcome screen...');
        
        // Initialize backend config first
        window.initializeBackendConfig();
        
        // Clear any existing content
        const mainContent = document.querySelector('main') || document.body;
        mainContent.innerHTML = '';
        
        // Create welcome screen content
        const welcomeContent = document.createElement('div');
        welcomeContent.style.cssText = `
            min-height: 100vh;
            background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 20px;
            position: relative;
        `;
        
        welcomeContent.innerHTML = `
            <div style="text-align: center; max-width: 400px;">
                <!-- Logo -->
                <div style="
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #47B2E5, #0B36AD);
                    border-radius: 16px;
                    margin: 0 auto 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 8px 32px rgba(71, 178, 229, 0.3);
                ">
                    <span style="font-size: 40px; color: white;">🌉</span>
                </div>
                
                <!-- Title -->
                <h1 style="
                    color: #E8F4F8;
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin: 0 0 8px 0;
                    background: linear-gradient(135deg, #E8F4F8 0%, #B0BEC5 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                ">Welcome to The Bridge</h1>
                
                <!-- Subtitle -->
                <p style="
                    color: #7BA7CC;
                    font-size: 1.1rem;
                    margin: 0 0 40px 0;
                    font-weight: 400;
                ">Your collaborative workspace</p>
                
                <!-- Buttons -->
                <div style="display: flex; flex-direction: column; gap: 16px; width: 100%;">
                    <button id="newUserBtn" style="
                        background: linear-gradient(135deg, #10B981, #059669);
                        border: none;
                        color: white;
                        padding: 16px 24px;
                        border-radius: 12px;
                        font-size: 1.1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                    ">
                        <span style="font-size: 18px;">👤</span>
                        <div style="text-align: left;">
                            <div>I'm New</div>
                            <div style="font-size: 0.9rem; opacity: 0.9; font-weight: 400;">Create your account</div>
                        </div>
                    </button>
                    
                    <button id="existingUserBtn" style="
                        background: linear-gradient(135deg, #47B2E5, #0B36AD);
                        border: none;
                        color: white;
                        padding: 16px 24px;
                        border-radius: 12px;
                        font-size: 1.1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        box-shadow: 0 4px 15px rgba(71, 178, 229, 0.3);
                    ">
                        <span style="font-size: 18px;">➡️</span>
                        <div style="text-align: left;">
                            <div>I'm Back</div>
                            <div style="font-size: 0.9rem; opacity: 0.9; font-weight: 400;">Sign in to your account</div>
                        </div>
                    </button>
                </div>
                
                <!-- Backend Status -->
                <div id="backendStatus" style="
                    margin-top: 24px;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    display: none;
                "></div>
            </div>
            
            <!-- Copyright -->
            <div style="
                position: absolute;
                bottom: 20px;
                color: #7BA7CC;
                font-size: 0.9rem;
                text-align: center;
            ">
                © 2025 | Pablo Beneitez | Valencia
            </div>
        `;
        
        mainContent.appendChild(welcomeContent);
        
        // Add event listeners
        const newUserBtn = document.getElementById('newUserBtn');
        const existingUserBtn = document.getElementById('existingUserBtn');
        
        if (newUserBtn) {
            newUserBtn.addEventListener('click', () => {
                console.log('👤 New user button clicked');
                if (typeof showUserRegistrationModal === 'function') {
                    showUserRegistrationModal();
                } else {
                    console.warn('⚠️ showUserRegistrationModal function not found');
                }
            });
        }
        
        if (existingUserBtn) {
            existingUserBtn.addEventListener('click', () => {
                console.log('🔐 Existing user button clicked');
                if (typeof showUserLoginModal === 'function') {
                    showUserLoginModal();
                } else {
                    console.warn('⚠️ showUserLoginModal function not found');
                }
            });
        }
        
        // Update backend status
        updateBackendStatus();
        
        console.log('✅ Welcome screen displayed');
    };
    
    // Update backend status display
    window.updateBackendStatus = function() {
        const statusDiv = document.getElementById('backendStatus');
        if (!statusDiv) return;
        
        if (window.backendOnline) {
            statusDiv.style.display = 'block';
            statusDiv.style.background = 'rgba(16, 185, 129, 0.1)';
            statusDiv.style.color = '#10B981';
            statusDiv.style.border = '1px solid rgba(16, 185, 129, 0.3)';
            statusDiv.textContent = '✅ Backend connected - Your data will sync across devices';
        } else {
            statusDiv.style.display = 'block';
            statusDiv.style.background = 'rgba(245, 158, 11, 0.1)';
            statusDiv.style.color = '#F59E0B';
            statusDiv.style.border = '1px solid rgba(245, 158, 11, 0.3)';
            statusDiv.textContent = '⚠️ Offline mode - Using local storage only';
        }
    };
    
    // Override the clearTeamSession function to handle backend reset
    window.clearTeamSession = function() {
        console.log('🧹 Clearing team session...');
        
        // Clear local storage
        localStorage.removeItem('thebridge_current_team');
        localStorage.removeItem('thebridge_current_user');
        localStorage.removeItem('thebridge_teams');
        
        // Reset global variables
        window.currentTeam = null;
        window.currentUser = null;
        window.teamBackendConnected = false;
        
        // Reset backend detection
        window.backendUrl = null;
        window.backendOnline = false;
        
        // Re-initialize backend config
        window.initializeBackendConfig();
        
        // Show welcome screen
        window.showWelcomeScreen();
        
        console.log('✅ Team session cleared and backend re-initialized');
    };
    
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    console.log('✅ Offline mode issue fixed!');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 DOM loaded, initializing offline mode fix...');
    
    // Wait a bit for other scripts to load
    setTimeout(() => {
        fixOfflineModeIssue();
    }, 1000);
});

// Also fix when page loads
window.addEventListener('load', function() {
    console.log('🔧 Page loaded, ensuring offline mode fix...');
    
    setTimeout(() => {
        if (typeof fixOfflineModeIssue === 'function') {
            fixOfflineModeIssue();
        }
    }, 500);
});

// Make functions available globally
window.fixOfflineModeIssue = fixOfflineModeIssue; 