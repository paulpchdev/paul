const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Simulación de base de datos (en memoria)
// En producción real, esto estaría en MongoDB o PostgreSQL
let users = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@corvoevent.com',
    password: '$2b$10$example',
    role: 'admin',
    profile: {
      firstName: 'Admin',
      lastName: 'CorvoEvent',
      phone: '999888777',
      avatar: null
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  }
];

let userIdCounter = 2;

// Validaciones
const validateUserUpdate = [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('El nombre de usuario debe tener entre 3 y 30 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail(),
  body('profile.firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres'),
  body('profile.lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres'),
  body('profile.phone')
    .optional()
    .matches(/^\d{9}$/)
    .withMessage('El teléfono debe tener exactamente 9 dígitos')
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Contraseña actual requerida'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@_-])/)
    .withMessage('La nueva contraseña debe contener letras, números y al menos uno de estos caracteres: @, -, _')
];

// Middleware de autenticación simplificado
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido'
    });
  }
  // En implementación real, verificar JWT y extraer info del usuario
  req.user = { id: 1, role: 'admin' }; // Simulado
  next();
};

// Middleware para verificar permisos de admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Permisos de administrador requeridos'
    });
  }
  next();
};

// GET /api/users - Obtener lista de usuarios (solo admin)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    let filteredUsers = users.filter(user => {
      let matches = true;
      
      if (search) {
        const searchLower = search.toLowerCase();
        matches = matches && (
          user.username.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          (user.profile?.firstName?.toLowerCase().includes(searchLower)) ||
          (user.profile?.lastName?.toLowerCase().includes(searchLower))
        );
      }
      
      if (role) {
        matches = matches && user.role === role;
      }
      
      if (status !== undefined) {
        const isActive = status === 'active';
        matches = matches && user.isActive === isActive;
      }
      
      return matches;
    });

    const total = filteredUsers.length;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex).map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      profile: user.profile,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isActive: user.isActive
      // No incluir password
    }));

    res.json({
      success: true,
      data: paginatedUsers,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/users/profile - Obtener perfil del usuario actual
router.get('/profile', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/users/:id - Obtener usuario específico (admin o el mismo usuario)
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Solo admin puede ver otros usuarios, usuarios normales solo su propio perfil
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este usuario'
      });
    }

    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/users/profile - Actualizar perfil del usuario actual
router.put('/profile', authenticateToken, validateUserUpdate, (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de actualización inválidos',
        errors: errors.array()
      });
    }

    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const { username, email, profile } = req.body;
    const currentUser = users[userIndex];

    // Verificar si el username o email ya existen (excluyendo el usuario actual)
    if (username && username !== currentUser.username) {
      const existingUser = users.find(u => u.id !== req.user.id && u.username.toLowerCase() === username.toLowerCase());
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El nombre de usuario ya está en uso'
        });
      }
    }

    if (email && email !== currentUser.email) {
      const existingUser = users.find(u => u.id !== req.user.id && u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El email ya está en uso'
        });
      }
    }

    // Actualizar usuario
    users[userIndex] = {
      ...currentUser,
      username: username || currentUser.username,
      email: email ? email.toLowerCase() : currentUser.email,
      profile: {
        ...currentUser.profile,
        ...profile
      },
      updatedAt: new Date()
    };

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        id: users[userIndex].id,
        username: users[userIndex].username,
        email: users[userIndex].email,
        role: users[userIndex].role,
        profile: users[userIndex].profile,
        updatedAt: users[userIndex].updatedAt
      }
    });

  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/users/:id - Actualizar usuario (solo admin)
router.put('/:id', authenticateToken, requireAdmin, validateUserUpdate, (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de actualización inválidos',
        errors: errors.array()
      });
    }

    const userId = parseInt(req.params.id);
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const { username, email, profile, role, isActive } = req.body;
    const currentUser = users[userIndex];

    // Verificar duplicados
    if (username && username !== currentUser.username) {
      const existingUser = users.find(u => u.id !== userId && u.username.toLowerCase() === username.toLowerCase());
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El nombre de usuario ya está en uso'
        });
      }
    }

    if (email && email !== currentUser.email) {
      const existingUser = users.find(u => u.id !== userId && u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El email ya está en uso'
        });
      }
    }

    // Actualizar usuario
    users[userIndex] = {
      ...currentUser,
      username: username || currentUser.username,
      email: email ? email.toLowerCase() : currentUser.email,
      role: role || currentUser.role,
      isActive: isActive !== undefined ? isActive : currentUser.isActive,
      profile: {
        ...currentUser.profile,
        ...profile
      },
      updatedAt: new Date()
    };

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: {
        id: users[userIndex].id,
        username: users[userIndex].username,
        email: users[userIndex].email,
        role: users[userIndex].role,
        profile: users[userIndex].profile,
        isActive: users[userIndex].isActive,
        updatedAt: users[userIndex].updatedAt
      }
    });

  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/users/password - Cambiar contraseña
router.put('/password', authenticateToken, validatePasswordChange, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de cambio de contraseña inválidos',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = users[userIndex];

    // Verificar contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    // Hashear nueva contraseña
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña
    users[userIndex] = {
      ...user,
      password: hashedNewPassword,
      updatedAt: new Date()
    };

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/users/:id - Eliminar usuario (solo admin)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // No permitir eliminar al admin principal
    if (userId === 1) {
      return res.status(403).json({
        success: false,
        message: 'No se puede eliminar al administrador principal'
      });
    }

    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const deletedUser = users.splice(userIndex, 1)[0];

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
      data: {
        id: deletedUser.id,
        username: deletedUser.username,
        email: deletedUser.email
      }
    });

  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/users/:id/toggle-status - Activar/Desactivar usuario (solo admin)
router.post('/:id/toggle-status', authenticateToken, requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // No permitir desactivar al admin principal
    if (userId === 1) {
      return res.status(403).json({
        success: false,
        message: 'No se puede cambiar el estado del administrador principal'
      });
    }

    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    users[userIndex].isActive = !users[userIndex].isActive;
    users[userIndex].updatedAt = new Date();

    const status = users[userIndex].isActive ? 'activado' : 'desactivado';

    res.json({
      success: true,
      message: `Usuario ${status} exitosamente`,
      data: {
        id: users[userIndex].id,
        username: users[userIndex].username,
        isActive: users[userIndex].isActive
      }
    });

  } catch (error) {
    console.error('Error al cambiar estado del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/users/stats - Estadísticas de usuarios (solo admin)
router.get('/stats/overview', authenticateToken, requireAdmin, (req, res) => {
  try {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const inactiveUsers = totalUsers - activeUsers;
    const adminUsers = users.filter(u => u.role === 'admin').length;
    const regularUsers = users.filter(u => u.role === 'user').length;
    
    // Usuarios registrados en los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = users.filter(u => u.createdAt >= thirtyDaysAgo).length;

    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        admins: adminUsers,
        regular: regularUsers,
        recentRegistrations: recentUsers,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;