# 🇪🇨 Backend Proxy SRI Ecuador

Backend Node.js/Express con arquitectura modular por capas (controller → service → routes).
Actúa como proxy entre el frontend y los Web Services del SRI de Ecuador.

## 🚀 Inicio Rápido

```bash
npm install
cp .env.example .env
npm run dev   # Desarrollo (nodemon, puerto 3001)
npm start     # Producción
```

## 📂 Estructura Modular

```
backend/
├── prisma/                     # Modelo de datos, migraciones, seed
├── src/
│   ├── modules/                # 21 módulos domain-driven
│   │   ├── admin/              # Panel SUPERADMIN
│   │   ├── ai/                 # Asistente IA
│   │   ├── auth/               # Login, registro, recuperación
│   │   ├── business/           # Empresa, clientes, productos, docs
│   │   ├── module-permissions/ # Permisos granulares
│   │   ├── notifications/      # Email (SendGrid, Mailgun, SMTP)
│   │   ├── production/         # Recetas y producción
│   │   ├── quicksale/          # Ventas rápidas / POS
│   │   ├── session/            # Sesiones de usuario
│   │   ├── sri/                # Firma XML, recepción, autorización
│   │   ├── system/             # Health check, info, backups
│   │   ├── payment/            # Pagos PayPal
│   │   ├── internal-payment/   # Pagos internos
│   │   ├── subscription-plans/ # Planes de suscripción
│   │   ├── activation-requests/# Solicitudes de activación
│   │   ├── settings/           # Configuración global
│   │   ├── public/             # Rutas públicas
│   │   ├── emission-points/    # Puntos de emisión
│   │   ├── referrals/          # Programa de referidos
│   │   ├── points-admin/       # Admin de puntos
│   │   └── blog/               # Blog y capacitaciones
│   ├── middleware/             # JWT, roles, error handler
│   └── utils/                  # Logger
├── server.js                   # Entry point (~208 líneas)
├── sriHelpers.js               # Validación XML, parseo SOAP, backups
└── tests/                      # Tests unitarios
```

Cada módulo sigue el patrón:
```
module/
├── module.controller.js   # Manejo de req/res
├── module.service.js      # Lógica de negocio + Prisma
└── module.routes.js       # Definición de rutas + middlewares
```

## 📋 Endpoints SRI

### POST `/api/sri/sign-xml`
Firma XML con certificado digital .p12

```json
{
  "xml": "<factura>...</factura>",
  "p12Base64": "MIIK...",
  "password": "certificado123",
  "claveAcceso": "2912202501179123456700120010010000000011234567818"
}
```

**Respuesta:**
```json
{
  "success": true,
  "signedXml": "<factura>...<ds:Signature>...</ds:Signature></factura>",
  "certificateInfo": { "subject": "CN=EMPRESA SA", "validFrom": "...", "validTo": "..." }
}
```

### POST `/api/sri/recepcion`
Envía comprobante firmado al SRI

```json
{ "xmlSigned": "<factura>...<ds:Signature>...</ds:Signature></factura>", "isProduction": false }
```

**Respuesta:** `{ "success": true, "estado": "RECIBIDA", "claveAcceso": "...", "mensaje": "..." }`

### POST `/api/sri/autorizacion`
Consulta autorización SRI

```json
{ "claveAcceso": "2912202501179123456700120010010000000011234567818", "isProduction": false }
```

**Respuesta:** `{ "success": true, "estado": "AUTORIZADO", "numeroAutorizacion": "...", ... }`

## 🔐 Autenticación

Endpoints SRI requieren header en producción:
```
X-API-Key: tu-clave-secreta
```

Endpoints de negocio usan JWT Bearer token.

## ⚙️ Variables de Entorno

| Variable | Descripción | Defecto |
|----------|-------------|---------|
| `PORT` | Puerto | `3001` |
| `NODE_ENV` | Entorno | `development` |
| `DATABASE_URL` | PostgreSQL | - |
| `JWT_SECRET` | Secreto JWT | - |
| `API_KEY` | API Key SRI (producción) | - |
| `FRONTEND_URL` | CORS | `http://localhost:3000` |

## 🚀 Deploy

```bash
# PM2
pm2 start server.js --name "sri-proxy"

# Docker
docker build -t sri-proxy . && docker run -p 3001:3001 --env-file .env sri-proxy
```

## 🛡️ Seguridad

- Helmet, rate limiting (100/15min), CORS, body parser 10MB
- Validación de certificados .p12, logs de todas las operaciones

---

**Desarrollado para integración con SRI Ecuador — Versión 2.0.0**
