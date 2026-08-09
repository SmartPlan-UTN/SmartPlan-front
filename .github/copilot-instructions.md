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

## Design system

Tokens en `src/styles/tokens.css`, guía completa en `skills/06-design-system/SKILL.md`.

**Nunca sugieras un color hexadecimal escrito a mano.** Usá las variables CSS:
`--ember #E85D20` (primario) · `--char #1A1109` (texto y superficies oscuras) ·
`--cream #F5F0E8` (fondo) · `--surface-card #FFFCF8` (tarjetas, nunca blanco puro) ·
`--electric #2B5BFF` (IA) · `--gold #FFD166` (valoraciones) · `--hairline #E2DDD5` ·
`--success #22C06B` · `--warning #F5A623` · `--error #F04040`.

Tipografía única: **Bricolage Grotesque** (self-hosted en `src/app/fonts/`).
Clases `.sp-display` `.sp-h1` … `.sp-label`.

Radios: botones `10px`, tarjetas `16px`, chips y badges `99px`.
Espaciado en escala de 4 (`--s-1` a `--s-8`).

Iconos: `lucide-react`, siempre de línea, trazo 1.75–2. Sin emoji.

Logos en `public/brand/`: variantes `ink` para fondo claro, `white` para oscuro.

La marca se escribe `smartplan` en minúscula, nunca "SmartPlan", en textos de interfaz.
