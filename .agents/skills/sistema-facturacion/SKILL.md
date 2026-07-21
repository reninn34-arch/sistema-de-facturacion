---
name: sistema-facturacion-ec
description: Guía de arquitectura, esquema Prisma DB, API REST, facturación electrónica SRI Ecuador (firma PKCS12, clave de acceso 49d, WSDL offline), multitenancy SaaS, multi-sucursales (inventario por local) y UI React + Vite + Tailwind. Usar para consultas y desarrollo optimizado en consumo de tokens.
---

# Skill: Sistema de Facturación Electrónica Multi-Empresa & Multi-Sucursal (Ecuador)

Este documento condensa la arquitectura integral, modelos de datos, flujos tributarios SRI y convenciones del proyecto para permitir a cualquier modelo IA comprender el código instantáneamente sin volver a leer el repositorio.

---

## 1. Stack Tecnológico & Arquitectura
- **Frontend:** React (TypeScript, Vite), Tailwind CSS (Aesthetic Dark/Light Theme), Lucide/Heroicons, Recharts, jsPDF, XLSX/CSV.
- **Backend:** Node.js, Express, Prisma ORM, PostgreSQL (Neon DB).
- **Despliegue:** Vercel Production (`https://clone-system.vercel.app`), Git multiremoto (`origin` y `clone-system`).
- **Autenticación:** JWT con Roles (`SUPERADMIN`, `ADMIN`, `CONTADOR`, `VENDEDOR`, `CLIENTE`).
- **Multitenancy:** Basado en `businessId` aislado en base de datos PostgreSQL.

---

## 2. Facturación Electrónica SRI (Ecuador)

### Tipos de Comprobantes (`doc.type`):
- `01` Factura | `04` Nota de Crédito | `05` Nota de Débito | `06` Guía de Remisión | `07` Comprobante de Retención | `03` Liquidación de Compras.

### Generación de Clave de Acceso (49 dígitos):
`[Fecha 8d][TipoDoc 2d][RUC 13d][Ambiente 1d (1=Pruebas,2=Prod)][Establecimiento 3d][PuntoEmision 3d][Secuencial 9d][CodigoNumerico 8d][TipoEmision 1d (1)][DigitoVerificador 1d (Módulo 11)]`

### Flujo SRI (Offline WSDL):
1. **Generación XML:** Estructura autorizada por XSD del SRI (IVA 15%, 0%, Exento, No Objeto). Redondeo exacto a 2 decimales: `Math.round((n + Number.EPSILON) * 100) / 100`.
2. **Firma Digital PKCS#12 (`.p12`):** Firmado en formato XAdES-BES / Enveloped XML en Node.js.
3. **Recepción SRI (SOAP WSDL):** `POST https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl` (Pruebas) / `https://cel.sri.gob.ec/...` (Producción).
4. **Autorización SRI (SOAP WSDL):** `POST https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl`.

---

## 3. Modelo de Datos Prisma Clave (`backend/prisma/schema.prisma`)

```prisma
model BusinessInfo {
  id               String   @id @default(uuid())
  ruc              String   @unique
  name             String
  tradename        String?
  address          String
  phone            String?
  email            String?
  p12Path          String?  // Certificado digital encriptado o path S3/local
  p12Password      String?
  environment      String   @default("1") // 1: Pruebas, 2: Produccion
  isProduction     Boolean  @default(false)
  plan             String   @default("BASIC") // FREE, BASIC, PRO, ENTERPRISE, GASTRONOMICO
  maxInvoicesMonth Int      @default(50)
  emissionPoints   EmissionPoint[]
  products         Product[]
  users            User[]
  documents        Document[]
}

model EmissionPoint {
  id                String       @id @default(uuid())
  establishmentCode String       // Ej. "001"
  emissionPointCode String       // Ej. "001"
  description       String?      // Ej. "Caja Principal Matriz"
  currentSequential Int          @default(1)
  isMatriz          Boolean      @default(false)
  businessId        String
  business          BusinessInfo @relation(fields: [businessId], references: [id], onDelete: Cascade)
}

model Product {
  id              String       @id @default(uuid())
  code            String
  description     String
  price           Float        // PVP
  wholesalePrice  Float?       // Precio Mayorista
  distributorPrice Float?      // Precio Distribuidor
  taxRate         Float        @default(15) // % IVA
  stock           Float        @default(0)  // Suma total de sucursales
  branchStock     Json?        // Estructura JSON: { "001": 10, "002": 5, "003": 0 }
  minStock        Float?
  type            String       @default("FISICO") // FISICO, SERVICIO
  isRawMaterial   Boolean      @default(false)
  businessId      String
  business        BusinessInfo @relation(fields: [businessId], references: [id], onDelete: Cascade)
}

model Document {
  id                String   @id @default(uuid())
  type              String   // 01, 04, 07, etc.
  establishmentCode String   // Ej. "001"
  emissionPointCode String   // Ej. "001"
  sequential        String   // Ej. "000000001"
  number            String   // Ej. "001-001-000000001"
  accessKey         String?  // 49 dígitos SRI
  status            String   // BORRADOR, ENVIADO, AUTORIZADO, RECHAZADO
  issueDate         DateTime @default(now())
  entityRuc         String
  entityName        String
  subtotal0         Float    @default(0)
  subtotal12        Float    @default(0) // Gravado IVA (15%)
  iva               Float    @default(0)
  total             Float    @default(0)
  userId            String?
  user              User?    @relation(fields: [userId], references: [id])
  businessId        String
  items             Item[]
}
```

---

## 4. Multi-Sucursal y Multi-Caja (Inventario Compartido)

1. **Visibilidad Cruzada:** El POS (`QuickSaleForm.tsx`) muestra insignias de stock por cada sucursal (`🏬 Matriz: 10 | Suc.002: 5`), evitando pérdidas de venta.
2. **Traslado de Inventario (`POST /api/products/transfer-stock`):**
   - Transfiere atómicamente de `fromBranch` a `toBranch`.
   - Modifica `Product.branchStock[fromBranch]` y `Product.branchStock[toBranch]`.
   - Recalcula el total `Product.stock`.
   - Registra el movimiento en el Kardex.
3. **Filtrado por Sucursal Integrado:**
   - Kardex de Inventario (`Kardex.tsx`).
   - Anexo Transaccional SRI ATS XML (`ATSReport.tsx`).
   - Formulario SRI 104 IVA (`Form104.tsx`).
   - Dashboard & Ranking de Vendedores (`Dashboard.tsx`).

---

## 5. Convenciones de Código y UX (Reglas del Agente)

- **Mobile First & Tailwind CSS:** Grids responsivas `grid-cols-1 md:grid-cols-3 lg:grid-cols-4`.
- **Tablas de Datos:** Contenedor obligatorio con `overflow-x-auto` (`<div className="w-full overflow-x-auto"><table ...>...</table></div>`).
- **Modales Adaptables:** Anchos relativos `w-full max-w-lg` y límites de scroll `max-h-[90vh] overflow-y-auto`.
- **Cero Redondeo Impuro:** Usar `round2(n)` para evitar desfases de centavos en la firma de comprobantes XML SRI.
