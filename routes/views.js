const express = require('express');
const router  = express.Router();

// Login — sin layout (no header)
router.get('/', (req, res) => {
  res.render('login', { layout: false });  // ← express-ejs-layouts lee esto directamente
});

router.get('/register', (req, res) => {
  res.render('register', { title: 'Registrar Usuario' });
});

router.get('/selector', (req, res) => {
  res.render('selector', { title: 'SELECTOR' });
});

router.get('/register-commission', (req, res) => {
  res.render('register-commission', { title: 'Registro de Comisión' });
});

router.get('/dashboard-commission', (req, res) => {
  res.render('dashboard-commission', { title: 'Comisiones' });
});

router.get('/test', (req, res) => {
  res.render('prueba', { title: 'PRUEBA' });
});

module.exports = router;