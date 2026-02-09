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

// Esto permite que al escribir localhost:3000/login, Express busque login.html automáticamente
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


