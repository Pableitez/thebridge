const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { config } = require('../config/paths');
const { exec } = require('child_process');

const router = express.Router();

// Función para sanitizar nombres de carpeta
function sanitizeFolderName(name) {
  // Remover caracteres no válidos para nombres de carpeta
  return name
    .replace(/[<>:"/\\|?*]/g, '') // Caracteres no válidos en Windows
    .replace(/\s+/g, '_') // Espacios por guiones bajos
    .replace(/[.]{2,}/g, '.') // Múltiples puntos por uno solo
    .replace(/^[._]/, '') // No empezar con punto o guion bajo
    .replace(/[._]$/, '') // No terminar con punto o guion bajo
    .trim()
    .substring(0, 50); // Limitar longitud
}

// Función para generar nombre de carpeta único
async function generateUniqueFolderName(baseDataPath, teamName) {
  const sanitizedName = sanitizeFolderName(teamName);
  let folderName = sanitizedName;
  let counter = 1;
  
  // Verificar si ya existe una carpeta con ese nombre
  while (await fs.pathExists(path.join(baseDataPath, folderName))) {
    folderName = `${sanitizedName}_${counter}`;
    counter++;
  }
  
  return folderName;
}

// Función para obtener la configuración de un equipo
async function getTeamConfig(teamId) {
  console.log(`🔍 Searching for team config: ${teamId}`);
  
  try {
    // Lista de todas las rutas posibles donde buscar
    const searchPaths = [
      // Estructura actual por defecto
      path.join(config.paths.dataRoot, 'teams', teamId, 'team-config.json'),
      
      // Estructuras con TheBridge
      path.join(config.paths.dataRoot, 'TheBridge', 'teams', teamId, 'team-config.json'),
      path.join(config.paths.dataRoot, 'TheBridge', teamId, 'team-config.json'),
      
      // OneDrive
      path.join(require('os').homedir(), 'OneDrive', 'TheBridge', 'teams', teamId, 'team-config.json'),
      path.join(require('os').homedir(), 'OneDrive', 'TheBridge', teamId, 'team-config.json'),
      path.join(require('os').homedir(), 'OneDrive', teamId, 'team-config.json'),
      
      // Documents
      path.join(require('os').homedir(), 'Documents', 'TheBridge', 'teams', teamId, 'team-config.json'),
      path.join(require('os').homedir(), 'Documents', 'TheBridge', teamId, 'team-config.json'),
      path.join(require('os').homedir(), 'Documents', teamId, 'team-config.json'),
      
      // Google Drive
      path.join(require('os').homedir(), 'Google Drive', 'TheBridge', 'teams', teamId, 'team-config.json'),
      path.join(require('os').homedir(), 'Google Drive', 'TheBridge', teamId, 'team-config.json'),
      
      // Dropbox
      path.join(require('os').homedir(), 'Dropbox', 'TheBridge', 'teams', teamId, 'team-config.json'),
      path.join(require('os').homedir(), 'Dropbox', 'TheBridge', teamId, 'team-config.json')
    ];
    
    // Buscar en cada ruta posible
    for (const configPath of searchPaths) {
      console.log(`🔎 Checking: ${configPath}`);
      
      if (await fs.pathExists(configPath)) {
        try {
          const config = await fs.readJson(configPath);
          if (config.id === teamId) {
            console.log(`✅ Found team config: ${configPath}`);
            return config;
          }
        } catch (e) {
          console.warn(`⚠️ Error reading config at ${configPath}:`, e.message);
        }
      }
    }
    
    // Si no se encuentra por rutas directas, buscar recursivamente
    console.log(`🔄 Recursive search for team ${teamId}`);
    
    const basePaths = [
      config.paths.dataRoot,
      path.join(require('os').homedir(), 'OneDrive'),
      path.join(require('os').homedir(), 'Documents'),
      path.join(require('os').homedir(), 'Google Drive'),
      path.join(require('os').homedir(), 'Dropbox')
    ];
    
    for (const basePath of basePaths) {
      if (await fs.pathExists(basePath)) {
        try {
          const foundConfig = await searchConfigRecursively(basePath, teamId, 2); // Max 2 levels deep
          if (foundConfig) {
            return foundConfig;
          }
        } catch (e) {
          console.warn(`⚠️ Error in recursive search at ${basePath}:`, e.message);
        }
      }
    }
    
    throw new Error(`Team configuration not found for team ${teamId}`);
  } catch (error) {
    console.error('❌ Error getting team config:', error);
    throw error;
  }
}

// Función helper para búsqueda recursiva
async function searchConfigRecursively(basePath, teamId, maxDepth) {
  if (maxDepth <= 0) return null;
  
  try {
    const items = await fs.readdir(basePath);
    
    for (const item of items) {
      const itemPath = path.join(basePath, item);
      const stat = await fs.stat(itemPath);
      
      if (stat.isDirectory()) {
        // Buscar config en esta carpeta
        const configPath = path.join(itemPath, 'team-config.json');
        
        if (await fs.pathExists(configPath)) {
          try {
            const config = await fs.readJson(configPath);
            if (config.id === teamId) {
              console.log(`✅ Found team config recursively: ${configPath}`);
              return config;
            }
          } catch (e) {
            // Continuar buscando
          }
        }
        
        // Buscar recursivamente si no es muy profundo
        if (maxDepth > 1) {
          const found = await searchConfigRecursively(itemPath, teamId, maxDepth - 1);
          if (found) return found;
        }
      }
    }
  } catch (e) {
    // Ignorar errores de permisos y continuar
  }
  
  return null;
}

// Función para obtener la ruta de versiones del equipo
async function getTeamVersionsPath(teamId) {
  try {
    const teamConfig = await getTeamConfig(teamId);
    
    // Priorizar la nueva estructura (folderPath)
    if (teamConfig.folderPath) {
      return path.join(teamConfig.folderPath, 'versions');
    }
    
    // Fallback a la estructura anterior (storagePath)
    if (teamConfig.storagePath) {
      return path.join(teamConfig.storagePath, 'versions');
    }
    
    // Fallback final
    return path.join(config.paths.dataRoot, 'teams', teamId, 'versions');
  } catch (error) {
    console.error('Error getting team versions path:', error);
    // Fallback a la ruta por defecto
    return path.join(config.paths.dataRoot, 'teams', teamId, 'versions');
  }
}

// Función para obtener la ruta base del equipo
async function getTeamBasePath(teamId) {
  try {
    const teamConfig = await getTeamConfig(teamId);
    
    // Priorizar la nueva estructura (folderPath)
    if (teamConfig.folderPath) {
      return teamConfig.folderPath;
    }
    
    // Fallback a la estructura anterior (storagePath)
    if (teamConfig.storagePath) {
      return teamConfig.storagePath;
    }
    
    // Fallback final
    return path.join(config.paths.dataRoot, 'teams', teamId);
  } catch (error) {
    console.error('Error getting team base path:', error);
    // Fallback a la ruta por defecto
    return path.join(config.paths.dataRoot, 'teams', teamId);
  }
}

// POST /api/teams/select-folder - Abrir selector de carpetas
router.post('/select-folder', async (req, res) => {
  try {
    const { defaultPath } = req.body;
    
    // Detectar plataforma
    const platform = process.platform;
    let command;
    
    if (platform === 'win32') {
      // En Windows, usar PowerShell con FolderBrowserDialog
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        $browser = New-Object System.Windows.Forms.FolderBrowserDialog
        $browser.Description = "Selecciona la carpeta donde guardar los datos del equipo"
        $browser.RootFolder = "Desktop"
        if ($browser.ShowDialog() -eq "OK") {
          $browser.SelectedPath
        }
      `;
      
      command = `powershell -Command "${psScript.replace(/\n/g, '; ')}"`;
    } else if (platform === 'darwin') {
      // En macOS, usar osascript
      command = `osascript -e 'tell application "Finder" to set folderPath to (choose folder with prompt "Selecciona la carpeta para guardar los datos del equipo") as string' -e 'set posixPath to POSIX path of folderPath' -e 'return posixPath'`;
    } else {
      // En Linux, usar zenity si está disponible
      command = `zenity --file-selection --directory --title="Selecciona la carpeta para guardar los datos del equipo"`;
    }
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error opening folder selector:', error);
        return res.status(500).json({
          success: false,
          error: 'No se pudo abrir el selector de carpetas. Usando ruta por defecto.',
          defaultPath: config.paths.dataRoot
        });
      }
      
      const selectedPath = stdout.trim();
      if (selectedPath) {
        console.log(`✅ Carpeta seleccionada: ${selectedPath}`);
        res.json({
          success: true,
          selectedPath: selectedPath,
          message: 'Carpeta seleccionada correctamente'
        });
      } else {
        res.json({
          success: false,
          error: 'No se seleccionó ninguna carpeta',
          defaultPath: config.paths.dataRoot
        });
      }
    });
    
  } catch (error) {
    console.error('Error in folder selector:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      defaultPath: config.paths.dataRoot
    });
  }
});

// GET /api/teams - List all teams
router.get('/', async (req, res) => {
  try {
    const teamsPath = path.join(config.paths.dataRoot, 'teams');
    await fs.ensureDir(teamsPath);
    
    const teams = [];
    const teamFolders = await fs.readdir(teamsPath);
    
    for (const folder of teamFolders) {
      const teamConfigPath = path.join(teamsPath, folder, 'team-config.json');
      if (await fs.pathExists(teamConfigPath)) {
        const teamConfig = await fs.readJson(teamConfigPath);
        teams.push({
          id: folder,
          name: teamConfig.name,
          code: teamConfig.code,
          description: teamConfig.description,
          createdAt: teamConfig.createdAt,
          memberCount: teamConfig.members ? teamConfig.members.length : 0
        });
      }
    }
    
    res.json({
      success: true,
      teams: teams
    });
  } catch (error) {
    console.error('Error listing teams:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list teams'
    });
  }
});

// POST /api/teams/create - Create a new team
router.post('/create', async (req, res) => {
  try {
    const { teamName, teamCode, location, customPath, storagePath } = req.body;
    
    if (!teamName) {
      return res.status(400).json({
        success: false,
        error: 'Team name is required'
      });
    }
    
    // Generate team ID
    const teamId = uuidv4();
    
    // Determinar la ruta base donde crear el equipo
    let baseDataPath;
    
    if (storagePath) {
      // Si el usuario seleccionó una carpeta específica
      baseDataPath = storagePath;
    } else if (customPath) {
      // Si se proporcionó una ruta personalizada
      baseDataPath = customPath;
    } else {
      // Usar la ruta por defecto
      baseDataPath = config.paths.dataRoot;
    }
    
    // Crear la estructura de carpetas del equipo usando el nombre del equipo
    const theBridgePath = path.join(baseDataPath, 'TheBridge');
    const teamFolderName = await generateUniqueFolderName(theBridgePath, teamName);
    const teamPath = path.join(theBridgePath, teamFolderName);
    
    // Create team directories
    const teamDirs = [
      teamPath,
      path.join(teamPath, 'versions'),
      path.join(teamPath, 'backups'),
      path.join(teamPath, 'exports'),
      path.join(teamPath, 'temp'),
      path.join(teamPath, 'csvs')
    ];
    
    console.log(`🔨 Creando equipo "${teamName}" en: ${teamPath}`);
    
    for (const dir of teamDirs) {
      await fs.ensureDir(dir);
      console.log(`✅ Carpeta creada: ${dir}`);
    }
    
    // Create team configuration
    const teamConfig = {
      id: teamId,
      name: teamName,
      code: teamCode || null,
      description: req.body.description || '',
      adminEmail: req.body.adminEmail || '',
      storageLocation: location || 'custom',
      storagePath: teamPath, // Para compatibilidad con código existente
      folderPath: teamPath,  // Nueva propiedad más clara
      folderName: teamFolderName,
      baseDataPath: baseDataPath,
      createdAt: new Date().toISOString(),
      members: req.body.members || []
    };
    
    // Save team configuration
    const configPath = path.join(teamPath, 'team-config.json');
    await fs.writeJson(configPath, teamConfig, { spaces: 2 });
    
    console.log(`✅ Team created: ${teamName} (${teamId})`);
    console.log(`📁 Team folder: ${teamPath}`);
    
    res.json({
      success: true,
      teamId: teamId,
      teamPath: teamPath,
      teamConfig: teamConfig,
      message: `Team "${teamName}" created successfully`
    });
    
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create team: ' + error.message
    });
  }
});

// GET /api/teams/:teamId - Get team details
router.get('/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const teamPath = path.join(config.paths.dataRoot, 'teams', teamId);
    const configPath = path.join(teamPath, 'team-config.json');
    
    if (!await fs.pathExists(configPath)) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }
    
    const teamConfig = await fs.readJson(configPath);
    
    // Get team statistics
    const versionsPath = path.join(teamPath, 'versions');
    const versions = await fs.pathExists(versionsPath) ? await fs.readdir(versionsPath) : [];
    
    const stats = {
      totalVersions: versions.length,
      totalMembers: teamConfig.members ? teamConfig.members.length : 0,
      createdDate: teamConfig.createdAt,
      storagePath: teamConfig.storagePath
    };
    
    res.json({
      success: true,
      team: {
        ...teamConfig,
        stats
      }
    });
    
  } catch (error) {
    console.error('Error getting team details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get team details'
    });
  }
});

// POST /api/teams/:teamId/join - Join a team
router.post('/:teamId/join', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email, name, role = 'member' } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email and name are required'
      });
    }
    
    // Use the getTeamConfig function to find the team in any location
    const teamConfig = await getTeamConfig(teamId);
    
    if (!teamConfig) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }
    
    // Check if user is already a member
    const existingMember = teamConfig.members?.find(m => m.email.toLowerCase() === email.toLowerCase());
    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: 'User is already a member of this team'
      });
    }
    
    // Add new member
    if (!teamConfig.members) {
      teamConfig.members = [];
    }
    
    teamConfig.members.push({
      email: email,
      name: name,
      role: role,
      joinedAt: new Date().toISOString()
    });
    
    // Save updated configuration to the correct location
    const configPath = teamConfig.folderPath ? 
      path.join(teamConfig.folderPath, 'team-config.json') :
      path.join(teamConfig.storagePath, 'team-config.json');
    
    await fs.writeJson(configPath, teamConfig, { spaces: 2 });
    
    console.log(`✅ User joined team: ${email} -> ${teamConfig.name}`);
    
    res.json({
      success: true,
      message: `Successfully joined team "${teamConfig.name}"`
    });
    
  } catch (error) {
    console.error('Error joining team:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join team'
    });
  }
});

// GET /api/teams/:teamId/versions - Get team versions
router.get('/:teamId/versions', async (req, res) => {
  try {
    const { teamId } = req.params;
    const versionsPath = await getTeamVersionsPath(teamId);
    
    console.log(`🔍 Looking for versions in: ${versionsPath}`);
    
    if (!await fs.pathExists(versionsPath)) {
      console.log(`📂 Versions folder does not exist: ${versionsPath}`);
      return res.json({
        success: true,
        versions: []
      });
    }
    
    const versionFiles = await fs.readdir(versionsPath);
    console.log(`📄 Found ${versionFiles.length} files in versions folder`);
    
    const versions = [];
    
    for (const file of versionFiles) {
      if (file.endsWith('.json')) {
        try {
          const versionPath = path.join(versionsPath, file);
          const versionData = await fs.readJson(versionPath);
          const stats = await fs.stat(versionPath);
          
          // Generar nombre de display inteligente
          let displayName = versionData.metadata?.displayName || 
                           versionData.metadata?.name || 
                           versionData.metadata?.fileName || 
                           file.replace('.json', '');
          
          // Si el archivo tiene el formato de timestamp, limpiar el nombre
          if (displayName.includes('_2025-') || displayName.includes('_2024-')) {
            displayName = displayName.split('_')[0]; // Tomar solo la parte antes del timestamp
          }
          
          versions.push({
            id: versionData.id || file.replace('.json', ''),
            name: displayName,
            originalFileName: file,
            description: versionData.metadata?.description || '',
            createdAt: versionData.metadata?.createdAt || stats.birthtime.toISOString(),
            size: stats.size,
            recordCount: versionData.data?.length || 0,
            csvFileName: versionData.metadata?.fileName || null,
            teamId: teamId
          });
          
          console.log(`✅ Processed version: ${displayName} (${versionData.data?.length || 0} records)`);
        } catch (error) {
          console.error(`❌ Error reading version file ${file}:`, error);
        }
      }
    }
    
    // Sort by creation date (newest first)
    versions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    console.log(`📊 Returning ${versions.length} versions for team ${teamId}`);
    
    res.json({
      success: true,
      versions: versions
    });
    
  } catch (error) {
    console.error('Error getting team versions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get team versions'
    });
  }
});

// POST /api/teams/:teamId/versions - Save version for team
router.post('/:teamId/versions', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { data, metadata } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Data array is required'
      });
    }
    
    const versionsPath = await getTeamVersionsPath(teamId);
    await fs.ensureDir(versionsPath);
    
    const versionId = uuidv4();
    
    // Generar nombre de archivo basado en el CSV si está disponible
    let fileName = `${versionId}.json`;
    if (metadata && metadata.fileName) {
      // Usar el nombre del CSV, remover extensión y agregar timestamp
      const csvName = metadata.fileName.replace(/\.csv$/i, '');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      fileName = `${csvName}_${timestamp}.json`;
    } else if (metadata && metadata.displayName) {
      // Usar el display name
      const displayName = metadata.displayName.replace(/[<>:"/\\|?*]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      fileName = `${displayName}_${timestamp}.json`;
    }
    
    const versionData = {
      id: versionId,
      data: data,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
        teamId: teamId,
        recordCount: data.length,
        fileName: fileName
      }
    };
    
    const versionPath = path.join(versionsPath, fileName);
    await fs.writeJson(versionPath, versionData, { spaces: 2 });
    
    console.log(`✅ Team version saved: ${fileName} (${versionId}) for team ${teamId}`);
    console.log(`📁 Saved to: ${versionPath}`);
    
    res.json({
      success: true,
      versionId: versionId,
      fileName: fileName,
      message: 'Version saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving team version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save version'
    });
  }
});

// GET /api/teams/:teamId/versions/:versionId - Get specific team version
router.get('/:teamId/versions/:versionId', async (req, res) => {
  try {
    const { teamId, versionId } = req.params;
    const versionsPath = await getTeamVersionsPath(teamId);
    const versionPath = path.join(versionsPath, `${versionId}.json`);
    
    if (!await fs.pathExists(versionPath)) {
      return res.status(404).json({
        success: false,
        error: 'Version not found'
      });
    }
    
    const versionData = await fs.readJson(versionPath);
    
    res.json({
      success: true,
      version: versionData
    });
    
  } catch (error) {
    console.error('Error getting team version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get version'
    });
  }
});

// DELETE /api/teams/:teamId/versions/:versionId - Delete team version
router.delete('/:teamId/versions/:versionId', async (req, res) => {
  try {
    const { teamId, versionId } = req.params;
    const versionsPath = await getTeamVersionsPath(teamId);
    const versionPath = path.join(versionsPath, `${versionId}.json`);
    
    if (!await fs.pathExists(versionPath)) {
      return res.status(404).json({
        success: false,
        error: 'Version not found'
      });
    }
    
    // Create backup before deletion
    const teamPath = await getTeamBasePath(teamId);
    const backupsPath = path.join(teamPath, 'backups');
    await fs.ensureDir(backupsPath);
    const backupPath = path.join(backupsPath, `backup_${versionId}_${Date.now()}.json`);
    await fs.copy(versionPath, backupPath);
    
    // Delete version
    await fs.remove(versionPath);
    
    console.log(`✅ Team version deleted: ${versionId} from team ${teamId}`);
    
    res.json({
      success: true,
      message: 'Version deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting team version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete version'
    });
  }
});

// POST /api/teams/:teamId/versions/:versionId/export - Export team version to CSV
router.post('/:teamId/versions/:versionId/export', async (req, res) => {
  try {
    const { teamId, versionId } = req.params;
    const versionsPath = await getTeamVersionsPath(teamId);
    const versionPath = path.join(versionsPath, `${versionId}.json`);
    
    if (!await fs.pathExists(versionPath)) {
      return res.status(404).json({
        success: false,
        error: 'Version not found'
      });
    }
    
    // Read version data
    const versionData = await fs.readJson(versionPath);
    
    if (!versionData.data || !Array.isArray(versionData.data)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid version data'
      });
    }
    
    // Create exports directory
    const teamPath = await getTeamBasePath(teamId);
    const exportsPath = path.join(teamPath, 'exports');
    await fs.ensureDir(exportsPath);
    
    // Generate CSV filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `export_${versionId}_${timestamp}.csv`;
    const filePath = path.join(exportsPath, fileName);
    
    // Convert data to CSV
    const data = versionData.data;
    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No data to export'
      });
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    // Save CSV file
    await fs.writeFile(filePath, csvContent, 'utf8');
    
    console.log(`✅ Team version exported: ${versionId} to ${fileName}`);
    
    res.json({
      success: true,
      fileName: fileName,
      filePath: filePath,
      recordCount: data.length,
      message: 'Version exported successfully'
    });
    
  } catch (error) {
    console.error('Error exporting team version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export version'
    });
  }
});

// GET /api/teams/:teamId/versions/stats - Get team version statistics
router.get('/:teamId/versions/stats', async (req, res) => {
  try {
    const { teamId } = req.params;
    const versionsPath = await getTeamVersionsPath(teamId);
    
    if (!await fs.pathExists(versionsPath)) {
      return res.json({
        success: true,
        stats: {
          totalVersions: 0,
          totalRecords: 0,
          totalSize: 0,
          oldestVersion: null,
          newestVersion: null
        }
      });
    }
    
    const versionFiles = await fs.readdir(versionsPath);
    const versions = [];
    
    for (const file of versionFiles) {
      if (file.endsWith('.json')) {
        try {
          const versionPath = path.join(versionsPath, file);
          const versionData = await fs.readJson(versionPath);
          const stats = await fs.stat(versionPath);
          
          versions.push({
            id: file.replace('.json', ''),
            name: versionData.metadata?.name || file.replace('.json', ''),
            createdAt: versionData.metadata?.createdAt || stats.birthtime.toISOString(),
            recordCount: versionData.data?.length || 0,
            size: stats.size
          });
        } catch (error) {
          console.error(`Error reading version file ${file}:`, error);
        }
      }
    }
    
    if (versions.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalVersions: 0,
          totalRecords: 0,
          totalSize: 0,
          oldestVersion: null,
          newestVersion: null
        }
      });
    }
    
    // Sort by creation date
    versions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    const stats = {
      totalVersions: versions.length,
      totalRecords: versions.reduce((sum, v) => sum + v.recordCount, 0),
      totalSize: versions.reduce((sum, v) => sum + v.size, 0),
      oldestVersion: versions[0],
      newestVersion: versions[versions.length - 1]
    };
    
    console.log(`✅ Team version stats: ${teamId} - ${stats.totalVersions} versions`);
    
    res.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error('Error getting team version stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get version stats'
    });
  }
});

// GET /api/teams/:teamId/versions/latest - Get latest version for team
router.get('/:teamId/versions/latest', async (req, res) => {
  try {
    const { teamId } = req.params;
    const versionsPath = await getTeamVersionsPath(teamId);
    
    console.log(`🔍 Looking for latest version in: ${versionsPath}`);
    
    if (!await fs.pathExists(versionsPath)) {
      console.log(`📂 Versions folder does not exist: ${versionsPath}`);
      return res.json({
        success: true,
        hasLatest: false,
        latest: null
      });
    }
    
    const versionFiles = await fs.readdir(versionsPath);
    const jsonFiles = versionFiles.filter(file => file.endsWith('.json'));
    
    console.log(`📄 Found ${jsonFiles.length} version files`);
    
    if (jsonFiles.length === 0) {
      return res.json({
        success: true,
        hasLatest: false,
        latest: null
      });
    }
    
    let latestVersion = null;
    let latestDate = null;
    
    for (const file of jsonFiles) {
      try {
        const versionPath = path.join(versionsPath, file);
        const versionData = await fs.readJson(versionPath);
        const stats = await fs.stat(versionPath);
        
        const createdAt = new Date(versionData.metadata?.createdAt || stats.birthtime);
        
        if (!latestDate || createdAt > latestDate) {
          latestDate = createdAt;
          
          // Generar nombre de display inteligente
          let displayName = versionData.metadata?.displayName || 
                           versionData.metadata?.name || 
                           versionData.metadata?.fileName || 
                           file.replace('.json', '');
          
          // Si el archivo tiene el formato de timestamp, limpiar el nombre
          if (displayName.includes('_2025-') || displayName.includes('_2024-')) {
            displayName = displayName.split('_')[0];
          }
          
          latestVersion = {
            id: versionData.id || file.replace('.json', ''),
            name: displayName,
            originalFileName: file,
            description: versionData.metadata?.description || '',
            createdAt: versionData.metadata?.createdAt || stats.birthtime.toISOString(),
            size: stats.size,
            recordCount: versionData.data?.length || 0,
            csvFileName: versionData.metadata?.fileName || null,
            teamId: teamId,
            data: versionData.data // Include the actual data
          };
        }
      } catch (error) {
        console.error(`❌ Error reading version file ${file}:`, error);
      }
    }
    
    if (latestVersion) {
      console.log(`✅ Latest version found: ${latestVersion.name} (${latestVersion.recordCount} records)`);
      
      res.json({
        success: true,
        hasLatest: true,
        latest: latestVersion
      });
    } else {
      res.json({
        success: true,
        hasLatest: false,
        latest: null
      });
    }
    
  } catch (error) {
    console.error('Error getting latest team version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get latest team version'
    });
  }
});

// GET /api/teams/:teamId/stats - Get team statistics
router.get('/:teamId/stats', async (req, res) => {
  try {
    const { teamId } = req.params;
    const teamPath = path.join(config.paths.dataRoot, 'teams', teamId);
    
    if (!await fs.pathExists(teamPath)) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }
    
    const versionsPath = path.join(teamPath, 'versions');
    const backupsPath = path.join(teamPath, 'backups');
    const exportsPath = path.join(teamPath, 'exports');
    
    const stats = {
      totalVersions: await fs.pathExists(versionsPath) ? (await fs.readdir(versionsPath)).length : 0,
      totalBackups: await fs.pathExists(backupsPath) ? (await fs.readdir(backupsPath)).length : 0,
      totalExports: await fs.pathExists(exportsPath) ? (await fs.readdir(exportsPath)).length : 0,
      teamSize: await getFolderSize(teamPath)
    };
    
    res.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error('Error getting team stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get team statistics'
    });
  }
});

// Helper function to get folder size
async function getFolderSize(folderPath) {
  try {
    const files = await fs.readdir(folderPath);
    let totalSize = 0;
    
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isDirectory()) {
        totalSize += await getFolderSize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    return 0;
  }
}

// POST /api/teams/save-config - Save team configuration
router.post('/save-config', async (req, res) => {
  try {
    const teamConfig = req.body;
    
    if (!teamConfig.id || !teamConfig.name) {
      return res.status(400).json({
        success: false,
        error: 'Team ID and name are required'
      });
    }
    
    console.log(`💾 Saving team config for: ${teamConfig.id} (${teamConfig.name})`);
    
    // Determine the best path to save the config
    let configPath;
    
    if (teamConfig.folderPath && await fs.pathExists(teamConfig.folderPath)) {
      // Use the team's own folder if it exists
      configPath = path.join(teamConfig.folderPath, 'team-config.json');
    } else if (teamConfig.storagePath && await fs.pathExists(teamConfig.storagePath)) {
      // Use storage path if folder path doesn't exist
      configPath = path.join(teamConfig.storagePath, 'team-config.json');
    } else {
      // Create in default location
      const defaultTeamPath = path.join(config.paths.dataRoot, 'teams', teamConfig.id);
      await fs.ensureDir(defaultTeamPath);
      configPath = path.join(defaultTeamPath, 'team-config.json');
    }
    
    // Ensure the directory exists
    await fs.ensureDir(path.dirname(configPath));
    
    // Save the team configuration
    await fs.writeJson(configPath, teamConfig, { spaces: 2 });
    
    console.log(`✅ Team config saved to: ${configPath}`);
    
    // Also create versions folder if it doesn't exist
    const versionsPath = path.join(path.dirname(configPath), 'versions');
    await fs.ensureDir(versionsPath);
    
    console.log(`✅ Versions folder ensured at: ${versionsPath}`);
    
    res.json({
      success: true,
      message: 'Team configuration saved successfully',
      configPath: configPath,
      versionsPath: versionsPath
    });
    
  } catch (error) {
    console.error('❌ Error saving team config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save team configuration'
    });
  }
});

module.exports = router; 