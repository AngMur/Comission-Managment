const sql = require('mssql');
require('dotenv').config();

const express = require('express');
const router = express.Router();

// Config conexión
const port = parseInt(process.env.EK_PORT, 10);
const config = {
  user: process.env.EK_USER,
  password: process.env.EK_PASS,
  server: process.env.EK_SERVER,
  database: process.env.EK_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  port: port
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
    const result = await pool.request().query("SELECT ubi.Nombre as nombre, ubi.IdDesarrollo as desarrollo, ubi.Id as id, vta.importe as importe_venta FROM scv_ubicaciones ubi INNER JOIN scv_Ventas_Ubicaciones vta_ubi ON ubi.Id = vta_ubi.IdUbicacion INNER JOIN uvw_SCV_Ventas vta ON vta_ubi.IdVenta = vta.ID INNER JOIN uvw_SCV_Expedientes_Seguimientos_Etapas seg ON vta.IdExpediente = seg.IdExpediente WHERE seg.[Etapa.Nombre] = 'RECEPCION DE EXPEDIENTE' AND seg.FechaCierre IS NULL AND seg.FechaInicio IS NOT NULL;");

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

