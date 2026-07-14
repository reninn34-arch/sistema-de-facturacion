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
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Cabeceras heredadas pueden enviar "Bearer null" o "cookie_authenticated" si el cliente ya no
    // guarda el token en localStorage: tratarlas como ausentes.
    if (!token || token === 'null' || token === 'undefined' || token === 'cookie_authenticated') {
        // Fuente principal: cookie HttpOnly emitida por el servidor en el login.
        token = req.cookies?.adminToken || req.cookies?.clientToken || null;
    }

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
              select: { status: true }
            });
            if (!session || session.status !== 'ACTIVE') {
              const reason = session?.status === 'REVOKED'
                ? 'Tu sesión fue cerrada por el administrador'
                : 'Tu sesión ha expirado';
              return next(new AppError(`${reason}. Inicia sesión nuevamente.`, 401));
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
