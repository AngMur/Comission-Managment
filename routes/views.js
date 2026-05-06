const express = require('express');
const router  = express.Router();

// Login — sin layout (no header)
router.get('/', (req, res) => {
  res.render('login', { layout: false });  // ← express-ejs-layouts lee esto directamente
});

router.get('/login-successfully', (req, res) => {
  res.render('comisiones', { title: 'Comisiones'});
});

router.get('/registrar-usuario', (req, res) => {
  res.render('registrar-usuario', { title: 'Registrar Usuario' });
});

// router.get('/selector', (req, res) => {
//   res.render('selector', { title: 'SELECTOR' });
// });

router.get('/registrar-comision', (req, res) => {
  res.render('registrar-comision', { title: 'Registro de Comisión' });
});

router.get('/comisiones', (req, res) => {
  res.render('comisiones', { title: 'Comisiones'});
});

// router.get('/commission-historic', (req, res) => {
//   res.render('commission-historic', { title: 'Historial', layout: false });
// });


// router.get('/permissions', (req, res) => {
//   res.render('permissions', { title: 'Permisos', layout: false });
// });



module.exports = router;