const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del permiso es requerido'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  module: {
    type: String,
    required: [true, 'El módulo es requerido'],
    trim: true,
    enum: ['Usuarios', 'Reportes', 'Comisiones', 'Seguridad'] // Módulos permitidos
  }
}, {
  timestamps: true,
  strict: true
});


module.exports = mongoose.model('Permission', permissionSchema);