const express    = require('express');
const router     = express.Router();
const User       = require('../models/User');
const Role       = require('../models/Role');
const Permission = require('../models/Permission');
const { authenticate, authorizePermission } = require('../middleware/authMiddleware');

// ─────────────────────────────────────────────────────────────────
// POST /api/users/register
// Crea un usuario nuevo y construye su objeto permissions desde el rol
// ─────────────────────────────────────────────────────────────────
router.post('/register', authenticate, authorizePermission('crear_usuario'), async (req, res) => {
  try {
    const {
      username, password, role,
      name, email, phone,
      blood_type, birth_date,
      emergency_contact_name, emergency_contact_phone,
      picture
    } = req.body;

    // 1. Verifica que el username no exista
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario ya está en uso',
        data: null
      });
    }

    // 2. Verifica que el email no exista
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ya está registrado',
        data: null
      });
    }

    // 3. Busca el rol y obtiene sus permisos para construir permissions.from_role
    const roleDoc = await Role.findById(role);
    if (!roleDoc) {
      return res.status(400).json({
        success: false,
        message: 'El rol seleccionado no existe',
        data: null
      });
    }

    // 4. Crea el usuario con permissions.from_role tomado del rol
    const user = new User({
      username,
      password,                     // texto plano — igual que el resto de usuarios en BD
      role,
      name,
      email,
      phone,
      blood_type:              blood_type || '',
      birth_date:              birth_date || null,
      emergency_contact_name:  emergency_contact_name  || '',
      emergency_contact_phone: emergency_contact_phone || '',
      picture:                 picture || '',
      permissions: {
        from_role:     roleDoc.permissions,  // hereda los permisos del rol
        custom_add:    [],
        custom_remove: []
      },
      active:     true,
      created_at: new Date(),
      updated_at: new Date()
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Usuario creado correctamente',
      data: {
        user: {
          id:       user._id,
          username: user.username,
          name:     user.name,
          email:    user.email,
          role:     roleDoc.name
        }
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
      data:    null,
      error:   err.message
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/users
// ─────────────────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  const users = await User.find().populate('role', 'name');
  res.json({ success: true, data: users });
});

// ─────────────────────────────────────────────────────────────────
// GET /api/users/gerentes
// ─────────────────────────────────────────────────────────────────
router.get('/gerentes', authenticate, async (req, res) => {
  try {
    const gerenteRole = await Role.findOne({ name: 'Gerente' });
    if (!gerenteRole) {
      return res.status(404).json({ success: false, message: 'Rol de Gerente no encontrado' });
    }
    const gerentes = await User.find({ role: gerenteRole._id, active: true })
      .populate('role', 'name description')
      .select('_id name role');

    res.json({ success: true, message: 'Gerentes obtenidos', data: gerentes, count: gerentes.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al obtener gerentes', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/users/asesores
// ─────────────────────────────────────────────────────────────────
router.get('/asesores', authenticate, async (req, res) => {
  try {
    const asesorRole = await Role.findOne({ name: 'Asesor' });
    if (!asesorRole) {
      return res.status(404).json({ success: false, message: 'Rol de Asesor no encontrado' });
    }
    const asesores = await User.find({ role: asesorRole._id, active: true })
      .populate('role', 'name description')
      .select('_id name role');

    res.json({ success: true, message: 'Asesores obtenidos', data: asesores, count: asesores.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al obtener asesores', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/users/by-role/:roleName
// ─────────────────────────────────────────────────────────────────
router.get('/by-role/:roleName', authenticate, async (req, res) => {
  try {
    const role = await Role.findOne({
      name: { $regex: new RegExp(`^${req.params.roleName}$`, 'i') }
    });
    if (!role) {
      return res.status(404).json({ success: false, message: `Rol "${req.params.roleName}" no encontrado` });
    }
    const users = await User.find({ role: role._id, active: true })
      .populate('role', 'name description')
      .select('_id name role');

    res.json({ success: true, data: users, count: users.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al obtener usuarios por rol', error: err.message });
  }
});

module.exports = router;