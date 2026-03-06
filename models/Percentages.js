const mongoose = require('mongoose');

const RolesSchema = new mongoose.Schema({
  manager:  Number,
  advisor:  Number,
  manager1: Number,
  manager2: Number,
  advisor1: Number,
  advisor2: Number,
}, { _id: false });

const VersionSchema = new mongoose.Schema({
  traditional: RolesSchema,
  shared:      RolesSchema,
  multipoint:  RolesSchema,
}, { _id: false });

const PercentageSchema = new mongoose.Schema({
  v1: VersionSchema,
  v2: VersionSchema, // ya listo para cuando agregues más
}, { 
  collection: 'Percentages',
  strict: false, // permite versiones dinámicas como v3, v4...
});

// Método para obtener la versión más reciente dinámicamente
PercentageSchema.methods.getLatest = function () {
  const keys = Object.keys(this.toObject())
    .filter(k => k.startsWith('v'))
    .sort();
  const latestKey = keys[keys.length - 1];
  return { version: latestKey, rates: this[latestKey] };
};

module.exports = mongoose.model('Percentages', PercentageSchema, "percentages");