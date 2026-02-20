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


router.get('/companias', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT Id as id, Nombre as nombre FROM Companias');
    
    res.status(200).json({
      success: true,
      message: "Compañías obtenidas correctamente",
      data: {
        companias: result.recordset
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error al obtener las compañías",
      data: null,
      error: err.message
    });
  }
});

// Consulta genérica
router.get('/desarrollos', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT Id as id, Descripcion as nombre, IdCompania as compania FROM scv_Desarrollos');
    
    res.status(200).json({
      success: true,
      message: "Desarrollos obtenidos correctamente",
      data: {
        desarrollos: result.recordset
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error al obtener los desarrollos",
      data: null,
      error: err.message
    });
  }
});



router.get('/ubicaciones', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT Id as id, Nombre as nombre, IdDesarrollo as desarrollo FROM scv_ubicaciones');
    
    res.status(200).json({
      success: true,
      message: "Ubicaciones obtenidas correctamente",
      data: {
        ubicaciones: result.recordset
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error al obtener las ubicaciones",
      data: null,
      error: err.message
    });
  }
});




module.exports = router;

