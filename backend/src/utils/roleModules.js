// ============================================================
// Módulos por defecto según el rol (mínimo privilegio de fábrica).
// Los códigos coinciden con Module.code (ver prisma/seed.js).
// ADMIN/SUPERADMIN ven todo → no se filtran.
// El ajuste fino por usuario (UserModulePermission) se aplica ENCIMA de
// estos defaults cuando el plan tiene hasModuleControl.
// ============================================================

const ROLE_DEFAULT_MODULES = {
  VENDEDOR: ['invoices', 'credit-notes', 'remittances', 'caja', 'clients', 'products'],
  CONTADOR: ['invoices', 'credit-notes', 'retentions', 'settlements', 'reports', 'clients', 'products', 'audit'],
};

/**
 * Devuelve la lista efectiva de permisos de módulo {moduleCode, granted}
 * para un usuario, combinando el default de su rol con los permisos
 * explícitos por usuario (estos últimos mandan si existen).
 *
 * - ADMIN / SUPERADMIN → [] (el frontend no filtra a los administradores).
 * - Rol sin default definido → [] (sin restricción por rol).
 *
 * @param {string} role
 * @param {Array<{moduleCode:string, granted:boolean}>} explicitPermissions
 */
function getEffectiveModulePermissions(role, explicitPermissions = []) {
  if (role === 'ADMIN' || role === 'SUPERADMIN') return [];
  const defaults = ROLE_DEFAULT_MODULES[role];
  if (!defaults) return [];

  // Base: los módulos del rol, concedidos.
  const effective = new Map();
  for (const code of defaults) effective.set(code, true);

  // Overlay: los permisos explícitos por usuario mandan (conceder o denegar).
  for (const p of explicitPermissions) {
    effective.set(p.moduleCode, p.granted);
  }

  return Array.from(effective, ([moduleCode, granted]) => ({ moduleCode, granted }));
}

module.exports = { ROLE_DEFAULT_MODULES, getEffectiveModulePermissions };
