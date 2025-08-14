const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./node/routes/auth');
const eventRoutes = require('./node/routes/events');
const userRoutes = require('./node/routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de seguridad
app.use(helmet({
  contentSecurityPolicy: false, // Deshabilitado para desarrollo
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/img', express.static(path.join(__dirname, 'img')));

// Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);

// Rutas para servir las páginas HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta para index con .html
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Rutas para registro
app.get('/registro', (req, res) => {
  res.sendFile(path.join(__dirname, 'registrar.html'));
});

app.get('/registrar.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'registrar.html'));
});

// Rutas para login/iniciar sesión
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'iniciar_sesion.html'));
});

app.get('/iniciar_sesion.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'iniciar_sesion.html'));
});

// Rutas para detalle de evento (inscripción)
app.get('/eventos', (req, res) => {
  res.sendFile(path.join(__dirname, 'detalle_evento.html'));
});

app.get('/detalle_evento.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'detalle_evento.html'));
});

// Ruta específica para detalle de evento con parámetro ID
app.get('/evento/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'detalle_evento.html'));
});

// Ruta para inscripción con parámetro de evento
app.get('/inscripcion/:eventoId', (req, res) => {
  res.sendFile(path.join(__dirname, 'detalle_evento.html'));
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Ruta no encontrada' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor CorvoEvents ejecutándose en http://localhost:${PORT}`);
  console.log(`📝 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📄 Páginas disponibles:`);
  console.log(`   → http://localhost:${PORT}/ (index.html) - Página principal`);
  console.log(`   → http://localhost:${PORT}/registro (registrar.html) - Registro de usuarios`);
  console.log(`   → http://localhost:${PORT}/login (iniciar_sesion.html) - Iniciar sesión`);
  console.log(`   → http://localhost:${PORT}/eventos (detalle_evento.html) - Inscripción a eventos`);
  console.log(`   → http://localhost:${PORT}/evento/:id - Detalle específico del evento`);
  console.log(`   → http://localhost:${PORT}/inscripcion/:eventoId - Inscripción específica`);
  console.log(`\n🔗 URLs alternativas con .html también funcionan`);
  console.log(`\n📡 API Endpoints disponibles:`);
  console.log(`   → GET  /api/events - Obtener todos los eventos`);
  console.log(`   → GET  /api/events/:id - Obtener evento específico`);
  console.log(`   → POST /api/events/:id/inscribirse - Inscribirse a un evento`);
  console.log(`   → GET  /api/events/inscripciones/mis-inscripciones - Mis inscripciones`);
  console.log(`   → PUT  /api/events/inscripciones/:id - Actualizar inscripción`);
  console.log(`   → DELETE /api/events/inscripciones/:id - Eliminar inscripción`);
});