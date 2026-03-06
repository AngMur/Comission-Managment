const mongoose = require('mongoose');

const permissionsSchema = new mongoose.Schema({
  from_role:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  custom_add:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  custom_remove: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }]
}, { _id: false });

const userSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  blood_type: {
    type: String, required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''], default: ''
  },
  birth_date:              { type: Date,   required: true },
  emergency_contact_name:  { type: String, required: true, trim: true },
  emergency_contact_phone: { type: String, required: true, trim: true },
  picture:                 { type: String, default: '' },

  username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
  password: { type: String, required: true, select: false },  // nunca se expone en queries

  role:        { type: mongoose.Schema.Types.ObjectId, ref: 'Role',       required: true },
  permissions: { type: permissionsSchema, default: () => ({ from_role: [], custom_add: [], custom_remove: [] }) },

  active:     { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: false, strict: true });

module.exports = mongoose.model('users', userSchema);