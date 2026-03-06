const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const {
  setAuthCookie,
  clearAuthCookie,
  authenticate
} = require('../middleware/authMiddleware');

/**
 * POST /api/auth/login
 * Body: { username, password }
 *
 * Comparación directa de contraseña (texto plano) para coincidir
 * con los usuarios existentes en BD.
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Usuario y contraseña son requeridos',
        data:    null
      });
    }

    const user = await User
      .findOne({ username, active: true })
      .select('+password')
      .populate('role', 'name description')
      .populate('permissions.from_role',     'name description module')
      .populate('permissions.custom_add',    'name description module')
      .populate('permissions.custom_remove', 'name description module');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos',
        data:    null
      });
    }

    // Comparación directa — contraseñas en texto plano
    if (password !== user.password) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos',
        data:    null
      });
    }

    // Genera JWT con permisos efectivos y guarda en cookie httpOnly
    setAuthCookie(res, user);

    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({
      success: true,
      message: 'Login correcto',
      data:    { user: userObj }
    });

  } catch (error) {
    console.error('[POST /api/auth/login]', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      data:    null,
      error:   error.message
    });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    message: 'Sesión cerrada correctamente',
    data:    null
  });
});

/**
 * GET /api/auth/me
 * Verifica sesión activa — útil para que el frontend compruebe al cargar la app
 */
router.get('/me', authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user }
  });
});

module.exports = router;