# Reglas del Agente para Diseño Responsive Web (Tailwind CSS)

Estas directrices aseguran que todos los desarrollos de la interfaz web en React + Vite + Tailwind CSS sean responsivos, fluidos y de calidad premium en dispositivos móviles, tablets y escritorios.

## 1. Grid y Flexbox Responsivos
- **Móvil Primero**: Diseñar primero para móvil (flujo vertical simple) y aplicar breakpoints de Tailwind (`md:`, `lg:`, `xl:`) para layouts de múltiples columnas.
- **Flex Wrap**: Siempre que se use `flex` horizontal en botones, badges o menús, utilizar `flex-wrap gap-x` para que los elementos se auto-ajusten en pantallas pequeñas en vez de salirse del contenedor.

## 2. Tablas de Datos
- Las tablas con muchos datos siempre deben estar envueltas en un contenedor con `overflow-x-auto` (ej. `<div className="w-full overflow-x-auto"><table ...>...</table></div>`) para evitar que ensanchen el layout de la página en dispositivos móviles.

## 3. Sidebar y Navegación
- En pantallas móviles y tablets (menores a `lg`), el menú lateral principal (Sidebar) debe ocultarse automáticamente y abrirse como un cajón superpuesto (Drawer) o menú hamburguesa para maximizar el área de trabajo del usuario.

## 4. Modales (`Modal.tsx`)
- Todos los modales deben usar anchos relativos adaptables (ej. `w-full max-w-lg`) junto con paddings reducidos en móvil (`p-4` en móvil vs `p-6` en desktop) y límites de altura con scroll interno (`max-h-[90vh] overflow-y-auto`).

## 5. Tipografía y Espaciados
- Usar tamaños de texto adaptativos (ej. `text-lg sm:text-xl lg:text-2xl`) y evitar márgenes/paddings gigantescos en pantallas móviles que reduzcan el espacio útil.
