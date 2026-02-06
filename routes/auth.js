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
      return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
    }

    res.json({
      message: "Login correcto",
      user: user
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
