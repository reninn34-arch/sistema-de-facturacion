const { AppError } = require('./error.handler');

// ============================================================
// Debe usarse DESPUÉS de verifyToken.
// Rechaza tokens que no pertenecen a una empresa (p.ej. tokens de CLIENTE,
// que no llevan businessId) para que no puedan alcanzar endpoints de datos de
// empresa. Sin esto, una consulta tipo `where: { businessId: undefined }`
// devuelve datos de TODAS las empresas (fuga multi-tenant).
// SUPERADMIN pasa: opera a nivel global.
// ============================================================
module.exports = (req, res, next) => {
  if (req.user?.role === 'SUPERADMIN') return next();
  if (!req.user?.businessId) {
    return next(new AppError('Acceso denegado. Se requiere contexto de empresa.', 403));
  }
  next();
};
