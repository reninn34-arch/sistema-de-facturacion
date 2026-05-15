const prisma = require('../../prisma/client');

// Middleware para verificar si un usuario tiene acceso a un módulo específico
// Si el plan tiene hasModuleControl activo, respeta los permisos explícitos del usuario.
// Si no, cae al comportamiento por rol tradicional.
// Los ADMIN siempre tienen acceso completo.

const checkModuleAccess = (moduleCode) => {
  return async (req, res, next) => {
    try {
      // Si no hay usuario autenticado, continuar (otro middleware lo manejará)
      if (!req.user || !req.user.businessId) {
        return next();
      }

      // SUPERADMIN siempre tiene acceso completo
      if (req.user.role === 'SUPERADMIN') {
        return next();
      }

      // ADMIN siempre tiene acceso completo a su empresa
      if (req.user.role === 'ADMIN') {
        return next();
      }

      // Verificar si el plan tiene control de módulos habilitado
      const business = await prisma.business.findUnique({
        where: { id: req.user.businessId },
        select: { plan: true }
      });

      if (!business) {
        return next();
      }

      const plan = await prisma.subscriptionPlan.findUnique({
        where: { code: business.plan },
        select: { hasModuleControl: true }
      });

      // Si el plan no tiene hasModuleControl, usar comportamiento por rol (default)
      if (!plan?.hasModuleControl) {
        return next();
      }

      // Buscar el módulo por código
      const moduleRecord = await prisma.module.findUnique({
        where: { code: moduleCode }
      });

      if (!moduleRecord) {
        // Si el módulo no existe en la tabla, permitir acceso (compatibilidad)
        return next();
      }

      // Buscar permiso explícito del usuario para este módulo
      const permission = await prisma.userModulePermission.findUnique({
        where: {
          userId_moduleId: {
            userId: req.user.id,
            moduleId: moduleRecord.id
          }
        }
      });

      if (permission) {
        // Si hay permiso explícito, usarlo
        if (permission.granted) {
          return next();
        } else {
          return res.status(403).json({
            message: `No tienes acceso al módulo: ${moduleRecord.name}`,
            moduleCode
          });
        }
      }

      // Si no hay permiso explícito y hasModuleControl está activo,
      // denegar por defecto (el admin debe otorgar explícitamente)
      return res.status(403).json({
        message: `No tienes acceso al módulo: ${moduleRecord.name}. Contacta al administrador de tu empresa.`,
        moduleCode
      });
    } catch (error) {
      console.error('Error en checkModuleAccess:', error);
      // En caso de error, permitir acceso para no bloquear la app
      return next();
    }
  };
};

module.exports = { checkModuleAccess };
