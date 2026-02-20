use('nova_db');

// 1. CREAR PERMISOS Y GUARDAR SUS IDs
const permissionsResult = db.permissions.insertMany([
  {
    name: "Crear Usuario",
    description: "Permite registrar nuevos usuarios en el sistema",
    module: "Usuarios"
  },
  {
    name: "Editar Usuario",
    description: "Permite modificar la información de usuarios existentes",
    module: "Usuarios"
  },
  {
    name: "Eliminar Usuario",
    description: "Permite eliminar usuarios del sistema",
    module: "Usuarios"
  },
  {
    name: "Ver Reportes",
    description: "Permite visualizar reportes generales del sistema",
    module: "Reportes"
  },
  {
    name: "Exportar Reportes",
    description: "Permite descargar reportes en diferentes formatos",
    module: "Reportes"
  },
  {
    name: "Crear Comisión",
    description: "Permite registrar nuevas comisiones",
    module: "Comisiones"
  },
  {
    name: "Editar Comisión",
    description: "Permite modificar información de comisiones",
    module: "Comisiones"
  },
  {
    name: "Eliminar Comisión",
    description: "Permite eliminar comisiones existentes",
    module: "Comisiones"
  },
  {
    name: "Ver Permisos",
    description: "Permite visualizar el catálogo de permisos",
    module: "Seguridad"
  },
  {
    name: "Asignar Roles",
    description: "Permite asignar roles a los usuarios",
    module: "Seguridad"
  }
]);

// Obtener todos los IDs de permisos creados
const allPermissionIds = Object.values(permissionsResult.insertedIds);

// 2. CREAR ROLES CON SUS PERMISOS ASIGNADOS
const rolesResult = db.roles.insertMany([
  {
    name: "SuperUsuario",
    description: "Acceso completo al sistema",
    permissions: allPermissionIds // Todos los permisos
  },
  {
    name: "Gerente",
    description: "Puede ver y editar información",
    permissions: [
      allPermissionIds[0], // Crear Usuario
      allPermissionIds[1], // Editar Usuario
      allPermissionIds[3], // Ver Reportes
      allPermissionIds[4], // Exportar Reportes
      allPermissionIds[5], // Crear Comisión
      allPermissionIds[6]  // Editar Comisión
    ]
  },
  {
    name: "Asesor",
    description: "Solo lectura",
    permissions: [
      allPermissionIds[3], // Ver Reportes
      allPermissionIds[8]  // Ver Permisos
    ]
  },
  {
    name: "Director",
    description: "Permisos de supervisión",
    permissions: [
      allPermissionIds[3], // Ver Reportes
      allPermissionIds[4], // Exportar Reportes
      allPermissionIds[8]  // Ver Permisos
    ]
  },
  {
    name: "Administrador",
    description: "Gestión de comisiones",
    permissions: [
      allPermissionIds[5], // Crear Comisión
      allPermissionIds[6], // Editar Comisión
      allPermissionIds[3]  // Ver Reportes
    ]
  }
]);

// Obtener el ID del rol Administrador (primer rol insertado)
const adminRoleId = rolesResult.insertedIds[0];

// 3. CREAR USUARIO CON ROL Y PERMISOS ASIGNADOS
db.users.insertOne({
  name: "Hendrick Martinez Perez",
  email: "henrick@gmail.com",
  phone: "5589543342",
  blood_type: "O+",
  birth_date: new Date("2025-08-24"), // Mejor usar Date object
  emergency_contact_name: "Ramses Moral Rosado",
  emergency_contact_phone: "5557358978", // Corregido el typo
  picture: "./RamsesEncuedaro.jpg",
  role: adminRoleId, // ID del rol Administrador
  username: "RAMRAN",
  password: "12345", // En producción, hasheala!
  permissions: allPermissionIds, // Todos los permisos
  active: true,
  created_at: new Date()
});
