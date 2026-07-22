# Estado de mejoras y pendientes

Resumen breve de lo corregido y lo que falta revisar. Actualizado: 2026-07-21.

---

## ✅ Arreglado

| Área | Qué estaba mal / Cómo se solucionó |
|---|---|
| **Asistente IA Multi-Proveedor (DeepSeek, Groq, OpenCode & Gemini)** | Se configuró la arquitectura multi-proveedor en `ai.service.js` y `AIAssistant.tsx` con soporte para modelos económicos/gratuitos de pruebas: **DeepSeek (`deepseek-chat`)**, **Groq (`llama-3.3-70b-versatile`)**, **OpenCode (Zen)** y **Gemini AI**, seleccionables dinámicamente desde la interfaz. |
| **Redondeo Exacto al Centavo SRI en Retenciones** | Se aplicó el redondeo de precisión `Math.round((n + Number.EPSILON) * 100) / 100` en `RetentionForm.tsx` tanto para el valor retenido individual (`taxValue`) como para el total retenido (`totalRetained`), eliminando descuadres flotantes en el XML autorizable por el SRI. |
| **Sincronización Multisucursal en Ventas, Devoluciones y Compras** | Se actualizó `business.service.js` para que al emitir Facturas (`01`), Notas de Crédito por devolución (`04`) o Compras (`03`), la afectación de stock impacte atómicamente la sucursal emisora (`Product.branchStock[estab]`) y sincronice el stock global del producto. |
| **Integridad Referencial (Clientes y Productos)** | Se implementó el control de prevención de borrado ("Verificar antes de borrar") en `business.service.js`. Si un cliente tiene comprobantes emitidos o un producto está incluido en facturas registradas, el backend bloquea la eliminación notificando al usuario en la UI en lugar de causar errores de clave foránea. |
| **Traslado de Inventario entre Sucursales** | Se creó `StockTransferModal.tsx` y la API atómica `POST /api/products/transfer-stock`. Modifica en memoria/BD la disponibilidad de `Product.branchStock` por local, recalcula el stock global y añade el evento de transferencia al Kardex. Se integró el botón "Trasladar Stock" en `ProductManager.tsx`. |
| **Filtros por Sucursal en Kardex, ATS XML y Formulario 104** | Se añadieron selectores de establecimiento/sucursal (`001`, `002`...) en `Kardex.tsx`, `ATSReport.tsx` y `Form104.tsx`. Permite a contadores y administradores desglosar la información tributaria y movimientos de inventario por local específico o en consolidado total. |
| **Dashboard Adaptado por Vendedor & Ranking de Cajas** | Se agregó el filtro de vendedor en `Dashboard.tsx` y la tarjeta interactiva de **"🏆 Desempeño y Ventas por Vendedor"**, clasificando a los vendedores según facturación y total de comprobantes autorizados. |
| **Skill del Proyecto para IA (`SKILL.md`)** | Se creó `.agents/skills/sistema-facturacion/SKILL.md` condensando la arquitectura, esquemas Prisma DB, integración SRI Ecuador y reglas de interfaz para consumo optimizado de tokens en Antigravity, ChatGPT, Claude o Cursor. |
| **Arqueo y Cierre de Caja Diario (POS)** | Se creó `CashClosingModal.tsx` e integró en `QuickSaleForm.tsx`. Permite ingresar fondo inicial de caja, conteo físico de efectivo/tarjeta/transferencia y genera el comprobante impreso de cierre con el cálculo de sobrante o faltante. |
| **Facturación Recurrente / Contratos** | Se creó `RecurringInvoices.tsx` para programar contratos de servicios y arriendos con frecuencias (semanal, mensual, anual), estado del contrato (activa/pausada), acciones de edición/eliminación y botón de emisión masiva en lote para el período activo. |
| **Sucursales y Puntos de Emisión SRI** | Se creó `EstablishmentManager.tsx` para registrar establecimientos (`001`, `002`) y cajas autorizadas por el SRI, permitiendo seleccionar el punto de emisión activo para la sesión del cajero o vendedor. |
| **Asignación Multisucursal & Segmentación de Módulos por Plan** | Se agregaron `establishmentCode` y `emissionPointCode` al modelo `User` en Prisma y en `UserManagement.tsx` para asignar cajas/locales a cajeros. Se añadieron filtros por sucursal en **Dashboard**, **Libro de Ventas** y **Rentabilidad**. Se implementó la ocultación dinámica de módulos (Sucursales, Recetas, Facturación Recurrente, ATS XML, Formulario 104) en `Layout.tsx` según el Plan de Suscripción contratado por la empresa. |
| **Punto de Venta (POS) Offline Auto-Sync** | Se habilitó la cola de persistencia local en `localStorage` (`offlineTicketsQueue`) dentro de `QuickSaleForm.tsx`. Si la conexión a internet falla o el backend no responde, las ventas de la caja se guardan de forma segura en local y se sincronizan automáticamente con el servidor al detectar el evento `online` del navegador. |
| **Exportación a Excel / CSV (Reportes)** | Se creó `excelService.ts` con codificación UTF-8 BOM (`\uFEFF`) para que Microsoft Excel abra archivos con tildes y eñes sin distorsión. Integrado en **Libro de Ventas**, **Kardex**, **Anexo Transaccional (ATS)** y **Rentabilidad de Productos** con subtotales por período. |
| **Revocación Masiva de Sesiones** | Se implementó el endpoint atómico `POST /api/business/sessions/revoke-others` para invalidar todas las sesiones activas en otros dispositivos en un solo llamado. Se añadió fallback de token `adminToken || token` en `SessionsPage.tsx`. |
| **Soporte PWA & POS Offline** | Se creó `public/manifest.json` y el Service Worker `public/sw.js` registrado en `index.html` para la instalación de Azul POS como PWA y la carga en caché offline de la interfaz de venta rápida. |
| **Optimización Bundle React** | Se aplicó code-splitting con `React.lazy()` en el enrutador y `manualChunks` en Vite (`vendor-pdf`, `vendor-crypto`, `vendor-react`, `vendor-icons`), reduciendo el paquete inicial de **1.38 MB a 155 kB** (**~89% de reducción**). |
| **Reintentos SRI & Notificaciones Asíncronas** | Se añadió `/api/sri/retry-pending` para reconsultar comprobantes en `PENDING` ante el WSDL del SRI, y `/api/notifications/notify-authorized-document` para desacoplar el envío en segundo plano de Email, SMS y WhatsApp sin congelar la UI. |
| **Modo Pruebas Sin Firma (.p12)** | Se clasificó la ausencia de certificado con el código `NO_CERTIFICATE` en backend. En ambiente de pruebas (`!isProduction`), `sriService.ts` permite continuar sin firma, previniendo bloqueos en emisiones de prueba sin certificado cargado. |
| **Pruebas de Calidad (Backend & E2E)** | Se ejecutaron y ajustaron las suites de pruebas automatizadas. **102 de 102** pruebas backend (Jest + Supertest en caja blanca, gris y negra) y **28 de 28** pruebas E2E (Playwright en navegador Chromium) pasaron exitosamente al 100%. |
| **Firma .p12 Cifrada (Fase B Cutover)** | El frontend exigía seleccionar el archivo `.p12` local en cada emisión. Se completó el cutover pasando `businessId` a `/api/sri/sign-xml` en `sriService.ts`, `InvoiceForm`, `CreditNoteForm` y `PendingTickets`. El backend ahora descifra y firma en memoria usando la firma guardada del negocio (`electronicSignature` y `sriPassword`). |
| **Portal de Clientes / RIDE & XML** | Los botones de "Descargar PDF" y "Descargar XML" en el portal de clientes no tenían eventos `onClick`. La consulta `findDocumentsByEntityRuc` omitía las relaciones `items` y `business`. Se integró `<RideViewer />`, descarga nativa de XML y carga de relaciones necesarias. |
| **Persistencia SMTP y Seguridad** | `notificationSettings` se reseteaba en frontend al recargar. Se añadió sincronización en `AppContext`. Se enmascararon contraseñas de SMTP (`••••••••••••••••`) en API para evitar exponer la clave en UI y se ajustó el backend para evitar sobreescribir la clave real al guardar con la máscara. |
| **Esquema de Documentos (Propinas / Reembolsos)** | El guardado de proformas/facturas fallaba con `500 (Internal Server Error)` al enviar `tip`, `isReimbursement` o `reimbursements` no soportados por Prisma. Se añadieron las 3 columnas al modelo `Document` en `schema.prisma`, se creó la migración SQL física y se aplicó mapeo explícito en `business.service.js`. |
| **UX / Tema Oscuro-Claro** | El selector de tema era un botón flotante y exclusivo para rol `SUPERADMIN`. Se trasladó al Header principal junto a las notificaciones y se habilitó globalmente para todos los usuarios. |
| **Script de Deploy (Vercel)** | `vercel-build` fallaba en Vercel cuando la base de datos de producción fue inicializada mediante `db push` (sin tabla `_prisma_migrations`). Se añadió manejo de excepciones en `scripts/migrate-deploy.js` con fallback automático. |
| **Notificaciones / SMS & WhatsApp** | No existían endpoints en el backend. Se implementaron los controladores `/api/notifications/send-sms` (vía Twilio / Vonage-Nexmo) y `/api/notifications/send-whatsapp` (vía Twilio WhatsApp API) con soporte de credenciales de la empresa y resolución de enmascaramiento. Se conectaron los botones de prueba en `NotificationSettings.tsx`. |
| **KYC / Verificación de Identidad** | Los documentos de Cédula y RUC guardados en `documents` no se mostraban en el panel de Superadmin. Se integró la sección de previsualización e inspección de Cédula y RUC en `ActivationRequests.tsx` con soporte para imágenes y visor integrado de PDFs. |
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
- **Firma `.p12` – Fase B**: ✅ Cutover completado. El frontend envía `businessId` al backend en `sign-xml`, permitiendo al servidor descifrar la firma `.p12` y contraseña desde la base de datos para firmar el XML sin requerir adjuntar el archivo local en cada emisión.

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
- **KYC (Documentos de registro)**: ✅ La carga de cédula/RUC y comprobante de pago aplica para pagos por **TRANSFER** (transferencia bancaria para aprobación manual en `ActivationRequests`). El Superadmin ahora dispone de visor de Cédula y RUC en formato imagen o PDF dentro de `ActivationRequests.tsx`. Para compras inmediatas (PayPal/Tarjeta) se omite para optimizar el flujo de registro.

### Calidad
- ✅ **Pruebas Automatizadas:** 102/102 tests de backend (Jest/Supertest) y 28/28 tests E2E (Playwright) ejecutados y pasando al 100%. Comandos de ejecución: `npm test` en backend y `npm run test:e2e` en raíz.
