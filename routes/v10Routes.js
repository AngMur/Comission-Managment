const sql = require('mssql');

const express = require('express');
const router = express.Router();

// Config conexión
const config = {
    user: 'EKAppUser',
    password: 'Enkontrol$app.user002',
    server: '10.0.0.3',
    database: 'EKCloud',
    options: {
        encrypt: false,
        trustServerCertificate: true
    },
    port: 3470
};

let pool;

// Crear pool UNA sola vez
async function connectDB() {
    try {
        pool = await sql.connect(config);
        console.log('V10 SQL conectado');
    } catch (err) {
        console.error('V10 Error DB:', err.message);
    }
}

connectDB();


// ---------- ENDPOINTS ----------

// Probar conexión
router.get('/version', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT @@VERSION AS version');
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Consulta genérica
router.get('/desarrollos', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT * FROM scv_Desarrollos');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/companias', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT * FROM Companias');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Query con parámetro
router.get('/user/:id', async (req, res) => {
    try {
        const result = await pool
            .request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM Users WHERE Id = @id');

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/precio', async (req, res) => {
    try {
        data = {"A-34": 5000000};
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

