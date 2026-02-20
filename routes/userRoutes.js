const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');


const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');


// Register
router.post("/register", async (req, res) => {
  try {
    const {
      username,
      password,
      role,
      name,
      email,
      phone,
      blood_type,
      birth_date,
      emergency_contact_name,
      emergency_contact_phone
    } = req.body;
    console.log(username);
    const userExists = await User.findOne({ username });
    console.log(userExists);
    if (userExists) {
      return res.status(400).json({ 
        success: false,
        message: "El usuario ya existe",
        data: null
      });
    }

    // const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      password,
      role,
      name,
      email,
      phone,
      blood_type,
      birth_date,
      emergency_contact_name,
      emergency_contact_phone,
      active : true
    });

    await user.save();

    res.status(201).json({ 
      success: true,
      message: "Usuario creado correctamente",
      data: {
        user: {
          id: user._id,
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email
        }
      }
    });

  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: "Error al registrar usuario",
      data: null,
      error: err.message
    });
  }
});

// Crear usuario
router.post('/', async (req, res) => {
  const user = new User(req.body);
  const saved = await user.save();
  res.json(saved);
});

// Obtener usuarios
router.get('/', async (req, res) => {
  const users = await User.find();
  res.json(users);
});


// Obtener usuarios con rol de Gerente
router.get('/gerentes', async (req, res) => {
  try {
    // Primero buscar el rol de Gerente
    const gerenteRole = await Role.findOne({ name: "Gerente" });
    
    console.log(gerenteRole);

    if (!gerenteRole) {
      return res.status(404).json({
        success: false,
        message: "Rol de Gerente no encontrado",
        data: null
      });
    }

    // Buscar usuarios con ese rol
    const gerentes = await User.find({ 
      role: gerenteRole._id.toString(),
      active: true // Solo usuarios activos
    })
    .populate('role', 'name description')
    .select('_id name role'); // Excluir password

    console.log(gerentes);

    res.json({
      success: true,
      message: "Gerentes obtenidos correctamente",
      data: gerentes,
      count: gerentes.length
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error al obtener gerentes",
      data: null,
      error: err.message
    });
  }
});

// Obtener usuarios con rol de Asesor
router.get('/asesores', async (req, res) => {
  try {
    // Primero buscar el rol de Asesor
    const asesorRole = await Role.findOne({ name: "Asesor" });
    
    if (!asesorRole) {
      return res.status(404).json({
        success: false,
        message: "Rol de Asesor no encontrado",
        data: null
      });
    }

    // Buscar usuarios con ese rol
    const asesores = await User.find({ 
      role: asesorRole._id.toString(),
      active: true // Solo usuarios activos
    })
    .populate('role', 'name description')
    .select('_id name role');

    res.json({
      success: true,
      message: "Asesores obtenidos correctamente",
      data: asesores,
      count: asesores.length
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error al obtener asesores",
      data: null,
      error: err.message
    });
  }
});

// Endpoint genérico para obtener usuarios por cualquier rol
router.get('/by-role/:roleName', async (req, res) => {
  try {
    const { roleName } = req.params;
    
    // Buscar el rol por nombre
    const role = await Role.findOne({ 
      name: { $regex: new RegExp(`^${roleName}$`, 'i') } // Case insensitive
    });
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: `Rol "${roleName}" no encontrado`,
        data: null
      });
    }

    // Buscar usuarios con ese rol
    const users = await User.find({ 
      role: role._id,
      active: true
    })
    .populate('role', 'name description')
    .select('_id name role');

    res.json({
      success: true,
      message: `Usuarios con rol ${role.name} obtenidos correctamente`,
      data: users,
      count: users.length
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error al obtener usuarios por rol",
      data: null,
      error: err.message
    });
  }
});


module.exports = router;
