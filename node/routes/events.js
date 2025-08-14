const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Simulación de base de datos (en memoria)
let eventos = [
  {
    id: 1,
    nombre: '¡Temporada digital y Más!',
    descripcion: 'Evento de tecnología y innovación digital',
    ubicacion: 'Lima',
    fecha: '2024-07-15',
    fechaFin: '2024-08-15',
    hora: '18:00',
    capacidadMaxima: 100,
    precio: 0,
    categoria: 'Tecnología',
    estado: 'activo',
    imagen: 'img/cards/513126531_1785148272214189_4619596617324041753_n.jpg',
    createdAt: new Date()
  },
  {
    id: 2,
    nombre: 'Dr. Jekyll & Mr. Hyde',
    descripcion: 'Obra teatral clásica',
    ubicacion: 'Arequipa',
    fecha: '2024-07-20',
    hora: '19:00',
    capacidadMaxima: 150,
    precio: 25,
    categoria: 'Teatro',
    estado: 'activo',
    imagen: 'img/cards/513199091_746317388335271_7685396646841333246_n.jpg',
    createdAt: new Date()
  },
  {
    id: 3,
    nombre: 'Meet & Greet',
    descripcion: 'Evento de networking y conocimiento',
    ubicacion: 'Trujillo',
    fecha: '2024-07-30',
    hora: '17:00',
    capacidadMaxima: 80,
    precio: 0,
    categoria: 'Networking',
    estado: 'activo',
    imagen: 'img/cards/513663032_9949232641861444_4757165714216607079_n.jpg',
    createdAt: new Date()
  },
  {
    id: 4,
    nombre: 'Gastronomicon',
    descripcion: 'Festival gastronómico',
    ubicacion: 'Lima',
    fecha: '2024-07-30',
    hora: '17:00',
    capacidadMaxima: 200,
    precio: 35,
    categoria: 'Gastronomía',
    estado: 'activo',
    imagen: 'img/cards/513721327_710115258549179_8599236021205993254_n.jpg',
    createdAt: new Date()
  },
  {
    id: 5,
    nombre: 'Oratoria',
    descripcion: 'Taller de técnicas de oratoria y comunicación',
    ubicacion: 'Lima',
    fecha: '2024-07-30',
    hora: '17:00',
    capacidadMaxima: 60,
    precio: 20,
    categoria: 'Educación',
    estado: 'activo',
    imagen: 'img/cards/513934264_670515809354703_3791911029304559057_n.jpg',
    createdAt: new Date()
  }
];

let inscripciones = [];
let inscripcionIdCounter = 1;
let eventoIdCounter = 6;

// Validaciones
const validateInscripcion = [
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail(),
  body('telefono')
    .matches(/^\d{9}$/)
    .withMessage('El teléfono debe tener exactamente 9 dígitos'),
  body('eventoId')
    .isInt({ min: 1 })
    .withMessage('ID de evento inválido')
];

const validateEvento = [
  body('nombre')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('El nombre del evento debe tener entre 3 y 200 caracteres'),
  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('La descripción no puede exceder 1000 caracteres'),
  body('ubicacion')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La ubicación debe tener entre 2 y 100 caracteres'),
  body('fecha')
    .isISO8601()
    .withMessage('Fecha inválida'),
  body('hora')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora inválida (formato HH:MM)'),
  body('capacidadMaxima')
    .isInt({ min: 1, max: 10000 })
    .withMessage('La capacidad debe ser entre 1 y 10000'),
  body('precio')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser mayor o igual a 0'),
  body('categoria')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('La categoría debe tener entre 2 y 50 caracteres')
];

// Middleware de autenticación (simplificado)
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token requerido'
    });
  }
  // En implementación real, verificar JWT
  next();
};

// GET /api/events - Obtener todos los eventos
router.get('/', (req, res) => {
  try {
    const { categoria, ubicacion, fecha, estado = 'activo' } = req.query;
    
    let eventosFiltered = eventos.filter(evento => evento.estado === estado);
    
    if (categoria) {
      eventosFiltered = eventosFiltered.filter(evento => 
        evento.categoria.toLowerCase().includes(categoria.toLowerCase())
      );
    }
    
    if (ubicacion) {
      eventosFiltered = eventosFiltered.filter(evento => 
        evento.ubicacion.toLowerCase().includes(ubicacion.toLowerCase())
      );
    }
    
    if (fecha) {
      eventosFiltered = eventosFiltered.filter(evento => evento.fecha === fecha);
    }

    // Agregar información de inscripciones
    const eventosConInfo = eventosFiltered.map(evento => {
      const inscripcionesEvento = inscripciones.filter(i => i.eventoId === evento.id);
      return {
        ...evento,
        inscritosActuales: inscripcionesEvento.length,
        disponible: inscripcionesEvento.length < evento.capacidadMaxima
      };
    });

    res.json({
      success: true,
      data: eventosConInfo,
      total: eventosConInfo.length
    });

  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/events/:id - Obtener evento específico
router.get('/:id', (req, res) => {
  try {
    const eventoId = parseInt(req.params.id);
    const evento = eventos.find(e => e.id === eventoId);
    
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }

    const inscripcionesEvento = inscripciones.filter(i => i.eventoId === eventoId);
    
    res.json({
      success: true,
      data: {
        ...evento,
        inscritosActuales: inscripcionesEvento.length,
        disponible: inscripcionesEvento.length < evento.capacidadMaxima,
        inscripciones: inscripcionesEvento
      }
    });

  } catch (error) {
    console.error('Error al obtener evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/events - Crear nuevo evento (requiere autenticación)
router.post('/', authenticateToken, validateEvento, (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de evento inválidos',
        errors: errors.array()
      });
    }

    const nuevoEvento = {
      id: eventoIdCounter++,
      ...req.body,
      estado: 'activo',
      createdAt: new Date()
    };

    eventos.push(nuevoEvento);

    res.status(201).json({
      success: true,
      message: 'Evento creado exitosamente',
      data: nuevoEvento
    });

  } catch (error) {
    console.error('Error al crear evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/events/:id/inscribirse - Inscribirse a un evento
router.post('/:id/inscribirse', validateInscripcion, (req, res) => {
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
    
    // Verificar si el evento existe
    const evento = eventos.find(e => e.id === eventoId && e.estado === 'activo');
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado o no está activo'
      });
    }

    // Verificar capacidad
    const inscripcionesEvento = inscripciones.filter(i => i.eventoId === eventoId);
    if (inscripcionesEvento.length >= evento.capacidadMaxima) {
      return res.status(409).json({
        success: false,
        message: 'El evento ha alcanzado su capacidad máxima'
      });
    }

    // Verificar si ya está inscrito
    const yaInscrito = inscripciones.find(i => 
      i.eventoId === eventoId && i.email.toLowerCase() === email.toLowerCase()
    );
    
    if (yaInscrito) {
      return res.status(409).json({
        success: false,
        message: 'Ya estás inscrito en este evento con este email'
      });
    }

    // Crear inscripción
    const nuevaInscripcion = {
      id: inscripcionIdCounter++,
      eventoId,
      eventoNombre: evento.nombre,
      nombre,
      email: email.toLowerCase(),
      telefono,
      fechaInscripcion: new Date(),
      estado: 'confirmada'
    };

    inscripciones.push(nuevaInscripcion);

    res.status(201).json({
      success: true,
      message: '¡Inscripción exitosa!',
      data: nuevaInscripcion
    });

  } catch (error) {
    console.error('Error en inscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/events/inscripciones/mis-inscripciones
router.get('/inscripciones/mis-inscripciones', (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requerido'
      });
    }

    const misInscripciones = inscripciones
      .filter(i => i.email.toLowerCase() === email.toLowerCase())
      .map(inscripcion => {
        const evento = eventos.find(e => e.id === inscripcion.eventoId);
        return {
          ...inscripcion,
          evento: evento || null
        };
      });

    res.json({
      success: true,
      data: misInscripciones,
      total: misInscripciones.length
    });

  } catch (error) {
    console.error('Error al obtener inscripciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/events/inscripciones/:id - Actualizar inscripción
router.put('/inscripciones/:id', validateInscripcion, (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de actualización inválidos',
        errors: errors.array()
      });
    }

    const inscripcionId = parseInt(req.params.id);
    const { nombre, email, telefono, eventoId } = req.body;
    
    const inscripcionIndex = inscripciones.findIndex(i => i.id === inscripcionId);
    if (inscripcionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Inscripción no encontrada'
      });
    }

    // Verificar que el nuevo evento existe si se cambió
    const evento = eventos.find(e => e.id === eventoId && e.estado === 'activo');
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado o no está activo'
      });
    }

    // Verificar duplicados si cambió email o evento
    const inscripcionActual = inscripciones[inscripcionIndex];
    if (inscripcionActual.email !== email.toLowerCase() || inscripcionActual.eventoId !== eventoId) {
      const duplicado = inscripciones.find(i => 
        i.id !== inscripcionId && 
        i.eventoId === eventoId && 
        i.email.toLowerCase() === email.toLowerCase()
      );
      
      if (duplicado) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe una inscripción con este email para el evento seleccionado'
        });
      }
    }

    // Actualizar inscripción
    inscripciones[inscripcionIndex] = {
      ...inscripcionActual,
      nombre,
      email: email.toLowerCase(),
      telefono,
      eventoId,
      eventoNombre: evento.nombre,
      fechaActualizacion: new Date()
    };

    res.json({
      success: true,
      message: 'Inscripción actualizada exitosamente',
      data: inscripciones[inscripcionIndex]
    });

  } catch (error) {
    console.error('Error al actualizar inscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/events/inscripciones/:id - Eliminar inscripción
router.delete('/inscripciones/:id', (req, res) => {
  try {
    const inscripcionId = parseInt(req.params.id);
    const inscripcionIndex = inscripciones.findIndex(i => i.id === inscripcionId);
    
    if (inscripcionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Inscripción no encontrada'
      });
    }

    const inscripcionEliminada = inscripciones.splice(inscripcionIndex, 1)[0];

    res.json({
      success: true,
      message: 'Inscripción eliminada exitosamente',
      data: inscripcionEliminada
    });

  } catch (error) {
    console.error('Error al eliminar inscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;