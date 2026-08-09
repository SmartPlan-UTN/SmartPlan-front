---
name: smartplan-frontend
description: Convenciones del frontend Next.js 16 — estructura, Tailwind 4, guía visual, consumo de la API. Leer antes de escribir cualquier componente o página.
---

# SmartPlan Front — Convenciones

Específico de `SmartPlan-front`.

## ⚠️ Antes de escribir código de Next.js

**Esta versión de Next.js no es la que conocés.** El repositorio usa Next.js
`16.2.3`, que trae cambios de ruptura en APIs, convenciones y estructura de
archivos respecto de versiones anteriores.

**Leé la guía correspondiente en `node_modules/next/dist/docs/` antes de escribir
código**, y prestá atención a los avisos de deprecación. No asumas APIs de memoria.

Un ejemplo concreto de por qué importa: `next lint` **fue eliminado** en Next.js 16.
El análisis estático se ejecuta con la CLI de ESLint directamente.

## Stack

| Pieza | Versión | Nota |
|---|---|---|
| Next.js | 16.2.3 | App Router |
| React | 19.2.4 | |
| TypeScript | 5.x | `strict: true` |
| Tailwind CSS | 4.x | vía `@tailwindcss/postcss` |
| axios | 1.15.x | consumo de la API |
| lucide-react | 1.8.x | iconografía |
| ESLint | 9.x | ver `skills/04-calidad/` |

Gestor de paquetes: **pnpm**. No uses `npm install` ni `yarn` — romperías el
lockfile.

## Comandos

```bash
pnpm install      # instalar dependencias
pnpm dev          # servidor de desarrollo
pnpm build        # build de producción
pnpm lint         # análisis estático
pnpm lint:fix     # corrige lo autocorregible
```

## Estructura

```
src/
└── app/          App Router de Next.js
    ├── layout.tsx
    ├── page.tsx
    └── globals.css
```

Está en scaffold. Al crecer, la estructura propuesta:

```
src/
├── app/                    rutas (App Router)
│   ├── (auth)/             login, registro, recuperar contraseña
│   ├── (main)/             home, búsqueda, planes, favoritos, perfil
│   └── admin/              panel de administración
├── components/             componentes reutilizables
│   ├── ui/                 primitivos (botón, card, badge, input)
│   └── <dominio>/          componentes por dominio (plan, actividad, coleccion)
├── lib/
│   ├── api/                cliente axios y llamadas por módulo
│   └── utils/              helpers
├── hooks/                  hooks de React
└── types/                  tipos compartidos del dominio
```

El alias `@/*` apunta a `./src/*` (definido en `tsconfig.json`). Usalo en lugar de
rutas relativas largas.

## Nombres

| Qué | Convención | Ejemplo |
|---|---|---|
| Componentes | `PascalCase` | `PlanCard.tsx` |
| Hooks | `camelCase` con prefijo `use` | `usePlanes.ts` |
| Carpetas de ruta | `kebab-case` | `app/consultar-plan/` |
| Tipos del dominio | `PascalCase`, en español | `DetallePlan` |

Los nombres del dominio van **en español** (ver `skills/01-dominio/`). El código
técnico (hooks, utilidades, props) puede ir en inglés si es más natural.

## Consumo de la API

- Todas las llamadas pasan por un cliente axios centralizado en `src/lib/api/`.
  No instancies axios suelto en los componentes.
- La URL base va en variable de entorno (`NEXT_PUBLIC_API_URL`), nunca hardcodeada.
- Autenticación por **JWT**: el token va en el header `Authorization: Bearer <token>`.
- **Toda promesa se maneja.** ESLint tiene `no-floating-promises` en error: una
  promesa sin `await` ni `.catch()` hace que el error se pierda en silencio y la
  UI quede inconsistente.

## Guía visual

El design system completo —paleta, tipografía, espaciado, radios, componentes
primitivos y voz de marca— está en **[`skills/06-design-system/`](../06-design-system/SKILL.md)**.
Leelo antes de escribir cualquier estilo.

Los tokens vigentes están en [`src/styles/tokens.css`](../../src/styles/tokens.css) y
los logos en [`public/brand/`](../../public/brand/).

Resumen de la paleta: `--ember #E85D20` (primario) · `--char #1A1109` (texto y
superficies oscuras) · `--cream #F5F0E8` (fondo) · `--electric #2B5BFF` (IA) ·
`--gold #FFD166` (valoraciones).

**Nunca escribas un hex a mano**: usá la variable CSS.

> **Discrepancia pendiente:** `src/app/layout.tsx` todavía carga **Geist** y
> **Geist Mono**, que vienen del template de `create-next-app`. El design system
> define **Bricolage Grotesque**, ya self-hosted en `src/app/fonts/`. Falta
> cablearlo con `next/font/local`.

## Accesibilidad y rendimiento

Estas reglas están activas como **error** en ESLint, no son sugerencias:

- Usá `<Image>` de `next/image`, nunca `<img>` (afecta el LCP).
- Usá `<Link>` de `next/link` para rutas internas, nunca `<a>` (evita full reload).
- Las dependencias de `useEffect` / `useMemo` / `useCallback` deben estar completas.
