const { AppError } = require('./error.handler');

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError('Acceso denegado. No tienes permisos suficientes.', 403));
    }
    next();
  };
};

module.exports = checkRole;
