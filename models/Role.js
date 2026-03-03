const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del rol es requerido'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'La descripción es requerida'],
    trim: true,
    default: ''
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Los permisos son requeridos'],
    ref: 'Permission'
  }]
}, {
  timestamps: true,
  strict: true
});


module.exports = mongoose.model('Role', roleSchema);