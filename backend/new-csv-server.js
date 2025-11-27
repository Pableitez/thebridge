const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3004;

// Configurar multer para subida de archivos
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Función para obtener la ruta base de CSVs del equipo
function getTeamCsvPath(teamId) {
  const basePath = 'C:\\Users\\pable\\OneDrive\\TheBridge\\Versions';
  return path.join(basePath, 'teams', teamId, 'csvs');
}

// Ruta de prueba
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'New CSV server running' });
});

// GET /api/csv/stats - Estadísticas de CSVs del equipo
app.get('/api/csv/stats', (req, res) => {
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
      const fullPath = path.join(teamPath, d);
      return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    });
    
    dates.forEach(date => {
      const datePath = path.join(teamPath, date);
      if (fs.existsSync(datePath)) {
        const types = fs.readdirSync(datePath).filter(t => {
          const fullPath = path.join(datePath, t);
          return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
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

// GET /api/csv/last-upload - Obtener el último CSV subido
app.get('/api/csv/last-upload', (req, res) => {
  try {
    const { teamId, userEmail } = req.query;
    
    console.log('📊 Last upload request:', { teamId, userEmail });
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'TeamId requerido'
      });
    }
    
    const teamPath = getTeamCsvPath(teamId);
    
    if (!fs.existsSync(teamPath)) {
      console.log('✅ Returning null (no data found)');
      return res.json({
        success: true,
        data: null
      });
    }
    
    // Buscar el archivo CSV más reciente
    let latestFile = null;
    let latestTime = 0;
    
    const dates = fs.readdirSync(teamPath).filter(d => {
      const fullPath = path.join(teamPath, d);
      return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    });
    
    dates.forEach(date => {
      const datePath = path.join(teamPath, date);
      if (fs.existsSync(datePath)) {
        const types = fs.readdirSync(datePath).filter(t => {
          const fullPath = path.join(datePath, t);
          return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
        });
        
        types.forEach(type => {
          const typePath = path.join(datePath, type);
          const files = fs.readdirSync(typePath).filter(f => f.endsWith('.csv'));
          
          files.forEach(file => {
            const filePath = path.join(typePath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtime.getTime() > latestTime) {
              latestTime = stats.mtime.getTime();
              latestFile = {
                path: filePath,
                name: file,
                date: date,
                type: type,
                size: stats.size,
                modified: stats.mtime
              };
            }
          });
        });
      }
    });
    
    if (latestFile) {
      // Leer el contenido del archivo
      const content = fs.readFileSync(latestFile.path, 'utf8');
      
      console.log('✅ Returning latest file:', latestFile.name);
      
      res.json({
        success: true,
        data: {
          fileName: latestFile.name,
          content: content,
          date: latestFile.date,
          type: latestFile.type,
          size: latestFile.size,
          modified: latestFile.modified
        }
      });
    } else {
      console.log('✅ Returning null (no data found)');
      res.json({
        success: true,
        data: null
      });
    }
    
  } catch (error) {
    console.error('Error getting last upload:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener último upload: ' + error.message
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 New CSV server running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   GET  /api/csv/stats`);
  console.log(`   GET  /api/csv/last-upload`);
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
}); 