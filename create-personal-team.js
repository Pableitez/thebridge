// ===== CREATE PERSONAL TEAM SCRIPT =====

console.log('👥 Create Personal Team Script Loaded');

// Create floating button for team creation
function createTeamCreationButton() {
    console.log('🔧 Creating team creation button...');
    
    const button = document.createElement('div');
    button.id = 'create-team-floating-btn';
    button.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        color: white;
        border: none;
        border-radius: 50px;
        padding: 15px 25px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
        z-index: 9999;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: Arial, sans-serif;
    `;
    
    button.innerHTML = `
        <span style="font-size: 18px;">👥</span>
        <span>Create Personal Team</span>
    `;
    
    // Add hover effects
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-3px)';
        button.style.boxShadow = '0 12px 35px rgba(16, 185, 129, 0.6)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)';
    });
    
    // Add click handler
    button.onclick = function() {
        console.log('👥 Opening team creation modal...');
        
        // Check if user is logged in
        const currentUser = window.currentUser || JSON.parse(localStorage.getItem('thebridge_current_user') || 'null');
        
        if (!currentUser) {
            // Show user registration first
            showUserRegistrationFirst();
        } else {
            // Show team creation directly
            if (typeof window.showTeamProfileModal === 'function') {
                window.showTeamProfileModal();
            } else {
                console.error('❌ showTeamProfileModal function not available');
                alert('Team creation not available. Please refresh the page.');
            }
        }
    };
    
    document.body.appendChild(button);
    console.log('✅ Team creation button created');
}

// Show user registration first if not logged in
function showUserRegistrationFirst() {
    console.log('👤 User not logged in, showing registration first...');
    
    const modal = document.createElement('div');
    modal.id = 'registration-first-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        font-family: Arial, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: #1a2332;
        border: 1px solid #0078d4;
        border-radius: 20px;
        padding: 2rem;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8);
        color: #E8F4F8;
        text-align: center;
    `;
    
    modalContent.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">👤</div>
            <h2 style="color: #0078d4; margin: 0 0 1rem 0; font-size: 1.5rem;">Create Account First</h2>
            <p style="color: #6b7280; margin: 0; line-height: 1.6;">
                You need to create a personal account before creating a team.
            </p>
        </div>
        
        <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
            <button id="create-account-btn" style="
                background: #0078d4;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                transition: background 0.2s;
            ">Create Account</button>
            <button id="cancel-btn" style="
                background: #6b7280;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                transition: background 0.2s;
            ">Cancel</button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('create-account-btn').onclick = function() {
        modal.remove();
        
        // Show user registration modal
        if (typeof window.showUserRegistrationModal === 'function') {
            window.showUserRegistrationModal();
        } else {
            console.error('❌ showUserRegistrationModal function not available');
            alert('User registration not available. Please refresh the page.');
        }
    };
    
    document.getElementById('cancel-btn').onclick = function() {
        modal.remove();
    };
    
    // Close modal when clicking outside
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    };
    
    console.log('✅ Registration first modal created');
}

// Auto-run when page loads
window.addEventListener('load', function() {
    console.log('🚀 Page loaded, setting up team creation...');
    
    setTimeout(() => {
        createTeamCreationButton();
    }, 2000);
});

// Make functions globally available
window.createTeamCreationButton = createTeamCreationButton;
window.showUserRegistrationFirst = showUserRegistrationFirst;

console.log('✅ Create Personal Team Script Ready'); 