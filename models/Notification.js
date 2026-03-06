// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({

  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },

  type: {
    type: String,
    required: true,
    enum: [
      'correccion_solicitada',  // todos los participantes
      'comision_verificada',    // Director
      'comision_aprobada',      // participantes + Administrador
      'comision_pagada',        // todos los participantes
      'participante_verifico'   // creador (informativo)
    ]
  },

  title: { type: String, required: true, trim: true },
  body:  { type: String, required: true, trim: true },

  commission_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commission',
    default: null
  },

  // Datos extra: quién hizo la acción, nota de corrección, etc.
  meta: { type: mongoose.Schema.Types.Mixed, default: null },

  read:    { type: Boolean, default: false },
  read_at: { type: Date,    default: null  },

  created_at: { type: Date, default: Date.now }

}, {
  versionKey: false,
  timestamps: false
});

// Índice principal del buzón: "dame las no leídas del usuario, más recientes primero"
notificationSchema.index({ user_id: 1, read: 1, created_at: -1 }, { name: 'inbox_query' });
notificationSchema.index({ commission_id: 1 });

// TTL: las notificaciones se eliminan automáticamente a los 90 días
notificationSchema.index({ created_at: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Notification', notificationSchema);