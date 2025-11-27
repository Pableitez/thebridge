// ===== FIX ONEDRIVE CONSENT ERROR (AADSTS65002) =====

// Handle Microsoft consent error for OneDrive authentication
function fixOneDriveConsentError() {
    console.log('🔧 Fixing OneDrive consent error (AADSTS65002)...');
    
    // 1. Detect consent error in URL or page content
    function detectConsentError() {
        const url = window.location.href;
        const pageContent = document.body.textContent;
        
        // Check for AADSTS65002 error in URL
        if (url.includes('AADSTS65002') || url.includes('error=consent_required')) {
            console.log('⚠️ Consent error detected in URL');
            return true;
        }
        
        // Check for consent error in page content
        if (pageContent.includes('AADSTS65002') || 
            pageContent.includes('Consent between first party application') ||
            pageContent.includes('must be configured via preauthorization')) {
            console.log('⚠️ Consent error detected in page content');
            return true;
        }
        
        return false;
    }
    
    // 2. Handle consent error
    function handleConsentError() {
        console.log('🔧 Handling OneDrive consent error...');
        
        // Create error resolution modal
        createConsentErrorModal();
        
        // Store error state
        localStorage.setItem('onedrive_consent_error', 'true');
        localStorage.setItem('onedrive_consent_error_time', Date.now().toString());
        
        // Clear any existing tokens
        localStorage.removeItem('onedrive_access_token');
        localStorage.removeItem('onedrive_refresh_token');
        
        console.log('✅ Consent error handled');
    }
    
    // 3. Create modal for consent error resolution
    function createConsentErrorModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('consent-error-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'consent-error-modal';
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
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            text-align: center;
        `;
        
        modalContent.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h2 style="color: #dc2626; margin: 0 0 1rem 0; font-size: 1.5rem;">Error de Autenticación OneDrive</h2>
                <p style="color: #6b7280; margin: 0; line-height: 1.6;">
                    Se detectó un error de consentimiento con Microsoft OneDrive. 
                    Este es un problema común con cuentas corporativas de Microsoft.
                </p>
            </div>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1rem; margin: 1rem 0; text-align: left;">
                <h4 style="color: #dc2626; margin: 0 0 0.5rem 0;">Código de Error: AADSTS65002</h4>
                <p style="color: #7f1d1d; margin: 0; font-size: 0.9rem;">
                    El consentimiento entre la aplicación y el recurso de Microsoft debe configurarse 
                    a través de preautorización. Esto requiere aprobación del administrador de la API.
                </p>
            </div>
            
            <div style="margin: 1.5rem 0;">
                <h4 style="color: #374151; margin: 0 0 1rem 0;">Soluciones Recomendadas:</h4>
                <div style="text-align: left;">
                    <div style="margin-bottom: 0.75rem; padding: 0.5rem; background: #f0f9ff; border-radius: 6px;">
                        <strong>1. Usar cuenta personal de Microsoft:</strong>
                        <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem; color: #0369a1;">
                            Intenta con una cuenta personal de Microsoft (@outlook.com, @hotmail.com) 
                            en lugar de una cuenta corporativa.
                        </p>
                    </div>
                    <div style="margin-bottom: 0.75rem; padding: 0.5rem; background: #f0f9ff; border-radius: 6px;">
                        <strong>2. Contactar administrador IT:</strong>
                        <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem; color: #0369a1;">
                            Si usas una cuenta corporativa, contacta a tu administrador de IT 
                            para autorizar la aplicación.
                        </p>
                    </div>
                    <div style="margin-bottom: 0.75rem; padding: 0.5rem; background: #f0f9ff; border-radius: 6px;">
                        <strong>3. Usar almacenamiento local:</strong>
                        <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem; color: #0369a1;">
                            Configura la aplicación para usar almacenamiento local 
                            en lugar de OneDrive.
                        </p>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
                <button id="try-personal-account" style="
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: background 0.2s;
                ">Intentar con Cuenta Personal</button>
                <button id="use-local-storage" style="
                    background: #10b981;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: background 0.2s;
                ">Usar Almacenamiento Local</button>
                <button id="close-consent-modal" style="
                    background: #6b7280;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: background 0.2s;
                ">Cerrar</button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Add event listeners
        document.getElementById('try-personal-account').onclick = function() {
            console.log('🔄 Attempting with personal account...');
            clearOneDriveTokens();
            redirectToPersonalAccount();
        };
        
        document.getElementById('use-local-storage').onclick = function() {
            console.log('🔄 Switching to local storage...');
            switchToLocalStorage();
        };
        
        document.getElementById('close-consent-modal').onclick = function() {
            modal.remove();
        };
        
        // Close modal when clicking outside
        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        };
        
        console.log('✅ Consent error modal created');
    }
    
    // 4. Clear OneDrive tokens
    function clearOneDriveTokens() {
        console.log('🧹 Clearing OneDrive tokens...');
        
        const tokensToRemove = [
            'onedrive_access_token',
            'onedrive_refresh_token',
            'onedrive_token_expiry',
            'onedrive_consent_error'
        ];
        
        tokensToRemove.forEach(token => {
            localStorage.removeItem(token);
        });
        
        console.log('✅ OneDrive tokens cleared');
    }
    
    // 5. Redirect to personal account authentication
    function redirectToPersonalAccount() {
        console.log('🔄 Redirecting to personal account authentication...');
        
        // Close modal
        const modal = document.getElementById('consent-error-modal');
        if (modal) {
            modal.remove();
        }
        
        // Show instructions for personal account
        const instructions = document.createElement('div');
        instructions.id = 'personal-account-instructions';
        instructions.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            padding: 2rem;
            max-width: 400px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            z-index: 10001;
            text-align: center;
        `;
        
        instructions.innerHTML = `
            <h3 style="color: #374151; margin: 0 0 1rem 0;">Usar Cuenta Personal</h3>
            <p style="color: #6b7280; margin: 0 0 1.5rem 0;">
                Para evitar el error de consentimiento, usa una cuenta personal de Microsoft:
            </p>
            <ul style="text-align: left; color: #6b7280; margin: 0 0 1.5rem 0;">
                <li>@outlook.com</li>
                <li>@hotmail.com</li>
                <li>@live.com</li>
            </ul>
            <button id="retry-onedrive-auth" style="
                background: #3b82f6;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
            ">Reintentar OneDrive</button>
        `;
        
        document.body.appendChild(instructions);
        
        document.getElementById('retry-onedrive-auth').onclick = function() {
            instructions.remove();
            // Trigger OneDrive authentication again
            if (window.showOneDriveConfiguration) {
                window.showOneDriveConfiguration();
            }
        };
    }
    
    // 6. Switch to local storage
    function switchToLocalStorage() {
        console.log('🔄 Switching to local storage...');
        
        // Close modal
        const modal = document.getElementById('consent-error-modal');
        if (modal) {
            modal.remove();
        }
        
        // Clear OneDrive configuration
        clearOneDriveTokens();
        localStorage.removeItem('onedrive_config');
        localStorage.removeItem('onedrive_folder_path');
        
        // Set storage preference to local
        localStorage.setItem('storage_preference', 'local');
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            z-index: 10001;
        `;
        successMsg.textContent = '✅ Cambiado a almacenamiento local';
        document.body.appendChild(successMsg);
        
        setTimeout(() => {
            successMsg.remove();
        }, 3000);
        
        console.log('✅ Switched to local storage');
    }
    
    // 7. Monitor for consent errors
    function monitorForConsentErrors() {
        // Check on page load
        if (detectConsentError()) {
            handleConsentError();
        }
        
        // Monitor URL changes
        let currentUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                if (detectConsentError()) {
                    handleConsentError();
                }
            }
        }, 1000);
        
        // Monitor for error messages in DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.textContent && node.textContent.includes('AADSTS65002')) {
                                console.log('⚠️ Consent error detected in DOM');
                                handleConsentError();
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
    }
    
    // 8. Initialize the fix
    function initializeConsentErrorFix() {
        console.log('🔧 Initializing OneDrive consent error fix...');
        
        // Monitor for consent errors
        monitorForConsentErrors();
        
        // Check if there was a previous consent error
        const hadConsentError = localStorage.getItem('onedrive_consent_error');
        if (hadConsentError) {
            console.log('⚠️ Previous consent error detected, showing resolution options...');
            createConsentErrorModal();
        }
        
        console.log('✅ OneDrive consent error fix initialized');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeConsentErrorFix);
    } else {
        initializeConsentErrorFix();
    }
}

// Apply the fix
fixOneDriveConsentError();

console.log('🔧 OneDrive Consent Error Fix loaded'); 