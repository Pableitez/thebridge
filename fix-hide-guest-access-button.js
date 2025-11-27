// ===== FIX HIDE GUEST ACCESS BUTTON =====

// Función para ocultar el botón Enable Guest Access cuando no sea necesario
function fixHideGuestAccessButton() {
    console.log('🔧 Fixing guest access button visibility...');
    
    function hideGuestAccessButton() {
        const guestAccessBtn = document.getElementById('guestAccessBtn');
        if (guestAccessBtn) {
            console.log('🚫 Hiding Enable Guest Access button...');
            guestAccessBtn.style.display = 'none';
            console.log('✅ Enable Guest Access button hidden');
        } else {
            console.log('⚠️ Guest access button not found');
        }
    }
    
    // Ocultar inmediatamente
    hideGuestAccessButton();
    
    // También ocultar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(hideGuestAccessButton, 100);
            setTimeout(hideGuestAccessButton, 500);
        });
    } else {
        setTimeout(hideGuestAccessButton, 100);
        setTimeout(hideGuestAccessButton, 500);
    }
    
    // Observar cambios en el DOM para ocultar el botón si aparece
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.id === 'guestAccessBtn' || 
                            (node.querySelector && node.querySelector('#guestAccessBtn'))) {
                            console.log('🔄 Guest access button detected, hiding...');
                            setTimeout(hideGuestAccessButton, 50);
                        }
                    }
                });
            }
        });
    });
    
    // Observar el sidebar para detectar cambios
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        observer.observe(sidebar, {
            childList: true,
            subtree: true
        });
    }
    
    // También agregar CSS global para asegurar que esté oculto
    const style = document.createElement('style');
    style.textContent = `
        #guestAccessBtn {
            display: none !important;
        }
    `;
    
    document.head.appendChild(style);
    
    console.log('✅ Guest access button fix applied');
}

// Exportar la función para uso global
window.fixHideGuestAccessButton = fixHideGuestAccessButton;

// Aplicar el fix automáticamente
fixHideGuestAccessButton();

console.log('🔧 Hide guest access button fix script loaded and applied'); 