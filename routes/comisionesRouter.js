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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/comisiones
// Retorna participantes con datos de ubicación aplanados
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  const db = req.app.locals.mongoClient.db(DB_NAME);

  try {
    const filas = await db
      .collection('comisiones-participantes')
      .aggregate([
        // ── Datos de la ubicación ────────────────────────────────────────────
        {
          $lookup: {
            from:         'comisiones-ubicaciones',
            localField:   'comision_id',
            foreignField: '_id',
            as:           'ubicacion',
          },
        },
        { $unwind: '$ubicacion' },

        // ── Datos del participante (usuario) ─────────────────────────────────
        {
          $lookup: {
            from:         'usuarios',
            localField:   'user',
            foreignField: '_id',
            as:           'usuario',
            pipeline: [
              { $project: { name: 1, username: 1, picture: 1 } },
            ],
          },
        },
        { $unwind: '$usuario' },

        // ── Estatus del participante ──────────────────────────────────────────
        {
          $lookup: {
            from:         'estatus',
            localField:   'status',
            foreignField: '_id',
            as:           'status',
          },
        },
        { $unwind: { path: '$status', preserveNullAndEmptyArrays: true } },

        // ── Aplanar todo en un solo documento ────────────────────────────────
        {
          $project: {
            // — identificadores clave —
            _id:                 1,          // ID del participante (para PATCH de estatus)
            comision_id:         1,

            // — datos de ubicación —
            company:             '$ubicacion.company',
            development:         '$ubicacion.development',
            location:            '$ubicacion.location',
            concept:             '$ubicacion.concept',
            commission_type:     '$ubicacion.commission_type',
            sale_price:          '$ubicacion.sale_price',
            total_commission:    '$ubicacion.total_commission',
            client_name:         '$ubicacion.client_name',
            operation_date:      '$ubicacion.operation_date',
            register_date:       '$ubicacion.register_date',

            // — datos del participante —
            usuario:             1,
            role_in_comision:    1,
            percentage:          1,
            commission_amount:   1,
            adjusted_commission: 1,
            verification:        1,
            correction_comments: 1,

            // — estatus del participante (el que se modifica) —
            status:              1,

            created_at:          1,
            updated_at:          1,
          },
        },

        { $sort: { 'ubicacion.created_at': -1, role_in_comision: 1 } },
      ])
      .toArray();

    return res.status(200).json({
      success: true,
      data:    { filas, total: filas.length },
      message: 'Comisiones obtenidas correctamente',
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


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/comisiones/mis-comisiones
// Mismo formato pero solo filas donde el usuario es participante
// ─────────────────────────────────────────────────────────────────────────────
router.get('/mis-comisiones', authenticate, async (req, res) => {
  const db     = req.app.locals.mongoClient.db(DB_NAME);
  const userId = new ObjectId(req.user.id);

  try {
    const filas = await db
      .collection('comisiones-participantes')
      .aggregate([
        // ── Solo filas del usuario autenticado ───────────────────────────────
        { $match: { user: userId } },

        // ── Datos de la ubicación ────────────────────────────────────────────
        {
          $lookup: {
            from:         'comisiones-ubicaciones',
            localField:   'comision_id',
            foreignField: '_id',
            as:           'ubicacion',
          },
        },
        { $unwind: '$ubicacion' },

        // ── Datos del participante (usuario) ─────────────────────────────────
        {
          $lookup: {
            from:         'usuarios',
            localField:   'user',
            foreignField: '_id',
            as:           'usuario',
            pipeline: [
              { $project: { name: 1, username: 1, picture: 1 } },
            ],
          },
        },
        { $unwind: '$usuario' },

        // ── Estatus del participante ──────────────────────────────────────────
        {
          $lookup: {
            from:         'estatus',
            localField:   'status',
            foreignField: '_id',
            as:           'status',
          },
        },
        { $unwind: { path: '$status', preserveNullAndEmptyArrays: true } },

        // ── Aplanar ───────────────────────────────────────────────────────────
        {
          $project: {
            _id:                 1,
            comision_id:         1,
            company:             '$ubicacion.company',
            development:         '$ubicacion.development',
            location:            '$ubicacion.location',
            concept:             '$ubicacion.concept',
            commission_type:     '$ubicacion.commission_type',
            sale_price:          '$ubicacion.sale_price',
            total_commission:    '$ubicacion.total_commission',
            client_name:         '$ubicacion.client_name',
            operation_date:      '$ubicacion.operation_date',
            register_date:       '$ubicacion.register_date',
            usuario:             1,
            role_in_comision:    1,
            percentage:          1,
            commission_amount:   1,
            adjusted_commission: 1,
            verification:        1,
            correction_comments: 1,
            status:              1,
            created_at:          1,
            updated_at:          1,
          },
        },

        { $sort: { created_at: -1 } },
      ])
      .toArray();

    return res.status(200).json({
      success: true,
      data:    { filas, total: filas.length },
      message: 'Mis comisiones obtenidas correctamente',
      error:   null,
    });

  } catch (error) {
    console.error('[GET /api/comisiones/mis-comisiones]', error);
    return res.status(500).json({
      success: false,
      data:    null,
      message: 'Error al obtener mis comisiones',
      error:   error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/comisiones/participantes/:id
// Actualiza el estatus de un participante
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/participantes/:id', authenticate, async (req, res) => {
  const db  = req.app.locals.mongoClient.db(DB_NAME);
  const { id } = req.params;
  const { statusOrder } = req.body;

  // ── 1. Validaciones ─────────────────────────────────────────────────────────
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      data:    null,
      message: 'ID de participante no válido',
      error:   null,
    });
  }

  if (statusOrder === undefined || statusOrder === null) {
    return res.status(400).json({
      success: false,
      data:    null,
      message: 'El campo statusOrder es requerido',
      error:   null,
    });
  }

  try {
    // ── 2. Resolver ObjectId del estatus desde su order ──────────────────────
    const estatus = await db.collection('estatus').findOne({ order: Number(statusOrder) });

    if (!estatus) {
      return res.status(404).json({
        success: false,
        data:    null,
        message: `No existe un estatus con order: ${statusOrder}`,
        error:   null,
      });
    }

    // ── 3. Verificar que el participante existe ───────────────────────────────
    const participante = await db
      .collection('comisiones-participantes')
      .findOne({ _id: new ObjectId(id) });

    if (!participante) {
      return res.status(404).json({
        success: false,
        data:    null,
        message: 'Participante no encontrado',
        error:   null,
      });
    }

    // ── 4. Validar transición de estatus permitida ───────────────────────────
    const statusActual = await db
      .collection('estatus')
      .findOne({ _id: participante.status });

    const transicionesPermitidas = {
      Directora:       { desde: [1, 2], hacia: [2, 4] },  // Verifica y Aprueba
      Administradora:  { desde: [5],    hacia: [6] },      // Marca pagada
    };

    const roleName = req.user.roleName;
    const reglas   = transicionesPermitidas[roleName];

    if (reglas) {
      const desdeOk = reglas.desde.includes(statusActual?.order);
      const haciaOk = reglas.hacia.includes(Number(statusOrder));

      if (!desdeOk || !haciaOk) {
        return res.status(403).json({
          success: false,
          data:    null,
          message: `El rol ${roleName} no puede cambiar de "${statusActual?.name}" a "${estatus.name}"`,
          error:   null,
        });
      }
    }

    // ── 5. Actualizar ─────────────────────────────────────────────────────────
    await db.collection('comisiones-participantes').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status:     estatus._id,
          updated_at: new Date(),
        },
      }
    );

    // ── 6. Notificar al participante ──────────────────────────────────────────
    await db.collection('notificaciones').insertOne({
      usuario_id:  participante.user,
      titulo:      `Comisión ${estatus.name}`,
      descripcion: `Tu comisión ha sido actualizada al estatus: ${estatus.name}`,
      fecha:       new Date(),
    });

    // ── 7. Respuesta ──────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      data: {
        participante_id: id,
        status: {
          _id:   estatus._id,
          order: estatus.order,
          name:  estatus.name,
        },
      },
      message: `Estatus actualizado a "${estatus.name}"`,
      error:   null,
    });

  } catch (error) {
    console.error('[PATCH /api/comisiones/participantes/:id]', error);
    return res.status(500).json({
      success: false,
      data:    null,
      message: 'Error al actualizar el estatus',
      error:   error.message,
    });
  }
});


module.exports = router;