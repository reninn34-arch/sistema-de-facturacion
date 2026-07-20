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

  // ID corto para correlacionar la respuesta del cliente con el log del servidor.
  const errorId = require('crypto').randomBytes(4).toString('hex');

  // Log del error en consola para el desarrollador
  logger.error(`❌ Error [${errorId}] ${req.method} ${req.originalUrl}`, err);

  // Esquema de base de datos desactualizado: Prisma P2021 (tabla inexistente) /
  // P2022 (columna inexistente). Es un fallo de despliegue muy concreto, así que
  // se responde con un mensaje accionable en vez de un 500 opaco.
  if (err.code === 'P2021' || err.code === 'P2022') {
    return res.status(500).json({
      success: false,
      status: 'error',
      errorId,
      code: err.code,
      message: 'La base de datos no está actualizada: faltan tablas o columnas. Aplica las migraciones pendientes (prisma migrate deploy).'
    });
  }

  if (process.env.NODE_ENV === 'development') {
    // En desarrollo: enviamos todo el stack trace
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      errorId,
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
        errorId,
        message: err.message
      });
    } else {
      // Error de programación o desconocido: no filtrar detalles técnicos al cliente
      logger.error('ERROR CRÍTICO 💥', err);
      res.status(500).json({
        success: false,
        status: 'error',
        errorId,
        message: `Algo salió mal en el servidor. Referencia del error: ${errorId}`
      });
    }
  }
};

module.exports = { catchAsync, AppError, errorHandler };
