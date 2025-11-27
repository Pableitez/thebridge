const path = require('path');
const os = require('os');

// Configuración de rutas para el backend
const config = {
  // Puerto del servidor
  port: process.env.PORT || 3000,
  
  // Rutas de archivos - Configuración para Render
  paths: {
    // Carpeta principal de datos - Usar /tmp en Render o variable de entorno
    dataRoot: process.env.DATA_ROOT || (process.env.NODE_ENV === 'production' 
      ? '/tmp/WebMainData' 
      : path.join(os.homedir(), 'Documents', 'WebMainData')),
    
    // Subcarpetas específicas
    versions: 'versions',
    backups: 'backups',
    exports: 'exports',
    temp: 'temp'
  },
  
  // Configuración de carpetas compartidas en la nube
  cloudSync: {
    // Tipos de carpetas soportadas
    supportedProviders: ['onedrive', 'googledrive', 'dropbox', 'local'],
    
    // Configuración por defecto (cambiar según tu setup)
    defaultProvider: 'local',
    
    // Rutas específicas por proveedor
    providerPaths: {
      onedrive: process.env.ONEDRIVE_PATH || path.join(os.homedir(), 'OneDrive', 'TheBridge', 'Versions'),
      googledrive: process.env.GOOGLEDRIVE_PATH || path.join(os.homedir(), 'Google Drive', 'TheBridge', 'Versions'),
      dropbox: process.env.DROPBOX_PATH || path.join(os.homedir(), 'Dropbox', 'TheBridge', 'Versions'),
      local: process.env.DATA_ROOT || path.join(os.homedir(), 'Documents', 'WebMainData')
    }
  },
  
  // Configuración de archivos
  files: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedExtensions: ['.csv', '.json', '.xlsx', '.xls'],
    versionFilePrefix: 'version_',
    backupFilePrefix: 'backup_'
  },
  
  // Configuración de seguridad
  security: {
    enableCors: true,
    corsOrigin: [
      'http://localhost:3000', 
      'http://127.0.0.1:3000', 
      'http://127.0.0.1:5500', 
      'http://127.0.0.1:5501', 
      'http://localhost:5500', 
      'http://localhost:5501', 
      'file://',
      'https://pableitez.github.io',
      'https://pableitez.github.io/the-bridge',
      'https://pableitez.github.io/the-bridge/',
      'https://the-bridge-9g01.onrender.com',
      'https://the-bridge-production-498b.up.railway.app'
    ],
    maxRequestsPerMinute: 100
  }
};

// Función para obtener la ruta completa de una carpeta
function getFullPath(folderName) {
  return path.join(config.paths.dataRoot, folderName);
}

// Función para obtener la ruta de la carpeta compartida actual
function getCloudPath(provider = null) {
  const selectedProvider = provider || config.cloudSync.defaultProvider;
  return config.cloudSync.providerPaths[selectedProvider] || config.paths.dataRoot;
}

// Función para inicializar las carpetas necesarias
function initializeFolders() {
  const fs = require('fs-extra');
  const folders = [
    config.paths.dataRoot,
    getFullPath(config.paths.versions),
    getFullPath(config.paths.backups),
    getFullPath(config.paths.exports),
    getFullPath(config.paths.temp)
  ];
  
  folders.forEach(folder => {
    fs.ensureDirSync(folder);
    console.log(`✅ Carpeta inicializada: ${folder}`);
  });
}

module.exports = {
  config,
  getFullPath,
  getCloudPath,
  initializeFolders
}; 