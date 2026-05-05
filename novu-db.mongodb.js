use("roles_usuarios");

db.createCollection("roles");

db.roles.insertMany([
  { name: "Asesor", description: "Puede consultar sus comisiones activas", created_at: new Date() },
  { name: "Gerente", description: "Puede registrar y ver comisiones activas", created_at: new Date() },
  { name: "Directora", description: "Puede aprobar comisiones y ajustar los montos", created_at: new Date() },
  { name: "Administradora", description: "Recibe las comisiones a pagar e indica cuando ya fueron pagadas", created_at: new Date() }
]);

const asesorId = db.roles.findOne({ name: "Asesor" })._id;
const gerenteId = db.roles.findOne({ name: "Gerente" })._id;
const directoraId = db.roles.findOne({ name: "Directora" })._id;
const administradoraId = db.roles.findOne({ name: "Administradora" })._id;

db.createCollection("usuarios");

db.usuarios.insertMany([
  {
    name: "Hendrick Martinez Perez", email: "hendrick@gmail.com", phone: "5589543342",
    blood_type: "O+", birth_date: new Date("1990-08-24"),
    emergency_contact_name: "Ramses Moral Rosado", emergency_contact_phone: "5557358978",
    picture: "./static/hendrick.jpg", role: asesorId,
    username: "HENDMART", password: "12345", active: true, created_at: new Date()
  },
  {
    name: "Roberto Sanchez Lopez", email: "roberto.sanchez@gmail.com", phone: "5534567890",
    blood_type: "O-", birth_date: new Date("1985-05-10"),
    emergency_contact_name: "Patricia Sanchez", emergency_contact_phone: "5534567891",
    picture: "./static/roberto.jpg", role: gerenteId,
    username: "ROBSAN", password: "gerente123", active: true, created_at: new Date()
  },
  {
    name: "Elena Montero Ruiz", email: "elena.montero@gmail.com", phone: "5545678901",
    blood_type: "AB+", birth_date: new Date("1980-12-01"),
    emergency_contact_name: "Javier Montero", emergency_contact_phone: "5545678902",
    picture: "./static/elena.jpg", role: directoraId,
    username: "ELENMON", password: "directora123", active: true, created_at: new Date()
  },
  {
    name: "Carmen Jimenez Diaz", email: "carmen.jimenez@gmail.com", phone: "5556789012",
    blood_type: "A-", birth_date: new Date("1983-07-19"),
    emergency_contact_name: "Luis Jimenez", emergency_contact_phone: "5556789013",
    picture: "./static/carmen.jpg", role: administradoraId,
    username: "CARJIM", password: "admin123", active: true, created_at: new Date()
  }
]);



db.createCollection("percentages");

db.percentages.insertOne({
  v1: {
    traditional: {
      manager1: 0.0025,
      advisor1: 0.006
    },
    shared: {
      manager1: 0.0015,
      manager2: 0.0015,
      advisor1: 0.0042,
      advisor2: 0.0028
    },
    multipoint: {
      manager1: 0.0025,
      manager2: 0.0015,
      advisor1: 0.005,
      advisor2: 0.0028
    }
  }
});


db.createCollection("notificaciones");

// Obtener IDs de los usuarios
const hendrickId = db.usuarios.findOne({ username: "HENDMART" })._id;
const robertoId = db.usuarios.findOne({ username: "ROBSAN" })._id;
const elenaId = db.usuarios.findOne({ username: "ELENMON" })._id;
const carmenId = db.usuarios.findOne({ username: "CARJIM" })._id;

db.notificaciones.insertMany([
  {
    usuario_id: hendrickId,
    titulo: "Bienvenido al sistema",
    descripcion: "Tu cuenta ha sido creada exitosamente.",
    fecha: new Date()
  },
  {
    usuario_id: robertoId,
    titulo: "Comisión registrada",
    descripcion: "Se ha registrado una nueva comisión en el sistema.",
    fecha: new Date()
  },
  {
    usuario_id: elenaId,
    titulo: "Comisión pendiente de aprobación",
    descripcion: "Hay una comisión esperando tu aprobación.",
    fecha: new Date()
  },
  {
    usuario_id: carmenId,
    titulo: "Comisión lista para pago",
    descripcion: "Hay una comisión aprobada pendiente de pago.",
    fecha: new Date()
  }
]);

db.createCollection("estatus");

db.estatus.insertMany([
  { order: 1, name: "Pendiente Verificacion", description: "La comisión está esperando verificación de los participantes", created_at: new Date() },
  { order: 2, name: "Verificada",             description: "Todos los participantes han verificado la comisión", created_at: new Date() },
  { order: 3, name: "Pendiente Aprobacion",   description: "La comisión está esperando aprobación de la Directora", created_at: new Date() },
  { order: 4, name: "Aprobada",               description: "La comisión ha sido aprobada por la Directora", created_at: new Date() },
  { order: 5, name: "Pendiente Pago",         description: "La comisión está aprobada y esperando ser pagada", created_at: new Date() },
  { order: 6, name: "Pagada",                 description: "La comisión ha sido pagada por la Administradora", created_at: new Date() },
  { order: 7, name: "Correccion",             description: "Se necesita corregir información", created_at: new Date() }
]);

console.log("✓ Estatus creados: " + db.estatus.countDocuments());



// Obtener IDs de usuarios
// const hendrickId = db.usuarios.findOne({ username: "HENDMART" })._id;
// const robertoId = db.usuarios.findOne({ username: "ROBSAN" })._id;

// Obtener IDs de estatus
const statusPendienteVerificacion = db.estatus.findOne({ order: 1 })._id;
const statusAprobada = db.estatus.findOne({ order: 4 })._id;
const statusPendientePago = db.estatus.findOne({ order: 5 })._id;

// Obtener porcentajes
const p = db.percentages.findOne().v1;

db.createCollection("comisiones");

db.comisiones.insertMany([
  {
    company: { id: "1", text: "DESARROLLADORA TOKIO, S.A. DE C.V." },
    development: { id: "1", text: "TOKIO 616" },
    location: { id: "1", text: "TOKIO-PB-A001" },
    concept: { id: "1", text: "Contratado" },
    commission_type: "Tradicional",
    sale_price: 2000000,
    operation_date: "2026-04-02",
    register_date: "2026-03-03",
    status: statusPendienteVerificacion,
    correction_comments: null,
    participants: {
      advisors: [
        { user: hendrickId, percentage: p.traditional.advisor1, commission: 2000000 * p.traditional.advisor1, adjusted_commission: null, verification: false }
      ],
      managers: [
        { user: robertoId, percentage: p.traditional.manager1, commission: 2000000 * p.traditional.manager1, adjusted_commission: null, verification: false }
      ]
    },
    created_by: robertoId,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    company: { id: "1", text: "DESARROLLADORA TOKIO, S.A. DE C.V." },
    development: { id: "1", text: "TOKIO 616" },
    location: { id: "2", text: "TOKIO-PB-A002" },
    concept: { id: "2", text: "Escriturado" },
    commission_type: "Compartida",
    sale_price: 3500000,
    operation_date: "2026-04-10",
    register_date: "2026-03-10",
    status: statusPendienteVerificacion,
    correction_comments: null,
    participants: {
      advisors: [
        { user: hendrickId, percentage: p.shared.advisor1, commission: 3500000 * p.shared.advisor1, adjusted_commission: null, verification: false },
        { user: hendrickId, percentage: p.shared.advisor2, commission: 3500000 * p.shared.advisor2, adjusted_commission: null, verification: false }
      ],
      managers: [
        { user: robertoId, percentage: p.shared.manager1, commission: 3500000 * p.shared.manager1, adjusted_commission: null, verification: false },
        { user: robertoId, percentage: p.shared.manager2, commission: 3500000 * p.shared.manager2, adjusted_commission: null, verification: false }
      ]
    },
    created_by: robertoId,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    company: { id: "2", text: "DESARROLLADORA TOKIO, S.A. DE C.V." },
    development: { id: "2", text: "TOKIO 616" },
    location: { id: "3", text: "TOKIO-PB-A003" },
    concept: { id: "1", text: "Contratado" },
    commission_type: "Tradicional",
    sale_price: 4000000,
    operation_date: "2026-03-15",
    register_date: "2026-02-15",
    status: statusAprobada,
    correction_comments: null,
    participants: {
      advisors: [
        { user: hendrickId, percentage: p.traditional.advisor1, commission: 4000000 * p.traditional.advisor1, adjusted_commission: null, verification: true }
      ],
      managers: [
        { user: robertoId, percentage: p.traditional.manager1, commission: 4000000 * p.traditional.manager1, adjusted_commission: null, verification: true }
      ]
    },
    created_by: robertoId,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    company: { id: "2", text: "DESARROLLADORA TOKIO, S.A. DE C.V." },
    development: { id: "2", text: "TOKIO 616" },
    location: { id: "4", text: "TOKIO-PB-A004" },
    concept: { id: "2", text: "Escriturado" },
    commission_type: "Multipunto",
    sale_price: 5000000,
    operation_date: "2026-03-20",
    register_date: "2026-02-20",
    status: statusAprobada,
    correction_comments: null,
    participants: {
      advisors: [
        { user: hendrickId, percentage: p.multipoint.advisor1, commission: 5000000 * p.multipoint.advisor1, adjusted_commission: null, verification: true },
        { user: hendrickId, percentage: p.multipoint.advisor2, commission: 5000000 * p.multipoint.advisor2, adjusted_commission: null, verification: true }
      ],
      managers: [
        { user: robertoId, percentage: p.multipoint.manager1, commission: 5000000 * p.multipoint.manager1, adjusted_commission: null, verification: true },
        { user: robertoId, percentage: p.multipoint.manager2, commission: 5000000 * p.multipoint.manager2, adjusted_commission: null, verification: true }
      ]
    },
    created_by: robertoId,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    company: { id: "1", text: "DESARROLLADORA TOKIO, S.A. DE C.V." },
    development: { id: "1", text: "TOKIO 616" },
    location: { id: "5", text: "TOKIO-PB-A005" },
    concept: { id: "1", text: "Contratado" },
    commission_type: "Compartida",
    sale_price: 6000000,
    operation_date: "2026-02-10",
    register_date: "2026-01-10",
    status: statusPendientePago,
    correction_comments: null,
    participants: {
      advisors: [
        { user: hendrickId, percentage: p.shared.advisor1, commission: 6000000 * p.shared.advisor1, adjusted_commission: null, verification: true },
        { user: hendrickId, percentage: p.shared.advisor2, commission: 6000000 * p.shared.advisor2, adjusted_commission: null, verification: true }
      ],
      managers: [
        { user: robertoId, percentage: p.shared.manager1, commission: 6000000 * p.shared.manager1, adjusted_commission: null, verification: true },
        { user: robertoId, percentage: p.shared.manager2, commission: 6000000 * p.shared.manager2, adjusted_commission: null, verification: true }
      ]
    },
    created_by: robertoId,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    company: { id: "2", text: "DESARROLLADORA TOKIO, S.A. DE C.V." },
    development: { id: "2", text: "TOKIO 616" },
    location: { id: "6", text: "TOKIO-PB-A006" },
    concept: { id: "2", text: "Escriturado" },
    commission_type: "Multipunto",
    sale_price: 7500000,
    operation_date: "2026-02-20",
    register_date: "2026-01-20",
    status: statusPendientePago,
    correction_comments: null,
    participants: {
      advisors: [
        { user: hendrickId, percentage: p.multipoint.advisor1, commission: 7500000 * p.multipoint.advisor1, adjusted_commission: null, verification: true },
        { user: hendrickId, percentage: p.multipoint.advisor2, commission: 7500000 * p.multipoint.advisor2, adjusted_commission: null, verification: true }
      ],
      managers: [
        { user: robertoId, percentage: p.multipoint.manager1, commission: 7500000 * p.multipoint.manager1, adjusted_commission: null, verification: true },
        { user: robertoId, percentage: p.multipoint.manager2, commission: 7500000 * p.multipoint.manager2, adjusted_commission: null, verification: true }
      ]
    },
    created_by: robertoId,
    created_at: new Date(),
    updated_at: new Date()
  }
]);


const comisiones = db.comisiones.find().toArray();

db.createCollection("estado_cuenta");

db.estado_cuenta.insertMany([
  // Cargos de Hendrick - préstamo y descomisión
  {
    user: hendrickId,
    comision: null,
    type: "cargo",
    amount: 5000,
    description: "Préstamo personal solicitado",
    date: new Date("2026-01-15"),
    created_at: new Date()
  },
  {
    user: hendrickId,
    comision: comisiones[2]._id,
    type: "cargo",
    amount: 2000,
    description: "Descomisión por cancelación de operación",
    date: new Date("2026-02-01"),
    created_at: new Date()
  },
  // Abono de Hendrick - pago parcial de deuda
  {
    user: hendrickId,
    comision: null,
    type: "abono",
    amount: 3000,
    description: "Pago parcial de préstamo personal",
    date: new Date("2026-03-01"),
    created_at: new Date()
  },

  // Cargo de Roberto - préstamo
  {
    user: robertoId,
    comision: null,
    type: "cargo",
    amount: 8000,
    description: "Préstamo personal solicitado",
    date: new Date("2026-01-20"),
    created_at: new Date()
  },
  // Abonos de Roberto - pagos de deuda
  {
    user: robertoId,
    comision: null,
    type: "abono",
    amount: 4000,
    description: "Pago parcial de préstamo personal",
    date: new Date("2026-02-20"),
    created_at: new Date()
  },
  {
    user: robertoId,
    comision: null,
    type: "abono",
    amount: 4000,
    description: "Liquidación de préstamo personal",
    date: new Date("2026-03-20"),
    created_at: new Date()
  }
]);





console.log("✓ Roles creados: " + db.roles.countDocuments());
console.log("✓ Usuarios creados: " + db.usuarios.countDocuments());
console.log("✓ Percentages creados: " + db.percentages.countDocuments());
console.log("✓ Notificaciones creadas: " + db.notificaciones.countDocuments());
console.log("✓ Comisiones creadas: " + db.comisiones.countDocuments());
console.log("✓ Estado de cuenta creado: " + db.estado_cuenta.countDocuments());