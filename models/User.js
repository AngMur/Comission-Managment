const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Información personal
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Por favor ingresa un email válido']
  },
  phone: {
    type: String,
    required: [true, 'Ingresa un número telefónico válido'],
    trim: true
  },
  blood_type: {
    type: String,
    required: [true, 'Tipo sanguineo es requerido'],
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
    default: ''
  },
  birth_date: {
    type: Date,  // Cambiado de String a Date
    required: [true, 'Ingresa una fecha de nacimiento válida']
  },
  
  // Contacto de emergencia
  emergency_contact_name: {
    type: String,
    required: [true, 'Contacto de emergencia requerido'],
    trim: true
  },
  emergency_contact_phone: {
    type: String,
    required: [true, 'Ingresa un número telefónico válido'],
    trim: true
  },
  
  // Imagen de perfil
  picture: {
    type: String,
    required: [true, 'Imágen requerida'],
    default: ''
  },
  
  // Autenticación y autorización
  username: {
    type: String,
    required: [true, 'El username es requerido'],
    unique: true,
    trim: true,
    minlength: [3, 'El username debe tener al menos 3 caracteres']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [5, 'La contraseña debe tener al menos 5 caracteres']
  },
  
  // CORREGIDO: Role como ObjectId
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'El rol es requerido']
  },
  
  // CORREGIDO: Permissions como array de ObjectIds
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Especificar permisos requeridos'],
    ref: 'Permission'
  }],
  
  // Estado del usuario
  active: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true,  // Agrega createdAt y updatedAt automáticamente
  strict: true       // Cambiado a true para mejor validación
});


module.exports = mongoose.model('users', userSchema);
