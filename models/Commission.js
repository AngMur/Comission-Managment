// ==========================================
// models/Commission.js
// ==========================================
const mongoose = require('mongoose');

// --- Sub-schema: participante ---
const participantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: [true, 'El usuario del participante es requerido']
  },
  percentage: {
    type: Number,
    required: [true, 'El porcentaje es requerido'],
    min: [0, 'El porcentaje no puede ser negativo'],
    max: [100, 'El porcentaje no puede superar 100']
  },
  commission: {
    type: Number,
    required: [true, 'La comisión es requerida'],
    min: [0, 'La comisión no puede ser negativa']
  }
}, { _id: false });

// --- Sub-schema: participants ---
const participantsSchema = new mongoose.Schema({
  managers: { type: [participantSchema], default: [] },
  advisors:  { type: [participantSchema], default: [] }
}, { _id: false });

// --- Schema principal: commission ---
const commissionSchema = new mongoose.Schema({

  company: {
    id:   { type: String, required: [true, 'El ID de compañía es requerido'],   trim: true },
    text: { type: String, required: [true, 'El nombre de compañía es requerido'], trim: true }
  },
  development: {
    id:   { type: String, required: [true, 'El ID de desarrollo es requerido'],   trim: true },
    text: { type: String, required: [true, 'El nombre de desarrollo es requerido'], trim: true }
  },
  location: {
    id:   { type: String, required: [true, 'El ID de ubicación es requerido'],   trim: true },
    text: { type: String, required: [true, 'El nombre de ubicación es requerido'], trim: true }
  },
  concept: {
    id:   { type: String, required: [true, 'El ID de concepto es requerido'],   trim: true },
    text: { type: String, required: [true, 'El nombre de concepto es requerido'], trim: true }
  },

  commission_type: {
    type: String, required: [true, 'El tipo de comisión es requerido'], trim: true
  },

  sale_price: {
    type: Number, required: [true, 'El precio de venta es requerido'], min: [0, 'El precio de venta no puede ser negativo']
  },

  operation_date: { type: String, trim: true, default: null },
  register_date:  { type: String, trim: true, default: null },

  status: {
    type: String, required: [true, 'El status es requerido'], trim: true, default: 'Pendiente'
  },

  participants: {
    type: participantsSchema, required: [true, 'Los participantes son requeridos']
  },

  // ── Quién registró la comisión ────────────────────────────────
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'users',
    required: [true, 'El usuario que registra la comisión es requerido']
  },

  // ── Workflow ──────────────────────────────────────────────────
  // Nota activa de corrección (se limpia al avanzar de status)
  correction_note: {
    type: String,
    default: null,
    trim: true
  },

  // Revisión del Director (se llena cuando aprueba o manda a corrección)
  director_review: {
    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'users', default: null },
    reviewed_at:  { type: Date,   default: null },
    action:       { type: String, enum: ['aprobada', 'correccion', null], default: null }
  },

  // Revisión del Administrador
  admin_review: {
    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'users', default: null },
    reviewed_at:  { type: Date,   default: null },
    action:       { type: String, enum: ['pagada', 'correccion', null], default: null }
  }

}, {
  timestamps: true,
  strict:     true,
  versionKey: false,
  toJSON: {
    transform: (doc, ret) => {
      const opts = {
        timeZone: 'America/Mexico_City',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      };
      if (ret.createdAt) ret.createdAt = new Intl.DateTimeFormat('es-MX', opts).format(new Date(ret.createdAt));
      if (ret.updatedAt) ret.updatedAt = new Intl.DateTimeFormat('es-MX', opts).format(new Date(ret.updatedAt));
      return ret;
    }
  }
});

// Índices
commissionSchema.index({ 'participants.managers.user': 1 });
commissionSchema.index({ 'participants.advisors.user': 1 });
commissionSchema.index({ created_by: 1 });
commissionSchema.index({ status: 1 });
commissionSchema.index({ 'concept.id': 1 });
commissionSchema.index({ 'company.id': 1, 'development.id': 1 });
commissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Commission', commissionSchema);