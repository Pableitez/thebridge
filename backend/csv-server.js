const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3005;

// Configuración de CORS más permisiva para desarrollo
app.use(cors({
  origin: true, // Permitir todos los orígenes en desarrollo
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware adicional para CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'CSV Server running on port 3005',
    timestamp: new Date().toISOString()
  });
});

// GET /api/csv/last-upload - Obtener información del último CSV subido
app.get('/api/csv/last-upload', async (req, res) => {
  try {
    const { teamId, userEmail } = req.query;
    
    console.log('📊 Last upload request:', { teamId, userEmail });
    
    if (!teamId || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'TeamId and userEmail are required'
      });
    }
    
    // Ruta base para los datos del equipo
    const basePath = 'C:\\Users\\pable\\OneDrive\\TheBridge\\Versions';
    const teamPath = path.join(basePath, 'teams', teamId);
    
    // Verificar si existe la carpeta del equipo
    if (!fs.existsSync(teamPath)) {
      console.log('📁 Team folder not found:', teamPath);
      return res.json({
        success: true,
        data: { lastUpload: null }
      });
    }
    
    // Buscar archivo de configuración del equipo
    const configPath = path.join(teamPath, 'team-config.json');
    
    if (!fs.existsSync(configPath)) {
      console.log('📄 Team config not found:', configPath);
      return res.json({
        success: true,
        data: { lastUpload: null }
      });
    }
    
    // Leer configuración del equipo
    const teamConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Buscar información del último CSV subido
    let lastUpload = null;
    
    if (teamConfig.lastUploads && teamConfig.lastUploads[userEmail]) {
      lastUpload = teamConfig.lastUploads[userEmail];
      console.log('✅ Found last upload for user:', lastUpload);
    } else {
      // Buscar en la carpeta de versiones del equipo
      const versionsPath = path.join(teamPath, 'versions');
      
      if (fs.existsSync(versionsPath)) {
        const versionFiles = fs.readdirSync(versionsPath)
          .filter(file => file.endsWith('.json'))
          .sort()
          .reverse(); // Más reciente primero
        
        if (versionFiles.length > 0) {
          const latestVersionFile = versionFiles[0];
          const versionPath = path.join(versionsPath, latestVersionFile);
          
          try {
            const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
            
            if (versionData.uploadedBy === userEmail) {
              lastUpload = {
                fileName: versionData.fileName || 'Unknown file',
                uploadDate: versionData.uploadDate || new Date().toISOString(),
                csvType: versionData.csvType || 'Unknown',
                size: versionData.size || 0
              };
              console.log('✅ Found last upload from versions:', lastUpload);
            }
          } catch (error) {
            console.error('❌ Error reading version file:', error);
          }
        }
      }
    }
    
    res.json({
      success: true,
      data: { lastUpload: lastUpload }
    });
    
  } catch (error) {
    console.error('❌ Error in last-upload endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
});

// POST /api/csv/upload - Subir nuevo CSV
app.post('/api/csv/upload', async (req, res) => {
  try {
    const { teamId, userEmail, fileName, csvType, fileContent } = req.body;
    
    console.log('📤 Upload request:', { teamId, userEmail, fileName, csvType });
    
    if (!teamId || !userEmail || !fileName || !csvType || !fileContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: teamId, userEmail, fileName, csvType, fileContent'
      });
    }
    
    // Ruta base para los datos del equipo
    const basePath = 'C:\\Users\\pable\\OneDrive\\TheBridge\\Versions';
    const teamPath = path.join(basePath, 'teams', teamId);
    
    // Crear carpetas si no existen
    const fsExtra = require('fs-extra');
    await fsExtra.ensureDir(teamPath);
    
    // Crear carpeta de versiones
    const versionsPath = path.join(teamPath, 'versions');
    await fsExtra.ensureDir(versionsPath);
    
    // Generar nombre de archivo único
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const versionFileName = `version_${timestamp}.json`;
    const versionPath = path.join(versionsPath, versionFileName);
    
    // Crear objeto de versión
    const versionData = {
      id: versionFileName.replace('.json', ''),
      fileName: fileName,
      csvType: csvType,
      uploadedBy: userEmail,
      uploadDate: new Date().toISOString(),
      size: Buffer.byteLength(fileContent, 'utf8'),
      content: fileContent,
      teamId: teamId
    };
    
    // Guardar versión
    fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));
    
    // Actualizar configuración del equipo
    const configPath = path.join(teamPath, 'team-config.json');
    let teamConfig = {};
    
    if (fs.existsSync(configPath)) {
      teamConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    // Actualizar último upload del usuario
    if (!teamConfig.lastUploads) {
      teamConfig.lastUploads = {};
    }
    
    teamConfig.lastUploads[userEmail] = {
      fileName: fileName,
      uploadDate: new Date().toISOString(),
      csvType: csvType,
      size: versionData.size
    };
    
    // Guardar configuración actualizada
    fs.writeFileSync(configPath, JSON.stringify(teamConfig, null, 2));
    
    console.log('✅ CSV uploaded successfully:', versionPath);
    
    res.json({
      success: true,
      data: {
        versionId: versionData.id,
        message: 'CSV uploaded successfully',
        filePath: versionPath
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
  console.log(`🚀 CSV Server running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   GET  /api/csv/last-upload`);
  console.log(`   POST /api/csv/upload`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
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