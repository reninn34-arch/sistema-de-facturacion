const logger = require('../utils/logger');

// 1. Wrapper para eliminar try-catch en controladores (Async Handler)
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 2. Clase de Error Personalizada (Opcional, para lanzar errores con status code específico)
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Para distinguir errores operacionales de bugs de programación

    Error.captureStackTrace(this, this.constructor);
  }
}

// 3. Middleware Centralizado de Manejo de Errores
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log del error en consola para el desarrollador
  logger.error('❌ Error:', err);

  if (process.env.NODE_ENV === 'development') {
    // En desarrollo: enviamos todo el stack trace
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // En producción: mensaje limpio para el cliente
    if (err.isOperational) {
      // Error operacional confiable (ej: usuario no encontrado, validación fallida)
      res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message
      });
    } else {
      // Error de programación o desconocido: no filtrar detalles técnicos al cliente
      logger.error('ERROR CRÍTICO 💥', err);
      res.status(500).json({
        success: false,
        status: 'error',
        message: 'Algo salió mal en el servidor, por favor intente más tarde.'
      });
    }
  }
};

module.exports = { catchAsync, AppError, errorHandler };
