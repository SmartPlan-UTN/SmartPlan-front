---
name: smartplan-frontend
description: Next.js 16 frontend conventions — structure, Tailwind 4, visual guide, API consumption. Read before writing any component or page.
---

# SmartPlan Front - Conventions

Specific to `SmartPlan-front`.

## ⚠️ Before writing Next.js code

**This version of Next.js is not the one you know.** The repository uses
Next.js `16.2.3`, which brings breaking changes in APIs, conventions, and
file structure compared to previous versions.

**Read the relevant guide in `node_modules/next/dist/docs/` before writing
code**, and pay attention to deprecation notices. Don't assume APIs from memory.

A concrete example of why it matters: `next lint` **was removed** in Next.js 16.
Static analysis runs directly through the ESLint CLI.

## Stack

| Piece | Version | Note |
|---|---|---|
| Next.js | 16.2.3 | App Router |
| React | 19.2.4 | |
| TypeScript | 5.x | `strict: true` |
| Tailwind CSS | 4.x | via `@tailwindcss/postcss` |
| axios | 1.15.x | API consumption |
| lucide-react | 1.8.x | iconography |
| ESLint | 9.x | see `skills/04-quality/` |

Package manager: **pnpm**. Don't use `npm install` or `yarn` — it would break
the lockfile.

## Commands

```bash
pnpm install      # install dependencies
pnpm dev          # development server
pnpm build        # production build
pnpm lint         # static analysis
pnpm lint:fix     # fix what's auto-fixable
```

## Structure

Set up by F19. This is what it looks like today:

```
src/
├── app/                    routes (App Router)
│   ├── layout.tsx          html/body, font, and SessionProvider
│   ├── not-found.tsx       404 for the whole application
│   ├── globals.css
│   ├── (auth)/             login, signup, and password recovery, no navbar
│   ├── (main)/             screens with a navbar
│   │   ├── layout.tsx      navbar + content container
│   │   ├── page.tsx        home
│   │   ├── explore/
│   │   └── (private)/      what requires a session: favorites, history,
│   │       └── layout.tsx  profile, preferences. The layout uses ProtectedRoute
│   └── admin/              administration panel
├── components/
│   ├── ui/                 design system primitives
│   ├── layout/             navbar, user menu, and containers
│   ├── auth/               route guard
│   └── <domain>/           components by domain (plan, activity, collection)
├── hooks/                  React hooks
├── lib/
│   ├── api/                axios client and per-module calls
│   ├── auth/               session state: token, provider, and hook
│   ├── utils/               domain-agnostic helpers
│   └── routes.ts           application route map
├── styles/                 design system tokens
├── test/                   Vitest setup and mocks
└── types/                  domain types
```

Every folder with more than one public file exposes a barrel (`index.ts`) and
is imported from there: `@/components/ui`, `@/components/layout`,
`@/components/auth`, `@/lib/api`, `@/lib/auth`, `@/lib/utils`. Don't import
the internal files.

The `@/*` alias points to `./src/*` (defined in `tsconfig.json`). Use it
instead of long relative paths.

## Layout, navigation, and session

### Where a new screen goes

| The screen... | Goes in | Inherits |
|---|---|---|
| is public | `app/(main)/<route>/page.tsx` | navbar and container |
| requires a session | `app/(main)/(private)/<route>/page.tsx` | navbar, container, and `ProtectedRoute` |
| is a session screen (login, signup...) | `app/(auth)/<route>/page.tsx` | dark surface, no navbar |
| is an admin screen | `app/admin/<route>/page.tsx` | navbar and `ProtectedRoute` |

The parentheses are [route groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups):
they organize folders without appearing in the URL. `(main)/(private)/favorites`
is `/favorites`.

**A screen is protected by where it lives, not by what it writes.** Creating
it inside `(private)` is enough: the group's layout wraps it in `ProtectedRoute`.

### Content width

The `<main>` **does not constrain width**. Screens that don't go full-bleed
wrap themselves in `Container`, which applies the 1200px `--max-w` and the
section's vertical spacing:

```tsx
import { Container } from "@/components/layout";

<Container>{/* the screen */}</Container>
```

The `(private)` group and `admin/` already set it in their layout, so their
screens don't repeat it. Public screens opt in: the home hero, with
`MoodBackground` behind it, goes full-bleed, and a container imposed from
the layout would box it in.

### Routes

Routes are written once, in [`src/lib/routes.ts`](../../src/lib/routes.ts):

```tsx
import { ROUTES } from "@/lib/routes";

<Link href={ROUTES.favorites}>Favoritos</Link>
```

Never hand-write the string in a `<Link>`: when the folder is renamed, the
constant breaks the build and the string breaks silently.

### Navbar

`Navbar` (in `@/components/layout`) is the 60px bar (`--navbar-h`) with
`backdrop-filter`, fixed at the top. It carries Inicio, Explorar, Favoritos,
and Historial, plus the user menu with Mi perfil, Preferencias, and Cerrar
sesión. Below 900px the links collapse into a panel.

**The navbar's inner row is not capped at `Container`'s `--max-w`.** Unlike
every screen's content, `.navbarInner` spans the full window width (48px
side padding above 900px) to match `SmartPlanSystemDesign/v2/Navbar.jsx` —
see the note in `skills/06-design-system/SKILL.md`'s Layout section before
"fixing" it to look consistent with the boxed content below it.

Destinations come from `MAIN_LINKS` and `USER_LINKS`
([`links.ts`](../../src/components/layout/links.ts)): to add one, add the
entry there, not a loose `<Link>` in the JSX.

Favoritos and Historial are also shown without a session. Someone who enters
without being logged in lands on the route and the guard sends them to
login: hiding the links would leave the application with no hints about
what's behind the account.

### Session

The state lives in `SessionProvider`, mounted once in `app/layout.tsx`.
It's read with `useSession()`:

```tsx
"use client";
import { useSession } from "@/lib/auth";

const { status, authenticated, login, logout } = useSession();
```

`status` is `"loading" | "authenticated" | "anonymous"`. **Always account
for `loading`**: the token lives in the browser, so on the first render —the
one generated on the server— it's not yet known whether there's a session.

The provider also tells the HTTP client where to get the token from
(`setTokenGetter`) and closes the session when the API responds with 401
(`onUnauthorized`). Once CU1 is implemented, login only needs to call
`login(token)` with the JWT the backend returns.

### Protected routes

`ProtectedRoute` shows the content when there's a session, a waiting state
while it resolves, and if there's no token it replaces the route with
`/login?redirect=<route>`. The destination is validated with
`safeDestination()` before use: without that filter,
`?redirect=https://other-site.com` would turn login into an open redirector.

> **It's a navigation barrier, not a security one.** The JWT lives in
> `localStorage`, which the server can't see: neither `proxy.ts` nor a
> Server Component can decide whether there's a session. What actually
> authorizes is the backend on every request. If CU1 decides to store the
> token in an `httpOnly` cookie, this check can move to the server without
> touching the screens.

To test the guard by hand, while login doesn't exist yet:

```js
// browser console
localStorage.setItem("smartplan_token", "anything"); // gets you in
localStorage.removeItem("smartplan_token");           // kicks you to login
```

### PendingScreen

Screens whose CU hasn't been implemented yet use `PendingScreen`: title,
description, and traceability (`"CU39–CU43 · PAN 12"`). It exists so the
navigation can be fully exercised without hitting a 404. **It gets removed
once the screen is implemented**; once none remain, the component is removed.

## Names

| What | Convention | Example |
|---|---|---|
| Components | `PascalCase` | `PlanCard.tsx` |
| Hooks | `camelCase` with a `use` prefix | `usePlans.ts` |
| Route folders | `kebab-case` | `app/view-plan/` |
| Domain types | `PascalCase`, in English | `PlanDetail` |

Domain names are **in English** (see `skills/01-domain/`), same as the rest
of the technical code (hooks, utilities, props).

## API consumption

- All calls go through the centralized HTTP client in `src/lib/api/` (`import { apiClient } from '@/lib/api'`). **Don't instantiate a loose Axios in components or services**.
- The base URL is configured dynamically through `NEXT_PUBLIC_API_URL` (defined in `.env.local`, see `.env.example`).
- **JWT authentication**: the client automatically injects `Authorization: Bearer <token>` when a token is available. By default it reads `localStorage` in an SSR-safe way. A dynamic token provider can be registered with `setTokenGetter(customGetter)`.
- **Error handling**: failed requests throw an `ApiError` instance (`import { ApiError } from '@/lib/api'`).
  - `error.isUnauthorized`: invalid or missing session token (automatically triggers events registered with `onUnauthorized(cb)`).
  - `error.isForbidden`: insufficient permissions (does not clear the session).
  - `error.isNetworkError`: network problems or a timeout.
  - `error.message`: descriptive message returned by the backend (the backend's `message` field) or a formatted fallback.
- **Every promise is handled.** ESLint has `@typescript-eslint/no-floating-promises` set to error: a promise without `await` or `.catch()` will break the build.

```ts
import { apiClient, ApiError } from '@/lib/api';
import type { Plan } from '@/types';

// Example usage in a service
export async function getPlan(id: number): Promise<Plan> {
  try {
    return await apiClient.get<Plan>(`/plans/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      // Specific handling if needed
    }
    throw error;
  }
}
```

## Visual guide

The complete design system —palette, typography, spacing, radii, primitive
components, and brand voice— is in
**[`skills/06-design-system/`](../06-design-system/SKILL.md)**. Read it
before writing any style.

The current tokens are in
[`src/styles/tokens.css`](../../src/styles/tokens.css) and the logos in
[`public/brand/`](../../public/brand/).

Palette summary: `--ember #E85D20` (primary) · `--char #1A1109` (text and
dark surfaces) · `--cream #F5F0E8` (background) · `--electric #2B5BFF` (AI) ·
`--gold #FFD166` (ratings).

**Never hand-write a hex value**: use the CSS variable.

## Accessibility and performance

These rules are active as **errors** in ESLint, not suggestions:

- Use `<Image>` from `next/image`, never `<img>` (affects LCP).
- Use `<Link>` from `next/link` for internal routes, never `<a>` (avoids a full reload).
- `useEffect` / `useMemo` / `useCallback` dependencies must be complete.
