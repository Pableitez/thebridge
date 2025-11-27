const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const router = express.Router();

// Función para generar hash de contraseña
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Función para verificar contraseña
function verifyPassword(password, hashedPassword) {
  return hashPassword(password) === hashedPassword;
}

// Función para obtener la ruta según la ubicación seleccionada
function getPathForLocation(location, customPath = null) {
  const homeDir = os.homedir();
  
  switch (location) {
    case 'onedrive':
      return path.join(homeDir, 'OneDrive', 'TheBridge', 'Versions');
    case 'documents':
      return path.join(homeDir, 'Documents', 'TheBridge', 'Versions');
    case 'custom':
      return customPath || path.join(homeDir, 'Documents', 'TheBridge', 'Versions');
    default:
      return path.join(homeDir, 'Documents', 'TheBridge', 'Versions');
  }
}

// GET /api/config/info - Obtener información de configuración actual
router.get('/info', (req, res) => {
  try {
    const configPath = path.join(__dirname, '..', 'config', 'paths.js');
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Extraer la ruta actual de datos
    const dataRootMatch = configContent.match(/dataRoot: [^,]+/);
    const dataRoot = dataRootMatch ? dataRootMatch[0].split(':')[1].trim().replace(/['"]/g, '') : '';
    
    res.json({
      success: true,
      config: {
        dataRoot,
        port: 3001,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error reading configuration'
    });
  }
});

// POST /api/config/save - Guardar nueva configuración
router.post('/save', async (req, res) => {
  try {
    const { location, customPath, password } = req.body;
    
    // Validar entrada
    if (!location || !password) {
      return res.status(400).json({
        success: false,
        error: 'Location and password are required'
      });
    }
    
    // Obtener la nueva ruta
    const newDataRoot = getPathForLocation(location, customPath);
    
    // Crear la carpeta si no existe
    await fs.ensureDir(newDataRoot);
    
    // Leer el archivo de configuración actual
    const configPath = path.join(__dirname, '..', 'config', 'paths.js');
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Actualizar la ruta de datos
    configContent = configContent.replace(
      /dataRoot: [^,]+/,
      `dataRoot: '${newDataRoot.replace(/\\/g, '\\\\')}'`
    );
    
    // Actualizar el proveedor por defecto
    configContent = configContent.replace(
      /defaultProvider: ['"]\w+['"]/,
      `defaultProvider: '${location}'`
    );
    
    // Actualizar la ruta del proveedor seleccionado
    const providerPathRegex = new RegExp(`${location}: [^,]+`, 'g');
    configContent = configContent.replace(
      providerPathRegex,
      `${location}: '${newDataRoot.replace(/\\/g, '\\\\')}'`
    );
    
    // Guardar el archivo de configuración
    fs.writeFileSync(configPath, configContent);
    
    // Guardar información de configuración con hash de contraseña
    const configInfo = {
      configuredAt: new Date().toISOString(),
      location,
      dataRoot: newDataRoot,
      passwordHash: hashPassword(password)
    };
    
    const infoPath = path.join(__dirname, '..', 'config', 'user-config.json');
    fs.writeFileSync(infoPath, JSON.stringify(configInfo, null, 2));
    
    console.log(`✅ Configuración actualizada: ${newDataRoot}`);
    
    res.json({
      success: true,
      message: 'Configuration saved successfully',
      dataRoot: newDataRoot
    });
    
  } catch (error) {
    console.error('❌ Error saving configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Error saving configuration: ' + error.message
    });
  }
});

// POST /api/config/test - Probar configuración
router.post('/test', async (req, res) => {
  try {
    const { location, customPath } = req.body;
    
    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Location is required'
      });
    }
    
    const testPath = getPathForLocation(location, customPath);
    
    // Verificar si la carpeta es accesible
    try {
      await fs.ensureDir(testPath);
      const testFile = path.join(testPath, '.test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      res.json({
        success: true,
        message: 'Configuration test successful',
        path: testPath
      });
    } catch (error) {
      res.json({
        success: false,
        error: 'Cannot write to selected folder: ' + error.message
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test error: ' + error.message
    });
  }
});

// GET /api/config/status - Obtener estado de la configuración
router.get('/status', (req, res) => {
  try {
    const infoPath = path.join(__dirname, '..', 'config', 'user-config.json');
    
    if (fs.existsSync(infoPath)) {
      const configInfo = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
      res.json({
        success: true,
        configured: true,
        location: configInfo.location,
        dataRoot: configInfo.dataRoot,
        configuredAt: configInfo.configuredAt
      });
    } else {
      res.json({
        success: true,
        configured: false
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error reading configuration status'
    });
  }
});

module.exports = router; 