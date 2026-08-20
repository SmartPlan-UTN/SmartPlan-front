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
| ESLint | 9.x | ver `skills/04-quality/` |

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

La dejó armada F19. Así está hoy:

```
src/
├── app/                    rutas (App Router)
│   ├── layout.tsx          html/body, fuente y SesionProvider
│   ├── not-found.tsx       404 de toda la aplicación
│   ├── globals.css
│   ├── (auth)/             login, registro y recuperar contraseña, sin navbar
│   ├── (main)/             pantallas con navbar
│   │   ├── layout.tsx      navbar + contenedor del contenido
│   │   ├── page.tsx        inicio
│   │   ├── explorar/
│   │   └── (private)/      lo que exige sesión: favorites, history,
│   │       └── layout.tsx  profile, preferences. El layout usa ProtectedRoute
│   └── admin/              panel de administración
├── components/
│   ├── ui/                 primitivos del design system
│   ├── layout/             navbar, menú de usuario y contenedores
│   ├── auth/               guardián de rutas
│   └── <dominio>/          componentes por dominio (plan, actividad, coleccion)
├── hooks/                  hooks de React
├── lib/
│   ├── api/                cliente axios y llamadas por módulo
│   ├── auth/               estado de sesión: token, provider y hook
│   ├── utils/              helpers sin dominio
│   └── rutas.ts            mapa de rutas de la aplicación
├── styles/                 tokens del design system
├── test/                   setup y mocks de Vitest
└── types/                  tipos del dominio
```

Cada carpeta con más de un archivo público expone un barrel (`index.ts`) y se
importa desde ahí: `@/components/ui`, `@/components/layout`, `@/components/auth`,
`@/lib/api`, `@/lib/auth`, `@/lib/utils`. No importes los archivos internos.

El alias `@/*` apunta a `./src/*` (definido en `tsconfig.json`). Usalo en lugar de
rutas relativas largas.

## Layout, navegación y sesión

### Dónde va una pantalla nueva

| La pantalla… | Va en | Qué hereda |
|---|---|---|
| es pública | `app/(main)/<ruta>/page.tsx` | navbar y contenedor |
| exige sesión | `app/(main)/(private)/<route>/page.tsx` | navbar, contenedor y `ProtectedRoute` |
| es de sesión (login, registro…) | `app/(auth)/<ruta>/page.tsx` | superficie oscura, sin navbar |
| es de administración | `app/admin/<route>/page.tsx` | navbar y `ProtectedRoute` |

Los paréntesis son [grupos de ruta](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups):
organizan carpetas sin aparecer en la URL. `(main)/(private)/favorites` es
`/favorites`.

**Una pantalla se protege por dónde vive, no por lo que escribe.** Crearla dentro
de `(private)` alcanza: el layout del grupo la envuelve en `ProtectedRoute`.

### Ancho del contenido

El `<main>` **no impone ancho**. Las pantallas que no van a fondo completo se
envuelven en `Container`, que aplica los 1200px de `--max-w` y el aire de
sección:

```tsx
import { Container } from "@/components/layout";

<Container>{/* la pantalla */}</Container>
```

El grupo `(private)` y `admin/` ya lo ponen en su layout, así que sus pantallas
no lo repiten. Las públicas lo eligen: el hero del inicio, con `MoodBackground`
detrás, va a fondo completo, y un contenedor impuesto desde el layout lo dejaría
encajonado.

### Rutas

Las rutas se escriben una sola vez, en [`src/lib/routes.ts`](../../src/lib/routes.ts):

```tsx
import { RUTAS } from "@/lib/rutas";

<Link href={RUTAS.favoritos}>Favoritos</Link>
```

Nunca pongas el string a mano en un `<Link>`: cuando la carpeta se renombra, la
constante rompe la compilación y el string se rompe en silencio.

### Navbar

`Navbar` (en `@/components/layout`) es la barra de 60px (`--navbar-h`) con
`backdrop-filter`, fija arriba. Lleva Inicio, Explorar, Favoritos e Historial, y
el menú de usuario con Mi perfil, Preferencias y Cerrar sesión. Debajo de 900px
los enlaces se pliegan en un panel.

Los destinos salen de `ENLACES_PRINCIPALES` y `ENLACES_USUARIO`
([`enlaces.ts`](../../src/components/layout/enlaces.ts)): para agregar uno, sumá
la entrada ahí, no un `<Link>` suelto en el JSX.

Favoritos e Historial se muestran también sin sesión. Quien entre sin estar
logueado llega a la ruta y el guardián lo manda al login: esconder los enlaces
dejaría la aplicación sin pistas de qué hay detrás de la cuenta.

### Sesión

El estado vive en `SesionProvider`, montado una vez en `app/layout.tsx`. Se lee
con `useSesion()`:

```tsx
"use client";
import { useSesion } from "@/lib/auth";

const { estado, autenticado, iniciarSesion, cerrarSesion } = useSesion();
```

`estado` es `"cargando" | "autenticado" | "anonimo"`. **Contemplá siempre
`cargando`**: el token vive en el navegador, así que en el primer render —el que
se genera en el servidor— todavía no se sabe si hay sesión.

El provider además le enseña al cliente HTTP de dónde sacar el token
(`setTokenGetter`) y cierra la sesión cuando la API responde 401
(`onUnauthorized`). Cuando se implemente CU1, el login solo tiene que llamar a
`iniciarSesion(token)` con el JWT que devuelva el back.

### Rutas protegidas

`ProtectedRoute` muestra el contenido si hay sesión, un estado de espera mientras
se resuelve, y si no hay token reemplaza la ruta por `/login?redirect=<ruta>`.
El destino se valida con `destinoSeguro()` antes de usarlo: sin ese filtro,
`?redirect=https://otro-sitio.com` convertiría el login en un redirector abierto.

> **Es una barrera de navegación, no de seguridad.** El JWT vive en
> `localStorage`, que el servidor no ve: ni `proxy.ts` ni un Server Component
> pueden decidir si hay sesión. Quien autoriza de verdad es el back en cada
> request. Si CU1 decide guardar el token en una cookie `httpOnly`, la
> comprobación se puede mover al servidor sin tocar las pantallas.

Para probar el guardián a mano, mientras el login no exista:

```js
// consola del navegador
localStorage.setItem("smartplan_token", "lo-que-sea"); // entra
localStorage.removeItem("smartplan_token");            // lo expulsa al login
```

### PantallaPendiente

Las pantallas cuyo CU todavía no se implementó usan `PantallaPendiente`: título,
descripción y trazabilidad (`"CU39–CU43 · PAN 12"`). Está para que la navegación
se pueda recorrer entera sin chocar con un 404. **Se borra al implementar la
pantalla**; cuando no quede ninguna, se borra el componente.

## Nombres

| Qué | Convención | Ejemplo |
|---|---|---|
| Componentes | `PascalCase` | `PlanCard.tsx` |
| Hooks | `camelCase` con prefijo `use` | `usePlanes.ts` |
| Carpetas de ruta | `kebab-case` | `app/consultar-plan/` |
| Tipos del dominio | `PascalCase`, en español | `DetallePlan` |

Los nombres del dominio van **en español** (ver `skills/01-domain/`). El código
técnico (hooks, utilidades, props) puede ir en inglés si es más natural.

## Consumo de la API

- Todas las llamadas pasan por el cliente HTTP centralizado en `src/lib/api/` (`import { apiClient } from '@/lib/api'`). **No instancies Axios suelto en componentes o servicios**.
- La URL base se configura dinámicamente mediante `NEXT_PUBLIC_API_URL` (definida en `.env.local`, ver `.env.example`).
- **Autenticación JWT**: El cliente inyecta automáticamente `Authorization: Bearer <token>` cuando hay un token disponible. Por defecto consulta `localStorage` de forma SSR-safe. Se puede registrar un proveedor de token dinámico mediante `setTokenGetter(customGetter)`.
- **Manejo de errores**: Las peticiones fallidas arrojan una instancia de `ApiError` (`import { ApiError } from '@/lib/api'`).
  - `error.es401`: Sesión o token inválido (desencadena automáticamente eventos registrados en `onUnauthorized(cb)`).
  - `error.es403`: Falta de permisos (no borra la sesión).
  - `error.esRed`: Problemas de red o tiempo de espera (timeout).
  - `error.mensaje`: Mensaje descriptivo retornado por el backend o fallback formateado.
- **Toda promesa se maneja.** ESLint tiene `@typescript-eslint/no-floating-promises` en error: una promesa sin `await` ni `.catch()` romperá el build.

```ts
import { apiClient, ApiError } from '@/lib/api';
import type { Plan } from '@/types';

// Ejemplo de consumo en un servicio
export async function obtenerPlan(id: number): Promise<Plan> {
  try {
    return await apiClient.get<Plan>(`/planes/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.es404) {
      // Manejo específico si es necesario
    }
    throw error;
  }
}
```

## Guía visual

El design system completo —paleta, tipografía, espaciado, radios, componentes
primitivos y voz de marca— está en **[`skills/06-design-system/`](../06-design-system/SKILL.md)**.
Leelo antes de escribir cualquier estilo.

Los tokens vigentes están en [`src/styles/tokens.css`](../../src/styles/tokens.css) y
los logos en [`public/brand/`](../../public/brand/).

Resumen de la paleta: `--ember #E85D20` (primario) · `--char #1A1109` (texto y
superficies oscuras) · `--cream #F5F0E8` (fondo) · `--electric #2B5BFF` (IA) ·
`--gold #FFD166` (ratinges).

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
