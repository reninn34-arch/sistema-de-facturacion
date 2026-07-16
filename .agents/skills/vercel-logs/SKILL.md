---
name: vercel-logs
description: >
  Ver logs en tiempo real de cualquier proyecto Vercel desplegado. 
  Útil para depurar errores en producción, ver requests al backend, 
  y monitorear el comportamiento del servidor sin abrir el dashboard.
---

# Ver Logs en Tiempo Real de Vercel

## Uso básico

Para ver los logs en vivo de un proyecto Vercel, corre este comando en la terminal:

```powershell
# En Windows siempre usar con ExecutionPolicy Bypass:
powershell -ExecutionPolicy Bypass -Command "npx vercel logs <url-del-proyecto> --follow"
```

## Proyectos del workspace

| Proyecto | Comando |
|----------|---------|
| **Clone System** | `npx vercel logs clone-system.vercel.app --follow` |
| **Sistema Principal** | (no desplegado en Vercel aún) |

## Flags útiles

| Flag | Descripción |
|------|-------------|
| `--follow` | Streaming en tiempo real (como `tail -f`) |
| `-n <N>` | Ver últimas N líneas (sin `--follow`) |
| `--output raw` | Salida sin formatear, útil para grep |

## Ejemplos

```powershell
# Logs en vivo del clon
npx vercel logs clone-system.vercel.app --follow

# Últimas 50 líneas (sin streaming)
npx vercel logs clone-system.vercel.app -n 50

# Filtrar errores con grep
npx vercel logs clone-system.vercel.app -n 100 | Select-String "error"

# Ver logs y guardarlos en archivo
npx vercel logs clone-system.vercel.app -n 200 | Out-File "logs.txt"
```

## Desbloquear usuarios bloqueados (login rate-limit)

Si un usuario queda bloqueado por intentos fallidos, correr en `d:\clone-system`:

```powershell
node unlock-users.cjs
```

Ese script conecta directamente a la BD Neon y limpia `failedLoginAttempts` y `lockedUntil` para todos los usuarios.

## Notas

- El flag `--follow` se cancela con `Ctrl+C`
- Los logs muestran requests HTTP, errores de Node.js y console.log del backend
- Para logs más avanzados con UI, considera conectar **Axiom** en Vercel → Settings → Log Drains (gratis)
- El directorio de trabajo debe tener acceso al CLI de Vercel (`npx vercel`)
