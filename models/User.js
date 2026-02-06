const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nombre: String,
  correo: String,
  telefono: String,
  tipo_sangre: String,
  fecha_nacimiento: String,
  nombre_contacto_emergencia: String,
  telefono_contacto_emergencia: String,
  foto: String,
  rol: String,
  nombre_usuario: String,
  password: String,
  permisos: [],
  activo: Boolean
}, { strict: false });


module.exports = mongoose.model('usuarios', userSchema);
