const express = require('express');
const { ObjectId, Decimal128 } = require('mongodb');
const router = express.Router();
const { authenticate } = require('../JWT/authCookies');

const DB_NAME = 'roles_usuarios';

// ─── Resumen ──────────────────────────────────────────────────────────────────
// +--------+---------------------------------------------+-----------------------+-------------+
// | Método | Ruta                                        | Acción                | Transacción |
// +--------+---------------------------------------------+-----------------------+-------------+
// | POST   | /api/wallet/debts                           | Registrar deuda       |      ✓     |
// +--------+---------------------------------------------+-----------------------+-------------+
// | GET    | /api/wallet/debts/:user_id                  | Deudas de un usuario  |      —      |
// +--------+---------------------------------------------+-----------------------+-------------+
// | POST   | /api/wallet/debts/:debt_id/payment          | Pagar cuota           |      ✓     |
// +--------+---------------------------------------------+-----------------------+-------------+
// | PATCH  | /api/wallet/debts/:debt_id/cancel           | Cancelar deuda        |      —      |
// +--------+---------------------------------------------+-----------------------+-------------+
// | GET    | /api/wallet/:user_id/transactions           | Historial + Saldo     |      —      |
// +--------+---------------------------------------------+-----------------------+-------------+
// | POST   | /api/wallet/:user_id/transactions/credit    | Crédito manual        |      —      |
// +--------+---------------------------------------------+-----------------------+-------------+

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDecimal = (value) => Decimal128.fromString(value.toString());

const netBalance = async (db, userId) => {
    const resultado = await db.collection('walletTransactions').aggregate([
        { $match: { user_id: new ObjectId(userId) } },
        {
            $group: {
                _id: '$type',
                total: { $sum: { $toDouble: '$amount' } },
            },
        },
    ]).toArray();

    const credits = resultado.find(r => r._id === 'credit')?.total ?? 0;
    const debits = resultado.find(r => r._id === 'debit')?.total ?? 0;
    return parseFloat((credits - debits).toFixed(2));
};

// =============================================================================
// DEBTS
// =============================================================================

/**
 * POST /api/wallet/debts
 * Registrar una deuda nueva (loan | penalty)
 */
router.post('/debts', authenticate, async (req, res) => {
    const client = req.app.locals.mongoClient;
    const db = client.db(DB_NAME);
    const session = client.startSession();

    try {
        const { user_id, type, description, total_amount } = req.body;
        const created_by = req.user._id;

        // ── Validaciones ────────────────────────────────────────────────────────
        if (!user_id || !type || !description || !total_amount) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos requeridos: user_id, type, description, total_amount',
                data: null,
                error: null,
            });
        }

        if (!['loan', 'penalty'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: "El campo type debe ser 'loan' o 'penalty'",
                data: null,
                error: null,
            });
        }

        if (isNaN(total_amount) || total_amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'El monto debe ser un número mayor a 0',
                data: null,
                error: null,
            });
        }

        const userDoc = await db.collection('usuarios').findOne({ _id: new ObjectId(user_id) });
        if (!userDoc) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
                data: null,
                error: null,
            });
        }

        let debtId;
        const now = new Date();

        await session.withTransaction(async () => {

            // 1. Insertar deuda
            const debtDoc = {
                user_id: new ObjectId(user_id),
                type,
                description,
                total_amount: toDecimal(total_amount),
                remaining_balance: toDecimal(total_amount),
                status: 'active',
                created_by: new ObjectId(created_by),
                created_at: now,
                updated_at: now,
            };

            const { insertedId } = await db.collection('debts').insertOne(debtDoc, { session });
            debtId = insertedId;

            // 2. Registrar transacción de origen
            await db.collection('walletTransactions').insertOne({
                user_id: new ObjectId(user_id),
                type: 'debit',
                amount: toDecimal(total_amount),
                concept: type === 'loan' ? 'loan' : 'penalty',
                description,
                debt_id: debtId,
                comision_id: null,
                reference_date: now,
                created_by: new ObjectId(created_by),
                created_at: now,
            }, { session });

        });

        return res.status(201).json({
            success: true,
            message: 'Deuda registrada correctamente',
            data: { debt_id: debtId, user_id, type, total_amount },
            error: null,
        });

    } catch (error) {
        console.error('[POST /api/wallet/debts]', error);
        return res.status(500).json({
            success: false,
            message: 'Error al registrar la deuda',
            data: null,
            error: error.message,
        });
    } finally {
        await session.endSession();
    }
});

// -----------------------------------------------------------------------------

/**
 * GET /api/wallet/debts/:user_id
 * Deudas activas de un asesor
 */
router.get('/debts/:user_id', authenticate, async (req, res) => {
    try {
        const db = req.app.locals.mongoClient.db(DB_NAME);
        const { user_id } = req.params;
        const { status } = req.query; // ?status=active | paid | cancelled

        if (!ObjectId.isValid(user_id)) {
            return res.status(400).json({
                success: false,
                message: 'El parámetro user_id no es un ObjectId válido',
                data: null,
                error: null,
            });
        }

        const match = { user_id: new ObjectId(user_id) };
        if (status) match.status = status;

        const debts = await db.collection('debts').aggregate([
            { $match: match },

            // Populate created_by
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'created_by',
                    foreignField: '_id',
                    as: 'created_by',
                    pipeline: [{ $project: { name: 1, username: 1 } }],
                },
            },
            { $unwind: { path: '$created_by', preserveNullAndEmptyArrays: true } },

            { $sort: { created_at: -1 } },
        ]).toArray();

        return res.status(200).json({
            success: true,
            message: `Se encontraron ${debts.length} deudas`,
            data: { debts },
            error: null,
        });

    } catch (error) {
        console.error('[GET /api/wallet/debts/:user_id]', error);
        return res.status(500).json({
            success: false,
            message: 'Error al consultar las deudas',
            data: null,
            error: error.message,
        });
    }
});

// -----------------------------------------------------------------------------

/**
 * POST /api/wallet/debts/:debt_id/payment
 * Aplicar un pago parcial o total a una deuda
 */
router.post('/debts/:debt_id/payment', authenticate, async (req, res) => {
    const client = req.app.locals.mongoClient;
    const db = client.db(DB_NAME);
    const session = client.startSession();

    try {
        const { debt_id } = req.params;
        const { amount, description } = req.body;
        const created_by = req.user._id;

        // ── Validaciones ────────────────────────────────────────────────────────
        if (!ObjectId.isValid(debt_id)) {
            return res.status(400).json({
                success: false,
                message: 'El parámetro debt_id no es un ObjectId válido',
                data: null,
                error: null,
            });
        }

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'El monto debe ser un número mayor a 0',
                data: null,
                error: null,
            });
        }

        const debt = await db.collection('debts').findOne({ _id: new ObjectId(debt_id) });

        if (!debt) {
            return res.status(404).json({
                success: false,
                message: 'Deuda no encontrada',
                data: null,
                error: null,
            });
        }

        if (debt.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: `No se puede abonar a una deuda con estatus '${debt.status}'`,
                data: null,
                error: null,
            });
        }

        const remaining = parseFloat(debt.remaining_balance.toString());

        if (amount > remaining) {
            return res.status(400).json({
                success: false,
                message: `El monto ($${amount}) excede el saldo restante ($${remaining})`,
                data: null,
                error: null,
            });
        }

        const newBalance = parseFloat((remaining - amount).toFixed(2));
        const newStatus = newBalance === 0 ? 'paid' : 'active';
        const now = new Date();

        await session.withTransaction(async () => {

            // 1. Actualizar deuda
            await db.collection('debts').updateOne(
                { _id: new ObjectId(debt_id) },
                {
                    $set: {
                        remaining_balance: toDecimal(newBalance),
                        status: newStatus,
                        updated_at: now,
                    },
                },
                { session }
            );

            // 2. Registrar transacción de pago
            await db.collection('walletTransactions').insertOne({
                user_id: debt.user_id,
                type: 'debit',
                amount: toDecimal(amount),
                concept: 'payment',
                description: description ?? `Pago a deuda — ${debt.description}`,
                debt_id: new ObjectId(debt_id),
                comision_id: null,
                reference_date: now,
                created_by: new ObjectId(created_by),
                created_at: now,
            }, { session });

        });

        return res.status(200).json({
            success: true,
            message: newStatus === 'paid'
                ? 'Deuda liquidada correctamente'
                : `Pago aplicado. Saldo restante: $${newBalance}`,
            data: {
                debt_id,
                amount_paid: amount,
                remaining_balance: newBalance,
                status: newStatus,
            },
            error: null,
        });

    } catch (error) {
        console.error('[POST /api/wallet/debts/:debt_id/payment]', error);
        return res.status(500).json({
            success: false,
            message: 'Error al aplicar el pago',
            data: null,
            error: error.message,
        });
    } finally {
        await session.endSession();
    }
});

// -----------------------------------------------------------------------------

/**
 * PATCH /api/wallet/debts/:debt_id/cancel
 * Cancelar una deuda activa
 */
router.patch('/debts/:debt_id/cancel', authenticate, async (req, res) => {
    try {
        const db = req.app.locals.mongoClient.db(DB_NAME);
        const { debt_id } = req.params;

        if (!ObjectId.isValid(debt_id)) {
            return res.status(400).json({
                success: false,
                message: 'El parámetro debt_id no es un ObjectId válido',
                data: null,
                error: null,
            });
        }

        const debt = await db.collection('debts').findOne({ _id: new ObjectId(debt_id) });

        if (!debt) {
            return res.status(404).json({
                success: false,
                message: 'Deuda no encontrada',
                data: null,
                error: null,
            });
        }

        if (debt.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: `Solo se pueden cancelar deudas activas. Estatus actual: '${debt.status}'`,
                data: null,
                error: null,
            });
        }

        await db.collection('debts').updateOne(
            { _id: new ObjectId(debt_id) },
            { $set: { status: 'cancelled', updated_at: new Date() } }
        );

        return res.status(200).json({
            success: true,
            message: 'Deuda cancelada correctamente',
            data: { debt_id, status: 'cancelled' },
            error: null,
        });

    } catch (error) {
        console.error('[PATCH /api/wallet/debts/:debt_id/cancel]', error);
        return res.status(500).json({
            success: false,
            message: 'Error al cancelar la deuda',
            data: null,
            error: error.message,
        });
    }
});

// =============================================================================
// wallet TRANSACTIONS
// =============================================================================

/**
 * GET /api/wallet/:user_id/transactions
 * Historial de transacciones + saldo neto
 */
router.get('/:user_id/transactions', authenticate, async (req, res) => {
    try {
        const db = req.app.locals.mongoClient.db(DB_NAME);
        const { user_id } = req.params;
        const page = parseInt(req.query.page ?? 1);
        const limit = parseInt(req.query.limit ?? 20);
        const concept = req.query.concept; // ?concept=commission|loan|penalty|payment
        const type = req.query.type;    // ?type=credit|debit
        const skip = (page - 1) * limit;

        if (!ObjectId.isValid(user_id)) {
            return res.status(400).json({
                success: false,
                message: 'El parámetro user_id no es un ObjectId válido',
                data: null,
                error: null,
            });
        }

        const match = { user_id: new ObjectId(user_id) };
        if (concept) match.concept = concept;
        if (type) match.type = type;

        const [transactions, total, balance] = await Promise.all([

            // Transacciones paginadas
            db.collection('walletTransactions').aggregate([
                { $match: match },

                // Populate debt_id
                {
                    $lookup: {
                        from: 'debts',
                        localField: 'debt_id',
                        foreignField: '_id',
                        as: 'debt',
                        pipeline: [{ $project: { type: 1, description: 1, status: 1 } }],
                    },
                },
                { $unwind: { path: '$debt', preserveNullAndEmptyArrays: true } },

                // Populate comision_id
                {
                    $lookup: {
                        from: 'comisiones-ubicaciones',
                        localField: 'comision_id',
                        foreignField: '_id',
                        as: 'comision',
                        pipeline: [{ $project: { location: 1, commission_type: 1, sale_price: 1 } }],
                    },
                },
                { $unwind: { path: '$comision', preserveNullAndEmptyArrays: true } },

                { $sort: { created_at: -1 } },
                { $skip: skip },
                { $limit: limit },
            ]).toArray(),

            // Total de documentos para paginación
            db.collection('walletTransactions').countDocuments(match),

            // Saldo neto (siempre sobre todas las transacciones, sin filtros)
            netBalance(db, user_id),
        ]);

        return res.status(200).json({
            success: true,
            message: `Se encontraron ${total} transacciones`,
            data: {
                net_balance: balance,
                pagination: {
                    total,
                    page,
                    limit,
                    total_pages: Math.ceil(total / limit),
                },
                transactions,
            },
            error: null,
        });

    } catch (error) {
        console.error('[GET /api/wallet/:user_id/transactions]', error);
        return res.status(500).json({
            success: false,
            message: 'Error al consultar las transacciones',
            data: null,
            error: error.message,
        });
    }
});

// -----------------------------------------------------------------------------

/**
 * POST /api/wallet/:user_id/transactions/credit
 * Registrar un crédito manual (ej: comisión pagada)
 */
router.post('/:user_id/transactions/credit', authenticate, async (req, res) => {
    try {
        const db = req.app.locals.mongoClient.db(DB_NAME);
        const { user_id } = req.params;
        const { amount, concept, description, comision_id } = req.body;
        const created_by = req.user._id;

        if (!ObjectId.isValid(user_id)) {
            return res.status(400).json({
                success: false,
                message: 'El parámetro user_id no es un ObjectId válido',
                data: null,
                error: null,
            });
        }

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'El monto debe ser un número mayor a 0',
                data: null,
                error: null,
            });
        }

        if (!['commission', 'loan', 'penalty', 'payment'].includes(concept)) {
            return res.status(400).json({
                success: false,
                message: "El campo concept debe ser: commission | loan | penalty | payment",
                data: null,
                error: null,
            });
        }

        const now = new Date();

        const { insertedId } = await db.collection('walletTransactions').insertOne({
            user_id: new ObjectId(user_id),
            type: 'credit',
            amount: toDecimal(amount),
            concept,
            description: description ?? 'Crédito manual',
            debt_id: null,
            comision_id: comision_id ? new ObjectId(comision_id) : null,
            reference_date: now,
            created_by: new ObjectId(created_by),
            created_at: now,
        });

        const balance = await netBalance(db, user_id);

        return res.status(201).json({
            success: true,
            message: 'Crédito registrado correctamente',
            data: {
                transaction_id: insertedId,
                amount,
                concept,
                net_balance: balance,
            },
            error: null,
        });

    } catch (error) {
        console.error('[POST /api/wallet/:user_id/transactions/credit]', error);
        return res.status(500).json({
            success: false,
            message: 'Error al registrar el crédito',
            data: null,
            error: error.message,
        });
    }
});

module.exports = router;