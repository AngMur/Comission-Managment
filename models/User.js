const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  blood_type: String,
  birthday: String,
  emergency_contact_name: String,
  emergency_contact_phone: String,
  picture: String,
  role: String,
  username: String,
  password: String,
  permissions: [],
  active: Boolean
}, { strict: false });


module.exports = mongoose.model('users', userSchema);
