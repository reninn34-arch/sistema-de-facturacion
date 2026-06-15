# EcuaFact Pro — Sistema de Facturación Electrónica SRI

Sistema completo de facturación electrónica integrado con el SRI de Ecuador. Arquitectura SaaS multi-tenant con frontend en React y backend proxy Node.js para comunicación SOAP.

---

## Tecnologías

**Frontend** — React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Heroicons  
**Backend** — Node.js, Express 4, Prisma ORM, PostgreSQL, JWT, bcrypt  
**SRI** — SOAP (node-soap), XML Schema v1.1.0, Firma XAdES-BES, node-forge, xml-crypto  
**Notificaciones** — SendGrid, Mailgun, SMTP, Twilio  
**Pagos** — PayPal SDK, transferencias bancarias  
**Testing** — Playwright (E2E), Jest + Supertest (unitario)  
**Infra** — Docker, Vercel

---

## Características

### Facturación Electrónica
- Facturas (código 01), Notas de Crédito (04), Retenciones (07), Guías de Remisión (06), Liquidaciones de Compra
- Generación de XML según esquema XSD v1.1.0 oficial del SRI
- Firma digital XAdES-BES con certificados .p12
- Envío SOAP a Recepción SRI
- Consulta de Autorización con polling automático y backoff exponencial
- Clave de Acceso de 49 dígitos con dígito verificador módulo 11
- Modo Demo para pruebas sin conexión al SRI

### SaaS Multi-tenant
- Empresas (tenants) aisladas con sus propios datos
- Planes de suscripción: FREE, BASIC, PRO, ENTERPRISE, UNLIMITED
- Roles de usuario: SUPERADMIN, ADMIN, VENDEDOR, CONTADOR
- Control de acceso granular por módulo por usuario
- Puntos de emisión múltiples por empresa
- Programa de referidos y puntos canjeables

### Gestión Comercial
- Clientes y Proveedores con portal de acceso
- Productos con control de stock, precios por volumen, unidades de medida
- Inventario (Kardex) con movimientos por venta, compra, producción, ajuste
- Secuenciales automáticos por establecimiento y punto de emisión
- Producción con recetas, ingredientes y costeo unitario
- Ventas rápidas / POS (punto de venta)
- Compras

### Reportes Tributarios
- Libro de Ventas (registro diario)
- ATS (Anexo Transaccional Simplificado) en XML
- Formulario 104 (IVA)
- Rentabilidad por producto

### Notificaciones
- Email: SendGrid, Mailgun, SMTP
- SMS: Twilio
- WhatsApp: Twilio
- Recordatorios automáticos de pago

### Extras
- Asistente IA conversacional
- Portal del cliente para consulta de facturas
- Blog / capacitaciones con editor de contenido
- Landing page configurable desde el panel admin
- Exportación de datos a CSV

---

## Requisitos

- Node.js 18+
- PostgreSQL
- npm o yarn
- Certificado digital .p12 (producción)

---

## Instalación

```bash
# 1. Clonar el repositorio
cd sistema-de-facturacion

# 2. Configurar base de datos PostgreSQL
psql -U postgres -c "CREATE DATABASE facturacion_db;"

# 3. Backend
cd backend
npm install
cp .env.example .env
# Editar DATABASE_URL en .env con tus credenciales:
#   DATABASE_URL=postgresql://usuario:password@localhost:5432/facturacion_db
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
cd ..

# 4. Frontend
npm install
cp .env.example .env
```

---

## Ejecución

```bash
# Terminal 1 — Backend (Express, puerto 3001)
cd backend
npm run dev

# Terminal 2 — Frontend (Vite, puerto 3000)
npm run dev

# O en paralelo:
npm run dev:full
```

---

## Estructura del Proyecto

```
sistema-de-facturacion/
├── src/                            # Frontend React
│   ├── api/                        # Cliente Axios + interceptors auth/refresh
│   ├── components/                 # Componentes compartidos
│   ├── layouts/                    # Layout principal con menú responsive
│   ├── modules/
│   │   ├── admin/                  # Gestión usuarios, sesiones, puntos, landing
│   │   ├── autenticacion/          # Login, registro, recuperación de acceso
│   │   ├── caja/                   # POS / ventas rápidas, tickets pendientes
│   │   ├── clientes/               # CRUD clientes, productos, portal cliente
│   │   ├── compras/                # Gestión de compras
│   │   ├── configuracion/          # Ajustes, notificaciones, integraciones
│   │   ├── facturacion/            # Facturas, NC, retenciones, guías, kardex
│   │   ├── landing/                # Página pública, blog, contacto, legal
│   │   ├── produccion/             # Recetas, ingredientes, registros de producción
│   │   ├── reportes/               # Libro Ventas, ATS, Form 104, rentabilidad
│   │   └── saas/                   # Suscripciones, admin SaaS, IA, puntos
│   ├── renderers/                  # Renderizado dinámico de configuración
│   ├── services/
│   │   ├── sriService.ts           # Orquestación SRI (firma → recepción → autorización)
│   │   ├── xmlSigner.ts            # Firma XAdES-BES desde el frontend
│   │   ├── atsService.ts           # Generación XML ATS
│   │   ├── retentionService.ts     # Cálculo de retenciones
│   │   ├── remittanceService.ts    # Guías de remisión
│   │   └── notificationService.ts  # Email, SMS, WhatsApp
│   ├── types/                      # Tipos TypeScript (Document, Client, Product, etc.)
│   └── utils/                      # Validaciones (RUC, CI, email, fechas)
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Modelo de datos (15+ modelos)
│   │   ├── migrations/             # Migraciones SQL
│   │   ├── seed.js                 # Datos iniciales
│   │   ├── setup.js                # Script de configuración completo
│   │   └── client.js               # Cliente Prisma singleton
│   ├── src/
│   │   ├── controllers/            # auth, business, ai, admin, production, etc.
│   │   ├── routes/                 # 18 archivos de rutas Express
│   │   ├── middleware/             # JWT, roles, errores, módulos
│   │   └── utils/                  # Logger
│   ├── server.js                   # Entry point Express (~960 líneas)
│   └── sriHelpers.js               # Validación XML, parseo SOAP, backups
├── tests/
│   └── e2e/                        # Tests E2E con Playwright
│       ├── admin-panel.e2e.test.cjs
│       └── payment-flows.e2e.test.cjs
├── public/                         # Favicon, logo, imágenes estáticas
├── backend/tests/                  # Tests unitarios con Jest + Supertest
│   ├── black-box/                  # Pruebas de caja negra (API)
│   ├── white-box/                  # Pruebas de caja blanca (lógica)
│   └── grey-box/                   # Pruebas de integración
├── docker-compose.yml              # PostgreSQL container
├── vite.config.ts                  # Vite + React + Tailwind + proxy /api
├── playwright.config.js
├── tsconfig.json
├── vercel.json                     # Config deploy Vercel (frontend + backend)
└── index.html                      # Entry point HTML con importmap
```

---

## Variables de Entorno

### Frontend (`/sistema-de-facturacion/.env`)

```env
VITE_BACKEND_URL=http://localhost:3001
VITE_API_KEY=your-api-key-here

# PayPal (sandbox)
VITE_PAYPAL_CLIENT_ID=your-paypal-sandbox-client-id
VITE_PAYPAL_SANDBOX=true
```

### Backend (`/sistema-de-facturacion/backend/.env`)

```env
PORT=3001
NODE_ENV=development

# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/facturacion_db

# Seguridad
JWT_SECRET=tu_jwt_secret_aqui
API_KEY=tu_api_key_aqui

# CORS
FRONTEND_URL=http://localhost:3000

# SMTP (email)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@azulpro.com

# PayPal
PAYPAL_CLIENT_ID=tu_paypal_client_id
PAYPAL_CLIENT_SECRET=tu_paypal_client_secret
PAYPAL_API_URL=https://api-m.sandbox.paypal.com

# Asistente IA (opcional)
GEMINI_API_KEY=tu_gemini_api_key
```

---

## API — Backend Proxy SRI

Endpoints del proxy Express (`backend/server.js`):

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/sri/sign-xml` | Firma XML con certificado .p12 (XAdES-BES) |
| POST | `/api/sri/recepcion` | Envía comprobante a Recepción SRI (SOAP) |
| POST | `/api/sri/autorizacion` | Consulta Autorización SRI (SOAP) |
| POST | `/api/auth/*` | Login, registro, refresh token |
| POST | `/api/business/*` | CRUD de empresa / tenant |
| POST | `/api/ai/chat` | Asistente IA conversacional |
| POST | `/api/ai/insights` | Recomendaciones financieras |
| POST | `/api/ai/audit` | Auditoría en tiempo real del negocio |
| POST | `/api/notifications/send-email` | Email (SendGrid / Mailgun / SMTP) |
| POST | `/api/notifications/send-sms` | SMS (Twilio) |
| POST | `/api/notifications/send-whatsapp` | WhatsApp (Twilio) |
| POST | `/api/payment/*` | Pagos PayPal |
| POST | `/api/internal-payment/*` | Solicitudes de activación por transferencia |
| GET/POST | `/api/subscription-plans/*` | Planes de suscripción |
| GET/POST | `/api/admin/*` | Panel SUPERADMIN |
| GET/POST | `/api/production/*` | Recetas y producción |
| GET/POST | `/api/quicksale/*` | Ventas rápidas / POS |
| POST | `/api/settings/*` | Configuración global |
| POST | `/api/module-permissions/*` | Permisos de módulos por usuario |
| POST | `/api/session/*` | Registro de sesiones |
| GET/POST | `/api/emission-points/*` | Puntos de emisión |
| GET/POST | `/api/referrals/*` | Programa de referidos |
| GET/POST | `/api/points-admin/*` | Administración de puntos |
| GET/POST | `/api/blog/*` | Blog y capacitaciones |
| GET | `/api/public/*` | Rutas públicas (consulta estado) |
| GET | `/health` | Health check |
| GET | `/api/info` | Información del servidor |
| GET | `/api/backups/info` | Info de backups XML |

---

## Scripts

### Frontend

```bash
npm run dev            # Desarrollo (Vite, puerto 3000)
npm run build          # Build producción
npm run preview        # Preview del build
npm run test:e2e       # Tests E2E (Playwright)
```

### Backend

```bash
npm run dev            # Desarrollo (nodemon, puerto 3001)
npm start              # Producción
npm test               # Tests unitarios (Jest)
npm run test:blackbox  # Pruebas de caja negra
npm run test:whitebox  # Pruebas de caja blanca
npm run test:greybox   # Pruebas de integración
npm run db:setup       # Configurar BD completa (generate + migrate + seed)
npm run prisma:studio  # Prisma Studio UI
npm run prisma:reset   # Resetear BD
npm run prisma:seed    # Ejecutar seed manualmente
```

---

## Base de Datos

15+ modelos PostgreSQL gestionados con Prisma ORM:

- **Business** — Empresa / tenant (RUC, régimen, plan, suscripción)
- **User** — Usuarios con roles (SUPERADMIN, ADMIN, VENDEDOR, CONTADOR)
- **Client** — Clientes y proveedores (único por RUC + empresa)
- **Product** — Productos y servicios (stock, precios, unidad de medida)
- **Document** — Documentos electrónicos (facturas, NC, retenciones, guías)
- **InvoiceItem** — Detalle de items por documento
- **Sequence** — Secuenciales numéricos por tipo/establecimiento/empresa
- **InventoryMovement** — Movimientos de kardex
- **Subscription** — Suscripciones a planes
- **SubscriptionPlan** — Planes (FREE, PRO, ENTERPRISE)
- **ActivationRequest** — Solicitudes de activación por transferencia
- **Recipe / RecipeIngredient / ProductionRecord** — Producción
- **QuickSale** — Ventas rápidas POS
- **Session** — Registro de sesiones de usuario
- **Module / UserModulePermission** — Módulos y permisos granulares
- **EmissionPoint** — Puntos de emisión por empresa
- **Referral** — Programa de referidos
- **PointsConfig / Prize** — Configuración de puntos y premios
- **BlogPost** — Blog y capacitaciones
- **AppSettings** — Configuración global

---

## Deploy

### Vercel

El proyecto incluye `vercel.json` con configuración para deploy del frontend (Vite) y backend (Express) en Vercel:

```json
{
  "experimentalServices": {
    "frontend": { "routePrefix": "/", "framework": "vite" },
    "backend": { "entrypoint": "backend", "routePrefix": "/_/backend" }
  }
}
```

### Servidor propio (VPS)

```bash
# Backend con PM2
cd backend
npm install
npm install -g pm2
pm2 start server.js --name ecuafact-api
pm2 save
pm2 startup

# Frontend
npm run build
# Servir dist/ con nginx, caddy o similar
```

---

## Documentación Complementaria

- [`GUIA_USO_COMPLETA.md`](GUIA_USO_COMPLETA.md) — Guía de usuario paso a paso
- [`INTEGRACION_SRI.md`](INTEGRACION_SRI.md) — Documentación técnica SRI
- [`BACKEND_PROXY_SRI.md`](BACKEND_PROXY_SRI.md) — Guía del backend proxy
- [`SISTEMA_COMPLETADO.md`](SISTEMA_COMPLETADO.md) — Estado del sistema
- [`CHANGELOG_SAAS.md`](CHANGELOG_SAAS.md) — Registro de cambios
- [`NOTAS_CREDITO_IMPLEMENTADAS.md`](NOTAS_CREDITO_IMPLEMENTADAS.md) — Implementación de NC
- [`RESUMEN_IMPLEMENTACION.md`](RESUMEN_IMPLEMENTACION.md) — Resumen técnico
- [`backend/README.md`](backend/README.md) — Documentación del backend
- [`backend/prisma/README.md`](backend/prisma/README.md) — Gestión de BD con Prisma
- [`backend/tests/README.md`](backend/tests/README.md) — Tests automatizados

---

## Licencia

MIT
