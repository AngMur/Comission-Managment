const express = require('express');
const router = express.Router();
const User = require('../models/User');
const mongoose = require('mongoose');


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
