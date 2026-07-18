/**
 * Migración one-time: cifra los certificados .p12 y contraseñas de firma que
 * hoy están en TEXTO PLANO dentro de business.features (signatureP12 /
 * signaturePassword) y los guarda cifrados en las columnas dedicadas
 * electronicSignature / sriPassword.
 *
 * Es NO destructivo: deja intacto features.* para que el flujo actual del
 * frontend siga funcionando. La limpieza del texto plano es el paso final del
 * "cutover" (Fase B), una vez validada la firma con un certificado real.
 *
 * Uso (desde la carpeta backend, con CERT_ENCRYPTION_KEY en el .env):
 *   node prisma/migrate-encrypt-signatures.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const prisma = require('./client');
const { encrypt, isEncrypted } = require('../src/utils/crypto');

async function main() {
  const businesses = await prisma.business.findMany({
    select: { id: true, name: true, features: true, electronicSignature: true, sriPassword: true },
  });

  let migrated = 0, skipped = 0, noSignature = 0;

  for (const b of businesses) {
    const features = b.features || {};
    const p12 = features.signatureP12;
    const pass = features.signaturePassword;

    if (!p12 || !pass) { noSignature++; continue; }

    // Ya migrado (columnas cifradas presentes): no re-cifrar.
    if (isEncrypted(b.electronicSignature) && isEncrypted(b.sriPassword)) {
      skipped++;
      continue;
    }

    await prisma.business.update({
      where: { id: b.id },
      data: { electronicSignature: encrypt(p12), sriPassword: encrypt(pass) },
    });
    console.log(`✅ Cifrado el certificado de: ${b.name} (${b.id})`);
    migrated++;
  }

  console.log(`\nResumen: ${migrated} migrados, ${skipped} ya cifrados, ${noSignature} sin firma.`);
  console.log('⚠️  El texto plano en features.signatureP12/signaturePassword se conservó (Fase B lo elimina tras validar la firma real).');
}

main()
  .catch(e => { console.error('❌ Error en la migración:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
