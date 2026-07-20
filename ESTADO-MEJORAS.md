# Estado de mejoras y pendientes

Resumen breve de lo corregido y lo que falta revisar. Actualizado: 2026-07-19.

---

## ✅ Arreglado

| Área | Qué estaba mal |
|---|---|
| **Notificaciones / Email** | La rama SMTP **nunca enviaba** (devolvía "SMTP simulado"); el botón "Enviar prueba" era un stub; el endpoint exigía `X-API-Key` en prod (401 en todos los envíos); la UI no mostraba los campos del proveedor hasta alternar; las credenciales enmascaradas rompían el envío real. Sin `try/catch` → requests colgadas. |
| **Logger** | No imprimía el mensaje (interpolaciones `${...}` borradas): solo salía `✅ [INFO]` vacío y los `.log` sin texto. |
| **Autenticación / Sesión** | El logout solo limpiaba `localStorage`: la **cookie HttpOnly seguía viva** → el cliente del portal no quedaba deslogueado. El registro tampoco cerraba sesión en el servidor. |
| **Seguridad multi-tenant** | Escalada de privilegios (cualquier empleado podía volverse SUPERADMIN); fuga de datos entre empresas (token sin `businessId` veía todo); endpoints de configuración sin control de rol. Se añadió `requireCompanyContext`. |
| **Suscripciones / Pagos** | Duración del plan hardcodeada (un plan anual daba 30 días); la aprobación de pago no era atómica (estado parcial si fallaba). |
| **SRI / Facturación** | Dígito verificador módulo 11 mal (≈9% de claves inválidas); descuadre de IVA por redondeo entre formulario, RIDE y XML; tipo de identificación del comprador se derivaba del teléfono; secuencial sin rellenar. |
| **Reportes tributarios** | ATS y Libro de Ventas sacaban la **identificación del cliente parseando su nombre** (podían declarar el nombre como cédula al SRI); `item.discount` sin guarda volvía **NaN** todo el reporte; sin redondeo al centavo; Form104 mostraba "Tarifa 12%" mientras calculaba 15%. |
| **Panel superadmin** | `deleteBusiness` hacía 5 borrados secuenciales sin transacción (empresa parcialmente eliminada si fallaba); `updateSubscriptionDays` y `addSubscriptionTime` actualizaban campos distintos, así que extender una suscripción podía dejar a la empresa sin acceso. |
| **Deploy** | Las migraciones de Prisma **no se aplicaban** en Vercel (columnas nuevas no existían en prod); CORS permitía orígenes con `localhost` en producción. |
| **Limpieza** | 30 `console.log` de debug en la generación de PDF; logs de debug de variables de entorno; mensaje de error de BD que solo mencionaba Docker. |

---

## ⏳ Pendiente / no inspeccionado

### Bloqueado por recursos externos
- **Emisión de prueba real contra el SRI**: requiere un certificado `.p12` de una **CA acreditada** (el de prueba actual es auto-firmado y el SRI lo rechaza). Es lo único que valida el flujo completo de punta a punta.
- **Firma `.p12` – Fase B**: el frontend todavía envía el certificado en cada firma. Falta el "cutover" para que firme por `businessId` usando el certificado cifrado en el servidor (la infraestructura ya está hecha).

### Módulos aún sin revisar
- **Reportes**: ✅ módulo completo revisado (ATS, Form104, Libro de Ventas, Kardex, Rentabilidad).
- **Producción / recetas**, **caja / quicksale**, **puntos y referidos**.
- **Blog** y **settings / landing page**.

### Conocidos, decididos a propósito
- **SMS y WhatsApp**: son WIP, no hay endpoints en el backend; sus botones de prueba solo simulan.
- **Rate limiting**: `express-rate-limit` no funciona en serverless (cada invocación es aislada). Necesitaría Redis; se omitió por ahora. El login ya tiene bloqueo por intentos fallidos por cuenta.
- **KYC**: los documentos del registro solo se guardan cuando el pago es por **TRANSFER**. Revisar si por compliance hacen falta en todos los casos.

### Calidad
- No hay **pruebas automatizadas** del flujo end-to-end (registro → verificación → login → emisión → envío del RIDE).
- Los cambios están verificados con `tsc` / `node --check` y pruebas de lógica, pero **no probados en producción**.
