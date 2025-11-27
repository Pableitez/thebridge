const express = require('express');
const router = express.Router();
const VersionService = require('../services/versionService');
const { config } = require('../config/paths');

// Instanciar el servicio de versiones
const versionService = new VersionService();

// Middleware para validar datos de entrada
const validateVersionData = (req, res, next) => {
  const { data } = req.body;
  
  if (!data) {
    return res.status(400).json({
      success: false,
      error: 'Datos requeridos para guardar versión'
    });
  }
  
  if (!Array.isArray(data)) {
    return res.status(400).json({
      success: false,
      error: 'Los datos deben ser un array'
    });
  }
  
  next();
};

// GET /api/versions - Obtener lista de versiones
router.get('/', async (req, res) => {
  try {
    const result = await versionService.getVersionsList();
    res.json(result);
  } catch (error) {
    console.error('Error en GET /api/versions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/versions/stats - Obtener estadísticas de versiones
router.get('/stats', async (req, res) => {
  try {
    const result = await versionService.getVersionStats();
    res.json(result);
  } catch (error) {
    console.error('Error en GET /api/versions/stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/versions/:id - Obtener una versión específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await versionService.loadVersion(id);
    res.json(result);
  } catch (error) {
    console.error(`Error en GET /api/versions/${req.params.id}:`, error);
    
    if (error.message.includes('no encontrada')) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

// POST /api/versions - Guardar una nueva versión
router.post('/', validateVersionData, async (req, res) => {
  try {
    const { data, metadata = {} } = req.body;
    
    // Validar tamaño de datos
    const dataSize = JSON.stringify(data).length;
    if (dataSize > config.files.maxSize) {
      return res.status(413).json({
        success: false,
        error: `Datos demasiado grandes. Máximo: ${config.files.maxSize / (1024 * 1024)}MB`
      });
    }
    
    const result = await versionService.saveVersion(data, metadata);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error en POST /api/versions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/versions/:id - Eliminar una versión
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await versionService.deleteVersion(id);
    res.json(result);
  } catch (error) {
    console.error(`Error en DELETE /api/versions/${req.params.id}:`, error);
    
    if (error.message.includes('no encontrada')) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

// POST /api/versions/:id/export - Exportar versión a CSV
router.post('/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await versionService.exportVersionToCSV(id);
    res.json(result);
  } catch (error) {
    console.error(`Error en POST /api/versions/${req.params.id}/export:`, error);
    
    if (error.message.includes('no encontrada')) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

// POST /api/versions/cleanup - Limpiar versiones antiguas
router.post('/cleanup', async (req, res) => {
  try {
    const { keepCount = 10 } = req.body;
    const result = await versionService.cleanupOldVersions(keepCount);
    res.json(result);
  } catch (error) {
    console.error('Error en POST /api/versions/cleanup:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/versions/config - Obtener configuración del backend
router.get('/config/info', (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        dataRoot: config.paths.dataRoot,
        maxFileSize: config.files.maxSize,
        allowedExtensions: config.files.allowedExtensions,
        supportedProviders: config.cloudSync.supportedProviders,
        defaultProvider: config.cloudSync.defaultProvider
      }
    });
  } catch (error) {
    console.error('Error en GET /api/versions/config/info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Middleware para manejar rutas no encontradas
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    availableRoutes: [
      'GET /api/versions',
      'GET /api/versions/stats',
      'GET /api/versions/:id',
      'POST /api/versions',
      'DELETE /api/versions/:id',
      'POST /api/versions/:id/export',
      'POST /api/versions/cleanup',
      'GET /api/versions/config/info'
    ]
  });
});

module.exports = router; 