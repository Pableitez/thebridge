const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3005;

// Middleware para CORS - DEBE ir ANTES de cualquier otra cosa
app.use((req, res, next) => {
  // Permitir todos los orígenes
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

app.use(express.json());

// Ruta de salud
app.get('/health', (req, res) => {
  console.log('🏥 Health check request');
  res.json({ 
    success: true, 
    message: 'CSV Server running on port 3005',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// Función para obtener la ruta base de CSVs del equipo
function getTeamCsvPath(teamId) {
  const basePath = 'C:\\Users\\pable\\OneDrive\\TheBridge\\Versions';
  return path.join(basePath, 'teams', teamId, 'csvs');
}

// GET /api/csv/last-upload
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
        data: { lastUpload: null }
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
          lastUpload: {
            fileName: latestFile.name,
            content: content,
            date: latestFile.date,
            type: latestFile.type,
            size: latestFile.size,
            modified: latestFile.modified
          }
        }
      });
    } else {
      console.log('✅ Returning null (no data found)');
      res.json({
        success: true,
        data: { lastUpload: null }
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

// POST /api/csv/upload
app.post('/api/csv/upload', (req, res) => {
  try {
    const { teamId, userEmail, fileName, csvType, fileContent } = req.body;
    
    console.log('📤 Upload request:', { teamId, userEmail, fileName, csvType });
    
    if (!teamId || !userEmail || !fileName || !csvType || !fileContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Por ahora, solo confirmar que recibió los datos
    console.log('✅ Upload request received successfully');
    res.json({
      success: true,
      data: {
        message: 'CSV upload request received',
        fileName: fileName,
        csvType: csvType
      }
    });
    
  } catch (error) {
    console.error('❌ Error uploading CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Simple CSV Server running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   GET  /api/csv/last-upload`);
  console.log(`   POST /api/csv/upload`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔧 CORS: Enabled for all origins`);
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: err.message 
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found',
    availableEndpoints: [
      'GET /health',
      'GET /api/csv/last-upload',
      'POST /api/csv/upload'
    ]
  });
}); 