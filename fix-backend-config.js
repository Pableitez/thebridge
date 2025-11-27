// Script para limpiar la configuración del backend
console.log('🔧 Limpiando configuración del backend...');

// Limpiar localStorage
localStorage.removeItem('backendSettings');
console.log('✅ localStorage.backendSettings eliminado');

// Limpiar variables globales
if (window.backendUrl) {
  delete window.backendUrl;
  console.log('✅ window.backendUrl eliminado');
}

if (window.backendTimeout) {
  delete window.backendTimeout;
  console.log('✅ window.backendTimeout eliminado');
}

if (window.autoReconnect) {
  delete window.autoReconnect;
  console.log('✅ window.autoReconnect eliminado');
}

if (window.enableHealthChecks) {
  delete window.enableHealthChecks;
  console.log('✅ window.enableHealthChecks eliminado');
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
          csv: 'https://the-bridge-csv-backend-production.up.railway.app'
        }
      },
      currentUrls: window.location.hostname === 'pableitez.github.io' 
        ? { main: 'https://the-bridge-backend-production.up.railway.app', csv: 'https://the-bridge-csv-backend-production.up.railway.app' }
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

console.log('✅ Configuración del backend limpiada. Recarga la página para aplicar los cambios.'); 