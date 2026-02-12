// db.js - Configuración de conexión
require('dotenv').config();
const sql = require('mssql');

const config = {
  server: '10.0.0.3\SQLEXPRESS',
  port: 3470,
  database: 'EKCloud',
  user: 'EKAppUser',
  password: 'Enkontrol$app.user002',
  options: {
    encrypt: false, // Para SQL Server local
    trustServerCertificate: true,
    enableArithAbort: true,
    instanceName: 'SQLEXPRESS'
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  connectionTimeout: 30000,
  requestTimeout: 30000
};

// Pool de conexiones global
let pool;

async function conectar() {
  try {
    if (!pool) {
      pool = await sql.connect(config);
      console.log('✅ Conectado a SQL Server');
    }
    return pool;
  } catch (err) {
    console.error('❌ Error al conectar a la base de datos:', err);
    throw err;
  }
}

async function ejecutarConsulta(query, params = {}) {
  try {
    const pool = await conectar();
    const request = pool.request();
    
    // Agregar parámetros si existen
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    console.error('❌ Error al ejecutar consulta:', err);
    throw err;
  }
}

async function cerrarConexion() {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log('✅ Conexión cerrada');
    }
  } catch (err) {
    console.error('❌ Error al cerrar conexión:', err);
  }
}

module.exports = {
  conectar,
  ejecutarConsulta,
  cerrarConexion,
  sql // Exportar sql para usar tipos de datos
};