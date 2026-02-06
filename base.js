use('nova_db');


db.createCollection("permisos")
db.permisos.insertMany([
  {
    "nombre": "Crear Usuario",
    "descripcion": "Permite registrar nuevos usuarios en el sistema",
    "modulo": "Usuarios"
  },
  {
    "nombre": "Editar Usuario",
    "descripcion": "Permite modificar la información de usuarios existentes",
    "modulo": "Usuarios"
  },
  {
    "nombre": "Eliminar Usuario",
    "descripcion": "Permite eliminar usuarios del sistema",
    "modulo": "Usuarios"
  },
  {
    "nombre": "Ver Reportes",
    "descripcion": "Permite visualizar reportes generales del sistema",
    "modulo": "Reportes"
  },
  {
    "nombre": "Exportar Reportes",
    "descripcion": "Permite descargar reportes en diferentes formatos",
    "modulo": "Reportes"
  },
  {
    "nombre": "Crear Comisión",
    "descripcion": "Permite registrar nuevas comisiones",
    "modulo": "Comisiones"
  },
  {
    "nombre": "Editar Comisión",
    "descripcion": "Permite modificar información de comisiones",
    "modulo": "Comisiones"
  },
  {
    "nombre": "Eliminar Comisión",
    "descripcion": "Permite eliminar comisiones existentes",
    "modulo": "Comisiones"
  },
  {
    "nombre": "Ver Permisos",
    "descripcion": "Permite visualizar el catálogo de permisos",
    "modulo": "Seguridad"
  },
  {
    "nombre": "Asignar Roles",
    "descripcion": "Permite asignar roles a los usuarios",
    "modulo": "Seguridad"
  }
]);

db.createCollection("roles");
db.roles.insertMany([
  {
    nombre: "Administrador",
    descripcion: "Acceso completo al sistema",
    permisos: []
  },
  {
    nombre: "Supervisor",
    descripcion: "Puede ver y editar información",
    permisos: []
  },
  {
    nombre: "Usuario",
    descripcion: "Solo lectura",
    permisos: []
  }
]);

db.createCollection("usuarios");
db.usuarios.insertOne({
    "nombre":"Hendrick Martinez Perez",
    "correo":"henrick@gmail.com",
    "telefono":"5589543342",
    "tipo_sange":"O+",
    "fecha_nacimiento":"24-08-2025",
    "nombre_contacto_emergencia": "Ramses Moral Rosado",
    "telefono_contacto_emergencia" : "5557358978",
    "foto":"./RamsesEncuedaro.jpg",
    "rol":"asesor ",
    "nombre_usuario":"RAMRAN",
    "contraseña":"12345",
    "permisos":[],
    "activo": true 
});
