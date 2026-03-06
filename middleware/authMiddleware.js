const jwt = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET || 'change-this-secret-in-production';
const COOKIE_NAME = 'auth_token';

const cookieOptions = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   8 * 60 * 60 * 1000   // 8 horas
};

// ─────────────────────────────────────────────────────────────────
// CÁLCULO DE PERMISOS EFECTIVOS
// efectivos = (from_role ∪ custom_add) - custom_remove
// ─────────────────────────────────────────────────────────────────

/**
 * Recibe el objeto permissions del usuario YA POPULADO
 * (cada elemento es un documento Permission con campo .name)
 * y devuelve un array de strings con los nombres de permisos efectivos.
 *
 * @param {Object} permissions  - user.permissions con subdocs populados
 * @returns {string[]}          - ['crear_comision', 'ver_comisiones', ...]
 */
const resolveEffectivePermissions = (permissions) => {
  if (!permissions) return [];

  const fromRole     = permissions.from_role     || [];
  const customAdd    = permissions.custom_add    || [];
  const customRemove = permissions.custom_remove || [];

  // IDs a remover (como strings para comparación simple)
  const removeIds = new Set(customRemove.map(p => p._id?.toString() || p.toString()));

  // Unión de from_role y custom_add
  const union = [...fromRole, ...customAdd];

  // Deduplica por _id y filtra los removidos
  const seen = new Set();
  const effective = [];

  for (const perm of union) {
    const id   = perm._id?.toString() || perm.toString();
    const name = perm.name;

    if (!seen.has(id) && !removeIds.has(id) && name) {
      seen.add(id);
      effective.push(name);
    }
  }

  return effective;
};

// ─────────────────────────────────────────────────────────────────
// COOKIE HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * setAuthCookie
 * Genera el JWT con datos del usuario y lo guarda en cookie httpOnly.
 *
 * REQUIERE que user venga con .role y .permissions.* POPULADOS.
 *
 * El token incluye:
 *   id, username, name, picture
 *   roleId, roleName           ← del documento Role populado
 *   permissions                ← array de nombres efectivos (calculado aquí)
 */
const setAuthCookie = (res, user) => {
  const effectivePermissions = resolveEffectivePermissions(user.permissions);

  const token = jwt.sign(
    {
      id:          user._id,
      username:    user.username,
      name:        user.name,
      picture:     user.picture  || '',
      roleId:      user.role?._id  || null,
      roleName:    user.role?.name || '',
      permissions: effectivePermissions
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.cookie(COOKIE_NAME, token, cookieOptions);
  return token;
};

/** Elimina la cookie de sesión */
const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
};

// ─────────────────────────────────────────────────────────────────
// MIDDLEWARES
// ─────────────────────────────────────────────────────────────────

/**
 * authenticate
 * Verifica la cookie JWT. Para rutas de API.
 * Adjunta req.user con { id, username, name, roleId, roleName, permissions[] }
 */
const authenticate = (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Sesión requerida. Por favor inicia sesión.',
      data:    null
    });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    clearAuthCookie(res);
    return res.status(403).json({
      success: false,
      message: 'Sesión expirada. Por favor inicia sesión de nuevo.',
      data:    null
    });
  }
};

/**
 * authenticateView
 * Para rutas de vistas EJS. Redirige a /login si la sesión no es válida.
 * Inyecta res.locals.user y res.locals.permissions.
 */
const authenticateView = (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.redirect('/login');

  try {
    const decoded          = jwt.verify(token, JWT_SECRET);
    req.user               = decoded;
    res.locals.user        = decoded;
    res.locals.permissions = decoded.permissions || [];
    next();
  } catch {
    clearAuthCookie(res);
    return res.redirect('/login');
  }
};

/**
 * injectUserLocals
 * Middleware GLOBAL (app.js, antes de las rutas).
 * Disponibiliza user y permissions en TODAS las vistas EJS sin pasar nada a mano.
 */
const injectUserLocals = (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    try {
      const decoded          = jwt.verify(token, JWT_SECRET);
      res.locals.user        = decoded;
      res.locals.permissions = decoded.permissions || [];
    } catch {
      res.locals.user        = null;
      res.locals.permissions = [];
    }
  } else {
    res.locals.user        = null;
    res.locals.permissions = [];
  }
  next();
};

// ─────────────────────────────────────────────────────────────────
// GUARDS DE AUTORIZACIÓN
// ─────────────────────────────────────────────────────────────────

/**
 * authorizeRole(...roleNames)
 * Corta el request si el roleName del usuario no está en la lista.
 *
 * Uso: router.post('/', authenticate, authorizeRole('SuperUsuario', 'Gerente'), handler)
 *
 * NOTA: los nombres deben coincidir EXACTAMENTE con los de la colección roles en BD
 *       (ej: "SuperUsuario", "Gerente", "Asesor", "Director", "Administrador")
 */
const authorizeRole = (...roleNames) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'No autenticado', data: null });
  }
  if (!roleNames.includes(req.user.roleName)) {
    return res.status(403).json({
      success: false,
      message: `Tu rol "${req.user.roleName}" no tiene permiso para esta acción.`,
      data:    null
    });
  }
  next();
};

/**
 * authorizePermission(...permissionNames)
 * Corta el request si el usuario NO tiene ninguno de los permisos indicados.
 * Basta con tener UNO para pasar.
 *
 * Uso: router.post('/', authenticate, authorizePermission('crear_comision'), handler)
 *
 * NOTA: los nombres deben coincidir con los de la colección permissions en BD
 *       (ej: "crear_comision", "editar_comision", "ver_comisiones", etc.)
 */
const authorizePermission = (...permissionNames) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'No autenticado', data: null });
  }
  const userPerms = req.user.permissions || [];
  const hasAccess = permissionNames.some(p => userPerms.includes(p));

  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      message: 'No tienes el permiso necesario para esta acción.',
      data:    null
    });
  }
  next();
};

/**
 * hasPermission(req, permissionName)  →  boolean
 * Helper para usar DENTRO de un handler cuando quieres ramificar lógica
 * sin cortar el request completo.
 *
 * Ejemplo:
 *   const filter = hasPermission(req, 'ver_comisiones')
 *     ? {}
 *     : { 'participants.advisors.user': req.user.id };
 */
const hasPermission = (req, permissionName) =>
  (req.user?.permissions || []).includes(permissionName);

module.exports = {
  resolveEffectivePermissions,
  setAuthCookie,
  clearAuthCookie,
  authenticate,
  authenticateView,
  injectUserLocals,
  authorizeRole,
  authorizePermission,
  hasPermission
};