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

// Función para obtener la ruta base de CSVs del equipo
function getTeamCsvPath(teamId) {
  const basePath = 'C:\\Users\\pable\\OneDrive\\TheBridge\\Versions';
  return path.join(basePath, 'teams', teamId, 'csvs');
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
  
  return 'general';
}

// Función para crear carpetas necesarias
function ensureTeamCsvFolders(teamId, date, csvType) {
  const teamPath = getTeamCsvPath(teamId);
  const datePath = path.join(teamPath, date);
  const typePath = path.join(datePath, csvType);
  
  if (!fs.existsSync(typePath)) {
    fs.mkdirSync(typePath, { recursive: true });
  }
  
  return typePath;
}

// Función para obtener archivos existentes de un tipo en una fecha
function getExistingFiles(teamId, date, csvType) {
  const typePath = path.join(getTeamCsvPath(teamId), date, csvType);
  
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

// POST /api/csv/upload - Subir CSV al equipo
router.post('/upload', upload.single('csvFile'), async (req, res) => {
  try {
    const { teamId, userEmail } = req.body;
    const file = req.file;
    
    if (!teamId || !userEmail || !file) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos: teamId, userEmail y archivo CSV'
      });
    }
    
    // Detectar tipo de CSV
    const csvType = detectCsvType(file.originalname);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Crear carpetas necesarias
    const typePath = ensureTeamCsvFolders(teamId, today, csvType);
    
    // Verificar archivos existentes
    const existingFiles = getExistingFiles(teamId, today, csvType);
    
    let position = 'first';
    let fileToReplace = null;
    
    if (existingFiles.first && existingFiles.last) {
      // Ya hay 2 archivos, reemplazar el "last"
      position = 'last';
      fileToReplace = existingFiles.last;
    } else if (existingFiles.first) {
      // Ya hay un "first", este será el "last"
      position = 'last';
    }
    
    // Generar nombre del archivo
    const fileName = generateFileName(csvType, position, file.originalname);
    const filePath = path.join(typePath, fileName);
    
    // Eliminar archivo anterior si se está reemplazando
    if (fileToReplace && fs.existsSync(fileToReplace)) {
      fs.unlinkSync(fileToReplace);
    }
    
    // Guardar archivo
    fs.writeFileSync(filePath, file.buffer);
    
    // Crear metadata
    const metadata = {
      originalName: file.originalname,
      csvType: csvType,
      position: position,
      userEmail: userEmail,
      teamId: teamId,
      uploadDate: new Date().toISOString(),
      size: file.size,
      hash: crypto.createHash('md5').update(file.buffer).digest('hex')
    };
    
    // Guardar metadata
    const metadataPath = path.join(typePath, `${path.parse(fileName).name}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    console.log(`✅ CSV uploaded: ${fileName} (${csvType}/${position}) by ${userEmail}`);
    
    res.json({
      success: true,
      message: 'CSV subido exitosamente',
      data: {
        fileName: fileName,
        csvType: csvType,
        position: position,
        path: filePath,
        metadata: metadata
      }
    });
    
  } catch (error) {
    console.error('Error uploading CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir CSV: ' + error.message
    });
  }
});

// GET /api/csv/stats - Estadísticas de CSVs del equipo
router.get('/stats', (req, res) => {
  try {
    const { teamId } = req.query;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'TeamId requerido'
      });
    }
    
    const teamPath = getTeamCsvPath(teamId);
    
    if (!fs.existsSync(teamPath)) {
      return res.json({
        success: true,
        data: { 
          stats: { 
            totalFiles: 0, 
            totalTypes: 0, 
            totalDates: 0, 
            types: [], 
            dateRange: null 
          } 
        }
      });
    }
    
    let totalFiles = 0;
    const typesSet = new Set();
    const dates = fs.readdirSync(teamPath).filter(d => {
      return fs.statSync(path.join(teamPath, d)).isDirectory();
    });
    
    dates.forEach(date => {
      const datePath = path.join(teamPath, date);
      if (fs.existsSync(datePath)) {
        const types = fs.readdirSync(datePath).filter(t => {
          return fs.statSync(path.join(datePath, t)).isDirectory();
        });
        
        types.forEach(type => {
          typesSet.add(type);
          const typePath = path.join(datePath, type);
          const files = fs.readdirSync(typePath).filter(f => f.endsWith('.csv'));
          totalFiles += files.length;
        });
      }
    });
    
    const stats = {
      totalFiles: totalFiles,
      totalTypes: typesSet.size,
      totalDates: dates.length,
      types: Array.from(typesSet).sort(),
      dateRange: dates.length > 0 ? {
        from: dates[0],
        to: dates[dates.length - 1]
      } : null
    };
    
    res.json({
      success: true,
      data: { stats: stats }
    });
    
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas: ' + error.message
    });
  }
});

module.exports = router; 