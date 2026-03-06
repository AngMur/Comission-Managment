const express = require('express');
const router = express.Router();
const Percentages = require('../models/Percentages');
const Role = require('../models/Role');

// Helper para obtener el documento y la versión más reciente
const getLatestRates = async () => {
  const doc = await Percentages.findOne();
  if (!doc) return null;
  return doc.getLatest();
};

// GET /Percentagess
// Retorna toda la versión activa
router.get('/', async (req, res) => {
  const data = await getLatestRates();
  if (!data) return res.status(404).json({ error: 'No hay comisiones registradas' });
  res.json(data);
});

// GET /Percentagess/:type
// Ej: /Percentagess/traditional
router.get('/:type', async (req, res) => {
  const { type } = req.params;
  const data = await getLatestRates();

  if (!data) return res.status(404).json({ error: 'No hay comisiones registradas' });
  if (!data.rates[type]) return res.status(404).json({ error: `Tipo '${type}' no encontrado` });

  res.json({ version: data.version, type, rates: data.rates[type] });
});

// GET /Percentagess/:type/:role
// Ej: /Percentagess/traditional/manager
router.get('/:type/:role', async (req, res) => {
  const { type, role } = req.params;
  const data = await getLatestRates();

  if (!data) return res.status(404).json({ error: 'No hay comisiones registradas' });
  if (!data.rates[type]) return res.status(404).json({ error: `Tipo '${type}' no encontrado` });
  if (data.rates[type][role] === undefined) return res.status(404).json({ error: `Rol '${role}' no encontrado` });

  res.json({ version: data.version, type, role, rate: data.rates[type][role] });
});

module.exports = router;