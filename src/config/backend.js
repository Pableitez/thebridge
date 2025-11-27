// Configuración del backend según el entorno
class BackendConfig {
  constructor() {
    // Detectar si estamos en producción (GitHub Pages) o desarrollo
    this.isProduction = window.location.hostname === 'pableitez.github.io';
    this.isDevelopment = !this.isProduction;
    
    // También detectar si estamos en localhost para desarrollo
    this.isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.protocol === 'file:';
    
    // Permitir conexión a Railway en desarrollo
    if (this.isDevelopment) {
      console.log('🌐 Modo desarrollo - Intentando conectar a Railway');
    }
    
    // URLs del backend según el entorno
    this.urls = {
      development: {
        main: 'http://localhost:3000',
        csv: 'http://localhost:3005'
      },
      production: {
        // Backend desplegado en Render
        main: 'https://the-bridge-9g01.onrender.com',
        csv: 'https://the-bridge-9g01.onrender.com'
      }
    };
    
    // URL actual según el entorno
    this.currentUrls = this.isProduction ? this.urls.production : this.urls.development;
    
    // Verificar si las URLs de producción son válidas
    this.validateProductionUrls();
    
    console.log(`🌐 Environment: ${this.isProduction ? 'Production' : 'Development'}`);
    console.log(`🔗 Main Backend: ${this.currentUrls.main}`);
    console.log(`📊 CSV Backend: ${this.currentUrls.csv}`);
  }
  
  // Validar URLs de producción
  validateProductionUrls() {
    // Verificar si las URLs de producción son válidas
    const hasValidUrls = this.currentUrls.main.includes('render.com') || 
                        this.currentUrls.main.includes('railway.app') || 
                        this.currentUrls.main.includes('herokuapp.com');
    
    if (!hasValidUrls) {
      console.warn('⚠️ URLs de producción no configuradas. Usando modo offline.');
      this.enableOfflineMode();
    } else {
      console.log('✅ URLs de backend configuradas correctamente');
    }
  }
  
  // Habilitar modo offline
  enableOfflineMode() {
    this.currentUrls = {
      main: 'offline',
      csv: 'offline'
    };
    this._offlineMode = true;
  }
  
  // Obtener URL del backend principal
  getMainBackendUrl() {
    return this.currentUrls.main;
  }
  
  // Obtener URL del backend CSV
  getCsvBackendUrl() {
    return this.currentUrls.csv;
  }
  
  // Verificar si estamos en modo offline
  isOfflineMode() {
    return this._offlineMode || this.currentUrls.main === 'offline';
  }
  
  // Obtener configuración completa
  getConfig() {
    return {
      isProduction: this.isProduction,
      isDevelopment: this.isDevelopment,
      urls: this.currentUrls,
      isOfflineMode: this.isOfflineMode()
    };
  }
}

// Instancia global de configuración
window.backendConfig = new BackendConfig();

// Forzar modo offline en producción si no hay URLs válidas
if (window.backendConfig.isProduction && window.backendConfig.isOfflineMode()) {
  console.log('🌐 Forzando modo offline en producción');
  window.backendConfig.enableOfflineMode();
}

// Exportar para compatibilidad con módulos (opcional)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.backendConfig;
}
