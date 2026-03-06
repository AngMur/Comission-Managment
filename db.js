use('nova_db');

// ==========================================
// 1. COLECCIÓN: permissions
// ==========================================
db.createCollection("permissions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "description", "module", "created_at"],
      properties: {
        name:        { bsonType: "string" },
        description: { bsonType: "string" },
        module:      { bsonType: "string" },
        created_at:  { bsonType: "date" }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

db.permissions.createIndex({ name: 1 },   { unique: true });
db.permissions.createIndex({ module: 1 });


// ==========================================
// 2. COLECCIÓN: roles
// ==========================================
db.createCollection("roles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "description", "permissions", "created_at"],
      properties: {
        name:        { bsonType: "string" },
        description: { bsonType: "string" },
        permissions: {
          bsonType: "array",
          minItems: 1,
          items: { bsonType: "objectId" }
        },
        created_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

db.roles.createIndex({ name: 1 }, { unique: true });


// ==========================================
// 3. COLECCIÓN: users
// ==========================================
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "name", "email", "phone", "blood_type",
        "birth_date", "emergency_contact_name",
        "emergency_contact_phone", "picture",
        "role", "username", "password",
        "permissions", "active", "created_at"
      ],
      properties: {
        name: { bsonType: "string" },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$"
        },
        phone: {
          bsonType: "string",
          pattern: "^[0-9]{10}$"
        },
        blood_type: {
          bsonType: "string",
          enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
        },
        birth_date:              { bsonType: "date" },
        emergency_contact_name:  { bsonType: "string" },
        emergency_contact_phone: {
          bsonType: "string",
          pattern: "^[0-9]{10}$"
        },
        picture:  { bsonType: "string" },
        role:     { bsonType: "objectId" },
        username: { bsonType: "string" },
        password: { bsonType: "string" },
        permissions: {
          bsonType: "object",
          required: ["from_role", "custom_add", "custom_remove"],
          properties: {
            from_role:     { bsonType: "array", items: { bsonType: "objectId" } },
            custom_add:    { bsonType: "array", items: { bsonType: "objectId" } },
            custom_remove: { bsonType: "array", items: { bsonType: "objectId" } }
          }
        },
        active:     { bsonType: "bool" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

db.users.createIndex({ email: 1 },    { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ active: 1 });


// ==========================================
// 4. COLECCIÓN: commissions
//
// CAMBIOS vs versión anterior:
//   • company / development / location / concept
//     → ahora son objetos { id: string, text: string }
//     (ya no existen company_id, development_id, location_id como campos raíz)
//   • participant: se eliminó "role" y se renombró "gain" → "commission"
//   • nuevos campos: operation_date y register_date (string "YYYY-MM-DD")
// ==========================================

// Sub-schema reutilizable para cada participante
const participant_schema = {
  bsonType: "object",
  required: ["user", "percentage", "commission"],
  properties: {
    user: { bsonType: "objectId" },
    percentage: {
      bsonType: "double",
      minimum: 0,
      maximum: 100
    },
    commission: {
      bsonType: "double",
      minimum: 0
    }
  }
};

// Sub-schema reutilizable para campos de referencia {id, text}
const ref_schema = {
  bsonType: "object",
  required: ["id", "text"],
  properties: {
    id:   { bsonType: "string" },
    text: { bsonType: "string" }
  }
};

db.createCollection("commissions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "company", "development", "location", "concept",
        "commission_type", "sale_price", "status",
        "participants", "created_at"
      ],
      properties: {

        // Referencias enriquecidas {id, text}
        company:     ref_schema,
        development: ref_schema,
        location:    ref_schema,
        concept:     ref_schema,

        // Tipo de comisión (ej: "Tradicional", "Multipunto", etc.)
        commission_type: { bsonType: "string" },

        // Precio de venta
        sale_price: { bsonType: "double", minimum: 0 },

        // Fechas opcionales en formato "YYYY-MM-DD"
        operation_date: { bsonType: "string" },
        register_date:  { bsonType: "string" },

        // Estado de la comisión
        status: { bsonType: "string" },

        // Participantes agrupados por rol
        participants: {
          bsonType: "object",
          required: ["advisors", "managers"],
          properties: {
            advisors: { bsonType: "array", items: participant_schema },
            managers: { bsonType: "array", items: participant_schema }
          }
        },

        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

// Índices
db.commissions.createIndex({ "participants.advisors.user": 1 });
db.commissions.createIndex({ "participants.managers.user": 1 });
db.commissions.createIndex({ status: 1 });
db.commissions.createIndex({ "concept.id": 1 });
db.commissions.createIndex({ "company.id": 1, "development.id": 1 });
db.commissions.createIndex({ created_at: -1 });


// ==========================================
// 5. COLECCIÓN: percentages
//
// Almacena los porcentajes base por tipo de comisión.
// Solo existe un documento activo (v1) que el sistema consulta
// al calcular la comisión de cada participante.
//
// Estructura:
//   v1.traditional  → comisión estándar (1 gerente, 1 asesor)
//   v1.shared       → comisión compartida (2 gerentes, 2 asesores)
//   v1.multipoint   → comisión multipunto (2 gerentes, 2 asesores)
// ==========================================
db.createCollection("percentages", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["v1"],
      properties: {
        v1: {
          bsonType: "object",
          required: ["traditional", "shared", "multipoint"],
          properties: {

            traditional: {
              bsonType: "object",
              required: ["manager", "advisor"],
              properties: {
                manager1: { bsonType: "double", minimum: 0 },
                advisor1: { bsonType: "double", minimum: 0 }
              }
            },

            shared: {
              bsonType: "object",
              required: ["manager1", "manager2", "advisor1", "advisor2"],
              properties: {
                manager1: { bsonType: "double", minimum: 0 },
                manager2: { bsonType: "double", minimum: 0 },
                advisor1: { bsonType: "double", minimum: 0 },
                advisor2: { bsonType: "double", minimum: 0 }
              }
            },

            multipoint: {
              bsonType: "object",
              required: ["manager1", "manager2", "advisor1", "advisor2"],
              properties: {
                manager1: { bsonType: "double", minimum: 0 },
                manager2: { bsonType: "double", minimum: 0 },
                advisor1: { bsonType: "double", minimum: 0 },
                advisor2: { bsonType: "double", minimum: 0 }
              }
            }

          }
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});


// ==========================================
// 5. SEED: permissions
// ==========================================
const permissions_result = db.permissions.insertMany([
  // Módulo: Usuarios
  { name: "crear_usuario",     description: "Permite registrar nuevos usuarios en el sistema",         module: "Usuarios",   created_at: new Date() },
  { name: "editar_usuario",    description: "Permite modificar la información de usuarios existentes", module: "Usuarios",   created_at: new Date() },
  { name: "eliminar_usuario",  description: "Permite eliminar usuarios del sistema",                   module: "Usuarios",   created_at: new Date() },
  // Módulo: Reportes
  { name: "ver_reportes",      description: "Permite visualizar reportes generales del sistema",       module: "Reportes",   created_at: new Date() },
  { name: "exportar_reportes", description: "Permite descargar reportes en diferentes formatos",       module: "Reportes",   created_at: new Date() },
  // Módulo: Comisiones
  { name: "crear_comision",    description: "Permite registrar nuevas comisiones",                     module: "Comisiones", created_at: new Date() },
  { name: "editar_comision",   description: "Permite modificar información de comisiones",             module: "Comisiones", created_at: new Date() },
  { name: "eliminar_comision", description: "Permite eliminar comisiones existentes",                  module: "Comisiones", created_at: new Date() },
  { name: "ver_comisiones",    description: "Permite visualizar el listado de comisiones",             module: "Comisiones", created_at: new Date() },
  // Módulo: Seguridad
  { name: "ver_permisos",      description: "Permite visualizar el catálogo de permisos",              module: "Seguridad",  created_at: new Date() },
  { name: "asignar_roles",     description: "Permite asignar roles a los usuarios",                    module: "Seguridad",  created_at: new Date() }
]);

const p = Object.values(permissions_result.insertedIds);
// p[0]  → crear_usuario       p[1]  → editar_usuario      p[2]  → eliminar_usuario
// p[3]  → ver_reportes        p[4]  → exportar_reportes
// p[5]  → crear_comision      p[6]  → editar_comision     p[7]  → eliminar_comision
// p[8]  → ver_comisiones      p[9]  → ver_permisos        p[10] → asignar_roles


// ==========================================
// 6. SEED: roles
// ==========================================
const roles_result = db.roles.insertMany([
  {
    name: "SuperUsuario",
    description: "Acceso completo al sistema",
    permissions: p,
    created_at: new Date()
  },
  {
    name: "Gerente",
    description: "Puede ver, editar y gestionar comisiones",
    permissions: [ p[0], p[1], p[3], p[4], p[5], p[6], p[8] ],
    created_at: new Date()
  },
  {
    name: "Asesor",
    description: "Solo lectura",
    permissions: [ p[3], p[8], p[9] ],
    created_at: new Date()
  },
  {
    name: "Director",
    description: "Permisos de supervisión",
    permissions: [ p[3], p[4], p[8], p[9] ],
    created_at: new Date()
  },
  {
    name: "Administrador",
    description: "Gestión completa de comisiones",
    permissions: [ p[3], p[5], p[6], p[7], p[8] ],
    created_at: new Date()
  }
]);

const super_user_role_id = roles_result.insertedIds[0];
const manager_role_id    = roles_result.insertedIds[1];
const advisor_role_id    = roles_result.insertedIds[2];
const director_role_id   = roles_result.insertedIds[3];
const admin_role_id      = roles_result.insertedIds[4];


// ==========================================
// 7. SEED: users
// ==========================================
const manager_role = db.roles.findOne({ _id: manager_role_id });
const advisor_role = db.roles.findOne({ _id: advisor_role_id });

const users_result = db.users.insertMany([
  {
    name:                    "Hendrick Martinez Perez",
    email:                   "henrick@gmail.com",
    phone:                   "5589543342",
    blood_type:              "O+",
    birth_date:              new Date("2025-08-24"),
    emergency_contact_name:  "Ramses Moral Rosado",
    emergency_contact_phone: "5557358978",
    picture:                 "./static/image.jpg",
    role:                    super_user_role_id,
    username:                "RAMRAN",
    password:                "12345",
    permissions: {
      from_role:     p,
      custom_add:    [],
      custom_remove: []
    },
    active:     true,
    created_at: new Date()
  },
  {
    name:                    "Laura Sanchez Vega",
    email:                   "laura.sanchez@nova.com",
    phone:                   "5512345678",
    blood_type:              "A+",
    birth_date:              new Date("1990-03-15"),
    emergency_contact_name:  "Pedro Sanchez",
    emergency_contact_phone: "5598765432",
    picture:                 "./static/image.jpg",
    role:                    manager_role_id,
    username:                "LAURASV",
    password:                "12345",
    permissions: {
      from_role:     manager_role.permissions,
      custom_add:    [],
      custom_remove: []
    },
    active:     true,
    created_at: new Date()
  },
  {
    name:                    "Carlos Mendoza Torres",
    email:                   "carlos.mendoza@nova.com",
    phone:                   "5523456789",
    blood_type:              "B+",
    birth_date:              new Date("1995-07-22"),
    emergency_contact_name:  "Ana Torres",
    emergency_contact_phone: "5567891234",
    picture:                 "./static/image.jpg",
    role:                    advisor_role_id,
    username:                "CARLOSMT",
    password:                "12345",
    permissions: {
      from_role:     advisor_role.permissions,
      custom_add:    [],
      custom_remove: []
    },
    active:     true,
    created_at: new Date()
  }
]);

const hendrick_id = users_result.insertedIds[0];
const laura_id    = users_result.insertedIds[1];
const carlos_id   = users_result.insertedIds[2];


// ==========================================
// 8. SEED: commissions
// Ahora con la nueva estructura {id, text}
// y sin campo "role" ni "gain" en participantes
// ==========================================
db.commissions.insertMany([
  {
    company:     { id: "1", text: "Innova Living" },
    development: { id: "2", text: "Innova Residences" },
    location:    { id: "3", text: "Innova-N4-B703" },
    concept:     { id: "1", text: "Escritura" },
    commission_type: "Multipunto",
    sale_price: 5350000.0,
    operation_date: "2026-01-15",
    register_date:  "2026-01-10",
    status: "Verificada",
    participants: {
      managers: [
        { user: hendrick_id, percentage: 1.2, commission: 64200.0 },
        { user: laura_id,    percentage: 1.2, commission: 64200.0 }
      ],
      advisors: [
        { user: carlos_id, percentage: 1.2, commission: 64200.0 }
      ]
    },
    created_at: new Date("2026-01-15T10:00:00.000Z"),
    updated_at: new Date("2026-01-20T14:30:00.000Z")
  },
  {
    company:     { id: "1", text: "Innova Living" },
    development: { id: "4", text: "Innova Sky" },
    location:    { id: "8", text: "Innova-N2-A401" },
    concept:     { id: "2", text: "Contrato" },
    commission_type: "Tradicional",
    sale_price: 3200000.0,
    operation_date: "2026-02-01",
    register_date:  "2026-01-28",
    status: "Pendiente",
    participants: {
      managers: [
        { user: laura_id, percentage: 0.5, commission: 16000.0 }
      ],
      advisors: [
        { user: carlos_id, percentage: 2.0, commission: 64000.0 }
      ]
    },
    created_at: new Date("2026-02-01T09:15:00.000Z"),
    updated_at: new Date("2026-02-01T09:15:00.000Z")
  },
  {
    company:     { id: "1", text: "Innova Living" },
    development: { id: "2", text: "Innova Residences" },
    location:    { id: "11", text: "Innova-N1-C102" },
    concept:     { id: "1", text: "Escritura" },
    commission_type: "Tradicional",
    sale_price: 4800000.0,
    operation_date: "2025-12-10",
    register_date:  "2025-12-05",
    status: "Pagada",
    participants: {
      managers: [
        { user: laura_id, percentage: 1.0, commission: 48000.0 }
      ],
      advisors: [
        { user: carlos_id, percentage: 1.5, commission: 72000.0 }
      ]
    },
    created_at: new Date("2025-12-10T08:00:00.000Z"),
    updated_at: new Date("2026-01-05T16:00:00.000Z")
  },
  {
    // Ejemplo exacto del payload de la imagen
    company:     { id: "2", text: "DESARROLLADORA TOKIO, S.A. DE C.V." },
    development: { id: "2", text: "TOKIO 616" },
    location:    { id: "2", text: "TOKIO-PB-A008" },
    concept:     { id: "1", text: "Contrato" },
    commission_type: "Tradicional",
    sale_price: 2000000.0,
    operation_date: "2026-04-02",
    register_date:  "2026-03-03",
    status: "Pendiente",
    participants: {
      advisors: [
        { user: hendrick_id, percentage: 0.006, commission: 12000.0 }
      ],
      managers: [
        { user: laura_id, percentage: 0.0025, commission: 5000.0 }
      ]
    },
    created_at: new Date("2026-03-03T16:18:28.000Z"),
    updated_at: new Date("2026-03-03T16:18:28.000Z")
  }
]);


// ==========================================
// 9. SEED: percentages
// ==========================================
db.percentages.insertOne({
  v1: {
    traditional: {
      manager1: 0.0025,   // 0.25%
      advisor1: 0.006     // 0.60%
    },
    shared: {
      manager1: 0.0015,  // 0.15%
      manager2: 0.0015,  // 0.15%
      advisor1: 0.0042,  // 0.42%
      advisor2: 0.0028   // 0.28%
    },
    multipoint: {
      manager1: 0.0025,  // 0.25%
      manager2: 0.0015,  // 0.15%
      advisor1: 0.005,   // 0.50%
      advisor2: 0.0028   // 0.28%
    }
  }
});


// ==========================================
// OPERACIONES DE GESTIÓN
// ==========================================

// OP 1: Agregar permiso custom a un usuario
db.users.updateOne(
  { _id: carlos_id },
  {
    $addToSet: { "permissions.custom_add": p[4] },
    $set:      { updated_at: new Date() }
  }
);

// OP 2: Remover un permiso del rol de un usuario
db.users.updateOne(
  { _id: laura_id },
  {
    $addToSet: { "permissions.custom_remove": p[5] },
    $set:      { updated_at: new Date() }
  }
);

// OP 3: Sincronizar rol → usuarios (ejecutar en backend al editar un rol)
function sync_role_to_users(role_id) {
  const role = db.roles.findOne({ _id: role_id });
  if (!role) return;

  const result = db.users.updateMany(
    { role: role_id },
    {
      $set: {
        "permissions.from_role": role.permissions,
        updated_at: new Date()
      }
    }
  );

  print(`Rol "${role.name}" sincronizado → ${result.modifiedCount} usuario(s) actualizado(s)`);
}

db.roles.updateOne(
  { _id: manager_role_id },
  { $addToSet: { permissions: p[7] } }
);
sync_role_to_users(manager_role_id);


// ==========================================
// QUERY: resolver permisos efectivos
// efectivos = (from_role ∪ custom_add) - custom_remove
// ==========================================
print("\n-- Permisos efectivos de cada usuario --");
db.users.aggregate([
  {
    $addFields: {
      effective_permission_ids: {
        $setDifference: [
          { $setUnion: ["$permissions.from_role", "$permissions.custom_add"] },
          "$permissions.custom_remove"
        ]
      }
    }
  },
  {
    $lookup: {
      from:         "permissions",
      localField:   "effective_permission_ids",
      foreignField: "_id",
      as:           "effective_permissions"
    }
  },
  {
    $lookup: {
      from:         "roles",
      localField:   "role",
      foreignField: "_id",
      as:           "role_info"
    }
  },
  { $unwind: "$role_info" },
  {
    $project: {
      name:     1,
      username: 1,
      role:     "$role_info.name",
      effective_permissions: {
        $map: {
          input: "$effective_permissions",
          as:    "perm",
          in: { name: "$$perm.name", module: "$$perm.module" }
        }
      },
      custom_add_count:    { $size: "$permissions.custom_add" },
      custom_remove_count: { $size: "$permissions.custom_remove" }
    }
  }
]).forEach(printjson);


// ==========================================
// VERIFICACIÓN FINAL
// ==========================================
print("\n==============================");
print("   NOVA DB — SEED COMPLETADO  ");
print("==============================");
print("Permisos   :", db.permissions.countDocuments());
print("Roles      :", db.roles.countDocuments());
print("Usuarios   :", db.users.countDocuments());
print("Comisiones :", db.commissions.countDocuments());
print("Tasas      :", db.percentages.countDocuments());