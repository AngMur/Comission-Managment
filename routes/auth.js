const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      username: username,
      password: password,
      active: true
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Usuario o contraseña incorrectos",
        data: null
      });
    }

    res.status(200).json({
      success: true,
      message: "Login correcto",
      data: {
        user: user
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Error en el servidor",
      data: null,
      error: error.message
    });
  }
});

module.exports = router;
