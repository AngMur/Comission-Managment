const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const router  = express.Router();
const {
  setAuthCookie,
  clearAuthCookie,
   authenticate
} = require('../JWT/authCookies');


const DB_NAME = 'roles_usuarios';

// POST /api/comisiones
router.post('/', async (req, res) => {
  const client = req.app.locals.mongoClient;
  const db     = client.db(DB_NAME);

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
      client_name,
      created_by,
      participants,
    } = req.body;

    // ── 1. Validaciones ───────────────────────────────────────────────────────
    if (!company || !development || !location || !concept) {
      return res.status(400).json({
        success: false,
        data:    null,
        message: 'Faltan campos obligatorios de ubicación',
        error:   null,
      });
    }

    if (!commission_type || !sale_price || !operation_date || !register_date) {
      return res.status(400).json({
        success: false,
        data:    null,
        message: 'Faltan campos obligatorios de la comisión',
        error:   null,
      });
    }

    if (!participants?.advisors?.length || !participants?.managers?.length) {
      return res.status(400).json({
        success: false,
        data:    null,
        message: 'Debe incluir al menos un asesor y un gerente',
        error:   null,
      });
    }

    const typeMap = {
      Tradicional: 'traditional',
      Compartida:  'shared',
      Multipunto:  'multipoint',
    };
    const pKey = typeMap[commission_type];
    if (!pKey) {
      return res.status(400).json({
        success: false,
        data:    null,
        message: `Tipo de comisión no válido: ${commission_type}`,
        error:   null,
      });
    }

    // ── 2. Obtener estatus inicial y porcentajes desde la DB ──────────────────
    const [statusInicial, percentagesDoc] = await Promise.all([
      db.collection('estatus').findOne({ order: 1 }),
      db.collection('percentages').findOne({}),
    ]);

    if (!statusInicial) {
      return res.status(500).json({
        success: false,
        data:    null,
        message: 'No se encontró el estatus inicial en la base de datos',
        error:   null,
      });
    }

    const pType = percentagesDoc?.v1?.[pKey];
    if (!pType) {
      return res.status(500).json({
        success: false,
        data:    null,
        message: 'No se encontraron los porcentajes en la base de datos',
        error:   null,
      });
    }

    // ── 3. Construir documentos de participantes ──────────────────────────────
    const advisorKeys = ['advisor1', 'advisor2'];
    const managerKeys = ['manager1', 'manager2'];
    const now         = new Date();

    const buildParticipante = (userId, percentageKey, roleInComision) => {
      const percentage = pType[percentageKey];
      if (percentage === undefined) return null; // clave no existe (ej: advisor2 en Tradicional)

      return {
        comision_id:         null, // se rellena después del insert de ubicación
        user:                new ObjectId(userId),
        role_in_comision:    roleInComision,
        percentage,
        commission_amount:   sale_price * percentage,
        adjusted_commission: null,
        verification:        false,
        status:              statusInicial._id,
        correction_comments: null,
        created_at:          now,
        updated_at:          now,
      };
    };

    const participanteDocs = [
      ...participants.advisors
        .map((a, i) => buildParticipante(a.user, advisorKeys[i], 'asesor'))
        .filter(Boolean),
      ...participants.managers
        .map((m, i) => buildParticipante(m.user, managerKeys[i], 'gerente'))
        .filter(Boolean),
    ];

    // ── 4. Calcular comisión total ────────────────────────────────────────────
    const total_commission = participanteDocs.reduce(
      (sum, p) => sum + p.commission_amount, 0
    );

    // ── 5. Insertar en comisiones-ubicaciones ─────────────────────────────────
    const ubicacionDoc = {
      company,
      development,
      location,
      concept,
      commission_type,
      sale_price,
      total_commission,
      client_name:         client_name ?? null,
      operation_date:      new Date(operation_date),
      register_date:       new Date(register_date),
      status:              statusInicial._id,
      correction_comments: null,
      created_by:          new ObjectId(created_by),
      created_at:          now,
      updated_at:          now,
    };

    const { insertedId: comisionId } = await db
      .collection('comisiones-ubicaciones')
      .insertOne(ubicacionDoc);

    // ── 6. Asignar comision_id e insertar participantes ───────────────────────
    const participantesConId = participanteDocs.map((p) => ({
      ...p,
      comision_id: comisionId,
    }));

    await db
      .collection('comisiones-participantes')
      .insertMany(participantesConId);

    // ── 7. Notificaciones para cada participante ──────────────────────────────
    await db.collection('notificaciones').insertMany(
      participantesConId.map((p) => ({
        usuario_id:  p.user,
        titulo:      'Nueva comisión registrada',
        descripcion: `Se registró una nueva comisión para ${location.text}.`,
        fecha:       now,
      }))
    );

    // ── 8. Respuesta ──────────────────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      data: {
        comision_id:      comisionId,
        total_commission,
        participantes:    participantesConId.length,
      },
      message: 'Comisión creada exitosamente',
      error:   null,
    });

  } catch (error) {
    console.error('[POST /api/comisiones]', error);
    return res.status(500).json({
      success: false,
      data:    null,
      message: 'Error al crear la comisión',
      error:   error.message,
    });
  }
});

/**
 * GET /api/comisiones/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const db = req.app.locals.mongoClient.db(DB_NAME);
    const { id } = req.params;

    // ── Validar ObjectId ──────────────────────────────────────────────────
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'El parámetro id no es un ObjectId válido',
        data:    null,
        error:   null,
      });
    }

    // ── 1. Traer la ubicación ─────────────────────────────────────────────
    const ubicacion = await db.collection('comisiones-ubicaciones').aggregate([
      {
        $match: { _id: new ObjectId(id) },
      },

      // Populate status
      {
        $lookup: {
          from:         'estatus',
          localField:   'status',
          foreignField: '_id',
          as:           'status',
        },
      },
      { $unwind: { path: '$status', preserveNullAndEmptyArrays: true } },

      // Populate created_by
      {
        $lookup: {
          from:         'usuarios',
          localField:   'created_by',
          foreignField: '_id',
          as:           'created_by',
          pipeline: [
            { $project: { password: 0 } },
          ],
        },
      },
      { $unwind: { path: '$created_by', preserveNullAndEmptyArrays: true } },

    ]).next();

    if (!ubicacion) {
      return res.status(404).json({
        success: false,
        message: 'Comisión no encontrada',
        data:    null,
        error:   null,
      });
    }

    // ── 2. Traer participantes ────────────────────────────────────────────
    const participantes = await db.collection('comisiones-participantes').aggregate([
      {
        $match: { comision_id: new ObjectId(id) },
      },

      // Populate user
      {
        $lookup: {
          from:         'usuarios',
          localField:   'user',
          foreignField: '_id',
          as:           'user',
          pipeline: [
            { $project: { name: 1, username: 1, picture: 1 } },
          ],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

      // Populate status
      {
        $lookup: {
          from:         'estatus',
          localField:   'status',
          foreignField: '_id',
          as:           'status',
        },
      },
      { $unwind: { path: '$status', preserveNullAndEmptyArrays: true } },

    ]).toArray();

    // ── 3. Separar asesores y gerentes (mismo formato que al crear) ───────
    const participants = {
      advisors: participantes
        .filter(p => p.role_in_comision === 'asesor')
        .map(({ role_in_comision, ...p }) => p),
      managers: participantes
        .filter(p => p.role_in_comision === 'gerente')
        .map(({ role_in_comision, ...p }) => p),
    };

    return res.status(200).json({
      success: true,
      message: 'Comisión encontrada',
      data: {
        comision: {
          ...ubicacion,
          participants,
        },
      },
      error: null,
    });

  } catch (error) {
    console.error('[GET /api/comisiones/:id]', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      data:    null,
      error:   error.message,
    });
  }
});

/**
 * DELETE /api/comisiones/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
  const client = req.app.locals.mongoClient;
  const db     = client.db(DB_NAME);
  const { id } = req.params;

  // ── Validar ObjectId ────────────────────────────────────────────────────
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'El parámetro id no es un ObjectId válido',
      data:    null,
      error:   null,
    });
  }

  // ── Iniciar sesión para transacción ────────────────────────────────────
  const session = client.startSession();

  try {
    const comisionId = new ObjectId(id);

    // ── Verificar que la comisión existe ────────────────────────────────
    const ubicacion = await db
      .collection('comisiones-ubicaciones')
      .findOne({ _id: comisionId }, { session });

    if (!ubicacion) {
      return res.status(404).json({
        success: false,
        message: 'Comisión no encontrada',
        data:    null,
        error:   null,
      });
    }

    // ── Obtener participantes para borrar sus notificaciones ────────────
    const participantes = await db
      .collection('comisiones-participantes')
      .find({ comision_id: comisionId }, { session })
      .toArray();

    const userIds = [...new Set(participantes.map(p => p.user.toString()))]
      .map(uid => new ObjectId(uid));

    // ── Ejecutar borrado en transacción ─────────────────────────────────
    await session.withTransaction(async () => {

      // 1. Eliminar participantes
      const { deletedCount: participantesEliminados } = await db
        .collection('comisiones-participantes')
        .deleteMany({ comision_id: comisionId }, { session });

      // 2. Eliminar notificaciones relacionadas
      // Notificaciones que mencionen la ubicación de esta comisión
      const { deletedCount: notificacionesEliminadas } = await db
        .collection('notificaciones')
        .deleteMany({
          usuario_id: { $in: userIds },
          descripcion: { $regex: ubicacion.location.text, $options: 'i' },
        }, { session });

      // 3. Eliminar la ubicación
      await db
        .collection('comisiones-ubicaciones')
        .deleteOne({ _id: comisionId }, { session });

    });

    return res.status(200).json({
      success: true,
      message: `Comisión '${ubicacion.location.text}' eliminada correctamente`,
      data: {
        comision_id:   comisionId,
        location:      ubicacion.location.text,
        commission_type: ubicacion.commission_type,
      },
      error: null,
    });

  } catch (error) {
    console.error('[DELETE /api/comisiones/:id]', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la comisión',
      data:    null,
      error:   error.message,
    });
  } finally {
    await session.endSession();
  }
});

// GET /api/comisiones
router.get('/', authenticate, async (req, res) => {
  const client = req.app.locals.mongoClient;
  const db     = client.db(DB_NAME);

  try {
    const comisiones = await db
      .collection('comisiones-ubicaciones')
      .aggregate([

        // ── 1. Join estatus de la comisión ────────────────────────────────────
        {
          $lookup: {
            from:         'estatus',
            localField:   'status',
            foreignField: '_id',
            as:           'status',
          },
        },
        { $unwind: { path: '$status', preserveNullAndEmptyArrays: true } },

        // ── 2. Join participantes ─────────────────────────────────────────────
        {
          $lookup: {
            from:         'comisiones-participantes',
            localField:   '_id',
            foreignField: 'comision_id',
            as:           'participantes',
          },
        },

        // ── 3. Join usuarios de los participantes ─────────────────────────────
        {
          $lookup: {
            from:         'usuarios',
            localField:   'participantes.user',
            foreignField: '_id',
            as:           'usuarios_info',
          },
        },

        // ── 4. Mapear participantes con su usuario ────────────────────────────
        {
          $addFields: {
            participantes: {
              $map: {
                input: '$participantes',
                as:    'p',
                in: {
                  _id:                 '$$p._id',
                  role_in_comision:    '$$p.role_in_comision',
                  percentage:          '$$p.percentage',
                  commission_amount:   '$$p.commission_amount',
                  adjusted_commission: '$$p.adjusted_commission',
                  verification:        '$$p.verification',
                  correction_comments: '$$p.correction_comments',
                  usuario: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$usuarios_info',
                          as:    'u',
                          cond:  { $eq: ['$$u._id', '$$p.user'] },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
            },
          },
        },



        { $sort: { register_date: -1 } },
      ])
      .toArray();

    return res.status(200).json({
      success: true,
      data:    comisiones,
      message: `${comisiones.length} comisión(es) encontrada(s)`,
      error:   null,
    });

  } catch (error) {
    console.error('[GET /api/comisiones]', error);
    return res.status(500).json({
      success: false,
      data:    null,
      message: 'Error al obtener las comisiones',
      error:   error.message,
    });
  }
});


// GET /api/comisiones/mis-comisiones
router.get('/mis-comisiones', authenticate, async (req, res) => {
  const client = req.app.locals.mongoClient;
  const db     = client.db(DB_NAME);

  try {
    const userId = new ObjectId(req.user.id); // ← viene del JWT decodificado

    // ── 1. IDs de comisiones donde el usuario es participante ────────────────
    const participaciones = await db
      .collection('comisiones-participantes')
      .find({ user: userId })
      .project({ comision_id: 1 })
      .toArray();

    const comisionIdsComoParticipante = participaciones.map(p => p.comision_id);

    // ── 2. Buscar comisiones donde es creador O participante ─────────────────
    const comisiones = await db
      .collection('comisiones-ubicaciones')
      .aggregate([
        {
          $match: {
            $or: [
              { created_by: userId },
              { _id: { $in: comisionIdsComoParticipante } },
            ],
          },
        },

        // ── Join estatus de la comisión ──────────────────────────────────────
        {
          $lookup: {
            from:         'estatus',
            localField:   'status',
            foreignField: '_id',
            as:           'status',
          },
        },
        { $unwind: { path: '$status', preserveNullAndEmptyArrays: true } },

        // ── Join participantes ───────────────────────────────────────────────
        {
          $lookup: {
            from:         'comisiones-participantes',
            localField:   '_id',
            foreignField: 'comision_id',
            as:           'participantes',
          },
        },

        // ── Join usuarios de los participantes ───────────────────────────────
        {
          $lookup: {
            from:         'usuarios',
            localField:   'participantes.user',
            foreignField: '_id',
            as:           'usuarios_info',
          },
        },

        // ── Mapear participantes con su usuario ──────────────────────────────
        {
          $addFields: {
            participantes: {
              $map: {
                input: '$participantes',
                as:    'p',
                in: {
                  _id:                 '$$p._id',
                  role_in_comision:    '$$p.role_in_comision',
                  percentage:          '$$p.percentage',
                  commission_amount:   '$$p.commission_amount',
                  adjusted_commission: '$$p.adjusted_commission',
                  verification:        '$$p.verification',
                  correction_comments: '$$p.correction_comments',
                  usuario: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$usuarios_info',
                          as:    'u',
                          cond:  { $eq: ['$$u._id', '$$p.user'] },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
            },
          },
        },

        // ── Proyección final ─────────────────────────────────────────────────
        {
          $project: {
            company:              1,
            development:          1,
            location:             1,
            concept:              1,
            commission_type:      1,
            sale_price:           1,
            total_commission:     1,
            client_name:          1,
            operation_date:       1,
            register_date:        1,
            correction_comments:  1,
            created_at:           1,
            'status.name':        1,
            'status.order':       1,
            'status.description': 1,
            participantes: {
              $map: {
                input: '$participantes',
                as:    'p',
                in: {
                  _id:                 '$$p._id',
                  role_in_comision:    '$$p.role_in_comision',
                  percentage:          '$$p.percentage',
                  commission_amount:   '$$p.commission_amount',
                  adjusted_commission: '$$p.adjusted_commission',
                  verification:        '$$p.verification',
                  correction_comments: '$$p.correction_comments',
                  usuario: {
                    _id:      '$$p.usuario._id',
                    name:     '$$p.usuario.name',
                    username: '$$p.usuario.username',
                    email:    '$$p.usuario.email',
                    picture:  '$$p.usuario.picture',
                  },
                },
              },
            },
          },
        },

        { $sort: { register_date: -1 } },
      ])
      .toArray();

    return res.status(200).json({
      success: true,
      data:    comisiones,
      message: `${comisiones.length} comisión(es) encontrada(s)`,
      error:   null,
    });

  } catch (error) {
    console.error('[GET /api/comisiones/mis-comisiones]', error);
    return res.status(500).json({
      success: false,
      data:    null,
      message: 'Error al obtener las comisiones',
      error:   error.message,
    });
  }
});


// ── 1. PATCH /api/comisiones/:id/verificar ────────────────────────────────────
// El participante marca su verificación; si todos verificaron → sube estatus
router.patch('/:id/verificar', authenticate, async (req, res) => {
  const client = req.app.locals.mongoClient;
  const db     = client.db(DB_NAME);

  try {
    const comisionId = new ObjectId(req.params.id);
    const userId     = new ObjectId(req.user.id);
    const now        = new Date();

    // ── Verificar que el usuario es participante ──────────────────────────────
    const participante = await db
      .collection('comisiones-participantes')
      .findOne({ comision_id: comisionId, user: userId });

    if (!participante) {
      return res.status(403).json({
        success: false,
        data:    null,
        message: 'No eres participante de esta comisión',
        error:   null,
      });
    }

    if (participante.verification) {
      return res.status(400).json({
        success: false,
        data:    null,
        message: 'Ya verificaste esta comisión',
        error:   null,
      });
    }

    // ── Marcar verificación del participante ──────────────────────────────────
    await db.collection('comisiones-participantes').updateOne(
      { _id: participante._id },
      { $set: { verification: true, updated_at: now } }
    );

    // ── Revisar si todos los participantes ya verificaron ─────────────────────
    const pendientes = await db
      .collection('comisiones-participantes')
      .countDocuments({ comision_id: comisionId, verification: false });

    if (pendientes > 0) {
      return res.status(200).json({
        success: true,
        data:    { todos_verificaron: false },
        message: 'Verificación registrada. Esperando a los demás participantes',
        error:   null,
      });
    }

    // ── Todos verificaron → subir a Verificada y luego a Pendiente Aprobacion ─
    const [statusVerificada, statusPendienteAprobacion] = await Promise.all([
      db.collection('estatus').findOne({ order: 2 }),
      db.collection('estatus').findOne({ order: 3 }),
    ]);

    // Actualizar comisión y participantes a Pendiente Aprobacion directamente
    await Promise.all([
      db.collection('comisiones-ubicaciones').updateOne(
        { _id: comisionId },
        { $set: { status: statusPendienteAprobacion._id, updated_at: now } }
      ),
      db.collection('comisiones-participantes').updateMany(
        { comision_id: comisionId },
        { $set: { status: statusPendienteAprobacion._id, updated_at: now } }
      ),
    ]);

    // ── Notificación a la Directora ───────────────────────────────────────────
    const directora = await db
      .collection('usuarios')
      .aggregate([
        { $lookup: { from: 'roles', localField: 'role', foreignField: '_id', as: 'role_info' } },
        { $unwind: '$role_info' },
        { $match: { 'role_info.name': 'Directora', active: true } },
        { $project: { _id: 1 } },
      ])
      .toArray();

    if (directora.length) {
      await db.collection('notificaciones').insertMany(
        directora.map(d => ({
          usuario_id:  d._id,
          titulo:      'Comisión lista para aprobación',
          descripcion: `La comisión ${comisionId} ha sido verificada por todos los participantes.`,
          fecha:       now,
        }))
      );
    }

    return res.status(200).json({
      success: true,
      data:    { todos_verificaron: true, nuevo_status: statusPendienteAprobacion.name },
      message: 'Todos verificaron. Comisión en Pendiente Aprobación',
      error:   null,
    });

  } catch (error) {
    console.error('[PATCH /api/comisiones/:id/verificar]', error);
    return res.status(500).json({
      success: false,
      data:    null,
      message: 'Error al verificar la comisión',
      error:   error.message,
    });
  }
});


// ── 2. PATCH /api/comisiones/:id/aprobar ─────────────────────────────────────
// La Directora aprueba o manda a corrección
router.patch('/:id/aprobar', authenticate, async (req, res) => {
  const client = req.app.locals.mongoClient;
  const db     = client.db(DB_NAME);

  try {
    const comisionId = new ObjectId(req.params.id);
    const { accion, correction_comments } = req.body; // accion: "aprobar" | "correccion"
    const now = new Date();

    if (!['aprobar', 'correccion'].includes(accion)) {
      return res.status(400).json({
        success: false,
        data:    null,
        message: 'La acción debe ser "aprobar" o "correccion"',
        error:   null,
      });
    }

    if (accion === 'correccion' && !correction_comments) {
      return res.status(400).json({
        success: false,
        data:    null,
        message: 'Debes indicar los comentarios de corrección',
        error:   null,
      });
    }

    // ── Verificar que la comisión está en Pendiente Aprobacion (order 3) ──────
    const comision = await db
      .collection('comisiones-ubicaciones')
      .aggregate([
        { $match: { _id: comisionId } },
        { $lookup: { from: 'estatus', localField: 'status', foreignField: '_id', as: 'status' } },
        { $unwind: '$status' },
      ])
      .next();

    if (!comision) {
      return res.status(404).json({
        success: false,
        data:    null,
        message: 'Comisión no encontrada',
        error:   null,
      });
    }

    if (comision.status.order !== 3) {
      return res.status(400).json({
        success: false,
        data:    null,
        message: `La comisión debe estar en "Pendiente Aprobación" para esta acción. Estado actual: ${comision.status.name}`,
        error:   null,
      });
    }

    // ── Obtener estatus destino ───────────────────────────────────────────────
    const targetOrder  = accion === 'aprobar' ? 5 : 7; // Pendiente Pago | Correccion
    const statusDestino = await db.collection('estatus').findOne({ order: targetOrder });

    await Promise.all([
      db.collection('comisiones-ubicaciones').updateOne(
        { _id: comisionId },
        {
          $set: {
            status:              statusDestino._id,
            correction_comments: accion === 'correccion' ? correction_comments : null,
            updated_at:          now,
          },
        }
      ),
      db.collection('comisiones-participantes').updateMany(
        { comision_id: comisionId },
        {
          $set: {
            status:              statusDestino._id,
            correction_comments: accion === 'correccion' ? correction_comments : null,
            updated_at:          now,
          },
        }
      ),
    ]);

    // ── Notificación a los participantes ──────────────────────────────────────
    const participantes = await db
      .collection('comisiones-participantes')
      .find({ comision_id: comisionId })
      .project({ user: 1 })
      .toArray();

    const titulo     = accion === 'aprobar'
      ? 'Comisión aprobada y en espera de pago'
      : 'Comisión requiere corrección';
    const descripcion = accion === 'aprobar'
      ? `Tu comisión ha sido aprobada y está pendiente de pago.`
      : `Tu comisión requiere corrección: ${correction_comments}`;

    await db.collection('notificaciones').insertMany(
      participantes.map(p => ({
        usuario_id:  p.user,
        titulo,
        descripcion,
        fecha:       now,
      }))
    );

    return res.status(200).json({
      success: true,
      data:    { nuevo_status: statusDestino.name },
      message: accion === 'aprobar'
        ? 'Comisión aprobada. Ahora está en Pendiente de Pago'
        : 'Comisión enviada a corrección',
      error:   null,
    });

  } catch (error) {
    console.error('[PATCH /api/comisiones/:id/aprobar]', error);
    return res.status(500).json({
      success: false,
      data:    null,
      message: 'Error al procesar la aprobación',
      error:   error.message,
    });
  }
});


// ── 3. PATCH /api/comisiones/:id/pagar ───────────────────────────────────────
// La Administradora marca la comisión como pagada
router.patch('/:id/pagar', authenticate, async (req, res) => {
  const client = req.app.locals.mongoClient;
  const db     = client.db(DB_NAME);

  try {
    const comisionId = new ObjectId(req.params.id);
    const now        = new Date();

    // ── Verificar que la comisión está en Pendiente Pago (order 5) ────────────
    const comision = await db
      .collection('comisiones-ubicaciones')
      .aggregate([
        { $match: { _id: comisionId } },
        { $lookup: { from: 'estatus', localField: 'status', foreignField: '_id', as: 'status' } },
        { $unwind: '$status' },
      ])
      .next();

    if (!comision) {
      return res.status(404).json({
        success: false,
        data:    null,
        message: 'Comisión no encontrada',
        error:   null,
      });
    }

    if (comision.status.order !== 5) {
      return res.status(400).json({
        success: false,
        data:    null,
        message: `La comisión debe estar en "Pendiente Pago" para marcarla como pagada. Estado actual: ${comision.status.name}`,
        error:   null,
      });
    }

    const statusPagada = await db.collection('estatus').findOne({ order: 6 });

    await Promise.all([
      db.collection('comisiones-ubicaciones').updateOne(
        { _id: comisionId },
        { $set: { status: statusPagada._id, updated_at: now } }
      ),
      db.collection('comisiones-participantes').updateMany(
        { comision_id: comisionId },
        { $set: { status: statusPagada._id, updated_at: now } }
      ),
    ]);

    // ── Notificación a los participantes ──────────────────────────────────────
    const participantes = await db
      .collection('comisiones-participantes')
      .find({ comision_id: comisionId })
      .project({ user: 1 })
      .toArray();

    await db.collection('notificaciones').insertMany(
      participantes.map(p => ({
        usuario_id:  p.user,
        titulo:      '¡Comisión pagada!',
        descripcion: 'Tu comisión ha sido marcada como pagada por la Administradora.',
        fecha:       now,
      }))
    );

    return res.status(200).json({
      success: true,
      data:    { nuevo_status: statusPagada.name },
      message: 'Comisión marcada como pagada',
      error:   null,
    });

  } catch (error) {
    console.error('[PATCH /api/comisiones/:id/pagar]', error);
    return res.status(500).json({
      success: false,
      data:    null,
      message: 'Error al marcar la comisión como pagada',
      error:   error.message,
    });
  }
});

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/comisiones
// // Retorna participantes con datos de ubicación aplanados
// // ─────────────────────────────────────────────────────────────────────────────
// router.get('/', authenticate, async (req, res) => {
//   const db = req.app.locals.mongoClient.db(DB_NAME);

//   try {
//     const filas = await db
//       .collection('comisiones-participantes')
//       .aggregate([
//         // ── Datos de la ubicación ────────────────────────────────────────────
//         {
//           $lookup: {
//             from:         'comisiones-ubicaciones',
//             localField:   'comision_id',
//             foreignField: '_id',
//             as:           'ubicacion',
//           },
//         },
//         { $unwind: '$ubicacion' },

//         // ── Datos del participante (usuario) ─────────────────────────────────
//         {
//           $lookup: {
//             from:         'usuarios',
//             localField:   'user',
//             foreignField: '_id',
//             as:           'usuario',
//             pipeline: [
//               { $project: { name: 1, username: 1, picture: 1 } },
//             ],
//           },
//         },
//         { $unwind: '$usuario' },

//         // ── Estatus del participante ──────────────────────────────────────────
//         {
//           $lookup: {
//             from:         'estatus',
//             localField:   'status',
//             foreignField: '_id',
//             as:           'status',
//           },
//         },
//         { $unwind: { path: '$status', preserveNullAndEmptyArrays: true } },

//         // ── Aplanar todo en un solo documento ────────────────────────────────
//         {
//           $project: {
//             // — identificadores clave —
//             _id:                 1,          // ID del participante (para PATCH de estatus)
//             comision_id:         1,

//             // — datos de ubicación —
//             company:             '$ubicacion.company',
//             development:         '$ubicacion.development',
//             location:            '$ubicacion.location',
//             concept:             '$ubicacion.concept',
//             commission_type:     '$ubicacion.commission_type',
//             sale_price:          '$ubicacion.sale_price',
//             total_commission:    '$ubicacion.total_commission',
//             client_name:         '$ubicacion.client_name',
//             operation_date:      '$ubicacion.operation_date',
//             register_date:       '$ubicacion.register_date',

//             // — datos del participante —
//             usuario:             1,
//             role_in_comision:    1,
//             percentage:          1,
//             commission_amount:   1,
//             adjusted_commission: 1,
//             verification:        1,
//             correction_comments: 1,

//             // — estatus del participante (el que se modifica) —
//             status:              1,

//             created_at:          1,
//             updated_at:          1,
//           },
//         },

//         { $sort: { 'ubicacion.created_at': -1, role_in_comision: 1 } },
//       ])
//       .toArray();

//     return res.status(200).json({
//       success: true,
//       data:    { filas, total: filas.length },
//       message: 'Comisiones obtenidas correctamente',
//       error:   null,
//     });

//   } catch (error) {
//     console.error('[GET /api/comisiones]', error);
//     return res.status(500).json({
//       success: false,
//       data:    null,
//       message: 'Error al obtener las comisiones',
//       error:   error.message,
//     });
//   }
// });


// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/comisiones/mis-comisiones
// // Mismo formato pero solo filas donde el usuario es participante
// // ─────────────────────────────────────────────────────────────────────────────
// router.get('/mis-comisiones', authenticate, async (req, res) => {
//   const db     = req.app.locals.mongoClient.db(DB_NAME);
//   const userId = new ObjectId(req.user.id);

//   try {
//     const filas = await db
//       .collection('comisiones-participantes')
//       .aggregate([
//         // ── Solo filas del usuario autenticado ───────────────────────────────
//         { $match: { user: userId } },

//         // ── Datos de la ubicación ────────────────────────────────────────────
//         {
//           $lookup: {
//             from:         'comisiones-ubicaciones',
//             localField:   'comision_id',
//             foreignField: '_id',
//             as:           'ubicacion',
//           },
//         },
//         { $unwind: '$ubicacion' },

//         // ── Datos del participante (usuario) ─────────────────────────────────
//         {
//           $lookup: {
//             from:         'usuarios',
//             localField:   'user',
//             foreignField: '_id',
//             as:           'usuario',
//             pipeline: [
//               { $project: { name: 1, username: 1, picture: 1 } },
//             ],
//           },
//         },
//         { $unwind: '$usuario' },

//         // ── Estatus del participante ──────────────────────────────────────────
//         {
//           $lookup: {
//             from:         'estatus',
//             localField:   'status',
//             foreignField: '_id',
//             as:           'status',
//           },
//         },
//         { $unwind: { path: '$status', preserveNullAndEmptyArrays: true } },

//         // ── Aplanar ───────────────────────────────────────────────────────────
//         {
//           $project: {
//             _id:                 1,
//             comision_id:         1,
//             company:             '$ubicacion.company',
//             development:         '$ubicacion.development',
//             location:            '$ubicacion.location',
//             concept:             '$ubicacion.concept',
//             commission_type:     '$ubicacion.commission_type',
//             sale_price:          '$ubicacion.sale_price',
//             total_commission:    '$ubicacion.total_commission',
//             client_name:         '$ubicacion.client_name',
//             operation_date:      '$ubicacion.operation_date',
//             register_date:       '$ubicacion.register_date',
//             usuario:             1,
//             role_in_comision:    1,
//             percentage:          1,
//             commission_amount:   1,
//             adjusted_commission: 1,
//             verification:        1,
//             correction_comments: 1,
//             status:              1,
//             created_at:          1,
//             updated_at:          1,
//           },
//         },

//         { $sort: { created_at: -1 } },
//       ])
//       .toArray();

//     return res.status(200).json({
//       success: true,
//       data:    { filas, total: filas.length },
//       message: 'Mis comisiones obtenidas correctamente',
//       error:   null,
//     });

//   } catch (error) {
//     console.error('[GET /api/comisiones/mis-comisiones]', error);
//     return res.status(500).json({
//       success: false,
//       data:    null,
//       message: 'Error al obtener mis comisiones',
//       error:   error.message,
//     });
//   }
// });

// // ─────────────────────────────────────────────────────────────────────────────
// // PATCH /api/comisiones/participantes/:id
// // Actualiza el estatus de un participante
// // ─────────────────────────────────────────────────────────────────────────────
// router.patch('/participantes/:id', authenticate, async (req, res) => {
//   const db  = req.app.locals.mongoClient.db(DB_NAME);
//   const { id } = req.params;
//   const { statusOrder } = req.body;

//   // ── 1. Validaciones ─────────────────────────────────────────────────────────
//   if (!ObjectId.isValid(id)) {
//     return res.status(400).json({
//       success: false,
//       data:    null,
//       message: 'ID de participante no válido',
//       error:   null,
//     });
//   }

//   if (statusOrder === undefined || statusOrder === null) {
//     return res.status(400).json({
//       success: false,
//       data:    null,
//       message: 'El campo statusOrder es requerido',
//       error:   null,
//     });
//   }

//   try {
//     // ── 2. Resolver ObjectId del estatus desde su order ──────────────────────
//     const estatus = await db.collection('estatus').findOne({ order: Number(statusOrder) });

//     if (!estatus) {
//       return res.status(404).json({
//         success: false,
//         data:    null,
//         message: `No existe un estatus con order: ${statusOrder}`,
//         error:   null,
//       });
//     }

//     // ── 3. Verificar que el participante existe ───────────────────────────────
//     const participante = await db
//       .collection('comisiones-participantes')
//       .findOne({ _id: new ObjectId(id) });

//     if (!participante) {
//       return res.status(404).json({
//         success: false,
//         data:    null,
//         message: 'Participante no encontrado',
//         error:   null,
//       });
//     }

//     // ── 4. Validar transición de estatus permitida ───────────────────────────
//     const statusActual = await db
//       .collection('estatus')
//       .findOne({ _id: participante.status });

//     const transicionesPermitidas = {
//       Directora:       { desde: [1, 2], hacia: [2, 4] },  // Verifica y Aprueba
//       Administradora:  { desde: [5],    hacia: [6] },      // Marca pagada
//     };

//     const roleName = req.user.roleName;
//     const reglas   = transicionesPermitidas[roleName];

//     if (reglas) {
//       const desdeOk = reglas.desde.includes(statusActual?.order);
//       const haciaOk = reglas.hacia.includes(Number(statusOrder));

//       if (!desdeOk || !haciaOk) {
//         return res.status(403).json({
//           success: false,
//           data:    null,
//           message: `El rol ${roleName} no puede cambiar de "${statusActual?.name}" a "${estatus.name}"`,
//           error:   null,
//         });
//       }
//     }

//     // ── 5. Actualizar ─────────────────────────────────────────────────────────
//     await db.collection('comisiones-participantes').updateOne(
//       { _id: new ObjectId(id) },
//       {
//         $set: {
//           status:     estatus._id,
//           updated_at: new Date(),
//         },
//       }
//     );

//     // ── 6. Notificar al participante ──────────────────────────────────────────
//     await db.collection('notificaciones').insertOne({
//       usuario_id:  participante.user,
//       titulo:      `Comisión ${estatus.name}`,
//       descripcion: `Tu comisión ha sido actualizada al estatus: ${estatus.name}`,
//       fecha:       new Date(),
//     });

//     // ── 7. Respuesta ──────────────────────────────────────────────────────────
//     return res.status(200).json({
//       success: true,
//       data: {
//         participante_id: id,
//         status: {
//           _id:   estatus._id,
//           order: estatus.order,
//           name:  estatus.name,
//         },
//       },
//       message: `Estatus actualizado a "${estatus.name}"`,
//       error:   null,
//     });

//   } catch (error) {
//     console.error('[PATCH /api/comisiones/participantes/:id]', error);
//     return res.status(500).json({
//       success: false,
//       data:    null,
//       message: 'Error al actualizar el estatus',
//       error:   error.message,
//     });
//   }
// });


module.exports = router;