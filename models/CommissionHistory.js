// models/CommissionHistory.js
const mongoose = require('mongoose');

const commissionHistorySchema = new mongoose.Schema({

  commission_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commission',
    required: true
  },

  action: {
    type: String,
    required: true,
    enum: [
      'registrada',
      'verificada',
      'aprobada',
      'pagada',
      'correccion',
      'participante_verifico'
    ]
  },

  performed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },

  from_status: {
    type: String,
    required: true,
    enum: ['pendiente', 'verificada', 'aprobada', 'pagada', 'correccion']
  },

  to_status: {
    type: String,
    required: true,
    enum: ['pendiente', 'verificada', 'aprobada', 'pagada', 'correccion']
  },

  // Solo se llena cuando action = 'correccion'
  note: { type: String, default: null, trim: true },

  created_at: { type: Date, default: Date.now }

}, {
  versionKey: false,
  timestamps: false
});

commissionHistorySchema.index({ commission_id: 1, created_at: -1 });
commissionHistorySchema.index({ performed_by: 1 });

// Inmutable — bloquea updates accidentales
commissionHistorySchema.pre(['updateOne', 'findOneAndUpdate'], function () {
  throw new Error('CommissionHistory es inmutable. Solo se puede insertar.');
});

module.exports = mongoose.model('CommissionHistory', commissionHistorySchema);