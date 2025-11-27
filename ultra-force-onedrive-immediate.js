// ===== ULTRA FORCE ONEDRIVE IMMEDIATE =====

// Ultra aggressive script that runs IMMEDIATELY
(function() {
    'use strict';
    
    console.log('🚀 ULTRA FORCE ONEDRIVE IMMEDIATE - STARTING...');
    
    // 1. MAIN ULTRA AGGRESSIVE FUNCTION
    function ultraForceOneDrive() {
        console.log('🔧 ULTRA FORCE ONEDRIVE - APPLYING ALL FIXES...');
        
        // A. FORCE ONEDRIVE BUTTON IN REGISTRATION MODAL (SUBTLE)
        function forceOneDriveButtonInModal() {
            console.log('🔧 FORCING OneDrive button in registration modal...');
            
            // Find registration modal
            const modals = document.querySelectorAll('.modal-overlay, .modal, [class*="modal"]');
            
            modals.forEach(modal => {
                // Check if it's registration modal
                const hasCreateAccount = modal.textContent && modal.textContent.includes('Create Account');
                const hasRegister = modal.textContent && modal.textContent.includes('Register');
                const hasEmail = modal.querySelector('input[type="email"]');
                
                if ((hasCreateAccount || hasRegister) && hasEmail) {
                    console.log('✅ Found registration modal, adding OneDrive button...');
                    
                    // Check if button already exists
                    if (modal.querySelector('#ultraOneDriveBtn')) {
                        return;
                    }
                    
                    // Create SUBTLE button that matches existing design
                    const oneDriveBtn = document.createElement('button');
                    oneDriveBtn.id = 'ultraOneDriveBtn';
                    oneDriveBtn.type = 'button';
                    oneDriveBtn.style.cssText = `
                        margin: 0.75rem 0;
                        background: rgba(71, 178, 229, 0.1);
                        color: #47B2E5;
                        border: 1px solid rgba(71, 178, 229, 0.3);
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.85rem;
                        font-weight: 500;
                        width: 100%;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                        backdrop-filter: blur(10px);
                    `;
                    
                    oneDriveBtn.innerHTML = `
                        <span style="font-size: 0.9rem;">☁️</span>
                        <span>Configure OneDrive Storage</span>
                    `;
                    
                    // Hover effects (subtle)
                    oneDriveBtn.onmouseover = function() {
                        this.style.background = 'rgba(71, 178, 229, 0.2)';
                        this.style.borderColor = 'rgba(71, 178, 229, 0.5)';
                        this.style.transform = 'translateY(-1px)';
                    };
                    
                    oneDriveBtn.onmouseout = function() {
                        this.style.background = 'rgba(71, 178, 229, 0.1)';
                        this.style.borderColor = 'rgba(71, 178, 229, 0.3)';
                        this.style.transform = 'translateY(0)';
                    };
                    
                    // Click handler
                    oneDriveBtn.onclick = function() {
                        console.log('🔧 OneDrive button clicked');
                        
                        // Change text
                        this.innerHTML = '<span style="font-size: 0.9rem;">🔄</span> Configuring...';
                        this.disabled = true;
                        
                        // Show configuration modal
                        if (window.showOneDriveConfiguration) {
                            window.showOneDriveConfiguration((config) => {
                                console.log('✅ OneDrive configuration completed:', config);
                                
                                // Restore button with success
                                this.innerHTML = `
                                    <span style="font-size: 0.9rem;">✅</span>
                                    <span>OneDrive Ready</span>
                                `;
                                this.style.background = 'rgba(16, 185, 129, 0.1)';
                                this.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                                this.style.color = '#10b981';
                                this.disabled = false;
                                
                                // Show success message
                                showUltraSuccessMessage('OneDrive configured successfully');
                            });
                        } else {
                            console.error('❌ OneDrive Configuration Modal not available');
                            alert('OneDrive Configuration Modal not available. Please reload the page.');
                            
                            // Restore button
                            this.innerHTML = `
                                <span style="font-size: 0.9rem;">☁️</span>
                                <span>Configure OneDrive Storage</span>
                            `;
                            this.disabled = false;
                        }
                    };
                    
                    // Find form container
                    const formContainer = modal.querySelector('form, .modal-content, .modal-body');
                    
                    if (formContainer) {
                        // Insert BEFORE action buttons
                        const actionButtons = formContainer.querySelector('button[type="submit"], .btn, [class*="btn"]');
                        
                        if (actionButtons) {
                            actionButtons.parentNode.insertBefore(oneDriveBtn, actionButtons);
                        } else {
                            formContainer.appendChild(oneDriveBtn);
                        }
                        
                        console.log('✅ OneDrive button added to registration modal (subtle)');
                    }
                }
            });
        }
        
        // B. FORCE BACKEND STATUS = ONEDRIVE (SUBTLE)
        function forceBackendStatusOneDrive() {
            console.log('🔧 FORCING backend status to show OneDrive...');
            
            // Remove any existing overlapping status indicators
            const existingStatus = document.querySelector('#ultraOneDriveStatus');
            if (existingStatus) {
                existingStatus.remove();
            }
            
            // Only create status if OneDrive is not configured
            const hasOneDriveConfig = localStorage.getItem('onedrive_config');
            const hasOneDriveToken = localStorage.getItem('onedrive_access_token');
            
            if (!hasOneDriveConfig || !hasOneDriveToken) {
                // Create subtle status indicator (bottom right, not overlapping)
                const statusDiv = document.createElement('div');
                statusDiv.id = 'ultraOneDriveStatus';
                statusDiv.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    padding: 0.5rem 0.75rem;
                    border-radius: 6px;
                    font-size: 0.8rem;
                    font-weight: 500;
                    z-index: 10001;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    background: rgba(245, 158, 11, 0.1);
                    color: #f59e0b;
                    border: 1px solid rgba(245, 158, 11, 0.3);
                    backdrop-filter: blur(10px);
                `;
                
                statusDiv.innerHTML = `
                    <span style="font-size: 0.8rem;">⚠️</span>
                    <span>OneDrive</span>
                `;
                statusDiv.title = 'Click to configure OneDrive storage';
                
                // Click handler
                statusDiv.onclick = function() {
                    console.log('🔧 OneDrive status clicked');
                    if (window.showOneDriveConfiguration) {
                        window.showOneDriveConfiguration();
                    } else {
                        alert('OneDrive configuration not available');
                    }
                };
                
                // Hover effects
                statusDiv.onmouseover = function() {
                    this.style.background = 'rgba(245, 158, 11, 0.2)';
                    this.style.borderColor = 'rgba(245, 158, 11, 0.5)';
                    this.style.transform = 'translateY(-1px)';
                };
                
                statusDiv.onmouseout = function() {
                    this.style.background = 'rgba(245, 158, 11, 0.1)';
                    this.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                    this.style.transform = 'translateY(0)';
                };
                
                // Add to body
                document.body.appendChild(statusDiv);
                console.log('✅ OneDrive status indicator created (subtle, bottom right)');
            }
        }
        
        // C. FORCE ONEDRIVE BUTTON IN SIDEBAR (CONSISTENT STYLE)
        function forceOneDriveButtonInSidebar() {
            console.log('🔧 FORCING OneDrive button in sidebar...');
            
            // Find sidebar
            const sidebar = document.querySelector('.sidebar, .side-panel, [class*="sidebar"], [class*="side"]');
            
            if (sidebar) {
                // Check if already exists
                if (sidebar.querySelector('#ultraSidebarOneDriveBtn')) {
                    return;
                }
                
                // Create button with consistent style (matching existing buttons)
                const sidebarBtn = document.createElement('button');
                sidebarBtn.id = 'ultraSidebarOneDriveBtn';
                sidebarBtn.style.cssText = `
                    width: 100%;
                    margin: 0.25rem 0;
                    padding: 0.5rem 0.75rem;
                    background: rgba(71, 178, 229, 0.1);
                    color: #47B2E5;
                    border: 1px solid rgba(71, 178, 229, 0.3);
                    border-radius: 6px;
                    font-size: 0.85rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    backdrop-filter: blur(10px);
                `;
                
                sidebarBtn.innerHTML = `
                    <span style="font-size: 0.9rem;">☁️</span>
                    <span>OneDrive</span>
                `;
                
                // Hover effects
                sidebarBtn.onmouseover = function() {
                    this.style.background = 'rgba(71, 178, 229, 0.2)';
                    this.style.borderColor = 'rgba(71, 178, 229, 0.5)';
                    this.style.transform = 'translateY(-1px)';
                };
                
                sidebarBtn.onmouseout = function() {
                    this.style.background = 'rgba(71, 178, 229, 0.1)';
                    this.style.borderColor = 'rgba(71, 178, 229, 0.3)';
                    this.style.transform = 'translateY(0)';
                };
                
                // Click handler
                sidebarBtn.onclick = function() {
                    console.log('🔧 Sidebar OneDrive button clicked');
                    if (window.showOneDriveConfiguration) {
                        window.showOneDriveConfiguration();
                    } else {
                        alert('OneDrive configuration not available');
                    }
                };
                
                // Insert at beginning of sidebar
                sidebar.insertBefore(sidebarBtn, sidebar.firstChild);
                console.log('✅ OneDrive sidebar button created (consistent style)');
            }
        }
        
        // D. FUNCTION TO SHOW SUCCESS MESSAGE
        function showUltraSuccessMessage(message) {
            const successDiv = document.createElement('div');
            successDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(16, 185, 129, 0.1);
                color: #10b981;
                padding: 0.75rem 1rem;
                border-radius: 6px;
                font-size: 0.85rem;
                font-weight: 500;
                z-index: 10002;
                border: 1px solid rgba(16, 185, 129, 0.3);
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            `;
            
            successDiv.innerHTML = `
                <span style="font-size: 0.9rem;">✅</span>
                <span>${message}</span>
            `;
            
            document.body.appendChild(successDiv);
            
            // Remove after 3 seconds
            setTimeout(() => {
                if (successDiv.parentNode) {
                    successDiv.parentNode.removeChild(successDiv);
                }
            }, 3000);
        }
        
        // E. APPLY ALL FUNCTIONS
        forceOneDriveButtonInModal();
        forceBackendStatusOneDrive();
        forceOneDriveButtonInSidebar();
        
        console.log('✅ ULTRA FORCE ONEDRIVE - ALL FIXES APPLIED');
    }
    
    // 2. EXECUTE IMMEDIATELY
    ultraForceOneDrive();
    
    // 3. EXECUTE EVERY 2 SECONDS TO ENSURE
    setInterval(ultraForceOneDrive, 2000);
    
    // 4. OBSERVE DOM CHANGES
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if modal was added
                        if (node.classList && (node.classList.contains('modal-overlay') || node.classList.contains('modal') || node.querySelector && node.querySelector('.modal-overlay, .modal'))) {
                            console.log('🔍 Modal detected, applying ULTRA OneDrive...');
                            setTimeout(ultraForceOneDrive, 100);
                        }
                        
                        // Check if sidebar was added
                        if (node.classList && (node.classList.contains('sidebar') || node.classList.contains('side-panel'))) {
                            console.log('🔍 Sidebar detected, applying ULTRA OneDrive...');
                            setTimeout(ultraForceOneDrive, 100);
                        }
                    }
                });
            }
        });
    });
    
    // Observe entire document
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('🚀 ULTRA FORCE ONEDRIVE IMMEDIATE - READY AND RUNNING');
})();

console.log('🚀 ULTRA FORCE ONEDRIVE IMMEDIATE loaded and applied'); 