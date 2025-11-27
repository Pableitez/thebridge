// ========================================
// SIDEBAR FIX - Estructura con alturas fijas
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('🔧 Sidebar Fix: Inicializando estructura con alturas fijas...');
  
  // 1. Asegurar que el teamInfo esté visible (solo si no es modo guest)
  const teamInfo = document.getElementById('teamInfo');
  if (teamInfo) {
    // Check if user is in guest mode
    const userData = localStorage.getItem('thebridge_current_user');
    const isGuestMode = userData ? JSON.parse(userData).role === 'guest' : false;
    
    if (!isGuestMode) {
      teamInfo.style.display = 'block';
      teamInfo.style.visibility = 'visible';
      teamInfo.style.opacity = '1';
      console.log('✅ TeamInfo activado (no guest mode)');
    } else {
      teamInfo.style.display = 'none';
      console.log('✅ TeamInfo ocultado (guest mode)');
    }
  }
  
  // 2. Asegurar que el copyright esté visible y completamente fijo (hover habilitado para tooltip)
  const legalNotice = document.getElementById('legalNoticeTrigger');
  if (legalNotice) {
    legalNotice.style.display = 'block';
    legalNotice.style.visibility = 'visible';
    legalNotice.style.opacity = '1';
    legalNotice.style.position = 'relative';
    legalNotice.style.zIndex = '11';
    legalNotice.style.whiteSpace = 'nowrap';
    legalNotice.style.overflow = 'hidden';
    legalNotice.style.textOverflow = 'ellipsis';
    legalNotice.style.cursor = 'pointer';
    legalNotice.style.pointerEvents = 'auto';
    legalNotice.onclick = null;
    console.log('✅ Copyright activado y fijado (hover habilitado)');
  }
  
  // 3. Verificar que la estructura de la sidebar esté correcta
  const sidebarHeader = document.querySelector('.sidebar-header');
  const sidebarScrollable = document.querySelector('.sidebar-scrollable');
  const sidebarFooter = document.querySelector('.sidebar-footer');
  
  if (sidebarHeader && sidebarScrollable && sidebarFooter) {
    console.log('✅ Estructura de sidebar correcta');
  } else {
    console.warn('⚠️ Estructura de sidebar incompleta');
  }
  
  // 4. Aplicar estilos de altura fija a la sidebar
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.style.display = 'flex';
    sidebar.style.flexDirection = 'column';
    sidebar.style.height = '100vh';
    sidebar.style.width = '280px';
    sidebar.style.overflow = 'hidden';
    sidebar.style.maxHeight = '100vh';
    console.log('✅ Estilos de sidebar aplicados');
  }
  
  // 5. Configurar el contenido scrollable con altura limitada
  if (sidebarScrollable) {
    sidebarScrollable.style.flex = '1';
    sidebarScrollable.style.overflowY = 'auto';
    sidebarScrollable.style.maxHeight = 'calc(100vh - 280px)';
    sidebarScrollable.style.minHeight = '0';
    sidebarScrollable.style.marginBottom = '80px';
    console.log('✅ Contenido scrollable configurado');
  }
  
  // 6. Configurar el footer completamente fijo
  if (sidebarFooter) {
    sidebarFooter.style.position = 'fixed';
    sidebarFooter.style.bottom = '0';
    sidebarFooter.style.left = '0';
    sidebarFooter.style.zIndex = '10';
    sidebarFooter.style.width = '280px';
    sidebarFooter.style.boxSizing = 'border-box';
    sidebarFooter.style.minHeight = '60px';
    sidebarFooter.style.maxHeight = '80px';
    sidebarFooter.style.overflow = 'hidden';
    sidebarFooter.style.backgroundColor = '#E3F2FD';
    sidebarFooter.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
    console.log('✅ Footer fijado completamente');
  }
  
  // 7. Arreglar el botón de toggle de la sidebar
  const toggleBtn = document.querySelector('.toggle-sidebar-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      console.log('🔄 Toggle sidebar clicked');
      
      // Forzar el cierre completo de la sidebar
      if (sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
        sidebar.style.width = '280px';
        sidebar.style.minWidth = '280px';
        sidebar.style.overflow = 'hidden';
        
        // Mostrar el footer cuando se expande
        if (sidebarFooter) {
          sidebarFooter.style.display = 'block';
          sidebarFooter.style.left = '0';
          sidebarFooter.style.width = '280px';
        }
        console.log('✅ Sidebar expandida');
      } else {
        sidebar.classList.add('collapsed');
        sidebar.style.width = '0px';
        sidebar.style.minWidth = '0px';
        sidebar.style.overflow = 'hidden';
        
        // Ocultar el footer cuando se colapsa
        if (sidebarFooter) {
          sidebarFooter.style.display = 'none';
          sidebarFooter.style.left = '-280px';
          sidebarFooter.style.width = '0px';
        }
        console.log('✅ Sidebar colapsada completamente');
      }
    });
    console.log('✅ Botón toggle configurado');
  }
  
  // 8. Verificar que el contenido no se extienda infinitamente
  setTimeout(() => {
    const sidebarContent = document.querySelector('.sidebar-content');
    if (sidebarContent) {
      const computedHeight = window.getComputedStyle(sidebarContent).height;
      console.log('📏 Altura del contenido de la sidebar:', computedHeight);
      
      if (sidebarContent.scrollHeight > window.innerHeight) {
        console.log('⚠️ Contenido de sidebar excede la altura de la ventana');
      } else {
        console.log('✅ Contenido de sidebar dentro de los límites');
      }
    }
  }, 1000);
  
  // 9. Función para mantener el footer fijo durante el scroll
  function keepFooterFixed() {
    if (sidebarFooter && !sidebar.classList.contains('collapsed')) {
      sidebarFooter.style.position = 'fixed';
      sidebarFooter.style.bottom = '0';
      sidebarFooter.style.left = '0';
      sidebarFooter.style.width = '280px';
    }
  }
  
  // Ejecutar la función cuando se hace scroll
  window.addEventListener('scroll', keepFooterFixed);
  
  // Ejecutar la función cuando se redimensiona la ventana
  window.addEventListener('resize', keepFooterFixed);
});

// Función para forzar la visualización de elementos
function forceShowSidebarElements() {
  const teamInfo = document.getElementById('teamInfo');
  const legalNotice = document.getElementById('legalNoticeTrigger');
  const sidebar = document.getElementById('sidebar');
  const sidebarFooter = document.querySelector('.sidebar-footer');
  const sidebarScrollable = document.querySelector('.sidebar-scrollable');
  
  if (teamInfo) {
    // Check if user is in guest mode
    const userData = localStorage.getItem('thebridge_current_user');
    const isGuestMode = userData ? JSON.parse(userData).role === 'guest' : false;
    
    if (!isGuestMode) {
      teamInfo.style.display = 'block';
      teamInfo.style.visibility = 'visible';
      teamInfo.style.opacity = '1';
    } else {
      teamInfo.style.display = 'none';
    }
  }
  
  if (legalNotice) {
    legalNotice.style.display = 'block';
    legalNotice.style.visibility = 'visible';
    legalNotice.style.opacity = '1';
    legalNotice.style.position = 'relative';
    legalNotice.style.zIndex = '11';
    legalNotice.style.whiteSpace = 'nowrap';
    legalNotice.style.overflow = 'hidden';
    legalNotice.style.textOverflow = 'ellipsis';
    legalNotice.style.cursor = 'default';
    legalNotice.style.pointerEvents = 'none';
    legalNotice.onclick = null;
  }
  
  if (sidebarFooter) {
    sidebarFooter.style.position = 'fixed';
    sidebarFooter.style.bottom = '0';
    sidebarFooter.style.left = '0';
    sidebarFooter.style.zIndex = '10';
    sidebarFooter.style.width = '280px';
    sidebarFooter.style.boxSizing = 'border-box';
    sidebarFooter.style.minHeight = '60px';
    sidebarFooter.style.maxHeight = '80px';
    sidebarFooter.style.overflow = 'hidden';
    sidebarFooter.style.backgroundColor = '#E3F2FD';
    sidebarFooter.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
  }
  
  if (sidebarScrollable) {
    sidebarScrollable.style.flex = '1';
    sidebarScrollable.style.overflowY = 'auto';
    sidebarScrollable.style.maxHeight = 'calc(100vh - 280px)';
    sidebarScrollable.style.minHeight = '0';
    sidebarScrollable.style.marginBottom = '80px';
  }
  
  console.log('🔧 Elementos de sidebar forzados a mostrar');
}

// Función para forzar el cierre completo de la sidebar
function forceCollapseSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarFooter = document.querySelector('.sidebar-footer');
  
  if (sidebar) {
    sidebar.classList.add('collapsed');
    sidebar.style.width = '0px';
    sidebar.style.minWidth = '0px';
    sidebar.style.overflow = 'hidden';
    
    // Ocultar el footer
    if (sidebarFooter) {
      sidebarFooter.style.display = 'none';
      sidebarFooter.style.left = '-280px';
      sidebarFooter.style.width = '0px';
    }
    console.log('🔧 Sidebar forzada a cerrar completamente');
  }
}

// Función para expandir la sidebar
function forceExpandSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarFooter = document.querySelector('.sidebar-footer');
  
  if (sidebar) {
    sidebar.classList.remove('collapsed');
    sidebar.style.width = '280px';
    sidebar.style.minWidth = '280px';
    sidebar.style.overflow = 'hidden';
    
    // Mostrar el footer
    if (sidebarFooter) {
      sidebarFooter.style.display = 'block';
      sidebarFooter.style.left = '0';
      sidebarFooter.style.width = '280px';
    }
    console.log('🔧 Sidebar forzada a expandir');
  }
}

// Función para verificar el estado de la sidebar
function checkSidebarStatus() {
  const sidebar = document.getElementById('sidebar');
  const sidebarContent = document.querySelector('.sidebar-content');
  const sidebarScrollable = document.querySelector('.sidebar-scrollable');
  const sidebarFooter = document.querySelector('.sidebar-footer');
  
  console.log('📊 Estado de la sidebar:');
  console.log('  - Colapsada:', sidebar?.classList.contains('collapsed'));
  console.log('  - Ancho:', sidebar?.style.width || 'no definido');
  console.log('  - Altura del contenido:', sidebarContent?.scrollHeight + 'px');
  console.log('  - Altura de la ventana:', window.innerHeight + 'px');
  console.log('  - Footer visible:', sidebarFooter?.style.display !== 'none');
  console.log('  - Footer position:', sidebarFooter?.style.position);
  console.log('  - Footer bottom:', sidebarFooter?.style.bottom);
  console.log('  - Scrollable max-height:', sidebarScrollable?.style.maxHeight);
  
  return {
    collapsed: sidebar?.classList.contains('collapsed'),
    width: sidebar?.style.width,
    contentHeight: sidebarContent?.scrollHeight,
    windowHeight: window.innerHeight,
    footerVisible: sidebarFooter?.style.display !== 'none',
    footerPosition: sidebarFooter?.style.position,
    footerBottom: sidebarFooter?.style.bottom
  };
}

// Exportar funciones para uso global
window.forceShowSidebarElements = forceShowSidebarElements;
window.forceCollapseSidebar = forceCollapseSidebar;
window.forceExpandSidebar = forceExpandSidebar;
window.checkSidebarStatus = checkSidebarStatus; 

// ========================================
// MONITOREO CONTINUO DEL FOOTER
// ========================================

// Función para forzar el footer fijo continuamente
function forceFooterFixed() {
  const sidebarFooter = document.querySelector('.sidebar-footer');
  const legalNotice = document.getElementById('legalNoticeTrigger');
  const sidebar = document.getElementById('sidebar');
  const teamInfo = document.getElementById('teamInfo');
  
  // Check if user is in guest mode and hide teamInfo if needed
  if (teamInfo) {
    const userData = localStorage.getItem('thebridge_current_user');
    const isGuestMode = userData ? JSON.parse(userData).role === 'guest' : false;
    
    if (isGuestMode) {
      teamInfo.style.setProperty('display', 'none', 'important');
      teamInfo.style.setProperty('visibility', 'hidden', 'important');
      teamInfo.style.setProperty('opacity', '0', 'important');
      teamInfo.style.setProperty('height', '0', 'important');
      teamInfo.style.setProperty('overflow', 'hidden', 'important');
      teamInfo.style.setProperty('margin', '0', 'important');
      teamInfo.style.setProperty('padding', '0', 'important');
    }
  }
  
  if (sidebarFooter && !sidebar.classList.contains('collapsed')) {
    // Forzar posición fija
    sidebarFooter.style.setProperty('position', 'fixed', 'important');
    sidebarFooter.style.setProperty('bottom', '0', 'important');
    sidebarFooter.style.setProperty('left', '0', 'important');
    sidebarFooter.style.setProperty('width', '280px', 'important');
    sidebarFooter.style.setProperty('height', '60px', 'important');
    sidebarFooter.style.setProperty('max-height', '60px', 'important');
    sidebarFooter.style.setProperty('min-height', '50px', 'important');
    sidebarFooter.style.setProperty('background-color', '#E3F2FD', 'important');
    sidebarFooter.style.setProperty('border-top', '1px solid rgba(255, 255, 255, 0.1)', 'important');
    sidebarFooter.style.setProperty('z-index', '9999', 'important');
    sidebarFooter.style.setProperty('overflow', 'hidden', 'important');
    sidebarFooter.style.setProperty('display', 'flex', 'important');
    sidebarFooter.style.setProperty('align-items', 'center', 'important');
    sidebarFooter.style.setProperty('justify-content', 'center', 'important');
    sidebarFooter.style.setProperty('box-sizing', 'border-box', 'important');
    sidebarFooter.style.setProperty('padding', '0.5rem 0.8rem 0.5rem 0.8rem', 'important');
    sidebarFooter.style.setProperty('flex-shrink', '0', 'important');
  }
  
  if (legalNotice) {
    // Forzar visibilidad del copyright (hover habilitado para tooltip)
    legalNotice.style.setProperty('display', 'block', 'important');
    legalNotice.style.setProperty('visibility', 'visible', 'important');
    legalNotice.style.setProperty('opacity', '1', 'important');
    legalNotice.style.setProperty('text-align', 'center', 'important');
    legalNotice.style.setProperty('font-size', '0.92em', 'important');
    legalNotice.style.setProperty('color', '#4FC3F7', 'important');
    legalNotice.style.setProperty('user-select', 'none', 'important');
    legalNotice.style.setProperty('cursor', 'pointer', 'important');
    legalNotice.style.setProperty('pointer-events', 'auto', 'important');
    legalNotice.style.setProperty('position', 'relative', 'important');
    legalNotice.style.setProperty('z-index', '10000', 'important');
    legalNotice.style.setProperty('margin', '0', 'important');
    legalNotice.style.setProperty('padding', '0.5rem 0', 'important');
    legalNotice.style.setProperty('white-space', 'nowrap', 'important');
    legalNotice.style.setProperty('overflow', 'hidden', 'important');
    legalNotice.style.setProperty('text-overflow', 'ellipsis', 'important');
    legalNotice.style.setProperty('width', '100%', 'important');
    legalNotice.style.setProperty('max-width', '100%', 'important');
  }
}

// Ejecutar el monitoreo cada 500ms para asegurar que el footer permanezca fijo
setInterval(forceFooterFixed, 500);

// También ejecutar cuando se detecten cambios en el DOM
const footerObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && 
        (mutation.target.classList.contains('sidebar-footer') || 
         mutation.target.id === 'legalNoticeTrigger')) {
      forceFooterFixed();
    }
  });
});

// Observar cambios en el footer y el copyright
document.addEventListener('DOMContentLoaded', () => {
  const sidebarFooter = document.querySelector('.sidebar-footer');
  const legalNotice = document.getElementById('legalNoticeTrigger');
  
  if (sidebarFooter) {
    footerObserver.observe(sidebarFooter, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }
  
  if (legalNotice) {
    footerObserver.observe(legalNotice, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }
});

// Exportar la función de monitoreo
window.forceFooterFixed = forceFooterFixed;

// ========================================
// FORZAR VISIBILIDAD DEL BOTÓN USER SET UP
// ========================================

// Función para forzar la visibilidad del botón User Set Up
function forceUserSetUpButtonVisible() {
  const userSetUpBtn = document.getElementById('userSetUpBtn');
  
  if (userSetUpBtn) {
    // Forzar visibilidad absoluta
    userSetUpBtn.style.setProperty('display', 'flex', 'important');
    userSetUpBtn.style.setProperty('visibility', 'visible', 'important');
    userSetUpBtn.style.setProperty('opacity', '1', 'important');
    userSetUpBtn.style.setProperty('color', '#ffffff', 'important');
    userSetUpBtn.style.setProperty('width', '100%', 'important');
    userSetUpBtn.style.setProperty('margin-bottom', '0.3rem', 'important');
    userSetUpBtn.style.setProperty('background', 'none', 'important');
    userSetUpBtn.style.setProperty('border', 'none', 'important');
    userSetUpBtn.style.setProperty('padding', '0.8rem 1rem', 'important');
    userSetUpBtn.style.setProperty('border-radius', '8px', 'important');
    userSetUpBtn.style.setProperty('font-weight', '500', 'important');
    userSetUpBtn.style.setProperty('cursor', 'pointer', 'important');
    userSetUpBtn.style.setProperty('transition', 'all 0.3s ease', 'important');
    userSetUpBtn.style.setProperty('align-items', 'center', 'important');
    userSetUpBtn.style.setProperty('gap', '0.5rem', 'important');
    userSetUpBtn.style.setProperty('font-size', '0.95rem', 'important');
    userSetUpBtn.style.setProperty('box-sizing', 'border-box', 'important');
    userSetUpBtn.style.setProperty('min-width', '0', 'important');
    userSetUpBtn.style.setProperty('position', 'relative', 'important');
  }
}

// Ejecutar el monitoreo cada 1 segundo para asegurar que el botón esté visible
setInterval(forceUserSetUpButtonVisible, 1000);

// También ejecutar cuando se detecten cambios en el DOM
const userSetUpObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && 
        mutation.target.id === 'userSetUpBtn') {
      forceUserSetUpButtonVisible();
    }
  });
});

// Observar cambios en el botón User Set Up
document.addEventListener('DOMContentLoaded', () => {
  const userSetUpBtn = document.getElementById('userSetUpBtn');
  
  if (userSetUpBtn) {
    userSetUpObserver.observe(userSetUpBtn, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    // Forzar visibilidad inmediatamente
    forceUserSetUpButtonVisible();
  }
});

// Exportar la función
window.forceUserSetUpButtonVisible = forceUserSetUpButtonVisible;

// ========================================
// GUEST MODE HANDLING
// ========================================

// Función para manejar elementos en modo guest
function handleGuestMode() {
  const teamInfo = document.getElementById('teamInfo');
  const teamManagementBtn = document.getElementById('teamManagementBtn');
  const teamManagementSeparator = teamManagementBtn?.nextElementSibling;
  const sidebarHeader = document.querySelector('.sidebar-header');
  
  if (teamInfo) {
    teamInfo.style.setProperty('display', 'none', 'important');
    teamInfo.style.setProperty('visibility', 'hidden', 'important');
    teamInfo.style.setProperty('opacity', '0', 'important');
    teamInfo.style.setProperty('height', '0', 'important');
    teamInfo.style.setProperty('overflow', 'hidden', 'important');
    teamInfo.style.setProperty('margin', '0', 'important');
    teamInfo.style.setProperty('padding', '0', 'important');
  }
  
  if (sidebarHeader) {
    sidebarHeader.style.setProperty('display', 'none', 'important');
    sidebarHeader.style.setProperty('height', '0', 'important');
    sidebarHeader.style.setProperty('margin', '0', 'important');
    sidebarHeader.style.setProperty('padding', '0', 'important');
    sidebarHeader.style.setProperty('overflow', 'hidden', 'important');
    sidebarHeader.style.setProperty('visibility', 'hidden', 'important');
    sidebarHeader.style.setProperty('opacity', '0', 'important');
  }
  
  if (teamManagementBtn) {
    teamManagementBtn.style.setProperty('display', 'none', 'important');
  }
  
  if (teamManagementSeparator && teamManagementSeparator.classList.contains('sidebar-separator')) {
    teamManagementSeparator.style.setProperty('display', 'none', 'important');
  }
  
  // Add guest-mode class to body
  document.body.classList.add('guest-mode');
  
  console.log('✅ Guest mode elements hidden aggressively');
}

// Función para manejar elementos en modo normal
function handleNormalMode() {
  const teamInfo = document.getElementById('teamInfo');
  const teamManagementBtn = document.getElementById('teamManagementBtn');
  const teamManagementSeparator = teamManagementBtn?.nextElementSibling;
  
  if (teamInfo) {
    teamInfo.style.setProperty('display', 'block', 'important');
  }
  
  if (teamManagementBtn) {
    teamManagementBtn.style.setProperty('display', 'flex', 'important');
  }
  
  if (teamManagementSeparator && teamManagementSeparator.classList.contains('sidebar-separator')) {
    teamManagementSeparator.style.setProperty('display', 'block', 'important');
  }
  
  // Remove guest-mode class from body
  document.body.classList.remove('guest-mode');
  
  console.log('✅ Normal mode elements shown');
}

// Exportar funciones para uso global
window.handleGuestMode = handleGuestMode;
window.handleNormalMode = handleNormalMode;

// ========================================
// MONITOREO CONTINUO PARA MODO GUEST
// ========================================

// Función para forzar la ocultación continua en modo guest
function forceGuestModeElementsHidden() {
  const userData = localStorage.getItem('thebridge_current_user');
  const isGuestMode = userData ? JSON.parse(userData).role === 'guest' : false;
  
  if (isGuestMode) {
    const teamInfo = document.getElementById('teamInfo');
    const teamManagementBtn = document.getElementById('teamManagementBtn');
    const teamManagementSeparator = teamManagementBtn?.nextElementSibling;
    const sidebarHeader = document.querySelector('.sidebar-header');
    
    if (teamInfo) {
      teamInfo.style.setProperty('display', 'none', 'important');
      teamInfo.style.setProperty('visibility', 'hidden', 'important');
      teamInfo.style.setProperty('opacity', '0', 'important');
      teamInfo.style.setProperty('height', '0', 'important');
      teamInfo.style.setProperty('overflow', 'hidden', 'important');
      teamInfo.style.setProperty('margin', '0', 'important');
      teamInfo.style.setProperty('padding', '0', 'important');
    }
    
    if (sidebarHeader) {
      sidebarHeader.style.setProperty('display', 'none', 'important');
      sidebarHeader.style.setProperty('height', '0', 'important');
      sidebarHeader.style.setProperty('margin', '0', 'important');
      sidebarHeader.style.setProperty('padding', '0', 'important');
      sidebarHeader.style.setProperty('overflow', 'hidden', 'important');
      sidebarHeader.style.setProperty('visibility', 'hidden', 'important');
      sidebarHeader.style.setProperty('opacity', '0', 'important');
    }
    
    if (teamManagementBtn) {
      teamManagementBtn.style.setProperty('display', 'none', 'important');
    }
    
    if (teamManagementSeparator && teamManagementSeparator.classList.contains('sidebar-separator')) {
      teamManagementSeparator.style.setProperty('display', 'none', 'important');
    }
  }
}

// Ejecutar el monitoreo cada 100ms para asegurar que los elementos permanezcan ocultos
setInterval(forceGuestModeElementsHidden, 100);

// También ejecutar cuando se detecten cambios en el DOM
const guestModeObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && 
        (mutation.target.id === 'teamInfo' || 
         mutation.target.id === 'teamManagementBtn')) {
      forceGuestModeElementsHidden();
    }
  });
});

// Observar cambios en los elementos del equipo
document.addEventListener('DOMContentLoaded', () => {
  const teamInfo = document.getElementById('teamInfo');
  const teamManagementBtn = document.getElementById('teamManagementBtn');
  
  if (teamInfo) {
    guestModeObserver.observe(teamInfo, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }
  
  if (teamManagementBtn) {
    guestModeObserver.observe(teamManagementBtn, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }
  
  // Ejecutar inmediatamente
  forceGuestModeElementsHidden();
});

// Exportar la función
window.forceGuestModeElementsHidden = forceGuestModeElementsHidden; 
 
 