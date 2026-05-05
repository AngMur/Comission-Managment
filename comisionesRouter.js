const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const router = express.Router();
const DB_NAME = 'roles_usuarios';

// ─────────────────────────────────────────────
// GET /comisiones/pendientes-pago
// Lista comisiones con estatus "Pendiente Pago"
// ─────────────────────────────────────────────
router.get('/pendientes-pago', async (req, res) => {
  const client = req.app.locals.mongoClient;
  const db = client.db(DB_NAME);

  try {
    const statusPendientePago = await db.collection('estatus').findOne({ order: 5 });

    if (!statusPendientePago) {
      return res.status(404).json({ message: 'Estatus "Pendiente Pago" no encontrado' });
    }

    const comisiones = await db.collection('comisiones').aggregate([
      {
        $match: { status: statusPendientePago._id }
      },
      // Resolver usuarios de advisors
      {
        $lookup: {
          from: 'usuarios',
          localField: 'participants.advisors.user',
          foreignField: '_id',
          as: 'advisor_details'
        }
      },
      // Resolver usuarios de managers
      {
        $lookup: {
          from: 'usuarios',
          localField: 'participants.managers.user',
          foreignField: '_id',
          as: 'manager_details'
        }
      },
      // Resolver estatus
      {
        $lookup: {
          from: 'estatus',
          localField: 'status',
          foreignField: '_id',
          as: 'status_detail'
        }
      },
      {
        $project: {
          _id: 1,
          company: 1,
          development: 1,
          location: 1,
          concept: 1,
          commission_type: 1,
          sale_price: 1,
          operation_date: 1,
          register_date: 1,
          status: { $arrayElemAt: ['$status_detail', 0] },
          correction_comments: 1,
          participants: {
            advisors: {
              $map: {
                input: '$participants.advisors',
                as: 'advisor',
                in: {
                  user: {
                    $let: {
                      vars: {
                        match: {
                          $arrayElemAt: [
                            { $filter: { input: '$advisor_details', as: 'u', cond: { $eq: ['$$u._id', '$$advisor.user'] } } },
                            0
                          ]
                        }
                      },
                      in: { _id: '$$match._id', name: '$$match.name', username: '$$match.username' }
                    }
                  },
                  percentage: '$$advisor.percentage',
                  commission: '$$advisor.commission',
                  adjusted_commission: '$$advisor.adjusted_commission',
                  verification: '$$advisor.verification'
                }
              }
            },
            managers: {
              $map: {
                input: '$participants.managers',
                as: 'manager',
                in: {
                  user: {
                    $let: {
                      vars: {
                        match: {
                          $arrayElemAt: [
                            { $filter: { input: '$manager_details', as: 'u', cond: { $eq: ['$$u._id', '$$manager.user'] } } },
                            0
                          ]
                        }
                      },
                      in: { _id: '$$match._id', name: '$$match.name', username: '$$match.username' }
                    }                                           
                  },  
                  percentage: '$$manager.percentage',
                  commission: '$$manager.commission',
                  adjusted_commission: '$$manager.adjusted_commission',
                  verification: '$$manager.verification'
                }
              }
            }
          },
          created_at: 1,
          updated_at: 1
        }
      }
    ]).toArray();

    return res.status(200).json({
      total: comisiones.length,
      comisiones
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener comisiones pendientes de pago' });
  }
});


// ─────────────────────────────────────────────
// PATCH /comisiones/:id/marcar-pagada
// Cambia el estatus de una comisión a "Pagada"
// ─────────────────────────────────────────────
router.patch('/:id/marcar-pagada', async (req, res) => {
  const client = req.app.locals.mongoClient;
  const db = client.db(DB_NAME);

  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de comisión inválido' });
    }

    const statusPendientePago = await db.collection('estatus').findOne({ order: 5 });
    const statusPagada        = await db.collection('estatus').findOne({ order: 6 });

    if (!statusPendientePago || !statusPagada) {
      return res.status(404).json({ message: 'Estatus no encontrados' });
    }

    // Solo se puede marcar como pagada si está en "Pendiente Pago"
    const comision = await db.collection('comisiones').findOne({ _id: new ObjectId(id) });

    if (!comision) {
      return res.status(404).json({ message: 'Comisión no encontrada' });
    }

    if (comision.status.toString() !== statusPendientePago._id.toString()) {
      return res.status(400).json({
        message: 'La comisión no está en estatus "Pendiente Pago"',
        status_actual: comision.status
      });
    }

    const result = await db.collection('comisiones').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: statusPagada._id,
          updated_at: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({ message: 'No se pudo actualizar la comisión' });
    }

    return res.status(200).json({
      message: 'Comisión marcada como pagada exitosamente',
      comision_id: id,
      status: statusPagada.name
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al marcar comisión como pagada' });
  }
});

// ─────────────────────────────────────────────
// PATCH /comisiones/marcar-pagadas
// Cambia el estatus de varias comisiones a "Pagada"
// Body: { ids: ["id1", "id2", "id3"] }
// ─────────────────────────────────────────────
router.patch('/marcar-pagadas', async (req, res) => {
  const client = req.app.locals.mongoClient;
  const db = client.db(DB_NAME);

  try {
    const { ids } = req.body;

    // Validaciones del body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Debes enviar un array de IDs en el campo "ids"' });
    }

    // Validar que todos los IDs sean válidos
    const idsInvalidos = ids.filter(id => !ObjectId.isValid(id));
    if (idsInvalidos.length > 0) {
      return res.status(400).json({
        message: 'Los siguientes IDs son inválidos',
        ids_invalidos: idsInvalidos
      });
    }

    const objectIds = ids.map(id => new ObjectId(id));

    const statusPendientePago = await db.collection('estatus').findOne({ order: 5 });
    const statusPagada        = await db.collection('estatus').findOne({ order: 6 });

    if (!statusPendientePago || !statusPagada) {
      return res.status(404).json({ message: 'Estatus no encontrados' });
    }

    // Buscar todas las comisiones enviadas
    const comisiones = await db.collection('comisiones')
      .find({ _id: { $in: objectIds } })
      .toArray();

    // Verificar que todas existan
    const idsEncontrados = comisiones.map(c => c._id.toString());
    const idsNoEncontrados = ids.filter(id => !idsEncontrados.includes(id));

    // Separar las que sí están en "Pendiente Pago" de las que no
    const aptas = comisiones.filter(
      c => c.status.toString() === statusPendientePago._id.toString()
    );
    const noAptas = comisiones.filter(
      c => c.status.toString() !== statusPendientePago._id.toString()
    );

    if (aptas.length === 0) {
      return res.status(400).json({
        message: 'Ninguna de las comisiones enviadas está en estatus "Pendiente Pago"',
        no_aptas: noAptas.map(c => ({ id: c._id, status: c.status }))
      });
    }

    // Actualizar solo las aptas
    const idsAptas = aptas.map(c => c._id);
    const result = await db.collection('comisiones').updateMany(
      { _id: { $in: idsAptas } },
      {
        $set: {
          status: statusPagada._id,
          updated_at: new Date()
        }
      }
    );

    return res.status(200).json({
      message: `${result.modifiedCount} comisión(es) marcada(s) como pagada(s)`,
      total_enviadas: ids.length,
      pagadas: result.modifiedCount,
      ids_pagadas: idsAptas.map(id => id.toString()),
      ...(idsNoEncontrados.length > 0 && { ids_no_encontrados: idsNoEncontrados }),
      ...(noAptas.length > 0 && {
        no_aptas: noAptas.map(c => ({
          id: c._id.toString(),
          status: c.status
        }))
      })
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al marcar comisiones como pagadas' });
  }
});

// ─────────────────────────────────────────────
// POST /comisiones
// Registra una nueva comisión
// Body: participantes ya vienen con percentage y commission calculados
// ─────────────────────────────────────────────
router.post('/resgistrar-comision', async (req, res) => {
  const client = req.app.locals.mongoClient;
  const db = client.db(DB_NAME);

  try {
    const {
      company,
      development,
      location,
      concept,
      commission_type,
      sale_price,
      operation_date,
      register_date,
      created_by,
      participants
    } = req.body;

    // ── Validaciones de campos requeridos ──
    if (!company?.id || !company?.text)
      return res.status(400).json({ message: 'El campo "company" es requerido (id, text)' });

    if (!development?.id || !development?.text)
      return res.status(400).json({ message: 'El campo "development" es requerido (id, text)' });

    if (!location?.id || !location?.text)
      return res.status(400).json({ message: 'El campo "location" es requerido (id, text)' });

    if (!concept?.id || !concept?.text)
      return res.status(400).json({ message: 'El campo "concept" es requerido (id, text)' });

    const tiposValidos = ['Tradicional', 'Compartida', 'Multipunto'];
    if (!commission_type || !tiposValidos.includes(commission_type))
      return res.status(400).json({ message: `"commission_type" debe ser uno de: ${tiposValidos.join(', ')}` });

    if (!sale_price || isNaN(sale_price) || sale_price <= 0)
      return res.status(400).json({ message: '"sale_price" debe ser un número mayor a 0' });

    if (!operation_date)
      return res.status(400).json({ message: 'El campo "operation_date" es requerido' });

    if (!register_date)
      return res.status(400).json({ message: 'El campo "register_date" es requerido' });

    if (!created_by || !ObjectId.isValid(created_by))
      return res.status(400).json({ message: 'El campo "created_by" es requerido y debe ser un ID válido' });

    if (!participants?.advisors || !Array.isArray(participants.advisors) || participants.advisors.length === 0)
      return res.status(400).json({ message: 'Debe haber al menos un asesor en "participants.advisors"' });

    if (!participants?.managers || !Array.isArray(participants.managers) || participants.managers.length === 0)
      return res.status(400).json({ message: 'Debe haber al menos un gerente en "participants.managers"' });

    // ── Validar estructura de cada participante ──
    const todosParticipantes = [...participants.advisors, ...participants.managers];

    for (const p of todosParticipantes) {
      if (!ObjectId.isValid(p.user))
        return res.status(400).json({ message: `ID de usuario inválido: ${p.user}` });
      if (p.percentage === undefined || isNaN(p.percentage))
        return res.status(400).json({ message: `El campo "percentage" es requerido para el usuario ${p.user}` });
      if (p.commission === undefined || isNaN(p.commission))
        return res.status(400).json({ message: `El campo "commission" es requerido para el usuario ${p.user}` });
    }

    // ── Verificar que los usuarios existan en DB ──
    const userIds = todosParticipantes.map(p => new ObjectId(p.user));
    const usuariosEncontrados = await db.collection('usuarios')
      .find({ _id: { $in: userIds } })
      .toArray();

    if (usuariosEncontrados.length !== userIds.length) {
      const encontradosIds = usuariosEncontrados.map(u => u._id.toString());
      const noEncontrados = userIds.filter(id => !encontradosIds.includes(id.toString()));
      return res.status(404).json({
        message: 'Uno o más usuarios no existen',
        ids_no_encontrados: noEncontrados.map(id => id.toString())
      });
    }

    // ── Obtener estatus inicial ──
    const statusInicial = await db.collection('estatus').findOne({ order: 1 });
    if (!statusInicial)
      return res.status(500).json({ message: 'No se encontró el estatus inicial' });

    // ── Construir participantes ──
    const buildParticipant = (p) => ({
      user: new ObjectId(p.user),
      percentage: p.percentage,
      commission: p.commission,
      adjusted_commission: null,
      verification: false
    });

    // ── Construir documento ──
    const nuevaComision = {
      company,
      development,
      location,
      concept,
      commission_type,
      sale_price,
      operation_date,
      register_date,
      status: statusInicial._id,
      correction_comments: null,
      participants: {
        advisors: participants.advisors.map(buildParticipant),
        managers: participants.managers.map(buildParticipant)
      },
      created_by: new ObjectId(created_by),
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await db.collection('comisiones').insertOne(nuevaComision);

    return res.status(201).json({
      message: 'Comisión registrada exitosamente',
      comision_id: result.insertedId,
      status: statusInicial.name
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al registrar la comisión' });
  }
});

const bcrypt = require('bcrypt');

// ─────────────────────────────────────────────
// POST /usuarios
// Registra un nuevo usuario
// ─────────────────────────────────────────────
router.post('/registrar-usuario', async (req, res) => {
  const client = req.app.locals.mongoClient;
  const db = client.db(DB_NAME);

  try {
    const {
      name,
      email,
      phone,
      blood_type,
      birth_date,
      emergency_contact_name,
      emergency_contact_phone,
      picture,
      role,
      username,
      password
    } = req.body;

    // ── Validaciones de campos requeridos ──
    const camposRequeridos = {
      name,
      email,
      phone,
      blood_type,
      birth_date,
      emergency_contact_name,
      emergency_contact_phone,
      picture,
      role,
      username,
      password
    };

    const camposFaltantes = Object.entries(camposRequeridos)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (camposFaltantes.length > 0) {
      return res.status(400).json({
        message: 'Los siguientes campos son requeridos',
        campos_faltantes: camposFaltantes
      });
    }

    if (!ObjectId.isValid(role))
      return res.status(400).json({ message: 'El campo "role" debe ser un ID válido' });

    if (password.length < 6)
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });

    // ── Verificar que el rol exista ──
    const rolEncontrado = await db.collection('roles').findOne({ _id: new ObjectId(role) });
    if (!rolEncontrado)
      return res.status(404).json({ message: 'El rol especificado no existe' });

    // ── Verificar que email y username sean únicos ──
    const emailExiste = await db.collection('usuarios').findOne({ email });
    if (emailExiste)
      return res.status(409).json({ message: 'Ya existe un usuario con ese email' });

    const usernameExiste = await db.collection('usuarios').findOne({ username });
    if (usernameExiste)
      return res.status(409).json({ message: 'Ya existe un usuario con ese username' });

    // ── Hashear contraseña ──
    const hashedPassword = await bcrypt.hash(password, 10);

    // ── Construir documento ──
    const nuevoUsuario = {
      name,
      email,
      phone,
      blood_type,
      birth_date:              new Date(birth_date),
      emergency_contact_name,
      emergency_contact_phone,
      picture,
      role:                    new ObjectId(role),
      username:                username.toUpperCase(),
      password:                hashedPassword,
      active:                  true,
      created_at:              new Date()
    };

    const result = await db.collection('usuarios').insertOne(nuevoUsuario);

    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      usuario_id: result.insertedId,
      username: nuevoUsuario.username,
      role: rolEncontrado.name
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al registrar el usuario' });
  }
});

// ─────────────────────────────────────────────
// GET /usuarios/:id/comisiones
// Obtiene comisiones donde el usuario es participante o creador
// ─────────────────────────────────────────────
router.get('/usuarios/:id/comisiones', async (req, res) => {
  const client = req.app.locals.mongoClient;
  const db = client.db(DB_NAME);

  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id))
      return res.status(400).json({ message: 'ID de usuario inválido' });

    const usuarioId = new ObjectId(id);

    // Verificar que el usuario exista
    const usuario = await db.collection('usuarios').findOne({ _id: usuarioId });
    if (!usuario)
      return res.status(404).json({ message: 'Usuario no encontrado' });

    const comisiones = await db.collection('comisiones').aggregate([
      {
        $match: {
          $or: [
            { created_by: usuarioId },
            { 'participants.advisors.user': usuarioId },
            { 'participants.managers.user': usuarioId }
          ]
        }
      },
      // Resolver estatus
      {
        $lookup: {
          from: 'estatus',
          localField: 'status',
          foreignField: '_id',
          as: 'status_detail'
        }
      },
      // Resolver datos del creador
      {
        $lookup: {
          from: 'usuarios',
          localField: 'created_by',
          foreignField: '_id',
          as: 'created_by_detail'
        }
      },
      // Resolver advisors
      {
        $lookup: {
          from: 'usuarios',
          localField: 'participants.advisors.user',
          foreignField: '_id',
          as: 'advisor_details'
        }
      },
      // Resolver managers
      {
        $lookup: {
          from: 'usuarios',
          localField: 'participants.managers.user',
          foreignField: '_id',
          as: 'manager_details'
        }
      },
      {
        $project: {
          _id: 1,
          company: 1,
          development: 1,
          location: 1,
          concept: 1,
          commission_type: 1,
          sale_price: 1,
          operation_date: 1,
          register_date: 1,
          correction_comments: 1,
          status: { $arrayElemAt: ['$status_detail', 0] },
          created_by: {
            $let: {
              vars: { u: { $arrayElemAt: ['$created_by_detail', 0] } },
              in: { _id: '$$u._id', name: '$$u.name', username: '$$u.username' }
            }
          },
          participants: {
            advisors: {
              $map: {
                input: '$participants.advisors',
                as: 'advisor',
                in: {
                  user: {
                    $let: {
                      vars: {
                        match: {
                          $arrayElemAt: [
                            { $filter: { input: '$advisor_details', as: 'u', cond: { $eq: ['$$u._id', '$$advisor.user'] } } },
                            0
                          ]
                        }
                      },
                      in: { _id: '$$match._id', name: '$$match.name', username: '$$match.username' }
                    }
                  },
                  percentage: '$$advisor.percentage',
                  commission: '$$advisor.commission',
                  adjusted_commission: '$$advisor.adjusted_commission',
                  verification: '$$advisor.verification'
                }
              }
            },
            managers: {
              $map: {
                input: '$participants.managers',
                as: 'manager',
                in: {
                  user: {
                    $let: {
                      vars: {
                        match: {
                          $arrayElemAt: [
                            { $filter: { input: '$manager_details', as: 'u', cond: { $eq: ['$$u._id', '$$manager.user'] } } },
                            0
                          ]
                        }
                      },
                      in: { _id: '$$match._id', name: '$$match.name', username: '$$match.username' }
                    }
                  },
                  percentage: '$$manager.percentage',
                  commission: '$$manager.commission',
                  adjusted_commission: '$$manager.adjusted_commission',
                  verification: '$$manager.verification'
                }
              }
            }
          },
          created_at: 1,
          updated_at: 1
        }
      },
      { $sort: { created_at: -1 } }
    ]).toArray();

    return res.status(200).json({
      total: comisiones.length,
      comisiones
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener comisiones del usuario' });
  }
});


// ─────────────────────────────────────────────
// GET /usuarios/:id/notificaciones
// Obtiene las notificaciones de un usuario
// ─────────────────────────────────────────────
router.get('/usuarios/:id/notificaciones', async (req, res) => {
  const client = req.app.locals.mongoClient;
  const db = client.db(DB_NAME);

  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id))
      return res.status(400).json({ message: 'ID de usuario inválido' });

    const usuarioId = new ObjectId(id);

    // Verificar que el usuario exista
    const usuario = await db.collection('usuarios').findOne({ _id: usuarioId });
    if (!usuario)
      return res.status(404).json({ message: 'Usuario no encontrado' });

    const notificaciones = await db.collection('notificaciones')
      .find({ usuario_id: usuarioId })
      .sort({ fecha: -1 })
      .toArray();

    return res.status(200).json({
      total: notificaciones.length,
      notificaciones
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener notificaciones del usuario' });
  }
});


module.exports = router;