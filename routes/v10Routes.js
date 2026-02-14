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

router.get('/desarrollos', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT * FROM scv_Desarrollos');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Departamentos
router.get('/ubicaciones/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const resUbicaciones = await pool.request()
            .input('idUbicacion', sql.Int, id)
            .query('SELECT Nombre, ID, IdDesarrollo FROM uvw_SCV_Ubicaciones WHERE ID = @idUbicacion');

        const resVentas = await pool.request()
            .input('idUbicacion', sql.Int, id)
            .query('SELECT IdVenta, IdUbicacion, Importe FROM scv_Ventas_Ubicaciones WHERE IdUbicacion = @idUbicacion');

        const ubicacion = resUbicaciones.recordset[0];
        const ventas = resVentas.recordset;

        if (!ubicacion) {
            return res.status(404).json({ message: "Ubicación no encontrada" });
        }

        const resultado = ventas.map(venta => ({
            ...venta,
            datosUbicacion: {
                Nombre: ubicacion.Nombre,
                IdDesarrollo: ubicacion.IdDesarrollo
            }
        }));


        res.json({
            idBuscado: id,
            totalVentas: resultado.length,
            ventas: resultado
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Precios por Departamento
router.get('/ventas', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT IdVenta, IdUbicacion, Importe FROM scv_Ventas_Ubicaciones');
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



module.exports = router;

