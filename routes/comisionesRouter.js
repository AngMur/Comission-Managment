const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const router  = express.Router();
const {
  setAuthCookie,
  clearAuthCookie,
   authenticate
} = require('../JWT/authCookies');


const DB_NAME = 'roles_usuarios';


// ─────────────────────────────────────────────
// GET /comisiones
// Obtiene todas las comisiones
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  const client = req.app.locals.mongoClient;
  const db = client.db(DB_NAME);

  try {
    const comisiones = await db.collection('comisiones').aggregate([
      {
        $lookup: {
          from: 'usuarios',
          localField: 'participants.advisors.user',
          foreignField: '_id',
          as: 'advisor_details'
        }
      },
      {
        $lookup: {
          from: 'usuarios',
          localField: 'participants.managers.user',
          foreignField: '_id',
          as: 'manager_details'
        }
      },
      {
        $lookup: {
          from: 'usuarios',
          localField: 'created_by',
          foreignField: '_id',
          as: 'created_by_detail'
        }
      },
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
      success: true,
      data: { comisiones, total: comisiones.length },
      message: 'Comisiones obtenidas correctamente',
      error: null
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener las comisiones',
      error: error.message
    });
  }
});

/**
 * GET /api/comisiones/pendientes-pago
 */
router.get('/pendientes-pago', authenticate, async (req, res) => {
  try {
    const db = req.app.locals.mongoClient.db(DB_NAME);

    // Obtener el estatus "Pendiente Pago" (order: 5)
    const statusPendientePago = await db.collection('estatus').findOne({ order: 5 });

    if (!statusPendientePago) {
      return res.status(404).json({
        success: false,
        message: 'Estatus "Pendiente Pago" no encontrado',
        data:    null,
        error:   null,
      });
    }

    const comisiones = await db.collection('comisiones').aggregate([
      {
        $match: { status: statusPendientePago._id }
      },

      // Lookup de estatus
      {
        $lookup: {
          from:         'estatus',
          localField:   'status',
          foreignField: '_id',
          as:           'status'
        }
      },
      { $unwind: { path: '$status', preserveNullAndEmptyArrays: true } },

      // Lookup de asesores dentro de participants.advisors
      {
        $lookup: {
          from: 'usuarios',
          let:  { advisors: '$participants.advisors' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', {
                    $map: {
                      input: '$$advisors',
                      as:    'a',
                      in:    '$$a.user'
                    }
                  }]
                }
              }
            },
            { $project: { name: 1, username: 1, picture: 1 } }
          ],
          as: '_advisors_data'
        }
      },

      // Lookup de managers dentro de participants.managers
      {
        $lookup: {
          from: 'usuarios',
          let:  { managers: '$participants.managers' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', {
                    $map: {
                      input: '$$managers',
                      as:    'm',
                      in:    '$$m.user'
                    }
                  }]
                }
              }
            },
            { $project: { name: 1, username: 1, picture: 1 } }
          ],
          as: '_managers_data'
        }
      },

      // Lookup del usuario que creó la comisión
      {
        $lookup: {
          from:         'usuarios',
          localField:   'created_by',
          foreignField: '_id',
          as:           'created_by',
          pipeline: [
            { $project: { name: 1, username: 1, picture: 1 } }
          ]
        }
      },
      { $unwind: { path: '$created_by', preserveNullAndEmptyArrays: true } },

      // Mezclar datos de usuarios dentro de cada advisor/manager
      {
        $addFields: {
          'participants.advisors': {
            $map: {
              input: '$participants.advisors',
              as:    'advisor',
              in: {
                $mergeObjects: [
                  '$$advisor',
                  {
                    user: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$_advisors_data',
                            as:    'u',
                            cond:  { $eq: ['$$u._id', '$$advisor.user'] }
                          }
                        },
                        0
                      ]
                    }
                  }
                ]
              }
            }
          },
          'participants.managers': {
            $map: {
              input: '$participants.managers',
              as:    'manager',
              in: {
                $mergeObjects: [
                  '$$manager',
                  {
                    user: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$_managers_data',
                            as:    'u',
                            cond:  { $eq: ['$$u._id', '$$manager.user'] }
                          }
                        },
                        0
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      },

      // Limpiar campos temporales
      {
        $project: {
          _advisors_data:  0,
          _managers_data:  0,
        }
      },

      { $sort: { operation_date: -1 } }

    ]).toArray();

    return res.status(200).json({
      success: true,
      message: `${comisiones.length} comisión(es) pendiente(s) de pago`,
      data:    comisiones,
      error:   null,
    });

  } catch (error) {
    console.error('[GET /api/comisiones/pendientes-pago]', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      data:    null,
      error:   error.message,
    });
  }
});

/**
 * GET /api/comisiones/mis-comisiones
 */
router.get('/mis-comisiones', authenticate, async (req, res) => {
  try {
    const db = req.app.locals.mongoClient.db(DB_NAME);
    const userId = new ObjectId(req.user.id);

    const comisiones = await db.collection('comisiones').aggregate([
      // 1. Filtrar donde el usuario es asesor o gerente
      {
        $match: {
          $or: [
            { 'participants.advisors.user': userId },
            { 'participants.managers.user': userId },
          ],
        },
      },

      // 2. Populate del estatus
      {
        $lookup: {
          from:         'estatus',
          localField:   'status',
          foreignField: '_id',
          as:           'status',
        },
      },
      { $unwind: { path: '$status', preserveNullAndEmptyArrays: true } },

      // 3. Populate de advisors
      {
        $lookup: {
          from:         'usuarios',
          localField:   'participants.advisors.user',
          foreignField: '_id',
          as:           '_advisorDocs',
          pipeline: [
            { $project: { name: 1, username: 1, picture: 1 } },
          ],
        },
      },

      // 4. Populate de managers
      {
        $lookup: {
          from:         'usuarios',
          localField:   'participants.managers.user',
          foreignField: '_id',
          as:           '_managerDocs',
          pipeline: [
            { $project: { name: 1, username: 1, picture: 1 } },
          ],
        },
      },

      // 5. Reconstruir participants con datos del usuario
      {
        $addFields: {
          'participants.advisors': {
            $map: {
              input: '$participants.advisors',
              as:    'a',
              in: {
                $mergeObjects: [
                  '$$a',
                  {
                    user: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$_advisorDocs',
                            as:    'd',
                            cond:  { $eq: ['$$d._id', '$$a.user'] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          },
          'participants.managers': {
            $map: {
              input: '$participants.managers',
              as:    'm',
              in: {
                $mergeObjects: [
                  '$$m',
                  {
                    user: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$_managerDocs',
                            as:    'd',
                            cond:  { $eq: ['$$d._id', '$$m.user'] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },

      // 6. Limpiar campos temporales
      {
        $project: {
          _advisorDocs:  0,
          _managerDocs:  0,
        },
      },

      // 7. Ordenar por fecha de registro descendente
      { $sort: { register_date: -1 } },

    ]).toArray();

    return res.status(200).json({
      success: true,
      message: `Se encontraron ${comisiones.length} comisiones`,
      data:    { comisiones },
      error:   null,
    });

  } catch (error) {
    console.error('[GET /api/comisiones/mis-comisiones]', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      data:    null,
      error:   error.message,
    });
  }
});



module.exports = router;