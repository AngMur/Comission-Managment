// routes/notifications.js
const express      = require('express');
const router       = express.Router();
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

// ─────────────────────────────────────────────────────────────────
// GET /api/notifications
// Devuelve todas las notificaciones del usuario autenticado.
// ?unread=true  → solo las no leídas
// ?limit=20     → cuántas traer (default 30)
// ─────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const filter = { user_id: req.user.id };
    if (req.query.unread === 'true') filter.read = false;

    const limit = parseInt(req.query.limit) || 30;

    const notifications = await Notification
      .find(filter)
      .sort({ created_at: -1 })
      .limit(limit)
      .populate('commission_id', 'development status');

    const unreadCount = await Notification.countDocuments({ user_id: req.user.id, read: false });

    res.json({ success: true, data: notifications, unread_count: unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// PATCH /api/notifications/:id/read
// Marca una notificación como leída
// ─────────────────────────────────────────────────────────────────
router.patch('/:id/read', async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { read: true, read_at: new Date() },
      { new: true }
    );
    if (!notif) return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
    res.json({ success: true, data: notif });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// PATCH /api/notifications/read-all
// Marca todas las notificaciones del usuario como leídas
// ─────────────────────────────────────────────────────────────────
router.patch('/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: req.user.id, read: false },
      { read: true, read_at: new Date() }
    );
    res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;