use('nova_db');


db.createCollection("permissions")
db.permissions.insertMany([
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
    name: "Ver permissions",
    description: "Permite visualizar el catálogo de permissions",
    module: "Seguridad"
  },
  {
    name: "Asignar Roles",
    description: "Permite asignar roles a los usuarios",
    module: "Seguridad"
  }
]);

db.createCollection("roles");
db.roles.insertMany([
  {
    name: "Administrador",
    description: "Acceso completo al sistema",
    permissions: []
  },
  {
    name: "Supervisor",
    description: "Puede ver y editar información",
    permissions: []
  },
  {
    name: "Usuario",
    description: "Solo lectura",
    permissions: []
  }
]);

db.createCollection("users");
db.users.insertOne({
    name:"Hendrick Martinez Perez",
    email:"henrick@gmail.com",
    phone:"5589543342",
    blood_type:"O+",
    birthday:"24-08-2025",
    emergency_contact_name: "Ramses Moral Rosado",
    emergency_contant_phone : "5557358978",
    picture:"./RamsesEncuedaro.jpg",
    role:"asesor ",
    username:"RAMRAN",
    password:"12345",
    permissions:[],
    active: true 
});


