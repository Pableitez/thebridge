const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { config } = require('../config/paths');

// Asegurar que existe la carpeta de usuarios
const usersDir = path.join(config.paths.dataRoot, 'users');
async function ensureUsersDir() {
  try {
    await fs.access(usersDir);
  } catch {
    await fs.mkdir(usersDir, { recursive: true });
  }
}

// Función para obtener el archivo de perfil de un usuario
function getUserProfilePath(userId, teamId) {
  return path.join(usersDir, `${userId}_${teamId}.json`);
}

// Función para obtener el archivo de filtros de un usuario
function getUserFiltersPath(userId, teamId) {
  return path.join(usersDir, `${userId}_${teamId}_filters.json`);
}

// Función para obtener el archivo de configuraciones de un usuario
function getUserSettingsPath(userId, teamId) {
  return path.join(usersDir, `${userId}_${teamId}_settings.json`);
}

// GET /api/users/list - Listar todos los usuarios
router.get('/list', async (req, res) => {
  try {
    await ensureUsersDir();
    
    const files = await fs.readdir(usersDir);
    const users = [];
    
    for (const file of files) {
      if (file.endsWith('.json') && !file.includes('_filters') && !file.includes('_settings')) {
        try {
          const filePath = path.join(usersDir, file);
          const userData = await fs.readFile(filePath, 'utf8');
          const user = JSON.parse(userData);
          
          // Extract user info without sensitive data
          users.push({
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            teamId: user.teamId
          });
        } catch (error) {
          console.warn(`Error reading user file ${file}:`, error);
        }
      }
    }
    
    res.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/users/register - Registrar nuevo usuario
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'email, password y name son requeridos'
      });
    }
    
    await ensureUsersDir();
    
    // Check if user already exists
    const defaultTeamId = 'default-team';
    const profilePath = getUserProfilePath(email, defaultTeamId);
    
    try {
      await fs.access(profilePath);
      return res.status(400).json({
        success: false,
        error: 'Usuario ya existe'
      });
    } catch {
      // User doesn't exist, create new user
    }
    
    // Create user profile
    const userProfile = {
      userId: email,
      teamId: defaultTeamId,
      email: email,
      name: name,
      password: password, // In production, this should be hashed
      role: 'user',
      preferences: {
        theme: 'dark',
        language: 'es',
        notifications: true
      },
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    
    await fs.writeFile(profilePath, JSON.stringify(userProfile, null, 2));
    
    console.log(`✅ User registered: ${email}`);
    
    res.json({
      success: true,
      message: 'Usuario registrado correctamente',
      user: {
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role,
        createdAt: userProfile.createdAt
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/users/login - Login de usuario
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'email y password son requeridos'
      });
    }
    
    await ensureUsersDir();
    
    // Try to find user in any team
    const files = await fs.readdir(usersDir);
    let userProfile = null;
    
    for (const file of files) {
      if (file.startsWith(email) && file.endsWith('.json') && !file.includes('_filters') && !file.includes('_settings')) {
        try {
          const filePath = path.join(usersDir, file);
          const userData = await fs.readFile(filePath, 'utf8');
          const user = JSON.parse(userData);
          
          if (user.password === password) {
            userProfile = user;
            break;
          }
        } catch (error) {
          console.warn(`Error reading user file ${file}:`, error);
        }
      }
    }
    
    if (!userProfile) {
      return res.status(401).json({
        success: false,
        error: 'Email o contraseña incorrectos'
      });
    }
    
    // Update last login
    userProfile.lastLogin = new Date().toISOString();
    const profilePath = getUserProfilePath(userProfile.userId, userProfile.teamId);
    await fs.writeFile(profilePath, JSON.stringify(userProfile, null, 2));
    
    console.log(`✅ User logged in: ${email}`);
    
    res.json({
      success: true,
      message: 'Login exitoso',
      user: {
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role,
        teamId: userProfile.teamId,
        lastLogin: userProfile.lastLogin
      }
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/users/:userId/profile - Obtener perfil de usuario
router.get('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const { teamId } = req.query;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'teamId es requerido'
      });
    }
    
    await ensureUsersDir();
    const profilePath = getUserProfilePath(userId, teamId);
    
    try {
      const profileData = await fs.readFile(profilePath, 'utf8');
      const profile = JSON.parse(profileData);
      
      res.json({
        success: true,
        profile
      });
    } catch (error) {
      // Si el archivo no existe, devolver perfil vacío
      res.json({
        success: true,
        profile: {
          userId,
          teamId,
          name: '',
          email: '',
          role: 'user',
          preferences: {},
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/users/:userId/profile - Crear/actualizar perfil de usuario
router.post('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const { teamId, name, email, role, preferences } = req.body;
    
    if (!teamId || !name || !email) {
      return res.status(400).json({
        success: false,
        error: 'teamId, name y email son requeridos'
      });
    }
    
    await ensureUsersDir();
    const profilePath = getUserProfilePath(userId, teamId);
    
    // Leer perfil existente o crear nuevo
    let profile = {
      userId,
      teamId,
      name,
      email,
      role: role || 'user',
      preferences: preferences || {},
      lastLogin: new Date().toISOString()
    };
    
    try {
      const existingData = await fs.readFile(profilePath, 'utf8');
      const existing = JSON.parse(existingData);
      profile = {
        ...existing,
        ...profile,
        createdAt: existing.createdAt || new Date().toISOString()
      };
    } catch {
      // Nuevo perfil
      profile.createdAt = new Date().toISOString();
    }
    
    await fs.writeFile(profilePath, JSON.stringify(profile, null, 2));
    
    res.json({
      success: true,
      profile,
      message: 'Perfil guardado correctamente'
    });
  } catch (error) {
    console.error('Error guardando perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/users/:userId/filters - Obtener filtros guardados del usuario
router.get('/:userId/filters', async (req, res) => {
  try {
    const { userId } = req.params;
    const { teamId } = req.query;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'teamId es requerido'
      });
    }
    
    await ensureUsersDir();
    const filtersPath = getUserFiltersPath(userId, teamId);
    
    try {
      const filtersData = await fs.readFile(filtersPath, 'utf8');
      const filters = JSON.parse(filtersData);
      
      res.json({
        success: true,
        filters
      });
    } catch (error) {
      // Si no hay filtros guardados, devolver array vacío
      res.json({
        success: true,
        filters: []
      });
    }
  } catch (error) {
    console.error('Error obteniendo filtros:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/users/:userId/filters - Guardar filtros del usuario
router.post('/:userId/filters', async (req, res) => {
  try {
    const { userId } = req.params;
    const { teamId, filters } = req.body;
    
    if (!teamId || !filters) {
      return res.status(400).json({
        success: false,
        error: 'teamId y filters son requeridos'
      });
    }
    
    await ensureUsersDir();
    const filtersPath = getUserFiltersPath(userId, teamId);
    
    await fs.writeFile(filtersPath, JSON.stringify(filters, null, 2));
    
    res.json({
      success: true,
      message: 'Filtros guardados correctamente'
    });
  } catch (error) {
    console.error('Error guardando filtros:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/users/:userId/settings - Obtener configuraciones del usuario
router.get('/:userId/settings', async (req, res) => {
  try {
    const { userId } = req.params;
    const { teamId } = req.query;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'teamId es requerido'
      });
    }
    
    await ensureUsersDir();
    const settingsPath = getUserSettingsPath(userId, teamId);
    
    try {
      const settingsData = await fs.readFile(settingsPath, 'utf8');
      const settings = JSON.parse(settingsData);
      
      res.json({
        success: true,
        settings
      });
    } catch (error) {
      // Si no hay configuraciones guardadas, devolver objeto vacío
      res.json({
        success: true,
        settings: {}
      });
    }
  } catch (error) {
    console.error('Error obteniendo configuraciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/users/:userId/settings - Guardar configuraciones del usuario
router.post('/:userId/settings', async (req, res) => {
  try {
    const { userId } = req.params;
    const { teamId, settings } = req.body;
    
    if (!teamId || !settings) {
      return res.status(400).json({
        success: false,
        error: 'teamId y settings son requeridos'
      });
    }
    
    await ensureUsersDir();
    const settingsPath = getUserSettingsPath(userId, teamId);
    
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    
    res.json({
      success: true,
      message: 'Configuraciones guardadas correctamente'
    });
  } catch (error) {
    console.error('Error guardando configuraciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// DELETE /api/users/:userId - Eliminar perfil de usuario (solo admin)
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { teamId } = req.query;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'teamId es requerido'
      });
    }
    
    await ensureUsersDir();
    
    // Eliminar todos los archivos del usuario
    const filesToDelete = [
      getUserProfilePath(userId, teamId),
      getUserFiltersPath(userId, teamId),
      getUserSettingsPath(userId, teamId)
    ];
    
    for (const filePath of filesToDelete) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // El archivo no existe, continuar
      }
    }
    
    res.json({
      success: true,
      message: 'Perfil de usuario eliminado correctamente'
    });
  } catch (error) {
    console.error('Error eliminando perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router; 