// models/CommissionVerification.js
const mongoose = require('mongoose');

const commissionVerificationSchema = new mongoose.Schema({

  commission_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commission',
    required: true
  },

  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },

  // Rol que tenía en esta comisión
  role: {
    type: String,
    enum: ['gerente', 'asesor'],
    required: true
  },

  verified:    { type: Boolean, default: false },
  verified_at: { type: Date,    default: null  },

  // Se incrementa cada vez que la comisión vuelve a pendiente por corrección
  verification_round: { type: Number, default: 1, min: 1 },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }

}, { versionKey: false, timestamps: false });

// Un participante solo tiene un registro por comisión
commissionVerificationSchema.index(
  { commission_id: 1, user_id: 1 },
  { unique: true }
);
commissionVerificationSchema.index({ user_id: 1, verified: 1 });
commissionVerificationSchema.index({ commission_id: 1, verified: 1 });

// Actualiza updated_at antes de cualquier save
commissionVerificationSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('CommissionVerification', commissionVerificationSchema);