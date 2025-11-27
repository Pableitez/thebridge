const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getFullPath, config } = require('../config/paths');

class VersionService {
  constructor() {
    this.versionsPath = getFullPath(config.paths.versions);
    this.backupsPath = getFullPath(config.paths.backups);
    this.exportsPath = getFullPath(config.paths.exports);
    this.tempPath = getFullPath(config.paths.temp);
    
    // Asegurar que las carpetas existan
    this.initializePaths();
  }

  initializePaths() {
    [this.versionsPath, this.backupsPath, this.exportsPath, this.tempPath].forEach(dir => {
      fs.ensureDirSync(dir);
    });
  }

  // Guardar una nueva versión
  async saveVersion(data, metadata = {}) {
    try {
      const versionId = uuidv4();
      const timestamp = new Date().toISOString();
      
      const versionData = {
        id: versionId,
        timestamp: timestamp,
        data: data,
        metadata: {
          ...metadata,
          createdAt: timestamp,
          dataSize: JSON.stringify(data).length,
          recordCount: Array.isArray(data) ? data.length : 0
        }
      };

      const fileName = `${config.files.versionFilePrefix}${versionId}.json`;
      const filePath = path.join(this.versionsPath, fileName);

      await fs.writeJson(filePath, versionData, { spaces: 2 });
      
      console.log(`✅ Versión guardada: ${versionId} (${versionData.metadata.recordCount} registros)`);
      
      return {
        success: true,
        versionId: versionId,
        timestamp: timestamp,
        metadata: versionData.metadata
      };
    } catch (error) {
      console.error('❌ Error guardando versión:', error);
      throw new Error(`Error guardando versión: ${error.message}`);
    }
  }

  // Cargar una versión específica
  async loadVersion(versionId) {
    try {
      const fileName = `${config.files.versionFilePrefix}${versionId}.json`;
      const filePath = path.join(this.versionsPath, fileName);

      if (!await fs.pathExists(filePath)) {
        throw new Error(`Versión no encontrada: ${versionId}`);
      }

      const versionData = await fs.readJson(filePath);
      
      console.log(`✅ Versión cargada: ${versionId} (${versionData.metadata.recordCount} registros)`);
      
      return {
        success: true,
        data: versionData.data,
        metadata: versionData.metadata
      };
    } catch (error) {
      console.error('❌ Error cargando versión:', error);
      throw new Error(`Error cargando versión: ${error.message}`);
    }
  }

  // Obtener lista de todas las versiones
  async getVersionsList() {
    try {
      const files = await fs.readdir(this.versionsPath);
      const versionFiles = files.filter(file => file.startsWith(config.files.versionFilePrefix) && file.endsWith('.json'));
      
      const versions = [];
      
      for (const file of versionFiles) {
        try {
          const filePath = path.join(this.versionsPath, file);
          const versionData = await fs.readJson(filePath);
          
          versions.push({
            id: versionData.id,
            timestamp: versionData.timestamp,
            metadata: versionData.metadata
          });
        } catch (error) {
          console.warn(`⚠️ Error leyendo archivo de versión ${file}:`, error);
        }
      }

      // Ordenar por timestamp (más reciente primero)
      versions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      console.log(`✅ Lista de versiones obtenida: ${versions.length} versiones`);
      
      return {
        success: true,
        versions: versions
      };
    } catch (error) {
      console.error('❌ Error obteniendo lista de versiones:', error);
      throw new Error(`Error obteniendo lista de versiones: ${error.message}`);
    }
  }

  // Eliminar una versión
  async deleteVersion(versionId) {
    try {
      const fileName = `${config.files.versionFilePrefix}${versionId}.json`;
      const filePath = path.join(this.versionsPath, fileName);

      if (!await fs.pathExists(filePath)) {
        throw new Error(`Versión no encontrada: ${versionId}`);
      }

      // Crear backup antes de eliminar
      const backupFileName = `${config.files.backupFilePrefix}${versionId}_${Date.now()}.json`;
      const backupPath = path.join(this.backupsPath, backupFileName);
      
      const versionData = await fs.readJson(filePath);
      await fs.writeJson(backupPath, versionData, { spaces: 2 });
      
      // Eliminar la versión original
      await fs.remove(filePath);
      
      console.log(`✅ Versión eliminada: ${versionId} (backup creado: ${backupFileName})`);
      
      return {
        success: true,
        versionId: versionId,
        backupCreated: backupFileName
      };
    } catch (error) {
      console.error('❌ Error eliminando versión:', error);
      throw new Error(`Error eliminando versión: ${error.message}`);
    }
  }

  // Exportar versión a CSV
  async exportVersionToCSV(versionId) {
    try {
      const versionData = await this.loadVersion(versionId);
      const data = versionData.data;
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No hay datos para exportar');
      }

      // Convertir a CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
          const value = row[header] || '';
          // Escapar comillas y comas
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(','))
      ].join('\n');

      const fileName = `export_${versionId}_${Date.now()}.csv`;
      const filePath = path.join(this.exportsPath, fileName);
      
      await fs.writeFile(filePath, csvContent, 'utf8');
      
      console.log(`✅ Versión exportada a CSV: ${fileName}`);
      
      return {
        success: true,
        fileName: fileName,
        filePath: filePath,
        recordCount: data.length
      };
    } catch (error) {
      console.error('❌ Error exportando versión:', error);
      throw new Error(`Error exportando versión: ${error.message}`);
    }
  }

  // Obtener estadísticas de versiones
  async getVersionStats() {
    try {
      const versionsList = await this.getVersionsList();
      const versions = versionsList.versions;
      
      if (versions.length === 0) {
        return {
          success: true,
          stats: {
            totalVersions: 0,
            totalRecords: 0,
            totalSize: 0,
            oldestVersion: null,
            newestVersion: null
          }
        };
      }

      const stats = {
        totalVersions: versions.length,
        totalRecords: versions.reduce((sum, v) => sum + (v.metadata.recordCount || 0), 0),
        totalSize: versions.reduce((sum, v) => sum + (v.metadata.dataSize || 0), 0),
        oldestVersion: versions[versions.length - 1],
        newestVersion: versions[0]
      };

      return {
        success: true,
        stats: stats
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
  }

  // Limpiar versiones antiguas (mantener solo las últimas N)
  async cleanupOldVersions(keepCount = 10) {
    try {
      const versionsList = await this.getVersionsList();
      const versions = versionsList.versions;
      
      if (versions.length <= keepCount) {
        return {
          success: true,
          message: 'No hay versiones para limpiar',
          deletedCount: 0
        };
      }

      const versionsToDelete = versions.slice(keepCount);
      let deletedCount = 0;

      for (const version of versionsToDelete) {
        try {
          await this.deleteVersion(version.id);
          deletedCount++;
        } catch (error) {
          console.warn(`⚠️ Error eliminando versión ${version.id}:`, error);
        }
      }

              console.log(`✅ Cleanup completed: ${deletedCount} versions deleted`);
      
      return {
        success: true,
        deletedCount: deletedCount,
        keptCount: keepCount
      };
    } catch (error) {
              console.error('❌ Error in version cleanup:', error);
              throw new Error(`Error in version cleanup: ${error.message}`);
    }
  }
}

module.exports = VersionService; 