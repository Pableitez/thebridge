// Script para limpiar completamente la configuración de Vercel
console.log('🧹 Limpiando configuración de Vercel...');

// Limpiar localStorage
localStorage.removeItem('backendSettings');
localStorage.removeItem('vercelConfig');
localStorage.removeItem('backendUrl');
console.log('✅ localStorage limpiado');

// Limpiar variables globales
if (window.backendUrl) {
  delete window.backendUrl;
  console.log('✅ window.backendUrl eliminado');
}

if (window.vercelConfig) {
  delete window.vercelConfig;
  console.log('✅ window.vercelConfig eliminado');
}

// Forzar reinicialización del backendConfig
if (window.backendConfig) {
  // Reinicializar la configuración
  window.backendConfig = new (window.BackendConfig || (() => {
    return {
      isProduction: window.location.hostname === 'pableitez.github.io',
      isDevelopment: !(window.location.hostname === 'pableitez.github.io'),
      urls: {
        development: {
          main: 'http://localhost:3001',
          csv: 'http://localhost:3005'
        },
        production: {
          main: 'https://the-bridge-backend-production.up.railway.app',
          csv: 'https://the-bridge-backend-production.up.railway.app'
        }
      },
      currentUrls: window.location.hostname === 'pableitez.github.io' 
        ? { main: 'https://the-bridge-backend-production.up.railway.app', csv: 'https://the-bridge-backend-production.up.railway.app' }
        : { main: 'http://localhost:3001', csv: 'http://localhost:3005' },
      getMainBackendUrl() { return this.currentUrls.main; },
      getCsvBackendUrl() { return this.currentUrls.csv; },
      isOfflineMode() { return false; }
    };
  }))();
  console.log('✅ window.backendConfig reinicializado');
}

console.log('🌐 Environment:', window.location.hostname === 'pableitez.github.io' ? 'Production' : 'Development');
console.log('🔗 Main Backend:', window.backendConfig ? window.backendConfig.getMainBackendUrl() : 'No config');
console.log('📊 CSV Backend:', window.backendConfig ? window.backendConfig.getCsvBackendUrl() : 'No config');

console.log('✅ Configuración de Vercel completamente limpiada. Recarga la página para aplicar los cambios.'); 