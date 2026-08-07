# SmartPlan Front — Instrucciones para GitHub Copilot

La fuente de verdad de las convenciones de este repositorio es
[`AGENTS.md`](../AGENTS.md) y la carpeta [`skills/`](../skills/). **Leelos antes
de proponer código.** Lo que sigue es el resumen operativo.

## ⚠️ Next.js 16

Este repositorio usa **Next.js 16.2.3**, con cambios de ruptura respecto de
versiones anteriores. Consultá `node_modules/next/dist/docs/` antes de usar
cualquier API de Next.js. No sugieras `next lint`: fue eliminado en la versión 16.

## Contexto

SmartPlan genera automáticamente planes recreativos personalizados (presupuesto,
ubicación, tiempo, tipo de salida, preferencias). Este repo es el frontend; el
backend es `SmartPlan-back` (NestJS, API REST, JWT).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 5 (`strict`) · Tailwind CSS 4 ·
axios · lucide-react · ESLint 9 · **pnpm** como gestor de paquetes.

## Convenciones

- **Dominio en español.** Las entidades se llaman `plan`, `detalle_plan`,
  `actividad`, `lugar`, `coleccion`, `valoracion`, `retroalimentacion`. En
  TypeScript, `PascalCase`: `DetallePlan`. No traduzcas al inglés.
- Componentes en `PascalCase`, hooks con prefijo `use`, carpetas de ruta en
  `kebab-case`.
- Importá con el alias `@/*` en lugar de rutas relativas largas.
- Las llamadas a la API pasan por el cliente axios centralizado en `src/lib/api/`.
- La URL de la API va en `NEXT_PUBLIC_API_URL`. Nunca hardcodear URLs, tokens ni
  credenciales.

## Reglas de lint que están en error

Copilot no debe sugerir código que las viole:

- `no-floating-promises` — toda promesa se maneja con `await` o `.catch()`.
- `no-explicit-any` — nada de `any`.
- `eqeqeq` — siempre `===` / `!==`.
- `no-var`, `prefer-const`.
- `react-hooks/exhaustive-deps` — dependencias completas en `useEffect`,
  `useMemo` y `useCallback`.
- `@next/next/no-img-element` — usar `<Image>` de `next/image`, nunca `<img>`.
- `@next/next/no-html-link-for-pages` — usar `<Link>` de `next/link` para rutas
  internas.

## Git

`main` y `develop` están protegidas: requieren PR con 2 aprobaciones. Nunca
sugieras commitear directo en esas ramas. Las ramas de trabajo salen de `develop`
y se llaman `SMART-<número>-<descripción>`.

Los mensajes de commit van en español, en imperativo, referenciando el caso de uso:

```
Implementar generación de plan automático (CU17)
```

## Paleta

Primary `#E85D20` · Fondo `#F5F0E8` · Card `#FFFCF5` · Borde `#E2DDD5` ·
IA `#2B5BFF` · Valoraciones `#FFD166` · Éxito `#22C06B` · Error `#F04040`.

Tipografía: Bricolage Grotesque.
