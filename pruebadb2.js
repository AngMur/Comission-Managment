// ejemplos-lectura.js - Solo consultas SELECT
const db = require('./db2');

// Ejemplo 1: Obtener todas las ventas
async function obtenerTodasLasVentas() {
  try {
    const query = 'SELECT * FROM uvw_scv_Ventas';
    const resultados = await db.ejecutarConsulta(query);
    console.log(`Total de ventas: ${resultados.length}`);
    console.log('Primeras 3 ventas:', resultados.slice(0, 3));
    return resultados;
  } catch (err) {
    console.error('Error:', err);
  }
}

// Ejemplo 2: Obtener venta específica por ID
async function obtenerVentaPorId(ventaId) {
  try {
    const query = 'SELECT * FROM uvw_scv_Ventas WHERE VentaID = @id';
    const params = { id: ventaId };
    const resultado = await db.ejecutarConsulta(query, params);
    console.log('Venta encontrada:', resultado[0]);
    return resultado[0];
  } catch (err) {
    console.error('Error:', err);
  }
}

// Ejemplo 3: Obtener clientes
async function obtenerClientes() {
  try {
    const query = 'SELECT TOP 10 * FROM uvw_SCV_Clientes';
    const resultados = await db.ejecutarConsulta(query);
    console.log('Clientes:', resultados);
    return resultados;
  } catch (err) {
    console.error('Error:', err);
  }
}

// Ejemplo 4: Buscar cliente por nombre
async function buscarClientePorNombre(nombre) {
  try {
    const query = `
      SELECT * FROM uvw_SCV_Clientes 
      WHERE Nombre LIKE @nombre
    `;
    const params = { nombre: `%${nombre}%` };
    const resultados = await db.ejecutarConsulta(query, params);
    console.log(`Clientes encontrados: ${resultados.length}`);
    return resultados;
  } catch (err) {
    console.error('Error:', err);
  }
}

// Ejemplo 5: Obtener desarrollos
async function obtenerDesarrollos() {
  try {
    const query = 'SELECT * FROM scv_Desarrollos';
    const resultados = await db.ejecutarConsulta(query);
    console.log('Desarrollos:', resultados);
    return resultados;
  } catch (err) {
    console.error('Error:', err);
  }
}

// Ejemplo 6: Obtener ubicaciones por desarrollo
async function obtenerUbicacionesPorDesarrollo(desarrolloId) {
  try {
    const query = `
      SELECT * FROM scv_Ubicaciones 
      WHERE DesarrolloID = @desarrolloId
    `;
    const params = { desarrolloId: desarrolloId };
    const resultados = await db.ejecutarConsulta(query, params);
    console.log(`Ubicaciones encontradas: ${resultados.length}`);
    return resultados;
  } catch (err) {
    console.error('Error:', err);
  }
}

// Ejemplo 7: Obtener lista de precios
async function obtenerListaPrecios() {
  try {
    const query = 'SELECT TOP 20 * FROM uvw_scv_ListaPrecios';
    const resultados = await db.ejecutarConsulta(query);
    console.log('Lista de precios:', resultados);
    return resultados;
  } catch (err) {
    console.error('Error:', err);
  }
}

// Ejemplo 8: Obtener usuarios
async function obtenerUsuarios() {
  try {
    const query = 'SELECT TOP 10 * FROM uvw_usuarios';
    const resultados = await db.ejecutarConsulta(query);
    console.log('Usuarios:', resultados);
    return resultados;
  } catch (err) {
    console.error('Error:', err);
  }
}

// Ejemplo 9: Obtener expedientes
async function obtenerExpedientes() {
  try {
    const query = 'SELECT TOP 10 * FROM scv_Expedientes';
    const resultados = await db.ejecutarConsulta(query);
    console.log('Expedientes:', resultados);
    return resultados;
  } catch (err) {
    console.error('Error:', err);
  }
}

// Ejemplo 10: Obtener boletas de prospección
async function obtenerBoletasProspeccion() {
  try {
    const query = 'SELECT TOP 10 * FROM uvw_SCV_BoletasProspeccion';
    const resultados = await db.ejecutarConsulta(query);
    console.log('Boletas de prospección:', resultados);
    return resultados;
  } catch (err) {
    console.error('Error:', err);
  }
}

// Ejemplo 11: Contar registros en una tabla
async function contarVentas() {
  try {
    const query = 'SELECT COUNT(*) as total FROM uvw_scv_Ventas';
    const resultado = await db.ejecutarConsulta(query);
    console.log(`Total de ventas: ${resultado[0].total}`);
    return resultado[0].total;
  } catch (err) {
    console.error('Error:', err);
  }
}

// Ejemplo 12: JOIN entre tablas
async function obtenerVentasConClientes() {
  try {
    const query = `
      SELECT TOP 10
        v.*,
        c.Nombre,
        c.Apellido,
        c.Email
      FROM uvw_scv_Ventas v
      INNER JOIN uvw_SCV_Clientes c ON v.ClienteID = c.ClienteID
    `;
    const resultados = await db.ejecutarConsulta(query);
    console.log('Ventas con clientes:', resultados);
    return resultados;
  } catch (err) {
    console.error('Error:', err);
  }
}

// FUNCIÓN PRINCIPAL PARA PROBAR
async function main() {
  try {

    console.log('=== INICIANDO PRUEBAS DE LECTURA ===\n');

    console.log('\n--- Test 1: Obtener todos los desarrollos  ---');

    await obtenerDesarrollos();
    // // Prueba 1
    // console.log('\n--- Test 1: Obtener todas las ventas ---');
    // await obtenerTodasLasVentas();

    // // Prueba 2
    // console.log('\n--- Test 2: Obtener venta por ID ---');
    // await obtenerVentaPorId(1);

    // // Prueba 3
    // console.log('\n--- Test 3: Obtener clientes ---');
    // await obtenerClientes();

    // // Prueba 4
    // console.log('\n--- Test 4: Contar ventas ---');
    // await contarVentas();

    // // Prueba 5
    // console.log('\n--- Test 5: Ventas con clientes (JOIN) ---');
    // await obtenerVentasConClientes();

    console.log('\n=== PRUEBAS COMPLETADAS ===');
    
    // Cerrar conexión
    await db.cerrarConexion();
  } catch (err) {
    console.error('Error en main:', err);
  }
}

// Ejecutar pruebas
main();

module.exports = {
  obtenerTodasLasVentas,
  obtenerVentaPorId,
  obtenerClientes,
  buscarClientePorNombre,
  obtenerDesarrollos,
  obtenerUbicacionesPorDesarrollo,
  obtenerListaPrecios,
  obtenerUsuarios,
  obtenerExpedientes,
  obtenerBoletasProspeccion,
  contarVentas,
  obtenerVentasConClientes
};