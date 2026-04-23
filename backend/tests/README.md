# 🧪 Sistema de Pruebas - Ecuafact

Este directorio contiene las pruebas automatizadas del sistema de facturación electrónica, organizadas en tres categorías: **Caja Negra**, **Caja Blanca** y **Caja Gris**.

## 📁 Estructura de Pruebas

```
tests/
├── setup.js                    # Configuración global de pruebas
├── black-box/                  # Pruebas de Caja Negra
│   └── auth.blackbox.test.js  # Pruebas de autenticación y API
├── white-box/                  # Pruebas de Caja Blanca
│   └── validation.whitebox.test.js # Pruebas de funciones y lógica
└── grey-box/                   # Pruebas de Caja Gris
    └── integration.greybox.test.js # Pruebas de integración
```

---

## 🟦 Pruebas de Caja Negra (Black Box Testing)

### Descripción
Las pruebas de caja negra verifican el comportamiento del sistema **SIN conocer la implementación interna**. Se centran en las entradas y salidas de la API, tratando el sistema como una "caja negra".

### Objetivos
- ✅ Detectar errores de funcionalidad
- ✅ Verificar requisitos faltantes
- ✅ Detectar comportamientos inesperados
- ✅ Validar flujos de usuario

### Casos de Prueba Incluidos (27 tests)

| ID | Módulo | Descripción |
|----|--------|-------------|
| TC-BB-001 | Auth | Login exitoso con credenciales válidas |
| TC-BB-002 | Auth | Login fallido con contraseña incorrecta |
| TC-BB-003 | Auth | Login fallido con email inexistente |
| TC-BB-004 | Auth | Login fallido con campos vacíos |
| TC-BB-005 | Auth | Login sin body |
| TC-BB-006 | Auth | Registro exitoso |
| TC-BB-007 | Auth | Registro con email duplicado |
| TC-BB-008 | Auth | Registro con RUC inválido |
| TC-BB-009 | Auth | Verificación de token válido |
| TC-BB-010 | Auth | Verificación de token inválido |
| TC-BB-011 | Auth | Verificación sin token |
| TC-BB-012 | Business | Listar usuarios autenticado |
| TC-BB-013 | Business | Listar usuarios sin auth |
| TC-BB-014 | Business | Crear usuario válido |
| TC-BB-015 | Business | Crear usuario duplicado |
| TC-BB-016 | Invoices | Crear factura válida |
| TC-BB-017 | Invoices | Crear factura sin items |
| TC-BB-018 | Invoices | Listar facturas |
| TC-BB-019 | Retentions | Listar retenciones |
| TC-BB-020 | Credit Notes | Listar notas de crédito |
| TC-BB-021 | Clients | Listar clientes |
| TC-BB-022 | Clients | Crear cliente válido |
| TC-BB-023 | Clients | Crear cliente duplicado |
| TC-BB-024 | Products | Listar productos |
| TC-BB-025 | Products | Crear producto válido |
| TC-BB-026 | Products | Crear producto sin stock |
| TC-BB-027 | SRI | Verificar conexión SRI |

### Ejecutar Pruebas de Caja Negra
```bash
npm run test:blackbox
```

---

## 🟩 Pruebas de Caja Blanca (White Box Testing)

### Descripción
Las pruebas de caja blanca verifican la **IMPLEMENTACIÓN INTERNA** del código. Se centran en la lógica de funciones, cobertura de código, condiciones y caminos de ejecución.

### Objetivos
- ✅ Detectar errores lógicos
- ✅ Verificar cobertura de código
- ✅ Probar condiciones extremas
- ✅ Validar algoritmos y cálculos

### Casos de Prueba Incluidos (43 tests)

| ID | Módulo | Descripción |
|----|--------|-------------|
| TC-WB-001 | RUC | Validar RUC persona natural válido |
| TC-WB-002 | RUC | Rechazar RUC longitud incorrecta |
| TC-WB-003 | RUC | Rechazar RUC con letras |
| TC-WB-004 | RUC | Rechazar RUC provincia inválida |
| TC-WB-005 | RUC | Rechazar RUC establecimiento 000 |
| TC-WB-006 | RUC | Validar RUC sociedad |
| TC-WB-007 | RUC | Rechazar RUC vacío |
| TC-WB-008 | RUC | Rechazar RUC null |
| TC-WB-009 | CI | Validar CI de 10 dígitos |
| TC-WB-010 | CI | Rechazar CI longitud incorrecta |
| TC-WB-011 | CI | Rechazar CI con letras |
| TC-WB-012 | CI | Rechazar CI provincia inválida |
| TC-WB-013 | Email | Validar emails correcta |
| TC-WB-014 | Email | Rechazar emails incorrectas |
| TC-WB-015 | Phone | Validar teléfonos Ecuador |
| TC-WB-016 | Phone | Rechazar teléfonos inválidos |
| TC-WB-017 | Date | Validar fechas formato correcto |
| TC-WB-018 | Date | Rechazar fechas formato incorrecto |
| TC-WB-019 | Date | Detectar fechas futuras |
| TC-WB-020 | Amount | Validar montos positivos |
| TC-WB-021 | Amount | Rechazar monto cero/negativo |
| TC-WB-022 | Amount | Precisión decimal |
| TC-WB-023 | Tax | Calcular IVA 12% |
| TC-WB-024 | Tax | Calcular ICE |
| TC-WB-025 | Tax | Total con múltiples impuestos |
| TC-WB-026 | Retention | Calcular retención IVA |
| TC-WB-027 | Retention | Calcular retención renta |
| TC-WB-028 | Sequence | Incrementar secuenciales |
| TC-WB-029 | Sequence | Formato con ceros |
| TC-WB-030 | Error | Capturar errores try-catch |
| TC-WB-031 | Error | Manejar promesas rechazadas |
| TC-WB-032 | Error | Ejecutar bloque finally |
| TC-WB-033 | JWT | Validar token JWT |
| TC-WB-034 | JWT | Rechazar token expirado |
| TC-WB-035 | JWT | Rechazar token firma inválida |
| TC-WB-036 | Security | Encriptar contraseña bcrypt |
| TC-WB-037 | Security | Verificar contraseña |
| TC-WB-038 | Security | Rechazar contraseña incorrecta |
| TC-WB-039 | Security | Sanitizar entrada XSS |
| TC-WB-040 | Security | Validar longitud entrada |
| TC-WB-041 | DB | Conectar Prisma Client |
| TC-WB-042 | DB | Acceder modelo usuario |
| TC-WB-043 | DB | Acceder modelo empresa |

### Ejecutar Pruebas de Caja Blanca
```bash
npm run test:whitebox
```

---

## 🟫 Pruebas de Caja Gris (Grey Box Testing)

### Descripción
Las pruebas de caja gris combinan el **conocimiento PARCIAL** del sistema. Tienen acceso a la base de datos y estructura interna, pero probando desde la perspectiva del usuario.

### Objetivos
- ✅ Detectar errores de integración
- ✅ Verificar flujos de trabajo completos
- ✅ Probar relaciones de base de datos
- ✅ Validar aislamiento entre empresas

### Casos de Prueba Incluidos (12 tests)

| ID | Módulo | Descripción |
|----|--------|-------------|
| TC-GG-001 | Integration | Flujo completo crear cliente + verificar DB |
| TC-GG-002 | Integration | Flujo crear producto + inventario DB |
| TC-GG-003 | Integration | Verificar incremento de secuenciales |
| TC-GG-004 | Auth DB | Verificar usuario existe en DB |
| TC-GG-005 | Auth DB | Verificar contraseñas hasheadas |
| TC-GG-006 | Integrity | Verificar usuarios tienen negocio |
| TC-GG-007 | Integrity | Verificar clientes tienen negocio |
| TC-GG-008 | Invoice | Flujo factura + actualizar kardex |
| TC-GG-009 | Transaction | Verificar integridad transacciones |
| TC-GG-010 | Security | Aislamiento datos entre empresas |
| TC-GG-011 | Security | Validar roles de usuario |
| TC-GG-012 | Security | Verificar usuarios inactivos no login |
| TC-GG-013 | Performance | Tiempos de respuesta < 2s |
| TC-GG-014 | Performance | Solicitudes concurrentes |
| TC-GG-015 | Schema | Verificar timestamps en tablas |
| TC-GG-016 | Schema | Integridad datos empresa |
| TC-GG-017 | Recovery | Endpoint inexistente |
| TC-GG-018 | Recovery | Método HTTP incorrecto |

### Ejecutar Pruebas de Caja Gris
```bash
npm run test:greybox
```

---

## 🚀 Ejecutar Todas las Pruebas

```bash
# Todas las pruebas
npm test

# Modo watch (desarrollo)
npm run test:watch

# Con cobertura de código
npm run test:coverage
```

---

## ⚙️ Configuración

### Variables de Entorno
Las pruebas requieren las siguientes variables de entorno:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/database
API_URL=http://localhost:3001
JWT_SECRET=your_secret_key
```

### Requisitos
- Node.js 18+
- Base de datos PostgreSQL
- Servidor backend ejecutándose

---

## 📊 Resumen de Cobertura

| Tipo de Prueba | Cantidad de Tests | Propósito |
|----------------|-------------------|-----------|
| Caja Negra | 27 | Funcionalidad externa |
| Caja Blanca | 43 | Lógica interna |
| Caja Gris | 18 | Integración |
| **TOTAL** | **88** | **Cobertura completa** |

---

## 🎯 Recomendaciones

1. **Ejecutar pruebas de caja blanca** durante el desarrollo de nuevas funciones
2. **Ejecutar pruebas de caja negra** para verificación de aceptación
3. **Ejecutar pruebas de caja gris** antes de cada release
4. **Ejecutar todas las pruebas** en el pipeline de CI/CD

---

## 📝 Notas

- Las pruebas de caja negra y gris requieren que el servidor esté ejecutándose
- Las pruebas de caja blanca pueden ejecutarse de forma independiente
- Algunos tests pueden saltarse si no hay datos de prueba disponibles
- Limpiar la base de datos después de ejecutar pruebas de integración
