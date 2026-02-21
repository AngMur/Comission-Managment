require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');


const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Mongo conectado'))
  .catch(err => console.log(err));


const PORT = process.env.PORT || 3000;

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

// Force an error to test endpoint (DELETE ON PRODUCTION!!!!)
app.get('/500test', (req, res) => {
  throw new Error('Error de prueba');
});

app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'server_errors', '404.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).sendFile(path.join(__dirname, 'server_errors', '500.html'));
});


