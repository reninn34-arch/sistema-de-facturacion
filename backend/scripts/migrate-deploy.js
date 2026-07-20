// ============================================================
// Aplica las migraciones pendientes de Prisma durante el despliegue.
//
// Sin esto, `vercel-build` solo hacía `prisma generate`: el cliente se generaba
// con el esquema nuevo pero las columnas NO se creaban en la base de producción,
// y las consultas fallaban con "column does not exist".
//
// La integración de Neon en Vercel inyecta DB_SAAS_DATABASE_URL[_UNPOOLED], no
// DATABASE_URL/DIRECT_URL. Ese mapeo lo hace server.js en runtime, pero durante
// el build no existe, así que se replica aquí.
// ============================================================
const { execSync } = require('child_process');

if (!process.env.DATABASE_URL && process.env.DB_SAAS_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DB_SAAS_DATABASE_URL;
}
if (!process.env.DIRECT_URL && process.env.DB_SAAS_DATABASE_URL_UNPOOLED) {
  process.env.DIRECT_URL = process.env.DB_SAAS_DATABASE_URL_UNPOOLED;
}
// Prisma usa directUrl para migrar; si no hay conexión unpooled, se cae a la principal.
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

if (!process.env.DATABASE_URL) {
  console.warn('[migrate] DATABASE_URL no configurada: se omiten las migraciones.');
  process.exit(0);
}

try {
  console.log('[migrate] Aplicando migraciones pendientes...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
  console.log('[migrate] Migraciones aplicadas.');
} catch (error) {
  // Se falla el build a propósito: desplegar con la BD desactualizada rompería la app.
  console.error('[migrate] Error aplicando migraciones:', error.message);
  process.exit(1);
}
