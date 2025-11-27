// ===== RESTART BACKEND SCRIPT =====

// Función para reiniciar el backend
async function restartBackend() {
    console.log('🔄 Restarting backend...');
    
    try {
        // 1. Test current backend status
        console.log('🧪 Testing current backend status...');
        const healthResponse = await fetch('https://the-bridge-9g01.onrender.com/health');
        
        if (healthResponse.ok) {
            console.log('✅ Backend is running');
        } else {
            console.log('⚠️ Backend health check failed');
        }
        
        // 2. Test users endpoint
        console.log('🧪 Testing users endpoint...');
        const usersResponse = await fetch('https://the-bridge-9g01.onrender.com/api/users/list');
        
        if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            console.log('✅ Users endpoint working:', usersData);
        } else {
            console.log('❌ Users endpoint not working yet');
            
            // Try to trigger a restart by making a request to a non-existent endpoint
            console.log('🔄 Triggering backend restart...');
            try {
                await fetch('https://the-bridge-9g01.onrender.com/restart', {
                    method: 'POST'
                });
            } catch (error) {
                console.log('ℹ️ Restart endpoint not available, waiting for auto-restart...');
            }
        }
        
        // 3. Wait and test again
        console.log('⏳ Waiting 30 seconds for backend to restart...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        console.log('🧪 Testing users endpoint again...');
        const usersResponse2 = await fetch('https://the-bridge-9g01.onrender.com/api/users/list');
        
        if (usersResponse2.ok) {
            const usersData2 = await usersResponse2.json();
            console.log('✅ Users endpoint now working:', usersData2);
        } else {
            console.log('❌ Users endpoint still not working');
        }
        
    } catch (error) {
        console.error('❌ Error restarting backend:', error);
    }
}

// Test user registration
async function testUserRegistration() {
    console.log('🧪 Testing user registration...');
    
    try {
        const testUser = {
            email: 'test-registration@example.com',
            password: 'test123',
            name: 'Test Registration'
        };
        
        const response = await fetch('https://the-bridge-9g01.onrender.com/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testUser)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ User registration test passed:', result);
        } else {
            const error = await response.text();
            console.log('❌ User registration test failed:', error);
        }
        
    } catch (error) {
        console.error('❌ User registration test error:', error);
    }
}

// Test user login
async function testUserLogin() {
    console.log('🧪 Testing user login...');
    
    try {
        const testUser = {
            email: 'test-registration@example.com',
            password: 'test123'
        };
        
        const response = await fetch('https://the-bridge-9g01.onrender.com/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testUser)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ User login test passed:', result);
        } else {
            const error = await response.text();
            console.log('❌ User login test failed:', error);
        }
        
    } catch (error) {
        console.error('❌ User login test error:', error);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 DOM loaded, initializing backend restart...');
    
    // Wait a bit then restart backend
    setTimeout(() => {
        restartBackend().then(() => {
            // Test registration and login after restart
            setTimeout(() => {
                testUserRegistration().then(() => {
                    setTimeout(() => {
                        testUserLogin();
                    }, 5000);
                });
            }, 5000);
        });
    }, 2000);
});

// Make functions available globally
window.restartBackend = restartBackend;
window.testUserRegistration = testUserRegistration;
window.testUserLogin = testUserLogin; 