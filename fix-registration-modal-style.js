// ===== FIX REGISTRATION MODAL STYLE =====

// Replace registration modal with consistent glassmorphism style
function fixRegistrationModalStyle() {
    console.log('🔧 Fixing registration modal style...');
    
    // 1. FUNCTION TO CREATE PROPER REGISTRATION MODAL
    function createProperRegistrationModal() {
        console.log('🔧 Creating proper registration modal...');
        
        // Remove any existing registration modals
        const existingModals = document.querySelectorAll('.modal-overlay, .modal, [class*="modal"]');
        existingModals.forEach(modal => {
            if (modal.textContent && (modal.textContent.includes('Create Account') || modal.textContent.includes('Register') || modal.textContent.includes('Autenticación'))) {
                modal.remove();
            }
        });
        
        // Create new modal with proper glassmorphism style (matching "I'm New" style)
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'properRegistrationModal';
        modalOverlay.className = 'modal-overlay';
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        // Create modal panel with EXACT same style as "I'm New" modals
        const modalPanel = document.createElement('div');
        modalPanel.className = 'modal-panel';
        modalPanel.style.cssText = `
            background: #47B2E5 !important;
            background-color: #47B2E5 !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            border-radius: 20px !important;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
            color: white !important;
            max-width: 500px !important;
            width: 90% !important;
            max-height: calc(100vh - 2rem) !important;
            overflow: hidden !important;
            margin: 0 auto !important;
            flex-shrink: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            position: relative !important;
            top: auto !important;
            left: auto !important;
            transform: none !important;
            margin-top: 0 !important;
            padding-top: 0 !important;
            opacity: 1 !important;
        `;
        
        // Create modal header with professional style
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        modalHeader.style.cssText = `
            background: rgba(255, 255, 255, 0.05) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 20px 20px 0 0 !important;
            padding: 1.5rem 2rem !important;
            color: white !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            position: relative !important;
        `;
        
        // Header Left Side - Logo and Title
        const headerLeft = document.createElement('div');
        headerLeft.className = 'header-left';
        headerLeft.style.cssText = `
            display: flex !important;
            align-items: center !important;
            gap: 1rem !important;
            flex: 1 !important;
        `;
        
        // Logo in Header
        const logo = document.createElement('img');
        logo.src = 'LOGOTAB_rounded.png';
        logo.alt = 'Logo';
        logo.className = 'modal-logo';
        logo.style.cssText = `
            width: 48px !important;
            height: 48px !important;
            border-radius: 50% !important;
            box-shadow: none !important;
            filter: none !important;
            outline: none !important;
            border: none !important;
            background: none !important;
            flex-shrink: 0 !important;
        `;
        
        // Professional Title
        const title = document.createElement('h3');
        title.className = 'panel-header-title';
        title.textContent = 'Create Your Account';
        title.style.cssText = `
            color: white !important;
            font-family: 'Roboto', 'Segoe UI', Arial, sans-serif !important;
            font-weight: 600 !important;
            font-size: 1.5rem !important;
            margin: 0 !important;
            letter-spacing: 0.02em !important;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
        `;
        
        // Close Button (professional style)
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            background: none !important;
            border: none !important;
            box-shadow: none !important;
            color: #fff !important;
            font-size: 1.8rem !important;
            font-weight: 400 !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            opacity: 1 !important;
            transition: none !important;
            text-transform: uppercase !important;
        `;
        
        closeBtn.onmouseover = function() {
            this.style.background = 'none !important';
            this.style.color = '#fff !important';
            this.style.opacity = '1 !important';
            this.style.boxShadow = 'none !important';
            this.style.transform = 'scale(0.9) !important';
        };
        
        closeBtn.onclick = function() {
            modalOverlay.remove();
        };
        
        headerLeft.appendChild(logo);
        headerLeft.appendChild(title);
        modalHeader.appendChild(headerLeft);
        modalHeader.appendChild(closeBtn);
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: transparent !important;
            background-color: transparent !important;
            padding: 2rem !important;
            color: white !important;
            flex: 1 !important;
            overflow-y: auto !important;
        `;
        
        // Welcome text
        const welcomeText = document.createElement('p');
        welcomeText.textContent = 'Join The Bridge community and configure your OneDrive storage.';
        welcomeText.style.cssText = `
            color: white !important;
            margin-bottom: 1.5rem;
            font-size: 1.1em;
            line-height: 1.6;
            text-align: center;
        `;
        
        // Form container
        const formContainer = document.createElement('div');
        formContainer.style.cssText = `
            margin-bottom: 2rem;
        `;
        
        // Full Name field
        const nameGroup = document.createElement('div');
        nameGroup.style.cssText = `
            margin-bottom: 1rem;
        `;
        
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Full Name';
        nameLabel.style.cssText = `
            font-weight: 600;
            display: block;
            margin-bottom: 0.5rem;
            color: white !important;
        `;
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Enter your full name';
        nameInput.style.cssText = `
            width: 100%;
            padding: 0.75rem;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            background: rgba(255, 255, 255, 0.1) !important;
            color: white !important;
            font-size: 1rem;
            font-family: 'Roboto', 'Segoe UI', Arial, sans-serif !important;
            backdrop-filter: none !important;
        `;
        
        nameInput.onfocus = function() {
            this.style.outline = 'none !important';
            this.style.borderColor = '#47B2E5 !important';
            this.style.boxShadow = '0 0 0 3px rgba(71, 178, 229, 0.2) !important';
            this.style.background = 'rgba(255, 255, 255, 0.15) !important';
        };
        
        nameInput.onblur = function() {
            this.style.borderColor = 'rgba(255, 255, 255, 0.2) !important';
            this.style.boxShadow = 'none !important';
            this.style.background = 'rgba(255, 255, 255, 0.1) !important';
        };
        
        nameGroup.appendChild(nameLabel);
        nameGroup.appendChild(nameInput);
        
        // Email field
        const emailGroup = document.createElement('div');
        emailGroup.style.cssText = `
            margin-bottom: 1rem;
        `;
        
        const emailLabel = document.createElement('label');
        emailLabel.textContent = 'Email Address';
        emailLabel.style.cssText = `
            font-weight: 600;
            display: block;
            margin-bottom: 0.5rem;
            color: white !important;
        `;
        
        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.placeholder = 'Enter your email';
        emailInput.style.cssText = `
            width: 100%;
            padding: 0.75rem;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            background: rgba(255, 255, 255, 0.1) !important;
            color: white !important;
            font-size: 1rem;
            font-family: 'Roboto', 'Segoe UI', Arial, sans-serif !important;
            backdrop-filter: none !important;
        `;
        
        emailInput.onfocus = function() {
            this.style.outline = 'none !important';
            this.style.borderColor = '#47B2E5 !important';
            this.style.boxShadow = '0 0 0 3px rgba(71, 178, 229, 0.2) !important';
            this.style.background = 'rgba(255, 255, 255, 0.15) !important';
        };
        
        emailInput.onblur = function() {
            this.style.borderColor = 'rgba(255, 255, 255, 0.2) !important';
            this.style.boxShadow = 'none !important';
            this.style.background = 'rgba(255, 255, 255, 0.1) !important';
        };
        
        emailGroup.appendChild(emailLabel);
        emailGroup.appendChild(emailInput);
        
        // Password field
        const passwordGroup = document.createElement('div');
        passwordGroup.style.cssText = `
            margin-bottom: 1rem;
        `;
        
        const passwordLabel = document.createElement('label');
        passwordLabel.textContent = 'Password';
        passwordLabel.style.cssText = `
            font-weight: 600;
            display: block;
            margin-bottom: 0.5rem;
            color: white !important;
        `;
        
        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.placeholder = 'Create a password';
        passwordInput.style.cssText = `
            width: 100%;
            padding: 0.75rem;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            background: rgba(255, 255, 255, 0.1) !important;
            color: white !important;
            font-size: 1rem;
            font-family: 'Roboto', 'Segoe UI', Arial, sans-serif !important;
            backdrop-filter: none !important;
        `;
        
        passwordInput.onfocus = function() {
            this.style.outline = 'none !important';
            this.style.borderColor = '#47B2E5 !important';
            this.style.boxShadow = '0 0 0 3px rgba(71, 178, 229, 0.2) !important';
            this.style.background = 'rgba(255, 255, 255, 0.15) !important';
        };
        
        passwordInput.onblur = function() {
            this.style.borderColor = 'rgba(255, 255, 255, 0.2) !important';
            this.style.boxShadow = 'none !important';
            this.style.background = 'rgba(255, 255, 255, 0.1) !important';
        };
        
        const passwordHint = document.createElement('div');
        passwordHint.textContent = 'Password must be at least 8 characters long';
        passwordHint.style.cssText = `
            font-size: 0.9em;
            color: rgba(255, 255, 255, 0.5) !important;
            margin-top: 0.25rem;
        `;
        
        passwordGroup.appendChild(passwordLabel);
        passwordGroup.appendChild(passwordInput);
        passwordGroup.appendChild(passwordHint);
        
        // Confirm Password field
        const confirmGroup = document.createElement('div');
        confirmGroup.style.cssText = `
            margin-bottom: 2rem;
        `;
        
        const confirmLabel = document.createElement('label');
        confirmLabel.textContent = 'Confirm Password';
        confirmLabel.style.cssText = `
            font-weight: 600;
            display: block;
            margin-bottom: 0.5rem;
            color: white !important;
        `;
        
        const confirmInput = document.createElement('input');
        confirmInput.type = 'password';
        confirmInput.placeholder = 'Confirm your password';
        confirmInput.style.cssText = `
            width: 100%;
            padding: 0.75rem;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            background: rgba(255, 255, 255, 0.1) !important;
            color: white !important;
            font-size: 1rem;
            font-family: 'Roboto', 'Segoe UI', Arial, sans-serif !important;
            backdrop-filter: none !important;
        `;
        
        confirmInput.onfocus = function() {
            this.style.outline = 'none !important';
            this.style.borderColor = '#47B2E5 !important';
            this.style.boxShadow = '0 0 0 3px rgba(71, 178, 229, 0.2) !important';
            this.style.background = 'rgba(255, 255, 255, 0.15) !important';
        };
        
        confirmInput.onblur = function() {
            this.style.borderColor = 'rgba(255, 255, 255, 0.2) !important';
            this.style.boxShadow = 'none !important';
            this.style.background = 'rgba(255, 255, 255, 0.1) !important';
        };
        
        confirmGroup.appendChild(confirmLabel);
        confirmGroup.appendChild(confirmInput);
        
        // Add form fields to container
        formContainer.appendChild(nameGroup);
        formContainer.appendChild(emailGroup);
        formContainer.appendChild(passwordGroup);
        formContainer.appendChild(confirmGroup);
        
        // OneDrive Configuration Button (matching modal button style)
        const oneDriveBtn = document.createElement('button');
        oneDriveBtn.id = 'properOneDriveBtn';
        oneDriveBtn.type = 'button';
        oneDriveBtn.className = 'modal-btn primary';
        oneDriveBtn.style.cssText = `
            width: 100%;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, #47B2E5 0%, #1976d2 100%) !important;
            color: white !important;
            border: none !important;
            border-radius: 10px !important;
            padding: 0.75rem 1.5rem !important;
            font-family: 'Roboto', 'Segoe UI', Arial, sans-serif !important;
            font-weight: 600 !important;
            font-size: 0.95rem !important;
            cursor: pointer !important;
            transition: all 0.3s ease !important;
            box-shadow: 0 4px 12px rgba(71, 178, 229, 0.3) !important;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        `;
        
        oneDriveBtn.innerHTML = `
            <span style="font-size: 1rem;">☁️</span>
            <span>Configure OneDrive Storage</span>
            <span style="font-size: 0.8rem; opacity: 0.8;">(Recommended)</span>
        `;
        
        // Hover effects
        oneDriveBtn.onmouseover = function() {
            this.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%) !important';
            this.style.transform = 'scale(1.05) !important';
            this.style.boxShadow = '0 6px 16px rgba(71, 178, 229, 0.4) !important';
        };
        
        oneDriveBtn.onmouseout = function() {
            this.style.background = 'linear-gradient(135deg, #47B2E5 0%, #1976d2 100%) !important';
            this.style.transform = 'scale(1) !important';
            this.style.boxShadow = '0 4px 12px rgba(71, 178, 229, 0.3) !important';
        };
        
        // Click handler
        oneDriveBtn.onclick = function() {
            console.log('🔧 OneDrive configuration button clicked');
            
            // Change text
            this.innerHTML = '<span style="font-size: 1rem;">🔄</span> Configuring OneDrive...';
            this.disabled = true;
            
            // Show configuration modal
            if (window.showOneDriveConfiguration) {
                window.showOneDriveConfiguration((config) => {
                    console.log('✅ OneDrive configuration completed:', config);
                    
                    // Restore button with success
                    this.innerHTML = `
                        <span style="font-size: 1rem;">✅</span>
                        <span>OneDrive Configured</span>
                        <span style="font-size: 0.8rem; opacity: 0.8;">(Ready)</span>
                    `;
                    this.style.background = 'linear-gradient(135deg, #10b981, #059669) !important';
                    this.disabled = false;
                    
                    // Show success message
                    showSuccessMessage('OneDrive configured successfully');
                });
            } else {
                console.error('❌ OneDrive Configuration Modal not available');
                alert('ERROR: OneDrive Configuration Modal not available. Please reload the page.');
                
                // Restore button
                this.innerHTML = `
                    <span style="font-size: 1rem;">☁️</span>
                    <span>Configure OneDrive Storage</span>
                    <span style="font-size: 0.8rem; opacity: 0.8;">(Recommended)</span>
                `;
                this.disabled = false;
            }
        };
        
        // Separator
        const separator = document.createElement('div');
        separator.style.cssText = `
            margin: 1rem 0;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            text-align: center;
            position: relative;
        `;
        separator.innerHTML = '<span style="background: #47B2E5; padding: 0 1rem; color: rgba(255, 255, 255, 0.6); font-size: 0.8rem;">or</span>';
        
        // Action buttons container
        const actionButtons = document.createElement('div');
        actionButtons.style.cssText = `
            display: flex;
            gap: 1rem;
        `;
        
        // Cancel button (secondary style)
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'modal-btn secondary';
        cancelBtn.style.cssText = `
            flex: 1;
            background: rgba(255,255,255,0.08) !important;
            color: #fff !important;
            border: 1.5px solid rgba(71,178,229,0.22) !important;
            border-radius: 8px !important;
            padding: 0.7em 1.5em !important;
            font-size: 1em !important;
            font-family: 'Roboto', 'Segoe UI', Arial, sans-serif !important;
            font-weight: 500 !important;
            box-shadow: none !important;
            transition: all 0.18s;
            cursor: pointer;
        `;
        
        cancelBtn.onmouseover = function() {
            this.style.background = 'rgba(71,178,229,0.18) !important';
            this.style.borderColor = '#47B2E5 !important';
            this.style.color = '#fff !important';
            this.style.transform = 'translateY(-2px) scale(1.04)';
            this.style.boxShadow = 'none !important';
        };
        
        cancelBtn.onmouseout = function() {
            this.style.background = 'rgba(255,255,255,0.08) !important';
            this.style.borderColor = 'rgba(71,178,229,0.22) !important';
            this.style.color = '#fff !important';
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = 'none !important';
        };
        
        cancelBtn.onclick = function() {
            modalOverlay.remove();
        };
        
        // Create Account button (primary style)
        const createBtn = document.createElement('button');
        createBtn.textContent = 'Create Account';
        createBtn.className = 'modal-btn primary';
        createBtn.style.cssText = `
            flex: 1;
            background: linear-gradient(135deg, #47B2E5 0%, #1976d2 100%) !important;
            color: white !important;
            border: none !important;
            border-radius: 10px !important;
            padding: 0.75rem 1.5rem !important;
            font-family: 'Roboto', 'Segoe UI', Arial, sans-serif !important;
            font-weight: 600 !important;
            font-size: 0.95rem !important;
            cursor: pointer !important;
            transition: all 0.3s ease !important;
            box-shadow: 0 4px 12px rgba(71, 178, 229, 0.3) !important;
        `;
        
        createBtn.onmouseover = function() {
            this.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%) !important';
            this.style.transform = 'scale(1.05) !important';
            this.style.boxShadow = '0 6px 16px rgba(71, 178, 229, 0.4) !important';
        };
        
        createBtn.onmouseout = function() {
            this.style.background = 'linear-gradient(135deg, #47B2E5 0%, #1976d2 100%) !important';
            this.style.transform = 'scale(1) !important';
            this.style.boxShadow = '0 4px 12px rgba(71, 178, 229, 0.3) !important';
        };
        
        createBtn.onclick = function() {
            console.log('🔧 Create Account button clicked');
            
            // Get form values
            const name = nameInput.value.trim();
            const email = emailInput.value.trim().toLowerCase();
            const password = passwordInput.value;
            const confirmPassword = confirmInput.value;
            
            // Validation
            if (!name || !email || !password || !confirmPassword) {
                alert('All fields are required.');
                return;
            }
            
            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                return;
            }
            
            if (password.length < 8) {
                alert('Password must be at least 8 characters long.');
                return;
            }
            
            // Show loading state
            createBtn.textContent = 'Creating Account...';
            createBtn.disabled = true;
            
            // Use OneDrive registration if available
            if (window.registerUserWithOneDrive) {
                window.registerUserWithOneDrive(email, password, name)
                    .then(result => {
                        if (result && result.success) {
                            createBtn.textContent = 'Account Created!';
                            createBtn.style.background = 'linear-gradient(135deg, #10b981, #059669) !important';
                            
                            setTimeout(() => {
                                modalOverlay.remove();
                                window.location.reload();
                            }, 2000);
                        } else {
                            throw new Error(result ? result.message : 'Registration failed');
                        }
                    })
                    .catch(error => {
                        console.error('Registration error:', error);
                        createBtn.textContent = 'Create Account';
                        createBtn.disabled = false;
                        alert(`Registration failed: ${error.message}`);
                    });
            } else {
                // Fallback to local registration
                const userData = {
                    id: email,
                    email: email,
                    password: password,
                    name: name,
                    role: 'user',
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                };
                
                // Save locally
                localStorage.setItem(`user_${email}`, JSON.stringify(userData));
                
                // Add to users array
                const users = JSON.parse(localStorage.getItem('thebridge_users') || '[]');
                users.push(userData);
                localStorage.setItem('thebridge_users', JSON.stringify(users));
                
                // Set current user
                window.currentUser = userData;
                localStorage.setItem('thebridge_current_user', JSON.stringify(userData));
                
                createBtn.textContent = 'Account Created!';
                createBtn.style.background = 'linear-gradient(135deg, #10b981, #059669) !important';
                
                setTimeout(() => {
                    modalOverlay.remove();
                    window.location.reload();
                }, 2000);
            }
        };
        
        actionButtons.appendChild(cancelBtn);
        actionButtons.appendChild(createBtn);
        
        // Add all elements to modal content
        modalContent.appendChild(welcomeText);
        modalContent.appendChild(formContainer);
        modalContent.appendChild(oneDriveBtn);
        modalContent.appendChild(separator);
        modalContent.appendChild(actionButtons);
        
        // Add header and content to panel
        modalPanel.appendChild(modalHeader);
        modalPanel.appendChild(modalContent);
        
        // Add panel to overlay
        modalOverlay.appendChild(modalPanel);
        
        // Add to body
        document.body.appendChild(modalOverlay);
        
        console.log('✅ Proper registration modal created with glassmorphism style');
    }
    
    // 2. FUNCTION TO SHOW SUCCESS MESSAGE
    function showSuccessMessage(message) {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            z-index: 10002;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        `;
        
        successDiv.innerHTML = `
            <span style="font-size: 1rem;">✅</span>
            <span>${message}</span>
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }
    
    // 3. OVERRIDE EXISTING REGISTRATION MODAL TRIGGERS
    function overrideRegistrationTriggers() {
        console.log('🔧 Overriding registration modal triggers...');
        
        // Override any function that shows registration modal
        if (window.showLoginRegisterModal) {
            const originalShowLoginRegisterModal = window.showLoginRegisterModal;
            window.showLoginRegisterModal = function() {
                console.log('🔄 showLoginRegisterModal called - showing proper modal');
                createProperRegistrationModal();
            };
        }
        
        // Override any button that opens registration
        const registrationButtons = document.querySelectorAll('button, a, [onclick*="register"], [onclick*="login"], [onclick*="create"]');
        registrationButtons.forEach(button => {
            if (button.textContent && (button.textContent.includes('Create Account') || button.textContent.includes('Register') || button.textContent.includes('Sign Up'))) {
                button.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔄 Registration button clicked - showing proper modal');
                    createProperRegistrationModal();
                };
            }
        });
    }
    
    // 4. APPLY FIX
    function applyRegistrationModalFix() {
        console.log('🔧 Applying registration modal fix...');
        
        // Override triggers
        overrideRegistrationTriggers();
        
        // 🚫 DISABLED: Don't automatically create modal
        // Create modal if needed
        // if (document.querySelector('.modal-overlay, .modal')) {
        //     createProperRegistrationModal();
        // }
        
        console.log('✅ Registration modal fix applied (auto-show disabled)');
    }
    
    // 5. EXECUTE IMMEDIATELY
    applyRegistrationModalFix();
    
    // 6. OBSERVE FOR NEW MODALS
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.classList && (node.classList.contains('modal-overlay') || node.classList.contains('modal'))) {
                            console.log('🔍 Modal detected, checking if it needs replacement...');
                            setTimeout(() => {
                                if (node.textContent && (node.textContent.includes('Create Account') || node.textContent.includes('Register') || node.textContent.includes('Autenticación'))) {
                                    console.log('🔄 Replacing registration modal with proper one...');
                                    createProperRegistrationModal();
                                }
                            }, 100);
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
    
    console.log('🔧 Registration Modal Style Fix ready');
}

// Apply the fix
fixRegistrationModalStyle();

console.log('🔧 Fix Registration Modal Style loaded and applied'); 