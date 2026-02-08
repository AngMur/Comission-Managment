const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const mongoose = require('mongoose');

//Get Roles
router.get('/', async (req, res) => {
   const roles = await Role.find();
   res.json(roles);
});

module.exports = router;
