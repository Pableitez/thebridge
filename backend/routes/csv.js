const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// Configurar multer para subida de archivos
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB máximo
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV'));
    }
  }
});

// Función para obtener la configuración del equipo
async function getTeamConfig(teamId) {
  try {
    const { config } = require('../config/paths');
    
    // Buscar por ID en la ruta por defecto (estructura antigua)
    const teamConfigPath = path.join(config.paths.dataRoot, 'teams', teamId, 'team-config.json');
    
    if (fs.existsSync(teamConfigPath)) {
      const configData = fs.readFileSync(teamConfigPath, 'utf8');
      return JSON.parse(configData);
    }
    
    // Buscar en todas las carpetas de equipos por nombre (estructura nueva)
    const commonBasePaths = [
      path.join(config.paths.dataRoot),
      path.join(require('os').homedir(), 'OneDrive', 'TheBridge'),
      path.join(require('os').homedir(), 'Documents', 'TheBridge'),
      path.join(require('os').homedir(), 'Google Drive', 'TheBridge'),
      path.join(require('os').homedir(), 'Dropbox', 'TheBridge')
    ];
    
    for (const basePath of commonBasePaths) {
      if (fs.existsSync(basePath)) {
        try {
          const folders = fs.readdirSync(basePath);
          
          for (const folder of folders) {
            const configPath = path.join(basePath, folder, 'team-config.json');
            if (fs.existsSync(configPath)) {
              const configData = fs.readFileSync(configPath, 'utf8');
              const config = JSON.parse(configData);
              if (config.id === teamId) {
                return config;
              }
            }
          }
        } catch (e) {
          // Continuar con el siguiente path
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error loading team config:', error);
    return null;
  }
}

// Función para obtener la ruta base de CSVs del equipo
async function getTeamCsvPath(teamId) {
  try {
    const teamConfig = await getTeamConfig(teamId);
    
    if (teamConfig) {
      // Priorizar la nueva estructura (folderPath)
      if (teamConfig.folderPath) {
        return path.join(teamConfig.folderPath, 'csvs');
      }
      
      // Fallback a la estructura anterior (storagePath)
      if (teamConfig.storagePath) {
        return path.join(teamConfig.storagePath, 'csvs');
      }
    }
    
    // Fallback a la configuración por defecto
    const { config } = require('../config/paths');
    return path.join(config.paths.dataRoot, 'teams', teamId, 'csvs');
  } catch (error) {
    console.error('Error getting team CSV path:', error);
    const { config } = require('../config/paths');
    return path.join(config.paths.dataRoot, 'teams', teamId, 'csvs');
  }
}

// Función para detectar el tipo de CSV basado en el nombre del archivo
function detectCsvType(filename) {
  const name = filename.toLowerCase();
  
  // Patrones de detección
  const patterns = {
    'sales': /sales?|venta[s]?|revenue|factur/,
    'inventory': /inventory|stock|inventa[r]?io|almace[n]?/,
    'customers': /customer[s]?|client[es]?|usuario[s]?|user[s]?/,
    'orders': /order[s]?|pedido[s]?|purchase[s]?|compra[s]?/,
    'products': /product[s]?|producto[s]?|item[s]?|articulo[s]?/,
    'financial': /financ|accounting|contab|budget|presupuesto/,
    'logistics': /logistic|transport|envio|shipping|deliver/,
    'marketing': /marketing|campaign|campana|promocion|promo/,
    'hr': /hr|human|resource|empleado|employee|staff|personal/,
    'analytics': /analytic|metric|estadistic|report|reporte/
  };
  
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(name)) {
      return type;
    }
  }
  
  // Si no coincide con ningún patrón, usar "general"
  return 'general';
}

// Función para crear carpetas necesarias
async function ensureTeamCsvFolders(teamId, date, csvType) {
  const teamPath = await getTeamCsvPath(teamId);
  const datePath = path.join(teamPath, date);
  const typePath = path.join(datePath, csvType);
  
  if (!fs.existsSync(typePath)) {
    fs.mkdirSync(typePath, { recursive: true });
  }
  
  return typePath;
}

// Función para obtener archivos existentes de un tipo en una fecha
async function getExistingFiles(teamId, date, csvType) {
  const typePath = path.join(await getTeamCsvPath(teamId), date, csvType);
  
  if (!fs.existsSync(typePath)) {
    return { first: null, last: null };
  }
  
  const files = fs.readdirSync(typePath);
  const firstFile = files.find(f => f.startsWith('first-'));
  const lastFile = files.find(f => f.startsWith('last-'));
  
  return {
    first: firstFile ? path.join(typePath, firstFile) : null,
    last: lastFile ? path.join(typePath, lastFile) : null
  };
}

// Función para generar nombre de archivo único
function generateFileName(csvType, position, originalName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = path.parse(originalName).name;
  return `${position}-${csvType}-${baseName}-${timestamp}.csv`;
}

// POST /api/csv/upload - Subir CSV al equipo (SIN GUARDAR ARCHIVOS)
router.post('/upload', upload.single('csv'), async (req, res) => {
  try {
    const { teamId, userEmail, date, csvType, position } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo CSV'
      });
    }
    
    if (!teamId || !userEmail || !date || !csvType || !position) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros requeridos: teamId, userEmail, date, csvType, position'
      });
    }
    
    // ⚠️ SEGURIDAD: NO GUARDAR ARCHIVOS CSV EN EL SERVIDOR
    // Solo procesar en memoria y devolver resumen
    
    // Procesar CSV en memoria
    const csvContent = file.buffer.toString('utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const recordCount = Math.max(0, lines.length - 1); // Excluir header
    
    // Detectar columnas del CSV
    const headers = lines.length > 0 ? lines[0].split(',').map(h => h.trim().replace(/"/g, '')) : [];
    
    // Crear metadata sin guardar archivo
    const metadata = {
      originalName: file.originalname,
      csvType: csvType,
      position: position,
      userEmail: userEmail,
      teamId: teamId,
      uploadDate: new Date().toISOString(),
      size: file.size,
      recordCount: recordCount,
      headers: headers,
      hash: crypto.createHash('md5').update(file.buffer).digest('hex'),
      // ⚠️ IMPORTANTE: No se guarda el archivo por seguridad
      securityNote: 'Archivo procesado en memoria - NO guardado en servidor'
    };
    
    console.log(`✅ CSV procesado (NO guardado): ${file.originalname} (${csvType}/${position}) por ${userEmail}`);
    console.log(`📊 Resumen: ${recordCount} registros, ${headers.length} columnas`);
    
    res.json({
      success: true,
      message: 'CSV procesado exitosamente (NO guardado en servidor por seguridad)',
      data: {
        fileName: file.originalname,
        csvType: csvType,
        position: position,
        recordCount: recordCount,
        headers: headers,
        metadata: metadata,
        // ⚠️ ADVERTENCIA DE SEGURIDAD
        securityWarning: 'Los archivos CSV NO se guardan en el servidor por protección de datos sensibles'
      }
    });
    
  } catch (error) {
    console.error('Error procesando CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar CSV: ' + error.message
    });
  }
});

// GET /api/csv/list - Listar CSVs del equipo (SIN ACCESO A ARCHIVOS)
router.get('/list', async (req, res) => {
  try {
    const { teamId, date, csvType } = req.query;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'TeamId requerido'
      });
    }
    
    // ⚠️ SEGURIDAD: NO ACCEDER A ARCHIVOS CSV EN EL SERVIDOR
    // Los archivos CSV no se guardan por protección de datos sensibles
    
    console.log(`🔒 Acceso denegado a archivos CSV para equipo ${teamId} - Protección de datos sensibles`);
    
    res.json({
      success: true,
      message: 'Los archivos CSV NO se almacenan en el servidor por seguridad',
      data: { 
        dates: [], 
        types: [], 
        files: [],
        securityNote: 'Los archivos CSV se procesan en memoria y NO se guardan en el servidor para proteger datos sensibles'
      },
      securityWarning: 'Por protección de datos sensibles, los archivos CSV NO se almacenan en el servidor'
    });
    
  } catch (error) {
    console.error('Error en listado de CSVs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar solicitud: ' + error.message
    });
  }
});

// GET /api/csv/timeline - Línea temporal de CSVs (DESHABILITADA)
router.get('/timeline', async (req, res) => {
  try {
    const { teamId } = req.query;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'TeamId requerido'
      });
    }
    
    // ⚠️ SEGURIDAD: NO ACCEDER A ARCHIVOS CSV EN EL SERVIDOR
    // Los archivos CSV no se guardan por protección de datos sensibles
    
    console.log(`🔒 Timeline denegado para equipo ${teamId} - Protección de datos sensibles`);
    
    res.json({
      success: true,
      message: 'Timeline de CSVs no disponible por seguridad',
      data: {
        timeline: [],
        securityNote: 'Los archivos CSV se procesan en memoria y NO se guardan en el servidor'
      },
      securityWarning: 'Por protección de datos sensibles, no se mantiene historial de archivos CSV'
    });
    
  } catch (error) {
    console.error('Error en timeline de CSVs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar solicitud: ' + error.message
    });
  }
});

// GET /api/csv/download/:teamId/:date/:csvType/:position - Descargar CSV (DESHABILITADO)
router.get('/download/:teamId/:date/:csvType/:position', async (req, res) => {
  try {
    const { teamId, date, csvType, position } = req.params;
    
    // ⚠️ SEGURIDAD: NO PERMITIR DESCARGAS DE ARCHIVOS CSV
    // Los archivos CSV no se guardan por protección de datos sensibles
    
    console.log(`🔒 Descarga denegada de CSV: ${teamId}/${date}/${csvType}/${position} - Protección de datos sensibles`);
    
    res.status(403).json({
      success: false,
      message: 'Descarga de archivos CSV deshabilitada por seguridad',
      error: 'Los archivos CSV NO se almacenan en el servidor para proteger datos sensibles',
      securityNote: 'Los archivos se procesan en memoria y NO se guardan en el servidor'
    });
    
  } catch (error) {
    console.error('Error en descarga de CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar solicitud: ' + error.message
    });
  }
});

// GET /api/csv/stats - Estadísticas de CSVs del equipo (DESHABILITADAS)
router.get('/stats', async (req, res) => {
  try {
    const { teamId } = req.query;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'TeamId requerido'
      });
    }
    
    // ⚠️ SEGURIDAD: NO ACCEDER A ARCHIVOS CSV EN EL SERVIDOR
    // Los archivos CSV no se guardan por protección de datos sensibles
    
    console.log(`🔒 Estadísticas denegadas para equipo ${teamId} - Protección de datos sensibles`);
    
    res.json({
      success: true,
      message: 'Estadísticas de CSVs no disponibles por seguridad',
      data: {
        totalFiles: 0,
        totalSize: 0,
        fileTypes: {},
        uploadHistory: [],
        securityNote: 'Los archivos CSV se procesan en memoria y NO se guardan en el servidor'
      },
      securityWarning: 'Por protección de datos sensibles, no se mantienen estadísticas de archivos CSV'
    });
    
  } catch (error) {
    console.error('Error en estadísticas de CSVs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar solicitud: ' + error.message
    });
  }
});

module.exports = router; 