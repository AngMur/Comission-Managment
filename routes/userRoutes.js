const express = require('express');
const router = express.Router();
const User = require('../models/User');
const mongoose = require('mongoose');


// Register
router.post("/register", async (req, res) => {
  try {
    const {
      username,
      password,
      role,
      fullName,
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
      fullName,
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
          fullName: user.fullName,
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

module.exports = router;
