# Prisma - Base de Datos

Este directorio contiene la configuración de Prisma y scripts para gestionar la base de datos.

## Archivos

- `schema.prisma` - Define el modelo de datos
- `seed.js` - Semilla de datos inicial
- `setup.js` - Script unificado de configuración
- `consultar-datos.js` - Script para consultar datos de la BD

## Scripts Disponibles

### En el directorio `backend/`:

```bash
# Generar el cliente Prisma (necesario antes de cualquier operación)
npm run prisma:generate
# o
npx prisma generate

# Ejecutar migraciones
npm run prisma:migrate
# o
npx prisma migrate deploy

# Configuración completa (genera + migra + seed)
npm run db:setup

# Configuración sin seed (útil si ya tienes datos)
npm run db:setup -- --skip-seed

# Consultar datos de la base
npm run db:consult
# o
node prisma/consultar-datos.js

# Abrir Prisma Studio (interfaz visual)
npm run prisma:studio
# o
npx prisma studio

# Reset de base de datos (borra todo y vuelve a migrar)
npm run prisma:reset
# o
npx prisma migrate reset

# Ejecutar seed manualmente
npm run prisma:seed
# o
node prisma/seed.js
```

## Flujo de Trabajo Recomendado

### Para desarrollo local (primera vez):
```bash
cd backend
npm install
npm run db:setup
```

### Para actualizar el schema:
1. Modificar `schema.prisma`
2. Ejecutar `npm run prisma:migrate:dev` para crear una nueva migración
3. Si hay conflictos, usar `npm run prisma:reset` (cuidado: borra datos)

### Para producción:
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed  # solo si es necesario
```

## Solución de Problemas

### Error: "There are already 10 migrations"
Esto es normal, las migraciones se ejecutan en orden. No es un error.

### Error: "Can't reach database server"
- Verificar que PostgreSQL esté ejecutándose
- Verificar la cadena de conexión en `backend/.env`

### Error: "Database schema is out of sync"
Ejecutar:
```bash
npm run prisma:generate
npm run prisma:migrate
```

### Error en seed duplicado
Los scripts usan `upsert` por lo que son idempotentes. Puedes ejecutarlos múltiples veces sin problemas.
