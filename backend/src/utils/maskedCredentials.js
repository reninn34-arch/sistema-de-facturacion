// ============================================================
// Credenciales enmascaradas de notificaciones.
//
// La API nunca devuelve al frontend las credenciales reales (contraseña SMTP,
// API keys): se sustituyen por CREDENTIAL_MASK. Como el frontend luego reenvía
// esos settings (al guardar o al enviar un email), el backend debe volver a
// resolver la máscara contra lo que hay guardado; si no, intentaría autenticarse
// literalmente con "••••••••".
//
// Mantener la máscara en UN solo lugar evita que se desincronice entre módulos.
// ============================================================

const CREDENTIAL_MASK = '••••••••••••••••';
const MASKED_FIELDS = ['smtpPassword', 'sendgridApiKey', 'mailgunApiKey'];

/** Copia de los settings con las credenciales sensibles enmascaradas. */
function maskSettings(settings) {
  if (!settings) return settings;
  const out = { ...settings };
  for (const field of MASKED_FIELDS) {
    if (out[field]) out[field] = CREDENTIAL_MASK;
  }
  return out;
}

/**
 * Devuelve los settings recibidos, reemplazando por el valor guardado cualquier
 * credencial que venga enmascarada o vacía. Así se conserva la real y se permite
 * que el usuario escriba una nueva.
 */
function resolveMaskedSettings(provided, stored) {
  const out = { ...(provided || {}) };
  const base = stored || {};
  for (const field of MASKED_FIELDS) {
    if (!out[field] || out[field] === CREDENTIAL_MASK) {
      out[field] = base[field];
    }
  }
  return out;
}

/**
 * Deja un objeto Business listo para enviarlo al cliente: quita el certificado y
 * su clave, y enmascara las credenciales de notificaciones.
 *
 * `features` se conserva a propósito: el frontend todavía lee features.signatureP12
 * para el flujo de firma actual (mientras no se complete el cutover al certificado
 * cifrado en el servidor).
 */
function sanitizeBusinessForClient(business) {
  if (!business) return business;
  const { electronicSignature, sriPassword, ...safe } = business;
  if (safe.notificationSettings) {
    safe.notificationSettings = maskSettings(safe.notificationSettings);
  }
  return safe;
}

module.exports = { CREDENTIAL_MASK, MASKED_FIELDS, maskSettings, resolveMaskedSettings, sanitizeBusinessForClient };
