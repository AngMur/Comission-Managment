require('dotenv').config();
const path         = require('path');
const express      = require('express');
const mongoose     = require('mongoose');
const cors         = require('cors');
const cookieParser = require('cookie-parser');            // npm install cookie-parser
const ejsLayouts   = require('express-ejs-layouts');
const { injectUserLocals } = require('./middleware/authMiddleware');

const app = express();

// ── Middlewares globales ──────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true   // Necesario para que el browser envíe cookies cross-origin
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());      // Parsea req.cookies — necesario para leer la auth_token

// ── Vistas EJS ───────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './views'));
app.use(ejsLayouts);
app.set('layout', 'partials/layout');
app.use(express.static(path.join(__dirname, 'public')));

// ── Inyección global de sesión en vistas ─────────────────────────
// Hace disponible res.locals.user y res.locals.permissions en TODOS los EJS
app.use(injectUserLocals);

// ── Base de datos ─────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Mongo conectado'))
  .catch(err => console.error('Error Mongo:', err));

// ── Rutas ─────────────────────────────────────────────────────────
app.use('/',                require('./routes/views'));
app.use('/api/users',       require('./routes/userRoutes'));
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/roles',       require('./routes/rolesRoutes'));
app.use('/v10',             require('./routes/v10Routes'));
app.use('/api/commission',    require('./routes/commissions'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/percentages', require('./routes/percentages'));

// ── Test de error (ELIMINAR EN PRODUCCIÓN) ────────────────────────
app.get('/500test', (req, res) => { throw new Error('Error de prueba'); });

<<<<<<< HEAD
// ── Manejo de errores ─────────────────────────────────────────────
app.use((req, res) => {
=======
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

app.use(express.static(path.join(__dirname, 'views'), {
  extensions: ['html']
}));

app.get('/', (req, res) => {
  res.redirect('/login');
});


const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const rolesRoutes = require('./routes/rolesRoutes');
app.use('/api/roles', rolesRoutes);

const v10Routes = require('./routes/v10Routes');
app.use('/v10/', v10Routes);

app.use((req, res, next) => {
>>>>>>> c18fb032519ca8868c0238e4b500c71e8cd5f637
  res.status(404).sendFile(path.join(__dirname, 'server_errors', '404.html'));
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).sendFile(path.join(__dirname, 'server_errors', '500.html'));
});

// ── Servidor ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});