const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const mongoose = require('mongoose');

//Get Roles
router.get('/', async (req, res) => {
  try {
    const roles = await Role.find();
    
    res.status(200).json({
      success: true,
      message: "Roles obtenidos correctamente",
      data: {
        roles: roles
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener los roles",
      data: null,
      error: error.message
    });
  }
});

module.exports = router;
