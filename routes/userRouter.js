const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const router = express.Router();
const {
    setAuthCookie,
    clearAuthCookie,
    authenticate
} = require('../JWT/authCookies');

const DB_NAME = 'roles_usuarios';

/**
 * POST /api/users
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const db = req.app.locals.mongoClient.db(DB_NAME);

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
            password,
            permissions,
        } = req.body;

        // ── Validaciones requeridas ──────────────────────────────────────────
        const requiredFields = { name, email, phone, blood_type, birth_date, role, username, password };
        const missing = Object.entries(requiredFields)
            .filter(([_, v]) => !v)
            .map(([k]) => k);

        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Faltan campos requeridos: ${missing.join(', ')}`,
                data: null,
                error: null,
            });
        }

        // ── Validar que el role exista ───────────────────────────────────────
        const roleDoc = await db.collection('roles').findOne({ _id: new ObjectId(role) });
        if (!roleDoc) {
            return res.status(400).json({
                success: false,
                message: 'El rol especificado no existe',
                data: null,
                error: null,
            });
        }

        // ── Validar username único ───────────────────────────────────────────
        const existingUser = await db.collection('usuarios').findOne({ username });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: `El username '${username}' ya está en uso`,
                data: null,
                error: null,
            });
        }

        // ── Validar email único ──────────────────────────────────────────────
        const existingEmail = await db.collection('usuarios').findOne({ email });
        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: `El email '${email}' ya está en uso`,
                data: null,
                error: null,
            });
        }

        // ── Construir permissions ────────────────────────────────────────────
        // Si vienen custom_add o custom_remove, convertir a ObjectId
        const buildPermissions = {
            from_role: [],
            custom_add: (permissions?.custom_add ?? []).map(id => new ObjectId(id)),
            custom_remove: (permissions?.custom_remove ?? []).map(id => new ObjectId(id)),
        };

        // ── Construir documento ──────────────────────────────────────────────
        const newUser = {
            name,
            email,
            phone,
            blood_type,
            birth_date: new Date(birth_date),
            emergency_contact_name: emergency_contact_name ?? null,
            emergency_contact_phone: emergency_contact_phone ?? null,
            picture: picture ?? null,
            role: new ObjectId(role),
            username,
            password,
            permissions: buildPermissions,
            active: true,
            created_at: new Date(),
        };

        const result = await db.collection('usuarios').insertOne(newUser);

        return res.status(201).json({
            success: true,
            message: 'Usuario creado correctamente',
            data: { _id: result.insertedId, username, name },
            error: null,
        });

    } catch (error) {
        console.error('[POST /api/usuarios]', error);
        return res.status(500).json({
            success: false,
            message: 'Error en el servidor',
            data: null,
            error: error.message,
        });
    }
});

/**
 * GET /api/roles
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const db = req.app.locals.mongoClient.db(DB_NAME);

        const roles = await db.collection('roles').find({}).toArray();

        return res.status(200).json({
            success: true,
            message: `Se encontraron ${roles.length} roles`,
            data: { roles },
            error: null,
        });

    } catch (error) {
        console.error('[GET /api/roles]', error);
        return res.status(500).json({
            success: false,
            message: 'Error en el servidor',
            data: null,
            error: error.message,
        });
    }
});

/**
 * GET /api/users/by-role/:role
 */
router.get('/by-role/:role', authenticate, async (req, res) => {
    try {
        const db = req.app.locals.mongoClient.db(DB_NAME);
        const { role } = req.params;

        // ── Validar que el role sea un ObjectId válido ────────────────────────
        if (!ObjectId.isValid(role)) {
            return res.status(400).json({
                success: false,
                message: 'El parámetro role no es un ObjectId válido',
                data: null,
                error: null,
            });
        }

        // ── Validar que el rol exista ─────────────────────────────────────────
        const roleDoc = await db.collection('roles').findOne({ _id: new ObjectId(role) });
        if (!roleDoc) {
            return res.status(404).json({
                success: false,
                message: 'El rol especificado no existe',
                data: null,
                error: null,
            });
        }

        // ── Traer usuarios con populate del rol ──────────────────────────────
        const usuarios = await db.collection('usuarios').aggregate([
            {
                $match: {
                    role: new ObjectId(role),
                    active: true,
                },
            },

            // Populate del rol
            {
                $lookup: {
                    from: 'roles',
                    localField: 'role',
                    foreignField: '_id',
                    as: 'role',
                },
            },
            { $unwind: { path: '$role', preserveNullAndEmptyArrays: true } },

            // Excluir password
            {
                $project: {
                    password: 0,
                },
            },

            { $sort: { name: 1 } },

        ]).toArray();

        return res.status(200).json({
            success: true,
            message: `Se encontraron ${usuarios.length} usuarios con el rol '${roleDoc.name}'`,
            data: { role: roleDoc, usuarios },
            error: null,
        });

    } catch (error) {
        console.error('[GET /api/usuarios/by-role/:role]', error);
        return res.status(500).json({
            success: false,
            message: 'Error en el servidor',
            data: null,
            error: error.message,
        });
    }
});

module.exports = router;