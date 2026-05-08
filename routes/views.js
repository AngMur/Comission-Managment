const express = require('express');
const router  = express.Router();
const {
    setAuthCookie,
    clearAuthCookie,
    authenticate
} = require('../JWT/authCookies');

// Login — sin layout (no header)
router.get('/', (req, res) => {
  // Sobreescribir res.status temporalmente para interceptar el 401
  // que lanzaría authenticate si no hay sesión válida
  const originalStatus = res.status.bind(res);
  let intercepted = false;

  res.status = (code) => {
    if (code === 401) {
      intercepted = true;
      return { json: () => res.render('login', { layout: false }) };
    }
    return originalStatus(code);
  };
  authenticate(req, res, () => {
    if (!intercepted) {
      return res.redirect('/login-successfully');
    }
  });
});



router.get('/login-successfully', (req, res) => {
  res.render('comisiones', { title: 'Comisiones', currentPage: 'comisiones' });
});

router.get('/registrar-usuario', (req, res) => {
  res.render('registrar-usuario', { title: 'Registrar Usuario', currentPage: 'registrar-usuario' });
});

// router.get('/selector', (req, res) => {
//   res.render('selector', { title: 'SELECTOR' });
// });

router.get('/registrar-comision', (req, res) => {
  res.render('registrar-comision', { title: 'Registro de Comisión', currentPage: 'registrar-comision' });
});

router.get('/comisiones', (req, res) => {
  res.render('comisiones', { title: 'Comisiones', currentPage: 'comisiones' });
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.redirect('/');
});

// router.get('/commission-historic', (req, res) => {
//   res.render('commission-historic', { title: 'Historial', layout: false });
// });


// router.get('/permissions', (req, res) => {
//   res.render('permissions', { title: 'Permisos', layout: false });
// });



module.exports = router;