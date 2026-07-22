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
  // En un build de PRODUCCIÓN saltarse las migraciones deja la base desactualizada
  // y la app rota (el cliente Prisma consulta columnas que no existen → 500).
  // Es preferible fallar el build a desplegar algo roto en silencio.
  if (process.env.VERCEL_ENV === 'production') {
    console.error('[migrate] ERROR: DATABASE_URL no disponible en el build de PRODUCCIÓN.');
    console.error('[migrate] Las migraciones no se aplicarían y la app quedaría rota.');
    console.error('[migrate] Configura DATABASE_URL y DIRECT_URL (o DB_SAAS_DATABASE_URL[_UNPOOLED]) en las variables del proyecto en Vercel.');
    process.exit(1);
  }
  console.warn('[migrate] DATABASE_URL no configurada: se omiten las migraciones (build no productivo).');
  process.exit(0);
}

try {
  console.log('[migrate] Aplicando migraciones pendientes...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
  console.log('[migrate] Migraciones aplicadas.');
} catch (error) {
  console.warn('[migrate] prisma migrate deploy falló. Intentando npx prisma db push como alternativa segura (sin destrucción de datos)...');
  try {
    execSync('npx prisma db push', { stdio: 'inherit', env: process.env });
    console.log('[migrate] Base de datos sincronizada correctamente con db push.');
  } catch (pushError) {
    console.error('[migrate] Error crítico aplicando migraciones y db push:', pushError.message);
    process.exit(1);
  }
}
