// services/commissionService.js
// ─────────────────────────────────────────────────────────────────
// Toda la lógica de negocio del flujo de comisiones.
// Las rutas solo llaman a estas funciones — nunca manipulan
// modelos directamente.
// ─────────────────────────────────────────────────────────────────
const Commission             = require('../models/Commission');
const CommissionVerification = require('../models/CommissionVerification');
const CommissionHistory      = require('../models/CommissionHistory');
const Notification           = require('../models/Notification');
const User                   = require('../models/User');

// ─────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────

/**
 * Inserta un registro en commission_history.
 */
async function _logHistory(commissionId, performedBy, action, fromStatus, toStatus, note = null) {
  await CommissionHistory.create({
    commission_id: commissionId,
    performed_by:  performedBy,
    action,
    from_status:   fromStatus,
    to_status:     toStatus,
    note,
    created_at:    new Date()
  });
}

/**
 * Crea una notificación para un usuario.
 */
async function _notify(userId, type, title, body, commissionId, meta = null) {
  await Notification.create({
    user_id:       userId,
    type,
    title,
    body,
    commission_id: commissionId,
    meta,
    read:          false,
    created_at:    new Date()
  });
}

/**
 * Notifica a todos los participantes de una comisión.
 */
async function _notifyAllParticipants(commission, type, title, body, meta = null) {
  const participantIds = [
    ...commission.participants.managers.map(m => m.user),
    ...commission.participants.advisors.map(a => a.user)
  ];
  // También notificar al creador si no es participante
  const allIds = [...new Set([
    ...participantIds.map(id => id.toString()),
    commission.created_by.toString()
  ])];

  await Promise.all(
    allIds.map(id => _notify(id, type, title, body, commission._id, meta))
  );
}

/**
 * Devuelve todos los IDs de participantes (managers + advisors) de una comisión.
 */
function _getParticipantIds(commission) {
  return [
    ...commission.participants.managers.map(m => m.user.toString()),
    ...commission.participants.advisors.map(a => a.user.toString())
  ];
}

/**
 * Devuelve el role de un usuario dentro de una comisión ('gerente' | 'asesor' | null).
 */
function _getRoleInCommission(commission, userId) {
  const id = userId.toString();
  if (commission.participants.managers.some(m => m.user.toString() === id)) return 'gerente';
  if (commission.participants.advisors.some(a => a.user.toString() === id))  return 'asesor';
  return null;
}

// ─────────────────────────────────────────────────────────────────
// 1. CREAR COMISIÓN
// ─────────────────────────────────────────────────────────────────
/**
 * Crea la comisión, genera las verificaciones para cada participante
 * y registra el evento en el historial.
 */
async function createCommission(data, createdById) {
  const commission = await Commission.create({
    ...data,
    created_by:      createdById,
    status:          'pendiente',
    correction_note: null,
    director_review: { reviewed_by: null, reviewed_at: null, action: null },
    admin_review:    { reviewed_by: null, reviewed_at: null, action: null }
  });

  // Crear un registro de verificación por cada participante
  const managers = commission.participants.managers.map(m => ({
    commission_id:       commission._id,
    user_id:             m.user,
    role:                'gerente',
    verified:            false,
    verified_at:         null,
    verification_round:  1,
    created_at:          new Date(),
    updated_at:          new Date()
  }));
  const advisors = commission.participants.advisors.map(a => ({
    commission_id:       commission._id,
    user_id:             a.user,
    role:                'asesor',
    verified:            false,
    verified_at:         null,
    verification_round:  1,
    created_at:          new Date(),
    updated_at:          new Date()
  }));

  await CommissionVerification.insertMany([...managers, ...advisors]);

  // Historial
  await _logHistory(commission._id, createdById, 'registrada', 'pendiente', 'pendiente');

  // Notificar a todos los participantes que hay una comisión pendiente de verificación
  await _notifyAllParticipants(
    commission,
    'participante_verifico',
    'Nueva comisión registrada',
    `Se registró la comisión "${commission.development.text}". Por favor verifica tu información.`,
    { registered_by: createdById }
  );

  return commission;
}

// ─────────────────────────────────────────────────────────────────
// 2. VERIFICAR PARTICIPANTE
// ─────────────────────────────────────────────────────────────────
/**
 * Marca la verificación de un participante.
 * Si todos verificaron → avanza a "verificada" y notifica al Director.
 */
async function verifyParticipant(commissionId, userId) {
  const commission = await Commission.findById(commissionId);
  if (!commission) throw new Error('Comisión no encontrada');
  if (commission.status !== 'pendiente') {
    throw new Error('Solo se puede verificar cuando la comisión está en estado Pendiente');
  }

  const role = _getRoleInCommission(commission, userId);
  if (!role) throw new Error('No eres participante de esta comisión');

  // Actualizar verificación
  const verification = await CommissionVerification.findOneAndUpdate(
    { commission_id: commissionId, user_id: userId },
    { verified: true, verified_at: new Date(), updated_at: new Date() },
    { new: true }
  );
  if (!verification) throw new Error('Registro de verificación no encontrado');

  // Historial
  await _logHistory(commission._id, userId, 'participante_verifico', 'pendiente', 'pendiente');

  // Notificar al creador
  if (commission.created_by.toString() !== userId.toString()) {
    const user = await User.findById(userId).select('name username');
    await _notify(
      commission.created_by,
      'participante_verifico',
      'Participante verificó',
      `${user?.name || user?.username} verificó su información en "${commission.development.text}".`,
      commission._id,
      { verified_by: userId }
    );
  }

  // ¿Todos verificaron?
  const allVerifications = await CommissionVerification.find({ commission_id: commissionId });
  const allDone = allVerifications.every(v => v.verified);

  if (allDone) {
    commission.status = 'verificada';
    commission.correction_note = null;
    await commission.save();

    await _logHistory(commission._id, userId, 'verificada', 'pendiente', 'verificada');

    // Buscar usuarios con rol Director para notificarles
    const directors = await User.find({}).populate('role').then(users =>
      users.filter(u => u.role?.name === 'Director')
    );
    await Promise.all(
      directors.map(d => _notify(
        d._id,
        'comision_verificada',
        'Comisión lista para revisión',
        `La comisión "${commission.development.text}" fue verificada por todos los participantes y está lista para tu aprobación.`,
        commission._id
      ))
    );
  }

  return { verification, allVerified: allDone, commission };
}

// ─────────────────────────────────────────────────────────────────
// 3. ACCIÓN DEL DIRECTOR (aprobar | correccion)
// ─────────────────────────────────────────────────────────────────
async function directorAction(commissionId, directorId, action, note = null) {
  const commission = await Commission.findById(commissionId);
  if (!commission) throw new Error('Comisión no encontrada');
  if (!['verificada'].includes(commission.status)) {
    throw new Error('La comisión debe estar en estado Verificada para que el Director actúe');
  }
  if (action !== 'aprobada' && action !== 'correccion') {
    throw new Error('Acción inválida. Usa "aprobada" o "correccion"');
  }

  const fromStatus = commission.status;
  commission.director_review = {
    reviewed_by: directorId,
    reviewed_at: new Date(),
    action
  };

  if (action === 'aprobada') {
    commission.status = 'aprobada';
    commission.correction_note = null;
    await commission.save();

    await _logHistory(commission._id, directorId, 'aprobada', fromStatus, 'aprobada');

    // Notificar a participantes y a Administradores
    await _notifyAllParticipants(
      commission,
      'comision_aprobada',
      'Comisión aprobada',
      `La comisión "${commission.development.text}" fue aprobada por la Dirección.`
    );

    const admins = await User.find({}).populate('role').then(users =>
      users.filter(u => u.role?.name === 'Administrador')
    );
    await Promise.all(
      admins.map(a => _notify(
        a._id,
        'comision_aprobada',
        'Comisión lista para pago',
        `La comisión "${commission.development.text}" fue aprobada y está lista para ser marcada como pagada.`,
        commission._id
      ))
    );

  } else {
    // correccion
    commission.status = 'correccion';
    commission.correction_note = note || 'Favor de revisar la información.';
    await commission.save();

    // Reset de todas las verificaciones
    await _resetVerifications(commissionId);

    await _logHistory(commission._id, directorId, 'correccion', fromStatus, 'correccion', commission.correction_note);

    // Notificar a TODOS los participantes
    await _notifyAllParticipants(
      commission,
      'correccion_solicitada',
      'Corrección solicitada',
      `La comisión "${commission.development.text}" requiere corrección: ${commission.correction_note}`,
      { note: commission.correction_note, requested_by: directorId }
    );
  }

  return commission;
}

// ─────────────────────────────────────────────────────────────────
// 4. ACCIÓN DEL ADMINISTRADOR (pagada | correccion)
// ─────────────────────────────────────────────────────────────────
async function adminAction(commissionId, adminId, action, note = null) {
  const commission = await Commission.findById(commissionId);
  if (!commission) throw new Error('Comisión no encontrada');
  if (commission.status !== 'aprobada') {
    throw new Error('La comisión debe estar en estado Aprobada para que el Administrador actúe');
  }
  if (action !== 'pagada' && action !== 'correccion') {
    throw new Error('Acción inválida. Usa "pagada" o "correccion"');
  }

  const fromStatus = commission.status;
  commission.admin_review = {
    reviewed_by: adminId,
    reviewed_at: new Date(),
    action
  };

  if (action === 'pagada') {
    commission.status = 'pagada';
    commission.correction_note = null;
    await commission.save();

    await _logHistory(commission._id, adminId, 'pagada', fromStatus, 'pagada');

    await _notifyAllParticipants(
      commission,
      'comision_pagada',
      'Comisión pagada',
      `La comisión "${commission.development.text}" ha sido marcada como pagada.`
    );

  } else {
    // correccion desde admin → regresa a pendiente y resetea todo
    commission.status = 'correccion';
    commission.correction_note = note || 'Favor de revisar la información.';
    commission.director_review = { reviewed_by: null, reviewed_at: null, action: null };
    await commission.save();

    await _resetVerifications(commissionId);

    await _logHistory(commission._id, adminId, 'correccion', fromStatus, 'correccion', commission.correction_note);

    await _notifyAllParticipants(
      commission,
      'correccion_solicitada',
      'Corrección solicitada',
      `La comisión "${commission.development.text}" requiere corrección: ${commission.correction_note}`,
      { note: commission.correction_note, requested_by: adminId }
    );
  }

  return commission;
}

// ─────────────────────────────────────────────────────────────────
// 5. OBTENER COMISIONES (con filtro por rol/participación)
// ─────────────────────────────────────────────────────────────────
async function getCommissions(userId, userPermissions) {
  let filter = {};

  // SuperUsuario / Administrador / Director ven todas
  const seeAll = userPermissions.includes('eliminar_comision')
    || userPermissions.includes('ver_reportes');

  if (!seeAll) {
    // Gerentes y Asesores: solo las suyas
    filter = {
      $or: [
        { 'participants.managers.user': userId },
        { 'participants.advisors.user': userId },
        { created_by: userId }
      ]
    };
  }

  return Commission
    .find(filter)
    .populate('created_by', 'name username')
    .populate('director_review.reviewed_by', 'name username')
    .populate('admin_review.reviewed_by', 'name username')
    .sort({ createdAt: -1 });
}

// ─────────────────────────────────────────────────────────────────
// 6. OBTENER ESTADO DE VERIFICACIONES DE UNA COMISIÓN
// ─────────────────────────────────────────────────────────────────
async function getVerifications(commissionId) {
  return CommissionVerification
    .find({ commission_id: commissionId })
    .populate('user_id', 'name username picture');
}

// ─────────────────────────────────────────────────────────────────
// 7. OBTENER HISTORIAL DE UNA COMISIÓN
// ─────────────────────────────────────────────────────────────────
async function getHistory(commissionId) {
  return CommissionHistory
    .find({ commission_id: commissionId })
    .populate('performed_by', 'name username')
    .sort({ created_at: 1 });
}

// ─────────────────────────────────────────────────────────────────
// HELPER INTERNO — resetear verificaciones al volver a pendiente
// ─────────────────────────────────────────────────────────────────
async function _resetVerifications(commissionId) {
  // Incrementa el round y resetea verified en todos los participantes
  await CommissionVerification.updateMany(
    { commission_id: commissionId },
    {
      $set:  { verified: false, verified_at: null, updated_at: new Date() },
      $inc:  { verification_round: 1 }
    }
  );
}

// ─────────────────────────────────────────────────────────────────
module.exports = {
  createCommission,
  verifyParticipant,
  directorAction,
  adminAction,
  getCommissions,
  getVerifications,
  getHistory
};