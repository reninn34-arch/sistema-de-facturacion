# 📋 CHANGELOG - Sistema SaaS de Facturación Electrónica

> **Documento de cambios para commit al proyecto original**  
> Fecha: 2026-02-28  
> Autor: Equipo de Desarrollo SaaS

---

## 🔧 Cambios Recientes (2026-02-28)

### 1. **Creación automática de facturas al procesar pagos**
- [`backend/src/routes/internal-payment.routes.js`](backend/src/routes/internal-payment.routes.js) - Ahora crea documento (factura) automáticamente al procesar pagos internos
- [`backend/src/routes/activation-requests.routes.js`](backend/src/routes/activation-requests.routes.js) - Ahora crea documento (factura) al aprobar solicitudes de activación

### 2. **Arreglar anulación de facturas en Devoluciones**
- [`src/SaasCreditNote.tsx`](src/SaasCreditNote.tsx) - Cambiado endpoint de `/api/documents` a `/api/admin/subscriptions/credit-note` para procesar correctamente notas de crédito

### 3. **Arreglar eliminación de pagos**
- [`backend/src/controllers/admin.controller.js`](backend/src/controllers/admin.controller.js) - Al eliminar suscripción, también elimina el documento de factura asociado

### 4. **Corrección de caracteres mal codificados**
- [`src/ClientDashboard.tsx`](src/ClientDashboard.tsx) - Corregidos caracteres como "contraseÃ±a" → "contraseña"

### 5. **Nueva migración de base de datos**
- [`backend/prisma/migrations/20260228000000_add_invoice_type_to_document/`](backend/prisma/migrations/20260228000000_add_invoice_type_to_document/) - Agregado campo invoiceType a tabla Document

### 6. **Archivos de configuración actualizados**
- [`backend/.env.example`](backend/.env.example) - Creado archivo de ejemplo para variables de entorno
- [`backend/prisma/seed.js`](backend/prisma/seed.js) - Actualizados precios de planes para consistencia
- [`backend/prisma/setup.js`](backend/prisma/setup.js) - Corregido plan de 'PRO' a 'UNLIMITED'

---

## 📋 Historial Anterior

## 🔧 Archivos Modificados

### 1. `src/api/client.ts` — **CRÍTICO: Corrección de conexión API**

**Problema:** La función `request()` hacía `fetch('')` (cadena vacía) en vez de construir la URL completa con el backend.

**Impacto:** Todas las peticiones HTTP se enviaban a `http://localhost:3000/` (servidor Vite/frontend) en vez de al backend (`http://localhost:3001`). El frontend recibía HTML (`<!DOCTYPE...`) en vez de JSON, causando errores en cascada.

**Cambio:**
```diff
- const response = await fetch(``, config);
+ const response = await fetch(`${BASE_URL}${endpoint}`, config);
```

**Línea afectada:** 20

---

### 2. `src/App.tsx` — **Correcciones múltiples**

#### 2a. Null safety en `loadData()` (línea ~184)
**Problema:** Cuando la petición de negocio fallaba, `empresa` era `null`, pero el código accedía a `empresa.features` sin verificar.

**Error:** `Cannot read properties of null (reading 'features')`

```diff
- const features = (empresa as any).features || {};
+ const features = (empresa as any)?.features || {};
```

#### 2b. Rutas API incorrectas (líneas ~173-174)
**Problema:** Las rutas `/products` y `/documents` no coincidían con las del backend (`/api/products` y `/api/documents`).

```diff
- const loadProducts = client.get<Product[]>('/products')...
- const loadDocs = client.get<Document[]>('/documents')...
+ const loadProducts = client.get<Product[]>('/api/products')...
+ const loadDocs = client.get<Document[]>('/api/documents')...
```

#### 2c. Modo oscuro mejorado en sección de configuración
- Agregadas variantes `dark:` a todos los contenedores, inputs, labels, botones y secciones del panel de configuración
- Header del perfil, Información Legal, Regímenes Especiales, Mi Cuenta
- Botón flotante del SUPERADMIN adaptado al modo oscuro
- Sidebar de certificado P12 con bordes mejorados en dark mode

---

### 3. `index.html` — **Mejoras globales de modo oscuro**

#### 3a. Body con soporte dark mode
```diff
- <body class="bg-slate-50 text-slate-900">
+ <body class="bg-slate-50 text-slate-900 dark:bg-[#0f172a] dark:text-slate-100 transition-colors duration-300">
```

#### 3b. Tailwind config actualizado
- `background-dark` cambiado de `#0B1120` a `#0f172a` (más coherente con slate-900)
- `surface-dark` cambiado de `#111827` a `#1e293b` (mejor contraste)
- Agregado `surface-dark-2: #334155` para jerarquía visual

#### 3c. Estilos CSS globales para modo oscuro automático
Se agregaron reglas CSS que aplican automáticamente colores oscuros a **todos los componentes** sin necesidad de editar cada archivo individualmente:

- **Tarjetas:** `.dark .bg-white` → `#1e293b`
- **Fondos sutiles:** `.dark .bg-slate-50` → `rgba(30, 41, 59, 0.5)`
- **Bordes:** `.dark .border-slate-100/200` → tonos de `#475569` con opacidad
- **Textos:** `.dark .text-slate-800/900` → `#f1f5f9/#f8fafc`
- **Inputs:** Color de texto y fondo adaptados
- **Sombras:** Más pronunciadas con negro para profundidad
- **Colores de acento:** `bg-blue-50`, `bg-emerald-50`, etc. → versiones con opacidad baja
- **Scrollbar personalizado** para modo oscuro
- **Placeholders** y **select options** con colores apropiados

---

### 4. `components/Layout.tsx` — **Rediseño completo del modo oscuro**

**Antes:** El sidebar siempre era `bg-slate-900` (oscuro fijo), sin diferenciación entre modo claro y oscuro.

**Después:**
- **Sidebar:** `bg-white dark:bg-[#1e293b]` — Claro en modo claro, oscuro elegante en dark mode
- **Bordes del sidebar:** `border-r border-slate-200 dark:border-slate-700/50`
- **Items del menú:** Hover states diferenciados para ambos modos
- **Logo empresa:** `bg-blue-100 dark:bg-slate-700` con bordes adaptados
- **Header principal:** `bg-white/80 dark:bg-[#1e293b]/80` con backdrop-blur
- **Área de contenido:** `bg-slate-50/50 dark:bg-[#0f172a]/50`
- **Notificaciones dropdown:** Colores adaptados con bordes y fondos apropiados
- **Badge de notificaciones:** Borde adaptado `dark:border-slate-800`

---

### 5. `components/Dashboard.tsx` — **Tarjetas con modo oscuro**

- Tarjetas de estadísticas: `dark:bg-[#1e293b]` con bordes y sombras adaptadas
- Sección de auditoría IA: Fondos y textos con variantes dark
- Cards de "Top Producto" y "Próximo Vencimiento": Colores de acento con opacidad
- Panel de inventario: Barras de progreso con fondo `dark:bg-slate-700`

---

## 📁 Archivos Nuevos

### `CHANGELOG_SAAS.md`
Este documento que describe todos los cambios realizados.

---

## 🎨 Paleta de Colores del Modo Oscuro

| Elemento | Color | Hex |
|----------|-------|-----|
| Fondo principal | Slate 950 | `#0f172a` |
| Superficie (tarjetas) | Slate 800 | `#1e293b` |
| Superficie secundaria | Slate 700 | `#334155` |
| Borde principal | Slate 600/50% | `rgba(71, 85, 105, 0.5)` |
| Texto principal | Slate 50 | `#f8fafc` |
| Texto secundario | Slate 400 | `#94a3b8` |
| Texto terciario | Slate 500 | `#64748b` |
| Acento primario | Blue 500 | `#3b82f6` |
| Acento hover | Blue 400 | `#60a5fa` |

---

## 🚀 Instrucciones para el Commit

```bash
# 1. Verificar cambios
git status
git diff

# 2. Agregar archivos modificados
git add src/api/client.ts
git add src/App.tsx
git add index.html
git add components/Layout.tsx
git add components/Dashboard.tsx
git add CHANGELOG_SAAS.md

# 3. Commit con mensaje descriptivo
git commit -m "fix: corregir conexión API y mejorar modo oscuro

- Fix crítico: client.ts fetch('') → fetch(BASE_URL + endpoint)
- Fix: null safety en loadData() para empresa?.features
- Fix: rutas API /products → /api/products, /documents → /api/documents
- Feat: modo oscuro global con CSS automático para todos los componentes
- Feat: Layout rediseñado con sidebar claro/oscuro adaptativo
- Feat: Dashboard con tarjetas adaptadas al modo oscuro
- Feat: Configuración con inputs y secciones dark mode
- Docs: CHANGELOG_SAAS.md con detalle de todos los cambios"

# 4. Push
git push origin <tu-rama>
```

---

## ⚠️ Notas Importantes

1. **El backend debe estar corriendo** en el puerto 3001 para que las peticiones API funcionen. Sin backend, se verán errores de conexión (pero ya no el error 404 del frontend).

2. **Los estilos CSS globales** en `index.html` usan `!important` para sobreescribir las clases de Tailwind. Esto es intencional para cubrir todos los componentes automáticamente sin editar cada archivo.

3. **El modo oscuro se activa** mediante la clase `dark` en `<html>`, controlado por `toggleDarkMode()` en `App.tsx` y guardado en `businessInfo.features.isDarkMode`.

4. **Compatibilidad:** Los cambios son retrocompatibles. El modo claro no se ve afectado por los estilos CSS globales (solo aplican dentro de `.dark`).
