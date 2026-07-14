const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./src/utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;
const sriRoutes = require('./src/modules/sri/sri.routes'); // Rutas SRI
const adminRoutes = require('./src/modules/admin/admin.routes'); // Rutas de administración
const businessRoutes = require('./src/modules/business/business.routes'); // Rutas de negocio y tenant
const aiRoutes = require('./src/modules/ai/ai.routes'); // Rutas de IA
const authRoutes = require('./src/modules/auth/auth.routes'); // Rutas de autenticación
const paymentRoutes = require('./src/modules/payment/payment.routes');
const internalPaymentRoutes = require('./src/modules/internal-payment/internal-payment.routes');
const subscriptionPlansRoutes = require('./src/modules/subscription-plans/subscription-plans.routes');
const activationRequestsRoutes = require('./src/modules/activation-requests/activation-requests.routes');
const productionRoutes = require('./src/modules/production/production.routes');
const quickSaleRoutes = require('./src/modules/quicksale/quicksale.routes');
const settingsRoutes = require('./src/modules/settings/settings.routes');
const modulePermissionsRoutes = require('./src/modules/module-permissions/module.routes');
const sessionRoutes = require('./src/modules/session/session.routes');
const publicRoutes = require('./src/modules/public/public.routes');
const emissionPointsRoutes = require('./src/modules/emission-points/emission-points.routes');
const referralsRoutes = require('./src/modules/referrals/referrals.routes');
const pointsAdminRoutes = require('./src/modules/points-admin/points-admin.routes');
const blogRoutes = require('./src/modules/blog/blog.routes');
const notificationRoutes = require('./src/modules/notifications/notifications.routes');
const systemRoutes = require('./src/modules/system/system.routes');
const { errorHandler } = require('./src/middleware/error.handler'); // [NUEVO] Manejador de errores centralizado

// Middleware de seguridad
app.use(helmet());
app.use(morgan('combined'));

// CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

logger.info('🛡️ CORS Allowed Origins:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Fix para cuando la variable de entorno viene sin https://
    if (process.env.FRONTEND_URL && origin === `https://${process.env.FRONTEND_URL}`) {
      return callback(null, true);
    }

    // Permitir túneles de desarrollo (localhost, devtunnels.ms, ngrok, etc.)
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('devtunnels.ms') || origin.includes('ngrok')) {
      return callback(null, true);
    }

    // En desarrollo, permitir todos los orígenes
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    logger.warn('🚫 Bloqueado por CORS:', origin);
    callback(new Error('No permitido por CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parser
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser mínimo (sin dependencia externa).
// Los tokens de sesión viajan en cookies HttpOnly para que ningún script
// del navegador (XSS) pueda leerlos — ver jwt.middleware.js.
app.use((req, _res, next) => {
  req.cookies = {};
  const header = req.headers.cookie;
  if (header) {
    for (const part of header.split(';')) {
      const idx = part.indexOf('=');
      if (idx > -1) {
        const key = part.slice(0, idx).trim();
        if (!(key in req.cookies)) {
          try {
            req.cookies[key] = decodeURIComponent(part.slice(idx + 1).trim());
          } catch {
            req.cookies[key] = part.slice(idx + 1).trim();
          }
        }
      }
    }
  }
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de requests
  message: 'Demasiadas solicitudes desde esta IP, por favor intente más tarde.'
});
app.use('/api/sri/', limiter);

// =================================================================
// [NUEVO] MÓDULO DE AUTENTICACIÓN Y USUARIOS
// =================================================================
// Funcionalidad agregada para gestión de usuarios, login y perfiles.
// =================================================================

app.use(authRoutes);

app.use(sriRoutes);
app.use(systemRoutes);

// =================================================================
// [NUEVO] MÓDULO DE ADMINISTRACIÓN SAAS (SUPERADMIN)
// =================================================================
// Gestión de tenants (empresas), planes y usuarios globales.
// Lógica movida a: backend/routes/admin.routes.js
// =================================================================

// Middleware para evitar caché en rutas de API admin
app.use('/api/admin', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

app.use(adminRoutes);
app.use(businessRoutes);
app.use(subscriptionPlansRoutes);
app.use(activationRequestsRoutes);
app.use(internalPaymentRoutes);
app.use(aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use(productionRoutes);
app.use(quickSaleRoutes);
app.use(paymentRoutes);
app.use(settingsRoutes);
app.use(modulePermissionsRoutes);
app.use(sessionRoutes);
app.use(publicRoutes);
app.use(emissionPointsRoutes);
app.use(referralsRoutes);
app.use(pointsAdminRoutes);
app.use(blogRoutes);

// ============================================
// SERVIR FRONTEND EN PRODUCCIÓN
// ============================================

// if (process.env.NODE_ENV === 'production') {
  // Servir archivos estáticos desde la carpeta dist del frontend (un nivel arriba)
//  app.use(express.static(path.join(__dirname, '../dist')));

  // Cualquier ruta que no sea API, enviar al index.html (SPA)
  //app.get('*', (req, res, next) => {
  //  if (req.path.startsWith('/api')) return next();
  //  res.sendFile(path.join(__dirname, '../dist/index.html'));
  //});
//}

app.get('/', (req, res) => {
  res.status(200).send('✅ Backend funcionando OK 🚀');
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
});

// [NUEVO] Middleware de manejo de errores centralizado (Debe ser el último app.use)
app.use(errorHandler);

const prisma = require('./prisma/client');

// Iniciar servidor verificando la base de datos primero
async function startServer() {
  try {
    // Intentar conectar a la base de datos
    await prisma.$connect();
    logger.info('🔌 Conexión exitosa a la base de datos PostgreSQL.');
  } catch (error) {
    console.error('');
    console.error('❌ ═══════════════════════════════════════════════════ ❌');
    console.error('  ERROR DE CONEXIÓN A LA BASE DE DATOS');
    console.error('  No se pudo establecer conexión con la base de datos.');
    console.error('  Por favor, asegúrate de que Docker esté encendido y que');
    console.error('  el contenedor de PostgreSQL (ecuafact_db) esté en ejecución.');
    console.error('❌ ═══════════════════════════════════════════════════ ❌');
    console.error('');
    process.exit(1);
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('🇪🇨  PROXY SRI ECUADOR - SERVIDOR INICIADO  🇪🇨');
      console.log('═══════════════════════════════════════════════════');
      console.log('');
      console.log(`✅ Servidor ejecutándose en: http://localhost:${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log('');
      console.log('📋 Endpoints disponibles:');
      console.log(`   POST http://localhost:${PORT}/api/sri/sign-xml`);
      console.log(`   POST http://localhost:${PORT}/api/sri/recepcion`);
      console.log(`   POST http://localhost:${PORT}/api/sri/autorizacion`);
      console.log(`   POST http://localhost:${PORT}/api/login`);
      console.log(`   POST http://localhost:${PORT}/api/auth/client/login`);
      console.log(`   POST http://localhost:${PORT}/api/forgot-password`);
      console.log(`   POST http://localhost:${PORT}/api/notifications/send-email`);
      console.log(`   POST http://localhost:${PORT}/api/notifications/send-sms`);
      console.log(`   POST http://localhost:${PORT}/api/notifications/send-whatsapp`);
      console.log(`   GET  http://localhost:${PORT}/health`);
      console.log(`   GET  http://localhost:${PORT}/api/info`);
      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('');
    });
  } else {
    logger.info('🚀 Backend corriendo en modo Serverless en Vercel');
  }
}

startServer();

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  logger.info('👋 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('👋 Cerrando servidor...');
  process.exit(0);
});

module.exports = app;

