const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Importar configuración y rutas
const { config, initializeFolders } = require('./config/paths');
const versionsRouter = require('./routes/versions');
const configRouter = require('./routes/config');
const teamsRouter = require('./routes/teams');
const usersRouter = require('./routes/users');
const dashboardRouter = require('./routes/dashboard');
const csvRouter = require('./routes/csv');

// Crear aplicación Express
const app = express();

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Middleware de compresión
app.use(compression());

// Middleware de logging
app.use(morgan('combined'));

// Configuración de CORS EXPLÍCITA para GitHub Pages
app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como aplicaciones móviles o Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
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
      'https://the-bridge-backend.onrender.com'
    ];
    
    // Verificar si el origin está permitido
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With', 'X-API-Key']
}));

// Middleware para parsear JSON
app.use(express.json({ 
  limit: config.files.maxSize 
}));

// Middleware para parsear URL-encoded
app.use(express.urlencoded({ 
  extended: true, 
  limit: config.files.maxSize 
}));

// Middleware de rate limiting básico
const requestCounts = new Map();
app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuto
  
  if (!requestCounts.has(clientIP)) {
    requestCounts.set(clientIP, []);
  }
  
  const requests = requestCounts.get(clientIP);
  const recentRequests = requests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= config.security.maxRequestsPerMinute) {
    return res.status(429).json({
      success: false,
      error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.'
    });
  }
  
  recentRequests.push(now);
  requestCounts.set(clientIP, recentRequests);
  
  next();
});

// Limpiar contadores de requests antiguos cada 5 minutos
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  
  for (const [clientIP, requests] of requestCounts.entries()) {
    const recentRequests = requests.filter(time => now - time < windowMs);
    if (recentRequests.length === 0) {
      requestCounts.delete(clientIP);
    } else {
      requestCounts.set(clientIP, recentRequests);
    }
  }
}, 5 * 60 * 1000);

// Ruta de salud del servidor (simplificada para Railway)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'The Bridge Backend API',
    version: '1.0.0',
    status: 'running',
    cors: 'enabled for GitHub Pages'
  });
});

// Rutas de la API
app.use('/api/versions', versionsRouter);
app.use('/api/config', configRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/users', usersRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/csv', csvRouter);

// Ruta de información del sistema
app.get('/api/system/info', (req, res) => {
  const os = require('os');
  
  res.json({
    success: true,
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      cpus: os.cpus().length,
      uptime: os.uptime()
    },
    config: {
      dataRoot: config.paths.dataRoot,
      port: process.env.PORT || config.port,
      maxFileSize: config.files.maxSize
    }
  });
});

// Middleware para manejar errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    availableEndpoints: [
      'GET /health',
      'GET /api/system/info',
      'GET /api/versions',
      'GET /api/versions/stats',
      'GET /api/versions/:id',
      'POST /api/versions',
      'DELETE /api/versions/:id',
      'POST /api/versions/:id/export',
      'POST /api/versions/cleanup',
      'GET /api/versions/config/info'
    ]
  });
});

// Función para iniciar el servidor
async function startServer() {
  try {
    // Inicializar carpetas
    console.log('🚀 Inicializando carpetas...');
    initializeFolders();
    
    // Iniciar servidor (usar PORT de Render o config.port como fallback)
    console.log('🔍 Variables de entorno:');
    console.log('   PORT:', process.env.PORT);
    console.log('   NODE_ENV:', process.env.NODE_ENV);
    
    // Escuchar en el puerto que Render asigna
    const port = process.env.PORT || 3000;
    console.log('🎯 Puerto seleccionado:', port);
    
    // Crear servidor principal
    const server = app.listen(port, '0.0.0.0', () => {
      console.log('✅ Backend iniciado correctamente');
      console.log(`📍 Puerto: ${port}`);
      console.log(`📁 Carpeta de datos: ${config.paths.dataRoot}`);
      console.log(`🌐 URL: http://localhost:${port}`);
      console.log(`�� Health check: http://localhost:${port}/health`);
      console.log('🌐 CORS habilitado para GitHub Pages');
      console.log('📋 Endpoints disponibles:');
      console.log('   GET  /api/versions - Listar versiones');
      console.log('   POST /api/versions - Guardar versión');
      console.log('   GET  /api/versions/:id - Cargar versión');
      console.log('   DELETE /api/versions/:id - Eliminar versión');
      console.log('   POST /api/versions/:id/export - Exportar a CSV');
      console.log('   POST /api/versions/cleanup - Limpiar versiones');
      console.log('   GET  /api/versions/stats - Estadísticas');
      console.log('   GET  /api/versions/config/info - Configuración');
      console.log('   GET  /api/teams - Listar equipos');
      console.log('   POST /api/teams/create - Crear equipo');
      console.log('   GET  /api/teams/:id - Detalles del equipo');
      console.log('   POST /api/teams/:id/join - Unirse al equipo');
      console.log('   GET  /api/users/:userId/profile - Perfil de usuario');
      console.log('   POST /api/users/:userId/profile - Guardar perfil');
      console.log('   GET  /api/users/:userId/filters - Filtros del usuario');
      console.log('   POST /api/users/:userId/filters - Guardar filtros');
      console.log('   GET  /api/users/:userId/settings - Configuraciones');
      console.log('   POST /api/users/:userId/settings - Guardar configuraciones');
      console.log('   POST /api/dashboard/save - Guardar configuración del dashboard');
      console.log('   POST /api/dashboard/open-folder - Abrir carpeta del dashboard');
      console.log('   GET  /api/dashboard/list - Listar configuraciones del dashboard');
      console.log('   GET  /api/dashboard/load/:filename - Cargar configuración específica');
      console.log('   POST /api/csv/upload - Subir CSV al equipo');
      console.log('   GET  /api/csv/list - Listar CSVs del equipo');
      console.log('   GET  /api/csv/timeline - Línea temporal de CSVs');
      console.log('   GET  /api/csv/download/:teamId/:date/:csvType/:position - Descargar CSV');
      console.log('   GET  /api/csv/stats - Estadísticas de CSVs del equipo');
      console.log('');
      console.log(`🎯 Para conectar el frontend, usa la URL: http://localhost:${port}`);
    });
    
    // Servidor configurado para Render
    console.log('🎯 Servidor configurado para Render');
    
    // Manejo de cierre graceful
    process.on('SIGTERM', () => {
      console.log('�� Recibida señal SIGTERM, cerrando servidor...');
      server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      console.log('�� Recibida señal SIGINT, cerrando servidor...');
      server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Iniciar servidor si este archivo se ejecuta directamente
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
