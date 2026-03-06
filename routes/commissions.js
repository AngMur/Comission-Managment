// routes/commissions.js
const express  = require('express');
const router   = express.Router();
const svc      = require('../services/commissionService');
const { authenticate, authorizePermission, hasPermission } = require('../middleware/authMiddleware');

router.use(authenticate);

// ─── Campos de usuario que se populan en todas las respuestas ───────────────
// Ajusta los nombres de campo según tu modelo User
const USER_FIELDS = 'name username role profile_image';

// Helper: popula todos los campos de usuario en una comisión.
// 'verifications.user' usa strictPopulate: false porque el nombre exacto
// del campo puede variar según el schema — cámbialo al nombre real si lo sabes.
function populateCommission(query) {
  return query
    .populate('created_by',                  USER_FIELDS)
    .populate('participants.managers.user',  USER_FIELDS)
    .populate('participants.advisors.user',  USER_FIELDS)
    .populate('director_review.reviewed_by', USER_FIELDS)
    .populate('admin_review.reviewed_by',    USER_FIELDS)
    .populate({ path: 'verifications.user', select: USER_FIELDS, strictPopulate: false });
}

// GET /api/commission
router.get('/', authorizePermission('ver_comisiones'), async (req, res) => {
  try {
    const commissions = await svc.getCommissions(req.user.id, req.user.permissions);
    res.json({ success: true, data: commissions, total: commissions.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/commission/:id
router.get('/:id', authorizePermission('ver_comisiones'), async (req, res) => {
  try {
    const Commission = require('../models/Commission');

    const commission = await populateCommission(Commission.findById(req.params.id));

    if (!commission)
      return res.status(404).json({ success: false, message: 'Comisión no encontrada' });

    // Verificar acceso: admins/directores ven todo, el resto solo sus comisiones
    if (!hasPermission(req, 'eliminar_comision') && !hasPermission(req, 'ver_reportes')) {
      const ids = [
        ...commission.participants.managers.map(m => m.user?._id?.toString() ?? m.user.toString()),
        ...commission.participants.advisors.map(a => a.user?._id?.toString() ?? a.user.toString()),
        commission.created_by?._id?.toString() ?? commission.created_by.toString(),
      ];
      if (!ids.includes(req.user.id))
        return res.status(403).json({ success: false, message: 'No tienes acceso a esta comisión' });
    }

    res.json({ success: true, data: commission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/commission  (también /save para compatibilidad)
router.post(['/', '/save'], authorizePermission('crear_comision'), async (req, res) => {
  try {
    const commission = await svc.createCommission(req.body, req.user.id);

    const Commission = require('../models/Commission');
    const populated  = await populateCommission(Commission.findById(commission._id));

    res.status(201).json({
      success: true,
      message: 'Comisión registrada correctamente',
      data:    populated,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/commission/:id  — solo el creador, solo en pendiente/correccion
router.put('/:id', authorizePermission('editar_comision'), async (req, res) => {
  try {
    const Commission = require('../models/Commission');
    const commission = await Commission.findById(req.params.id);

    if (!commission)
      return res.status(404).json({ success: false, message: 'Comisión no encontrada' });

    const creatorId = commission.created_by?._id?.toString() ?? commission.created_by.toString();
    if (creatorId !== req.user.id)
      return res.status(403).json({ success: false, message: 'Solo el creador puede editar esta comisión' });

    if (!['pendiente', 'correccion'].includes(commission.status))
      return res.status(400).json({
        success: false,
        message: `No se puede editar en estado "${commission.status}"`,
      });

    const { created_by, director_review, admin_review, status, ...updateData } = req.body;

    await Commission.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

    const updated = await populateCommission(Commission.findById(req.params.id));
    res.json({ success: true, message: 'Comisión actualizada', data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/commission/:id
router.delete('/:id', authorizePermission('eliminar_comision'), async (req, res) => {
  try {
    const commission = await require('../models/Commission').findByIdAndDelete(req.params.id);
    if (!commission)
      return res.status(404).json({ success: false, message: 'Comisión no encontrada' });
    res.json({ success: true, message: 'Comisión eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/commission/:id/verify  — participante confirma su información
router.post('/:id/verify', async (req, res) => {
  try {
    const result = await svc.verifyParticipant(req.params.id, req.user.id);

    const Commission = require('../models/Commission');
    const commission = await populateCommission(Commission.findById(req.params.id));

    res.json({
      success:     true,
      message:     result.allVerified
        ? 'Todos verificaron — comisión avanzó a Verificada'
        : 'Verificación registrada',
      allVerified: result.allVerified,
      data:        commission,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/commission/:id/director  — { action: 'aprobada'|'correccion', note? }
router.post('/:id/director', authorizePermission('asignar_roles'), async (req, res) => {
  try {
    const { action, note } = req.body;
    await svc.directorAction(req.params.id, req.user.id, action, note);

    const Commission = require('../models/Commission');
    const commission = await populateCommission(Commission.findById(req.params.id));

    res.json({ success: true, message: `Comisión marcada como "${action}"`, data: commission });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/commission/:id/admin  — { action: 'pagada'|'correccion', note? }
router.post('/:id/admin', authorizePermission('eliminar_comision'), async (req, res) => {
  try {
    const { action, note } = req.body;
    await svc.adminAction(req.params.id, req.user.id, action, note);

    const Commission = require('../models/Commission');
    const commission = await populateCommission(Commission.findById(req.params.id));

    res.json({ success: true, message: `Comisión marcada como "${action}"`, data: commission });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/commission/:id/verifications
router.get('/:id/verifications', authorizePermission('ver_comisiones'), async (req, res) => {
  try {
    const Commission = require('../models/Commission');
    const commission = await Commission.findById(req.params.id)
      .populate({ path: 'verifications.user', select: USER_FIELDS, strictPopulate: false })
      .select('verifications status');

    if (!commission)
      return res.status(404).json({ success: false, message: 'Comisión no encontrada' });

    res.json({ success: true, data: commission.verifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/commission/:id/history
router.get('/:id/history', authorizePermission('ver_comisiones'), async (req, res) => {
  try {
    const history = await svc.getHistory(req.params.id);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;