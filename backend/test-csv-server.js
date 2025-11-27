const express = require('express');
const cors = require('cors');
const csvRouter = require('./routes/csv-simple');

const app = express();
const PORT = 3003;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/csv', csvRouter);

// Ruta de prueba
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Test CSV server running' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Test CSV server running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   POST /api/csv/upload`);
  console.log(`   GET  /api/csv/stats`);
  console.log(`   GET  /api/csv/list`);
  console.log(`   GET  /api/csv/timeline`);
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