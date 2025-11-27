const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { config } = require('../config/paths');

// Función para obtener la ruta de configuraciones del dashboard del usuario
function getDashboardConfigPath(userEmail, teamId) {
  const userFolder = `${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}_${teamId}`;
  return path.join(config.paths.dataRoot, 'users', userFolder, 'dashboard');
}

// Función para asegurar que existe la carpeta del usuario
async function ensureDashboardDir(userEmail, teamId) {
  const dashboardPath = getDashboardConfigPath(userEmail, teamId);
  await fs.ensureDir(dashboardPath);
  return dashboardPath;
}

// POST /api/dashboard/save - Guardar configuración del dashboard
router.post('/save', async (req, res) => {
  try {
    const { filename, settings, teamId, userEmail } = req.body;
    
    if (!filename || !settings || !teamId || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'filename, settings, teamId y userEmail son requeridos'
      });
    }
    
    // Crear carpeta del usuario si no existe
    const dashboardPath = await ensureDashboardDir(userEmail, teamId);
    
    // Guardar configuración
    const configPath = path.join(dashboardPath, filename);
    await fs.writeFile(configPath, JSON.stringify(settings, null, 2));
    
    console.log(`✅ Dashboard config saved: ${filename} for ${userEmail}`);
    
    res.json({
      success: true,
      message: 'Dashboard configuration saved successfully',
      filename: filename,
      path: configPath,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error saving dashboard config:', error);
    res.status(500).json({
      success: false,
      error: 'Error saving dashboard configuration: ' + error.message
    });
  }
});

// POST /api/dashboard/open-folder - Abrir carpeta del dashboard del usuario
router.post('/open-folder', async (req, res) => {
  try {
    const { teamId, userEmail } = req.body;
    
    if (!teamId || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'teamId y userEmail son requeridos'
      });
    }
    
    // Crear carpeta del usuario si no existe
    const dashboardPath = await ensureDashboardDir(userEmail, teamId);
    
    // Listar archivos en la carpeta
    const files = await fs.readdir(dashboardPath);
    const configFiles = files.filter(file => file.endsWith('.json'));
    
    // Abrir carpeta en el explorador de archivos
    const platform = process.platform;
    let command;
    
    if (platform === 'win32') {
      // Simple explorer command to open the folder
      command = `explorer "${dashboardPath.replace(/\//g, '\\')}"`;
    } else if (platform === 'darwin') {
      command = `open "${dashboardPath}"`;
    } else {
      command = `xdg-open "${dashboardPath}"`;
    }
    
    console.log('🗂️ Executing command:', command);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error opening folder:', error);
        // Try alternative command for Windows
        if (platform === 'win32') {
          const altCommand = `start "" "${dashboardPath}"`;
          console.log('🔄 Trying alternative command:', altCommand);
          exec(altCommand, (altError, altStdout, altStderr) => {
            if (altError) {
              console.error('Alternative command also failed:', altError);
            } else {
              console.log(`✅ Folder opened with alternative command: ${dashboardPath}`);
            }
          });
        }
      } else {
        console.log(`✅ Folder opened: ${dashboardPath}`);
      }
    });
    
    res.json({
      success: true,
      message: 'Dashboard folder opened successfully',
      path: dashboardPath,
      files: configFiles,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error opening dashboard folder:', error);
    res.status(500).json({
      success: false,
      error: 'Error opening dashboard folder: ' + error.message
    });
  }
});

// GET /api/dashboard/list - Listar configuraciones del dashboard del usuario
router.get('/list', async (req, res) => {
  try {
    const { teamId, userEmail } = req.query;
    
    if (!teamId || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'teamId y userEmail son requeridos'
      });
    }
    
    const dashboardPath = await ensureDashboardDir(userEmail, teamId);
    
    // Listar archivos de configuración
    const files = await fs.readdir(dashboardPath);
    const configFiles = files.filter(file => file.endsWith('.json'));
    
    // Obtener información de cada archivo
    const fileInfo = [];
    for (const file of configFiles) {
      const filePath = path.join(dashboardPath, file);
      const stats = await fs.stat(filePath);
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const config = JSON.parse(content);
        
        fileInfo.push({
          filename: file,
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime,
          userEmail: config.userEmail || userEmail,
          timestamp: config.timestamp || config.lastSaved
        });
      } catch (parseError) {
        console.error(`Error parsing ${file}:`, parseError);
      }
    }
    
    res.json({
      success: true,
      path: dashboardPath,
      files: fileInfo,
      count: fileInfo.length
    });
    
  } catch (error) {
    console.error('Error listing dashboard configs:', error);
    res.status(500).json({
      success: false,
      error: 'Error listing dashboard configurations: ' + error.message
    });
  }
});

// GET /api/dashboard/load/:filename - Cargar configuración específica
router.get('/load/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { teamId, userEmail } = req.query;
    
    if (!teamId || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'teamId y userEmail son requeridos'
      });
    }
    
    const dashboardPath = await ensureDashboardDir(userEmail, teamId);
    const configPath = path.join(dashboardPath, filename);
    
    if (!await fs.pathExists(configPath)) {
      return res.status(404).json({
        success: false,
        error: 'Configuration file not found'
      });
    }
    
    const content = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(content);
    
    res.json({
      success: true,
      filename: filename,
      config: config,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error loading dashboard config:', error);
    res.status(500).json({
      success: false,
      error: 'Error loading dashboard configuration: ' + error.message
    });
  }
});

// POST /api/dashboard/load - Cargar la configuración más reciente del usuario
router.post('/load', async (req, res) => {
  try {
    const { userEmail } = req.body;
    
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'userEmail es requerido'
      });
    }
    
    // Buscar en todas las carpetas de equipos del usuario
    const usersDir = path.join(config.paths.dataRoot, 'users');
    
    if (!await fs.pathExists(usersDir)) {
      return res.status(404).json({
        success: false,
        error: 'No user configurations found'
      });
    }
    
    const userFolders = await fs.readdir(usersDir);
    const userConfigFolders = userFolders.filter(folder => 
      folder.startsWith(userEmail.replace(/[^a-zA-Z0-9]/g, '_'))
    );
    
    let latestConfig = null;
    let latestTimestamp = null;
    let latestFilename = null;
    
    // Buscar la configuración más reciente en todas las carpetas del usuario
    for (const folder of userConfigFolders) {
      const dashboardPath = path.join(usersDir, folder, 'dashboard');
      
      if (await fs.pathExists(dashboardPath)) {
        const files = await fs.readdir(dashboardPath);
        const configFiles = files.filter(file => file.endsWith('.json'));
        
        for (const file of configFiles) {
          try {
            const filePath = path.join(dashboardPath, file);
            const content = await fs.readFile(filePath, 'utf8');
            const config = JSON.parse(content);
            
            const configTimestamp = config.timestamp || config.lastSaved || new Date(0);
            
            if (!latestTimestamp || new Date(configTimestamp) > new Date(latestTimestamp)) {
              latestConfig = config;
              latestTimestamp = configTimestamp;
              latestFilename = file;
            }
          } catch (parseError) {
            console.warn(`Error parsing config file ${file}:`, parseError);
          }
        }
      }
    }
    
    if (latestConfig) {
      console.log(`✅ Latest configuration loaded for ${userEmail}: ${latestFilename}`);
      
      res.json({
        success: true,
        settings: latestConfig,
        filename: latestFilename,
        timestamp: latestTimestamp,
        message: 'Configuration loaded successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'No configuration found for this user'
      });
    }
    
  } catch (error) {
    console.error('Error loading latest user configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Error loading user configuration: ' + error.message
    });
  }
});

module.exports = router; 