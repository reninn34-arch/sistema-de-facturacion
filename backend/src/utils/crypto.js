const crypto = require('crypto');

// ============================================================
// Cifrado en reposo para datos sensibles (certificado .p12 y su
// contraseña de firma electrónica). AES-256-GCM (autenticado).
//
// La clave maestra sale de la variable de entorno CERT_ENCRYPTION_KEY:
//   - 64 caracteres hex  -> se usa tal cual (32 bytes).
//   - cualquier otra cadena -> se deriva a 32 bytes con SHA-256.
//
// Genera CERT_ENCRYPTION_KEY con:  openssl rand -hex 32
// ⚠️ Si se pierde/cambia esta clave, los certificados guardados no se
//    podrán descifrar y habrá que volver a subirlos.
//
// MODELO MULTIEMPRESA (SaaS): la clave maestra es UNA sola (del operador,
// en el .env del servidor). NO hay una clave por empresa. Cada empresa sube
// su propio .p12 desde la app; se cifra con esta misma clave maestra y se
// guarda por separado en su fila de la BD (Business.electronicSignature /
// sriPassword, aislado por businessId). El operador nunca configura un .env
// por empresa. Trade-off: si esta clave se filtra, quedan expuestos los certs
// de todas las empresas → migrar a KMS/subclave por tenant cuando escale.
// ============================================================

const ALGO = 'aes-256-gcm';
const VERSION = 'v1';

function getKey() {
  const raw = process.env.CERT_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'CERT_ENCRYPTION_KEY no está configurada. Genera una con "openssl rand -hex 32" y añádela al .env del backend.'
    );
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  return crypto.createHash('sha256').update(raw, 'utf8').digest();
}

/** Cifra un texto plano y devuelve un string autocontenido "v1:iv:tag:datos" (base64). */
function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

/** Descifra un payload producido por encrypt(). Lanza si fue manipulado o la clave no coincide. */
function decrypt(payload) {
  const parts = String(payload).split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Formato de dato cifrado no reconocido');
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/** True si el valor ya está cifrado (empieza con el prefijo de versión). */
function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(`${VERSION}:`);
}

module.exports = { encrypt, decrypt, isEncrypted };
