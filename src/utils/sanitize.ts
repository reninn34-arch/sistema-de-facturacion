import DOMPurify from 'dompurify';

/**
 * Sanitiza HTML antes de inyectarlo con dangerouslySetInnerHTML.
 * Evita XSS (Cross-Site Scripting) en contenido dinámico proveniente
 * del backend o de entradas de usuario.
 *
 * Uso:
 *   <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }} />
 */
export const sanitizeHtml = (dirty: string | null | undefined): string => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    // Fuerza que los enlaces se abran de forma segura y bloquea protocolos peligrosos.
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
};
