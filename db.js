use roles-usuarios

db.createCollection("roles")

db.roles.insertMany([
  {
    name: "Asesor",
    description: "Puede registrar y consultar sus propias comisiones",
    created_at: new Date()
  },
  {
    name: "Gerente",
    description: "Puede ver, editar y gestionar comisiones del equipo",
    created_at: new Date()
  },
  {
    name: "Directora",
    description: "Acceso total a todas las comisiones y reportes ejecutivos",
    created_at: new Date()
  },
  {
    name: "Administradora",
    description: "Gestiona usuarios, roles y configuración del sistema",
    created_at: new Date()
  }
])

// Obtener los IDs generados automáticamente
var asesorId = db.roles.findOne({ name: "Asesor" })._id
var gerenteId = db.roles.findOne({ name: "Gerente" })._id
var directoraId = db.roles.findOne({ name: "Directora" })._id
var administradoraId = db.roles.findOne({ name: "Administradora" })._id

db.createCollection("usuarios")

db.usuarios.insertMany([
  // Usuario Asesor
  {
    name: "Hendrick Martinez Perez",
    email: "hendrick@gmail.com",
    phone: "5589543342",
    blood_type: "O+",
    birth_date: new Date("1990-08-24"),
    emergency_contact_name: "Ramses Moral Rosado",
    emergency_contact_phone: "5557358978",
    picture: "./static/hendrick.jpg",
    role: asesorId,
    username: "HENDMART",
    password: "12345",
    active: true,
    created_at: new Date()
  },
  // Usuario Asesor 2
  {
    name: "Laura Fernandez Gomez",
    email: "laura.fernandez@gmail.com",
    phone: "5512345678",
    blood_type: "A+",
    birth_date: new Date("1992-03-15"),
    emergency_contact_name: "Carlos Fernandez",
    emergency_contact_phone: "5512345679",
    picture: "./static/laura.jpg",
    role: asesorId,
    username: "LAUFERG",
    password: "laura123",
    active: true,
    created_at: new Date()
  },
  // Usuario Asesor 3
  {
    name: "Miguel Angel Rodriguez",
    email: "miguel.rodriguez@gmail.com",
    phone: "5523456789",
    blood_type: "B+",
    birth_date: new Date("1988-11-22"),
    emergency_contact_name: "Sofia Rodriguez",
    emergency_contact_phone: "5523456790",
    picture: "./static/miguel.jpg",
    role: asesorId,
    username: "MIGROD",
    password: "miguel123",
    active: true,
    created_at: new Date()
  },
  // Usuario Gerente
  {
    name: "Roberto Sanchez Lopez",
    email: "roberto.sanchez@gmail.com",
    phone: "5534567890",
    blood_type: "O-",
    birth_date: new Date("1985-05-10"),
    emergency_contact_name: "Patricia Sanchez",
    emergency_contact_phone: "5534567891",
    picture: "./static/roberto.jpg",
    role: gerenteId,
    username: "ROBSAN",
    password: "gerente123",
    active: true,
    created_at: new Date()
  },
  // Usuario Directora
  {
    name: "Elena Montero Ruiz",
    email: "elena.montero@gmail.com",
    phone: "5545678901",
    blood_type: "AB+",
    birth_date: new Date("1980-12-01"),
    emergency_contact_name: "Javier Montero",
    emergency_contact_phone: "5545678902",
    picture: "./static/elena.jpg",
    role: directoraId,
    username: "ELENMON",
    password: "directora123",
    active: true,
    created_at: new Date()
  },
  // Usuario Administradora
  {
    name: "Carmen Jimenez Diaz",
    email: "carmen.jimenez@gmail.com",
    phone: "5556789012",
    blood_type: "A-",
    birth_date: new Date("1983-07-19"),
    emergency_contact_name: "Luis Jimenez",
    emergency_contact_phone: "5556789013",
    picture: "./static/carmen.jpg",
    role: administradoraId,
    username: "CARJIM",
    password: "admin123",
    active: true,
    created_at: new Date()
  },
  // Usuario Asesor adicional
  {
    name: "Sofia Castillo Perez",
    email: "sofia.castillo@gmail.com",
    phone: "5567890123",
    blood_type: "O+",
    birth_date: new Date("1995-09-30"),
    emergency_contact_name: "Andres Castillo",
    emergency_contact_phone: "5567890124",
    picture: "./static/sofia.jpg",
    role: asesorId,
    username: "SOFCAS",
    password: "sofia123",
    active: true,
    created_at: new Date()
  }
])