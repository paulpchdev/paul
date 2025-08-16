const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const router = express.Router();

// Validaciones (mantener las existentes)
const validateInscripcion = [
  body('nombre').trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email').isEmail().withMessage('Debe ser un email válido').normalizeEmail(),
  body('telefono').matches(/^\d{9}$/).withMessage('El teléfono debe tener exactamente 9 dígitos'),
  body('eventoId').isInt({ min: 1 }).withMessage('ID de evento inválido')
];

// GET /api/events - Obtener todos los eventos
router.get('/', async (req, res) => {
  try {
    const { categoria, ubicacion, fecha, estado = 'activo' } = req.query;
    
    let sql = `
      SELECT e.*, 
             COUNT(i.id) as inscritosActuales,
             (e.capacidadMaxima - COUNT(i.id)) > 0 as disponible
      FROM eventos e
      LEFT JOIN inscripciones i ON e.id = i.eventoId AND i.estado = 'confirmada'
      WHERE e.estado = ?
    `;
    const params = [estado];
    
    if (categoria) {
      sql += ' AND e.categoria LIKE ?';
      params.push(`%${categoria}%`);
    }
    
    if (ubicacion) {
      sql += ' AND e.ubicacion LIKE ?';
      params.push(`%${ubicacion}%`);
    }
    
    if (fecha) {
      sql += ' AND e.fecha = ?';
      params.push(fecha);
    }

    sql += ' GROUP BY e.id ORDER BY e.fecha ASC';

    const eventos = await query(sql, params);

    res.json({
      success: true,
      data: eventos,
      total: eventos.length
    });

  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/events/:id/inscribirse - Inscribirse a un evento
router.post('/:id/inscribirse', validateInscripcion, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de inscripción inválidos',
        errors: errors.array()
      });
    }

    const eventoId = parseInt(req.params.id);
    const { nombre, email, telefono } = req.body;
    
    // Verificar si el evento existe y está activo
    const eventoSql = `
      SELECT e.*, COUNT(i.id) as inscritosActuales
      FROM eventos e
      LEFT JOIN inscripciones i ON e.id = i.eventoId AND i.estado = 'confirmada'
      WHERE e.id = ? AND e.estado = 'activo'
      GROUP BY e.id
    `;
    
    const eventos = await query(eventoSql, [eventoId]);
    
    if (eventos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado o no está activo'
      });
    }

    const evento = eventos[0];

    // Verificar capacidad
    if (evento.inscritosActuales >= evento.capacidadMaxima) {
      return res.status(409).json({
        success: false,
        message: 'El evento ha alcanzado su capacidad máxima'
      });
    }

    // Verificar si ya está inscrito
    const yaInscritoSql = 'SELECT id FROM inscripciones WHERE eventoId = ? AND email = ?';
    const yaInscrito = await query(yaInscritoSql, [eventoId, email]);
    
    if (yaInscrito.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya estás inscrito en este evento con este email'
      });
    }

    // Crear inscripción
    const inscripcionSql = `
      INSERT INTO inscripciones (eventoId, nombre, email, telefono, estado)
      VALUES (?, ?, ?, ?, 'confirmada')
    `;

    const result = await query(inscripcionSql, [eventoId, nombre, email, telefono]);

    // Obtener la inscripción creada con datos del evento
    const nuevaInscripcionSql = `
      SELECT i.*, e.nombre as eventoNombre
      FROM inscripciones i
      JOIN eventos e ON i.eventoId = e.id
      WHERE i.id = ?
    `;
    
    const nuevaInscripcion = await query(nuevaInscripcionSql, [result.insertId]);

    res.status(201).json({
      success: true,
      message: '¡Inscripción exitosa!',
      data: nuevaInscripcion[0]
    });

  } catch (error) {
    console.error('Error en inscripción:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Ya estás inscrito en este evento con este email'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/events/inscripciones/mis-inscripciones
router.get('/inscripciones/mis-inscripciones', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requerido'
      });
    }

    const sql = `
      SELECT i.*, e.nombre as eventoNombre, e.fecha, e.hora, e.ubicacion, e.precio
      FROM inscripciones i
      JOIN eventos e ON i.eventoId = e.id
      WHERE i.email = ?
      ORDER BY i.fechaInscripcion DESC
    `;

    const inscripciones = await query(sql, [email]);

    const inscripcionesFormateadas = inscripciones.map(inscripcion => ({
      id: inscripcion.id,
      eventoId: inscripcion.eventoId,
      nombre: inscripcion.nombre,
      email: inscripcion.email,
      telefono: inscripcion.telefono,
      fechaInscripcion: inscripcion.fechaInscripcion,
      estado: inscripcion.estado,
      eventoNombre: inscripcion.eventoNombre,
      evento: {
        id: inscripcion.eventoId,
        nombre: inscripcion.eventoNombre,
        fecha: inscripcion.fecha,
        hora: inscripcion.hora,
        ubicacion: inscripcion.ubicacion,
        precio: inscripcion.precio
      }
    }));

    res.json({
      success: true,
      data: inscripcionesFormateadas,
      total: inscripcionesFormateadas.length
    });

  } catch (error) {
    console.error('Error al obtener inscripciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Agregar las demás rutas (GET específico, PUT, DELETE)...

module.exports = router;