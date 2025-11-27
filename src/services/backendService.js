// Servicio para conectar con el backend local
// UPDATED: Fixed syntax error - GitHub Pages cache bust
class BackendService {
  constructor() {
    // Usar la configuración global del backend
    if (window.backendConfig) {
      this.baseURL = window.backendConfig.getMainBackendUrl();
      console.log(`🌐 Backend URL: ${this.baseURL}`);
    } else {
      // Fallback si no hay configuración
      const isProduction = window.location.hostname === 'pableitez.github.io';
      this.baseURL = isProduction
        ? 'https://the-bridge-9g01.onrender.com' // URL de Render
        : 'http://localhost:3000';
      console.log(`🔧 Fallback Backend URL: ${this.baseURL}`);
    }
    
    this._isConnected = false;
    this.checkConnection();
  }

  // Conectar al backend
  async connect() {
    // Si estamos en modo offline, no intentar conectar
    if (window.backendConfig && window.backendConfig.isOfflineMode()) {
      console.log('📱 Modo offline activado - No intentando conectar al backend');
      this._isConnected = false;
      return false;
    }
    
    try {
      const response = await fetch(`${this.baseURL}/health`);
      if (response.ok) {
        this._isConnected = true;
        console.log('✅ Backend conectado:', this.baseURL);
        return true;
      } else {
        this._isConnected = false;
        return false;
      }
    } catch (error) {
      console.warn('⚠️ Backend no disponible:', error.message);
      this._isConnected = false;
      
      // En producción, mostrar mensaje de modo offline
      if (window.backendConfig && window.backendConfig.isProduction) {
        this.showOfflineMessage();
      }
      return false;
    }
  }

  // Desconectar del backend
  disconnect() {
    this._isConnected = false;
    console.log('🔌 Desconectado del backend');
  }

  // Verificar si está conectado
  isConnected() {
    return this._isConnected;
  }

  // Verificar conexión con el backend
  async checkConnection() {
    // Si estamos en modo offline, no verificar conexión
    if (window.backendConfig && window.backendConfig.isOfflineMode()) {
      console.log('📱 Modo offline activado - Usando almacenamiento local');
      this._isConnected = false;
      this.showOfflineMessage();
      return false;
    }
    
    try {
      const response = await fetch(`${this.baseURL}/health`);
      if (response.ok) {
        this._isConnected = true;
        console.log('✅ Backend conectado:', this.baseURL);
        return true;
      }
    } catch (error) {
      console.warn('⚠️ Backend no disponible:', error.message);
      this._isConnected = false;
      
      // En producción, mostrar mensaje informativo
      if (window.backendConfig && window.backendConfig.isProduction) {
        console.log('📱 Modo offline activado - Usando almacenamiento local');
        this.showOfflineMessage();
      }
    }
    return false;
  }

  // Mostrar mensaje de modo offline - DISABLED
  showOfflineMessage() {
    // Notificación deshabilitada - eliminar cualquier notificación existente
    const existingNotification = document.getElementById('offline-notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    const existingOfflineNotification = document.getElementById('offlineModeNotification');
    if (existingOfflineNotification) {
      existingOfflineNotification.remove();
    }
    return;
  }

  // Obtener el equipo actual
  getCurrentTeam() {
    const teamData = localStorage.getItem('currentTeam');
    if (teamData) {
      try {
        return JSON.parse(teamData);
      } catch (error) {
        console.error('Error parsing current team:', error);
        return null;
      }
    }
    return null;
  }

  // Obtener endpoints de versiones
  getVersionsEndpoints(versionId = null) {
    const baseEndpoint = `${this.baseURL}/api/versions`;
    
    if (versionId) {
      return {
        get: `${baseEndpoint}/${versionId}`,
        update: `${baseEndpoint}/${versionId}`,
        delete: `${baseEndpoint}/${versionId}`,
        export: `${baseEndpoint}/${versionId}/export`
      };
    }
    
    return {
      list: `${baseEndpoint}`,
      create: `${baseEndpoint}`,
      stats: `${baseEndpoint}/stats`,
      latest: `${baseEndpoint}/latest`
    };
  }

  // Guardar versión en el backend
  async saveVersion(data, metadata = {}) {
    if (!this._isConnected) {
      console.log('📱 Guardando versión en localStorage (backend desconectado)');
      return this.saveVersionToLocalStorage(data, metadata);
    }

    try {
      const endpoints = this.getVersionsEndpoints();
      const versionData = {
        data: data,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          team: this.getCurrentTeam()?.name || 'Unknown',
          version: metadata.version || '1.0'
        }
      };

      const response = await fetch(endpoints.create, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(versionData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Versión guardada en backend:', result);
        return result;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('⚠️ Error guardando en backend, usando localStorage:', error);
      return this.saveVersionToLocalStorage(data, metadata);
    }
  }

  // Obtener lista de versiones del backend
  async getVersionsList() {
    if (!this._isConnected) {
      console.log('📱 Obteniendo versiones de localStorage (backend desconectado)');
      return this.getVersionsListFromLocalStorage();
    }

    try {
      const endpoints = this.getVersionsEndpoints();
      const response = await fetch(endpoints.list);
      
      if (response.ok) {
        const versions = await response.json();
        console.log('✅ Versiones obtenidas del backend:', versions);
        return versions;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('⚠️ Error obteniendo versiones del backend, usando localStorage:', error);
      return this.getVersionsListFromLocalStorage();
    }
  }

  // Cargar versión específica del backend
  async loadVersion(versionId) {
    if (!this._isConnected) {
      console.log('📱 Cargando versión de localStorage (backend desconectado)');
      return this.loadVersionFromLocalStorage(versionId);
    }

    try {
      const endpoints = this.getVersionsEndpoints(versionId);
      const response = await fetch(endpoints.get);
      
      if (response.ok) {
        const version = await response.json();
        console.log('✅ Versión cargada del backend:', version);
        return version;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('⚠️ Error cargando versión del backend, usando localStorage:', error);
      return this.loadVersionFromLocalStorage(versionId);
    }
  }

  // Eliminar versión del backend
  async deleteVersion(versionId) {
    if (!this._isConnected) {
      console.log('📱 Eliminando versión de localStorage (backend desconectado)');
      return this.deleteVersionFromLocalStorage(versionId);
    }

    try {
      const endpoints = this.getVersionsEndpoints(versionId);
      const response = await fetch(endpoints.delete, {
        method: 'DELETE'
      });

      if (response.ok) {
        console.log('✅ Versión eliminada del backend:', versionId);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('⚠️ Error eliminando versión del backend, usando localStorage:', error);
      return this.deleteVersionFromLocalStorage(versionId);
    }
  }

  // Exportar versión a CSV desde el backend
  async exportVersionToCSV(versionId) {
    if (!this._isConnected) {
      console.log('📱 Exportando versión desde localStorage (backend desconectado)');
      return this.exportVersionFromLocalStorage(versionId);
    }

    try {
      const endpoints = this.getVersionsEndpoints(versionId);
      const response = await fetch(endpoints.export);
      
      if (response.ok) {
        const csvData = await response.text();
        console.log('✅ Versión exportada del backend:', versionId);
        return csvData;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('⚠️ Error exportando versión del backend, usando localStorage:', error);
      return this.exportVersionFromLocalStorage(versionId);
    }
  }

  // Obtener estadísticas de versiones del backend
  async getVersionStats() {
    if (!this._isConnected) {
      console.log('📱 Obteniendo estadísticas de localStorage (backend desconectado)');
      return this.getVersionStatsFromLocalStorage();
    }

    try {
      const endpoints = this.getVersionsEndpoints();
      const response = await fetch(endpoints.stats);
      
      if (response.ok) {
        const stats = await response.json();
        console.log('✅ Estadísticas obtenidas del backend:', stats);
        return stats;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('⚠️ Error obteniendo estadísticas del backend, usando localStorage:', error);
      return this.getVersionStatsFromLocalStorage();
    }
  }

  // Obtener la versión más reciente del backend
  async getLatestVersion() {
    if (!this._isConnected) {
      console.log('📱 Obteniendo versión más reciente de localStorage (backend desconectado)');
      return this.getLatestVersionFromLocalStorage();
    }

    try {
      const endpoints = this.getVersionsEndpoints();
      const response = await fetch(endpoints.latest);
      
      if (response.ok) {
        const latestVersion = await response.json();
        console.log('✅ Versión más reciente obtenida del backend:', latestVersion);
        return latestVersion;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('⚠️ Error obteniendo versión más reciente del backend, usando localStorage:', error);
      return this.getLatestVersionFromLocalStorage();
    }
  }

  // Limpiar versiones antiguas del backend
  async cleanupOldVersions(keepCount = 10) {
    if (!this._isConnected) {
      console.log('📱 Limpiando versiones antiguas de localStorage (backend desconectado)');
      return this.cleanupOldVersionsFromLocalStorage(keepCount);
    }

    try {
      const versions = await this.getVersionsList();
      if (versions.length > keepCount) {
        // Ordenar por timestamp y mantener solo las más recientes
        const sortedVersions = versions.sort((a, b) => 
          new Date(b.metadata.timestamp) - new Date(a.metadata.timestamp)
        );
        
        const versionsToDelete = sortedVersions.slice(keepCount);
        
        for (const version of versionsToDelete) {
          await this.deleteVersion(version.id);
        }
        
        console.log(`✅ Cleanup completed: ${versionsToDelete.length} versions deleted`);
        return versionsToDelete.length;
      }
      return 0;
    } catch (error) {
      console.warn('⚠️ Error limpiando versiones del backend, usando localStorage:', error);
      return this.cleanupOldVersionsFromLocalStorage(keepCount);
    }
  }

  // ===== MÉTODOS DE LOCALSTORAGE =====

  // Guardar versión en localStorage
  saveVersionToLocalStorage(data, metadata = {}) {
    try {
      const versions = this.getVersionsListFromLocalStorage();
      const newVersion = {
        id: this.generateUUID(),
        data: data,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          team: this.getCurrentTeam()?.name || 'Unknown',
          version: metadata.version || '1.0',
          source: 'localStorage'
        }
      };
      
      versions.push(newVersion);
      localStorage.setItem('dataVersions', JSON.stringify(versions));
      
      console.log('✅ Versión guardada en localStorage:', newVersion.id);
      return newVersion;
    } catch (error) {
      console.error('❌ Error guardando en localStorage:', error);
      throw error;
    }
  }

  // Obtener lista de versiones de localStorage
  getVersionsListFromLocalStorage() {
    try {
      const versionsData = localStorage.getItem('dataVersions');
      if (versionsData) {
        return JSON.parse(versionsData);
      }
      return [];
    } catch (error) {
      console.error('❌ Error obteniendo versiones de localStorage:', error);
      return [];
    }
  }

  // Cargar versión específica de localStorage
  loadVersionFromLocalStorage(versionId) {
    try {
      const versions = this.getVersionsListFromLocalStorage();
      const version = versions.find(v => v.id === versionId);
      
      if (version) {
        console.log('✅ Versión cargada de localStorage:', versionId);
        return version;
      } else {
        throw new Error(`Versión no encontrada: ${versionId}`);
      }
    } catch (error) {
      console.error('❌ Error cargando versión de localStorage:', error);
      throw error;
    }
  }

  // Eliminar versión de localStorage
  deleteVersionFromLocalStorage(versionId) {
    try {
      const versions = this.getVersionsListFromLocalStorage();
      const filteredVersions = versions.filter(v => v.id !== versionId);
      
      localStorage.setItem('dataVersions', JSON.stringify(filteredVersions));
      
      console.log('✅ Versión eliminada de localStorage:', versionId);
      return true;
    } catch (error) {
      console.error('❌ Error eliminando versión de localStorage:', error);
      return false;
    }
  }

  // Obtener estadísticas de versiones de localStorage
  getVersionStatsFromLocalStorage() {
    try {
      const versions = this.getVersionsListFromLocalStorage();
      
      return {
        total: versions.length,
        latest: versions.length > 0 ? versions[versions.length - 1] : null,
        oldest: versions.length > 0 ? versions[0] : null,
        teams: [...new Set(versions.map(v => v.metadata.team))]
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de localStorage:', error);
      return { total: 0, latest: null, oldest: null, teams: [] };
    }
  }

  // Obtener la versión más reciente de localStorage
  getLatestVersionFromLocalStorage() {
    try {
      const versions = this.getVersionsListFromLocalStorage();
      if (versions.length > 0) {
        // Ordenar por timestamp y obtener la más reciente
        const sortedVersions = versions.sort((a, b) => 
          new Date(b.metadata.timestamp) - new Date(a.metadata.timestamp)
        );
        return sortedVersions[0];
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo versión más reciente de localStorage:', error);
      return null;
    }
  }

  // Limpiar versiones antiguas de localStorage
  cleanupOldVersionsFromLocalStorage(keepCount = 10) {
    try {
      const versions = this.getVersionsListFromLocalStorage();
      if (versions.length > keepCount) {
        // Ordenar por timestamp y mantener solo las más recientes
        const sortedVersions = versions.sort((a, b) => 
          new Date(b.metadata.timestamp) - new Date(a.metadata.timestamp)
        );
        
        const versionsToKeep = sortedVersions.slice(0, keepCount);
        localStorage.setItem('dataVersions', JSON.stringify(versionsToKeep));
        
        const deletedCount = versions.length - keepCount;
        console.log(`✅ localStorage cleanup completed: ${deletedCount} versions deleted`);
        return deletedCount;
      }
      return 0;
    } catch (error) {
      console.error('❌ Error limpiando versiones de localStorage:', error);
      return 0;
    }
  }

  // Obtener versiones de localStorage
  getVersionsFromLocalStorage() {
    return this.getVersionsListFromLocalStorage();
  }

  // Generar UUID único
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Obtener configuración del backend
  async getBackendConfig() {
    if (window.backendConfig) {
      return window.backendConfig.getConfig();
    }
    return null;
  }
}

// Instancia global del servicio
window.backendService = new BackendService();

// Exportar para compatibilidad con módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BackendService;
}
