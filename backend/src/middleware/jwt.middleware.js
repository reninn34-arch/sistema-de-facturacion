const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const jwt = require('jsonwebtoken');
const { AppError } = require('./error.handler');
const prisma = require('../../prisma/client');

// JWT_SECRET debe estar configurado en variables de entorno
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET no está configurado en las variables de entorno');
}
const JWT_SECRET = process.env.JWT_SECRET;

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return next(new AppError('Acceso denegado. Token no proporcionado.', 401));
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        // Validar que la sesión siga activa (si tiene sessionId)
        if (decoded.sessionId) {
          try {
            const session = await prisma.session.findUnique({
              where: { id: decoded.sessionId },
              select: { isActive: true }
            });
            if (!session || !session.isActive) {
              return next(new AppError('Sesión revocada por el administrador. Inicia sesión nuevamente.', 401));
            }
          } catch (dbError) {
            // Si falla la DB, permitir acceso para no bloquear
            console.error('Error validando sesión:', dbError.message);
          }
        }

        next();
    } catch (error) {
        return next(new AppError('Token inválido o expirado.', 401));
    }
};

module.exports = verifyToken;
