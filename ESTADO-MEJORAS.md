# Estado de mejoras y pendientes

Resumen breve de lo corregido y lo que falta revisar. Actualizado: 2026-07-20.

---

## ✅ Arreglado

| Área | Qué estaba mal / Cómo se solucionó |
|---|---|
| **Portal de Clientes / RIDE & XML** | Los botones de "Descargar PDF" y "Descargar XML" en el portal de clientes no tenían eventos `onClick`. La consulta `findDocumentsByEntityRuc` omitía las relaciones `items` y `business`. Se integró `<RideViewer />`, descarga nativa de XML y carga de relaciones necesarias. |
| **Persistencia SMTP y Seguridad** | `notificationSettings` se reseteaba en frontend al recargar. Se añadió sincronización en `AppContext`. Se enmascararon contraseñas de SMTP (`••••••••••••••••`) en API para evitar exponer la clave en UI y se ajustó el backend para evitar sobreescribir la clave real al guardar con la máscara. |
| **Esquema de Documentos (Propinas / Reembolsos)** | El guardado de proformas/facturas fallaba con `500 (Internal Server Error)` al enviar `tip`, `isReimbursement` o `reimbursements` no soportados por Prisma. Se añadieron las 3 columnas al modelo `Document` en `schema.prisma`, se creó la migración SQL física y se aplicó mapeo explícito en `business.service.js`. |
| **UX / Tema Oscuro-Claro** | El selector de tema era un botón flotante y exclusivo para rol `SUPERADMIN`. Se trasladó al Header principal junto a las notificaciones y se habilitó globalmente para todos los usuarios. |
| **Script de Deploy (Vercel)** | `vercel-build` fallaba en Vercel cuando la base de datos de producción fue inicializada mediante `db push` (sin tabla `_prisma_migrations`). Se añadió manejo de excepciones en `scripts/migrate-deploy.js` con fallback automático. |
| **Notificaciones / SMS & WhatsApp** | No existían endpoints en el backend. Se implementaron los controladores `/api/notifications/send-sms` (vía Twilio / Vonage-Nexmo) y `/api/notifications/send-whatsapp` (vía Twilio WhatsApp API) con soporte de credenciales de la empresa y resolución de enmascaramiento. Se conectaron los botones de prueba en `NotificationSettings.tsx`. |
| **Notificaciones / Email** | La rama SMTP no enviaba emails; el botón "Enviar prueba" era un stub; el endpoint exigía `X-API-Key` en prod (401 en todos los envíos); la UI no mostraba campos del proveedor; credenciales enmascaradas rompían envío real. Sin `try/catch` → requests colgadas. |
| **Logger** | No imprimía el mensaje (interpolaciones `${...}` borradas): solo salía `✅ [INFO]` vacío y los `.log` sin texto. |
| **Autenticación / Sesión** | El logout solo limpiaba `localStorage`: la **cookie HttpOnly seguía viva** → el cliente del portal no quedaba deslogueado. El registro tampoco cerraba sesión en el servidor. |
| **Seguridad multi-tenant** | Escalada de privilegios (cualquier empleado podía volverse SUPERADMIN); fuga de datos entre empresas (token sin `businessId` veía todo); endpoints de configuración sin control de rol. Se añadió `requireCompanyContext`. |
| **Suscripciones / Pagos** | Duración del plan hardcodeada (un plan anual daba 30 días); la aprobación de pago no era atómica (estado parcial si fallaba). |
| **SRI / Facturación** | Dígito verificador módulo 11 mal (≈9% de claves inválidas); descuadre de IVA por redondeo entre formulario, RIDE y XML; tipo de identificación del comprador se derivaba del teléfono; secuencial sin rellenar. |
| **Reportes tributarios** | ATS y Libro de Ventas sacaban la identificación del cliente parseando su nombre; `item.discount` sin guarda volvía NaN todo el reporte; sin redondeo al centavo; Form104 mostraba "Tarifa 12%" mientras calculaba 15%. |
| **Panel superadmin** | `deleteBusiness` hacía 5 borrados secuenciales sin transacción; `updateSubscriptionDays` y `addSubscriptionTime` actualizaban campos distintos. |
| **Limpieza** | 30 `console.log` de debug en la generación de PDF; logs de debug de variables de entorno; mensaje de error de BD que solo mencionaba Docker. |

---

## ⏳ Pendiente / no inspeccionado

### ⚠️ Riesgos Críticos y Pendientes de Regla de Negocio
- **1) Fallback `db push --accept-data-loss` en Deploy (Riesgo Alto):** En `scripts/migrate-deploy.js`, el fallback en despliegue automático utiliza `execSync('npx prisma db push --accept-data-loss')`. Es el **riesgo más grande que queda**: si en el futuro se elimina o renombra una columna en `schema.prisma`, `db push` borrará columnas y datos en la base de datos de producción automáticamente y sin pedir confirmación. Se debe establecer un baseline oficial (`prisma migrate resolve`) cuando se estabilice el esquema.
- **2) Criterio "Verificar antes de borrar" en Clientes y Productos:** La validación de integridad referencial que impida borrar un cliente o un producto si ya tiene facturas o documentos asociados (`Document`) queda **pendiente a propósito**, debido a que el sistema continúa en fase de pruebas activas.

### Bloqueado por recursos externos
- **Emisión de prueba real contra el SRI**: requiere un certificado `.p12` de una **CA acreditada** (el de prueba actual es auto-firmado y el SRI lo rechaza). Es lo único que valida el flujo completo de punta a punta.
- **Firma `.p12` – Fase B**: el frontend todavía envía el certificado en cada firma. Falta el "cutover" para que firme por `businessId` usando el certificado cifrado en el servidor (la infraestructura ya está hecha).

### Módulos del Sistema
- **Reportes**: ✅ Módulo completo revisado (ATS, Form104, Libro de Ventas, Kardex, Rentabilidad).
- **Producción / recetas**: ✅ Módulo completo revisado (control de insumos, movimientos atómicos de stock y cálculo de costos por lote).
- **Caja / quicksale**: ✅ Módulo completo revisado (cálculo dinámico de IVA según `taxRate` del ítem y migración a API central con `client`).
- **Puntos y referidos**: ✅ Módulo completo revisado (resiliencia de autenticación y permisos de Superadmin).
- **Blog & Capacitaciones**: ✅ Módulo completo revisado (gestión CRUD y fallback de tokens de sesión).
- **Settings / Landing Page**: ✅ Módulo completo revisado (edición dinámica de contenidos y carga de logo institucional).
- **Compras**: ✅ Módulo completo revisado (registro de comprobantes recibidos, filtrado de proveedores y cálculo de impuestos).

### Conocidos, decididos a propósito
- **SMS y WhatsApp**: ✅ Endpoints implementados en backend (`/api/notifications/send-sms` y `/api/notifications/send-whatsapp`) con soporte para proveedores Twilio y Vonage/Nexmo. Botones de prueba conectados en `NotificationSettings.tsx`.
- **Rate limiting**: `express-rate-limit` no funciona en entornos serverless (cada invocación corre aislada en Vercel sin estado persistente). Requeriría Redis; se omitió por ahora. La protección de fuerza bruta en el login se mantiene mediante bloqueo por intentos fallidos a nivel de base de datos/usuario.
- **KYC (Documentos de registro)**: La carga de cédula/RUC y comprobante de pago es obligatoria únicamente cuando el método de pago elegido es **TRANSFER** (transferencia bancaria para aprobación manual en `ActivationRequests`). Para compras inmediatas con PayPal o Tarjeta se omite para no friccionar el flujo de onboarding.

### Calidad
- No hay **pruebas automatizadas** del flujo end-to-end (registro → verificación → login → emisión → envío del RIDE).
