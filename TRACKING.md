# TRACKING — SmartPlan Front

Repository progress status. It is the project's memory between sessions:
anyone arriving here (person or AI agent) should be able to resume without
rereading the entire git history.

---

## How to update this file

**Update it when you finish a task, not when you start it.**

1. Find the row for the CU or task you worked on.
2. Change the **Status** according to the table below.
3. Fill in **Branch** and **PR**.
4. If you made a non-obvious technical decision, add it to
   [Decisions](#decisions).
5. Add a line to the [Log](#log) with the date.

### Statuses

| Status | Meaning |
|---|---|
| `Not started` | No one has taken it yet |
| `In progress` | There's an open branch with real work |
| `In review` | Open PR, waiting on the 2 approvals |
| `Completed` | Merged into `develop` |
| `Blocked` | Can't move forward; the reason goes in Notes |

### Rules

- A CU only moves to `Completed` when the PR is **merged**, not when it's opened.
- If a CU needs the backend, the frontend row isn't marked `Completed` until
  the endpoint exists and is integrated.
- Don't delete rows. If something is dropped, mark it `Blocked` and explain why.
- Dates in `YYYY-MM-DD` format.

---

## Global status

| | |
|---|---|
| **Phase** | Foundations — layout and navigation ready, no use cases implemented |
| **Base branch** | `develop` |
| **Last update** | 2026-08-18 |
| **Completed use cases** | 0 / 62 |

---

## Infrastructure and configuration

| Task | Status | Branch | PR | Notes |
|---|---|---|---|---|
| Initial repository (create-next-app) | `Completed` | — | — | Next.js 16.2.3, React 19, Tailwind 4 |
| `main` and `develop` branch protection | `Completed` | — | — | Required PR + 2 approvals |
| Static analysis with ESLint | `In review` | `feature/eslint-analisis-estatico` | — | Commented config + `lint` / `lint:fix` scripts |
| Skills and conventions for AI agents | `In progress` | `docs/skills-agentes-ia` | — | This file and the `skills/` folder |
| [F21] Definition of Done and issue/PR templates | `In review` | `SMART-f21-definition-of-done-y-plantillas-de-issue-y-pr` | #73 | DoD in `skills/02-git-flow/`, templates in `.github/`. Still needs to replicate the shared core in `SmartPlan-back` |
| Design system assets in the repo | `In progress` | `docs/skills-agentes-ia` | — | Logos, font, `tokens.css`, and sample images |
| [F14] Wire up Bricolage Grotesque | `Completed` | `SmartPlan_AlvaroAriza_FrontEnd` | #74 | Loaded with `next/font/local` in `layout.tsx` and mapped to `--font-sans` in `globals.css`. Geist and Geist Mono removed |
| [F15] Import `tokens.css` in `globals.css` | `In progress` | `SmartPlan_AlvaroAriza_dv` | — | Exposed to Tailwind 4 via `@theme inline` (colors and radii). Removed the standalone `@font-face` from `tokens.css` and `--font` now uses `var(--font-bricolage-grotesque)`. `page.tsx` (the only existing component) was migrated to the new utilities, with no hex values or default Tailwind colors |
| [F20] Frontend testing: configuration and examples | `In review` | `SMART-f20-testing-del-frontend-configuracion-y-ejemplos` | #77 | Vitest + React Testing Library; templates for Button and useToggle; CI with lint, test, and build. Raises the Node floor to 24 |
| [F18] Domain types in TypeScript | `In review` | `feature/f18-tipos-dominio` | #68 | Foundation of the 37 domain types in `src/types/`, aligned with the backend's TypeORM |
| Port the primitives to React + TS | `Not started` | — | — | Button, Chip, Badge, and Card from `Primitives.jsx` |
| [F16] Port the 7 primitives to React + TS | `In review` | `SMART-f16-primitivos-design-system` | #76 | Icon, Button, Chip, Badge, Stars, Logo, and Divider typed, based on EMBER v2 |
| [F17] Centralized axios client (`src/lib/api/`) | `Completed` | `Smart-f17-cliente-axios-centralizado-con-interceptor-de-jwt` | — | With a JWT interceptor, TokenGetter abstraction, ApiError normalization, and pub/sub 401 handling |
| [F17] Environment variables (`NEXT_PUBLIC_API_URL`) | `Completed` | `Smart-f17-cliente-axios-centralizado-con-interceptor-de-jwt` | — | `.env.example` template added and dynamic integration in `config.ts` |
| [F19] Folder structure, base layout, and navbar | `Completed` | `SMART-f19-estructura-de-carpetas-layout-base-y-navbar` | #80 | `(auth)`, `(main)`, and `(private)` groups in `src/app/`, 60px navbar with `backdrop-filter`, user menu, route map in `src/lib/routes.ts`, session in `src/lib/auth/`, and `ProtectedRoute` guard. Screens are placeholders until each CU is implemented. Status corrected 2026-08-22: the branch's tip was already an ancestor of `develop` (merged via PR #80), the row had just never been updated |
| Align Navbar with the SmartPlanSystemDesign prototype | `In progress` | `feature/navbar-alineado-al-diseno` | — | F19 shipped from the written design-system skill only, without access to the actual `SmartPlanSystemDesign/v2/Navbar.jsx` prototype file. Once that file was located, fixed: centered nav links, dot-style active indicator, circular avatar trigger, and a confirmation dialog before logging out |

---

## Use cases

The system's 62 CUs. The **Screen** column comes from the document's
traceability matrix (`skills/01-domain/`).

### Authentication and access control

| CU | Feature | Screen | Status | Branch | PR |
|---|---|---|---|---|---|
| CU1 | Log in | — | `Not started` | | |
| CU2 | Register user | — | `Not started` | | |
| CU3 | Recover password | — | `Not started` | | |
| CU4 | Log out | — | `Not started` | | |

### User management

| CU | Feature | Screen | Status | Branch | PR |
|---|---|---|---|---|---|
| CU5 | Edit profile | PAN 14 | `Not started` | | |
| CU6 | Change password | — | `Not started` | | |
| CU7 | Delete account | PAN 14 | `Not started` | | |
| CU8 | Edit preferences | PAN 15 | `Not started` | | |

### Search and discovery

| CU | Feature | Screen | Status | Branch | PR |
|---|---|---|---|---|---|
| CU9 | Search activities | PAN 11 | `In progress` | `SMART-21-cu9-buscar-actividades` | |
| CU10 | Filter results | PAN 11 | `Not started` | | |
| CU11 | Sort results | PAN 11 | `Not started` | | |
| CU12 | Search plans | PAN 10, PAN 11 | `Not started` | | |
| CU13 | View plan | PAN 17 | `Not started` | | |
| CU14 | View activity | PAN 18 | `Not started` | | |
| CU15 | Save activity | PAN 18, PAN 12 | `Not started` | | |
| CU16 | View activities on a map | PAN 08 | `Not started` | | |

### Recommendation

| CU | Feature | Screen | Status | Branch | PR |
|---|---|---|---|---|---|
| CU17 | Generate automatic plan | PAN 07 | `Not started` | | |
| CU18 | Customize user preferences | PAN 15 | `Not started` | | |
| CU19 | Generate surprise plan | PAN 09 | `Not started` | | |
| CU20 | Show recommendations | PAN 10 | `Not started` | | |
| CU21 | Adjust recommendations based on history | — | `Not started` | | |
| CU22 | Select plan | PAN 11, PAN 17 | `Not started` | | |
| CU23 | Submit plan feedback | PAN 13, PAN 17 | `Not started` | | |

### Planning

| CU | Feature | Screen | Status | Branch | PR |
|---|---|---|---|---|---|
| CU24 | Create plan | — | `Not started` | | |
| CU25 | Edit plan | PAN 17 | `Not started` | | |
| CU26 | Delete plan | PAN 17 | `Not started` | | |
| CU27 | Add activity to plan | PAN 17, PAN 18 | `Not started` | | |
| CU28 | Remove activity from plan | PAN 17 | `Not started` | | |
| CU29 | View plan | PAN 17 | `Not started` | | |
| CU30 | Calculate plan cost | PAN 17 | `Not started` | | |
| CU31 | Generate suggested plan | — | `Not started` | | |

### Collections

| CU | Feature | Screen | Status | Branch | PR |
|---|---|---|---|---|---|
| CU32 | Create collection | — | `Not started` | | |
| CU33 | Edit collection | — | `Not started` | | |
| CU34 | Delete collection | — | `Not started` | | |
| CU35 | Add activity to collection | PAN 18 | `Not started` | | |
| CU36 | Remove activity from collection | — | `Not started` | | |
| CU37 | View collection details | — | `Not started` | | |
| CU38 | View collection | — | `Not started` | | |

### Favorites

| CU | Feature | Screen | Status | Branch | PR |
|---|---|---|---|---|---|
| CU39 | View saved activities | PAN 12 | `Not started` | | |
| CU40 | View saved plans | PAN 12 | `Not started` | | |
| CU41 | Remove saved activity | PAN 12 | `Not started` | | |
| CU42 | Remove saved plan | PAN 12 | `Not started` | | |
| CU43 | Save favorite plan | PAN 11, PAN 12, PAN 17 | `Not started` | | |

### Ratings

| CU | Feature | Screen | Status | Branch | PR |
|---|---|---|---|---|---|
| CU44 | Rate activity | PAN 18 | `Not started` | | |
| CU45 | View ratings | PAN 18 | `Not started` | | |
| CU46 | Edit rating | — | `Not started` | | |
| CU47 | Delete rating | — | `Not started` | | |

### External integration

> These CUs are primarily the backend's responsibility. They're recorded
> here only if the frontend needs something from them.

| CU | Feature | Status | Branch | PR |
|---|---|---|---|---|
| CU48 | Retrieve place data | `Not started` | | |
| CU49 | Synchronize external information | `Not started` | | |
| CU50 | Update activity data | `Not started` | | |
| CU51 | Record used external data | `Not started` | | |
| CU52 | Retrieve external ratings | `Not started` | | |

### Administration

| CU | Feature | Screen | Status | Branch | PR |
|---|---|---|---|---|---|
| CU53 | Manage activities | PAN 21 | `Not started` | | |
| CU54 | Manage categories | — | `Not started` | | |
| CU55 | Moderate ratings | PAN 20 | `Not started` | | |
| CU56 | Delete content | — | `Not started` | | |
| CU57 | Manage users | PAN 19 | `Not started` | | |
| CU58 | View system metrics | REP-01 | `Not started` | | |
| CU59 | Review user suggestion | — | `Not started` | | |
| CU60 | Manage plans | PAN 22 | `Not started` | | |
| CU61 | Manage permissions | — | `Not started` | | |
| CU62 | Manage roles | — | `Not started` | | |

---

## Decisions

Technical decisions made and their reasoning. Keeps the same thing from
being re-discussed twice.

| Date | Decision | Reason |
|---|---|---|
| 2026-08-06 | ESLint as the static analyzer | Ecosystem standard for TS/JS, official Next.js integration, type-aware analysis, no additional infrastructure (unlike SonarQube) |
| 2026-08-06 | Type-aware ESLint analysis (`projectService`) | Allows detecting unhandled promises, the most likely error when consuming the API with axios |
| 2026-08-06 | Domain names in Spanish | *(Superseded — see the 2026-08-19/20 language migration.)* Matched the delivery document's traceability matrix at the time; translating them was thought to break CU → code traceability |
| 2026-08-11 | Issue templates as *issue forms* (`.yml`) instead of Markdown | Fields can be marked required, so an issue can't be opened without acceptance criteria or reproduction steps. With Markdown the template gets erased and no one notices |
| 2026-08-11 | Blank issues stay enabled | Foundational work doesn't come from the traceability matrix and doesn't fit either template. Disabling them would force foundational issues into the use-case template |
| 2026-08-11 | The Definition of Done lives in `skills/02-git-flow/DEFINITION-OF-DONE.md`, not the wiki | The wiki isn't versioned with the code or reviewed through a PR. Here it changes with the same 2 approvals as any other change |
| 2026-08-11 | The DoD includes the backend's criteria even though this is the frontend repo | It's a team agreement, not a repository one, and the file is shared core: it's replicated verbatim in `SmartPlan-back` |
| 2026-08-17 | Vitest + React Testing Library for frontend unit tests | It's the integration documented by Next.js, allows testing components and hooks with jsdom, and keeps a fast API for development and CI |
| 2026-08-18 | The frontend requires Node 24 (`devEngines.runtime` in `package.json`, `.nvmrc`) | pnpm 11 —the version pinned in `packageManager`— won't start below Node 22.13: it throws `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite` before anything can be validated. 24 is pinned instead of the 22.13 floor so machines run exactly the same version as CI, which reads the same field |
| 2026-08-18 | Private routes are protected on the client, not in `proxy.ts` | The JWT lives in `localStorage`, which the server can't see: no Server Component or `proxy.ts` can know whether there's a session. `ProtectedRoute` is a navigation barrier; what actually authorizes is the backend on every request. If CU1 moves the token to an `httpOnly` cookie, the check can move to the server without touching the screens |
| 2026-08-18 | A screen is protected by where it lives: the `(private)` group | The group's layout wraps everything nested under it in `ProtectedRoute`. Wrapping screen by screen depends on nobody forgetting, and forgetting leaves a private screen open without anything failing |
| 2026-08-18 | The content's max width is set by the screen (`Container`), not the layout | The home hero and the plan-generation waiting screen go full-bleed. With the container in the layout, those screens would have to fight it or force a change touching every screen. The `(private)` group and `admin/` do set it in their layout because none of their screens are full-bleed |
| 2026-08-18 | URLs are centralized in `src/lib/routes.ts` | A hand-written route string in a `<Link>` survives the folder being renamed and only fails at runtime; the constant breaks the build instead |
| 2026-08-18 | Favoritos and Historial are shown in the navbar even without a session | Hiding the links leaves the application with no hints about what's behind the account. Someone without a session lands on the route and the guard sends them to login while preserving the destination in `?redirect=` |
| 2026-08-18 | Catalog keys via literal unions | Prevents structural incompatibility between catalogs (`UserStatus`, `Role`, etc.) and prevents invalid keys in TypeScript. Verified against `SmartPlan-back` commit `8ec4d07a34d2058f2147220e69d494e4da183811`, and `openai` corrected to `gemini`. |
| 2026-08-19/20 | Technical code and structure migrated from Spanish to English, in both `SmartPlan-front` and `SmartPlan-back` | Aligns identifiers, tables, routes, and API contracts with the shared `skills/01-domain/` convention. User-visible text, skills, and functional documentation continue to allow Spanish |
| 2026-08-22 | CU9 built against `GET /activities` from the backend's `SMART-16-busqueda-y-exploracion` branch | The endpoint's contract is documented in `SmartPlan-back/docs/exploration-api.md`. That branch merged into the backend's `develop` on 2026-08-22 (PR #56) with the same contract, verified field-for-field against the frontend's types before wiring it up |

---

## Known Pending Items

Things that have been spotted but don't have an owner yet:

- **Two design systems coexist** in the `SmartPlanSystemDesign` folder: v1
  (Ink / Lime / Violet) is deprecated and v2 "EMBER" is current. v1 should
  be deleted so no one picks it up by mistake.
- **The document's type scale doesn't match the design system**: Stage 5
  says H1 42px / H2 32px / H3 24px, and v2 uses 50 / 36 / 26. The document
  needs to be updated.
- **The brand brief is written for Spain**: it uses "tú" and euros. The
  project is set in Mendoza and the document's acceptance criteria use the
  "vos" form and pesos. Define the variant with the team and fix the brief.
- The concrete database engine isn't defined in the documentation, which
  only says "relational database."
- The `skills/` core (`00-project`, `01-domain`, `02-git-flow`) is
  duplicated in `SmartPlan-back`. When modifying it, replicate the change
  in the other repository.
- **Pending replication in `SmartPlan-back`** (F21): `DEFINITION-OF-DONE.md`,
  the new sections of `02-git-flow/SKILL.md`, and the `.github/` templates
  adapted for the backend (`pnpm test`, DTOs, migrations). Goes in a
  separate PR, in the other repository.
- Issue templates only apply labels that already exist (`frontend`, `bug`):
  GitHub silently ignores ones that don't. If the team wants a `use case`
  label, it needs to be created in Settings → Labels **before** adding it
  to the template.

---

## Log

| Date | What happened |
|---|---|
| 2026-08-06 | ESLint 9 configured with the project's own rules. First run: 0 errors, 0 warnings (scaffold with no application code yet). |
| 2026-08-06 | Created `skills/` and this tracking file. |
| 2026-08-11 | F21: Definition of Done agreed on, issue templates (use case and bug) and PR template in `.github/`. The `02-git-flow` core was synced with the backend's, which was newer. |
| 2026-08-16 | F15: `tokens.css` imported into `globals.css` and exposed to Tailwind 4 via `@theme inline` (colors and radii). Removed the duplicate `@font-face` from `tokens.css` and migrated `page.tsx` to the new utilities, with no hardcoded colors. `pnpm lint` and `next build` green. |
| 2026-08-17 | F18: implemented the 37 TypeScript domain types in `src/types/`, coordinated with the backend's TypeORM. `pnpm lint`, `pnpm build`, and `tsc` ran clean. |
| 2026-08-17 | F16: the seven EMBER v2 primitives were ported to React components with TypeScript contracts, basic accessibility, and a public barrel at `@/components/ui`. PR review: `Icon` moved from `lucide-react/dynamic` to a static registry (`iconRegistry.ts`) —icons now render in the server HTML and initial JS dropped from 874 KB to 646 KB—, and `Button`/`Chip` focus got back a visible `outline`: `--focus-ember` alone only gives 1.2:1 contrast. |
| 2026-08-17 | F20: configured Vitest, React Testing Library, and jsdom, added templates for a component and a hook, and updated the CI workflow to validate lint, tests, and build. |
| 2026-08-18 | F20 (Review): documented and pinned the Node 24 floor that pnpm 11 required (`devEngines`, `.nvmrc`, README, and AGENTS), mocked `next/font/local` so testing a page doesn't die with "default is not a function", added `timeout-minutes` to the CI job, removed F16's duplicate row, and renamed `catalogos-test.ts` to `catalogos.type-check.ts` so it isn't mistaken for a Vitest suite. |
| 2026-08-18 | F18 (Review): fixed catalogs by constraining `key` with literal types, replaced `openai` with `gemini` in `ExternalProvider`, added a type-check test (`catalogos-test.ts`), and documented the `SmartPlan-back` reference commit `8ec4d07`. |
| 2026-08-18 | F17: centralized Axios client in `src/lib/api/` with a JWT interceptor, decoupled token abstraction (`setTokenGetter`), response/network normalization in `ApiError`, debounced pub/sub for 401 (`onUnauthorized`), `.env.example` template, and updated documentation in `skills/03-frontend/SKILL.md`. `npx eslint .`, `npx tsc --noEmit`, and `npx next build` 100% clean. |
| 2026-08-18 | F19: `src/app` structure with the `(auth)`, `(main)`, and `(private)` groups, layout with the 60px navbar and `backdrop-filter`, navigation for Inicio, Explorar, Favoritos, and Historial, user menu, and protected routes that redirect to login with the destination in `?redirect=`. Removed the `create-next-app` template page and left the screens as placeholders with their CU. `pnpm lint`, `pnpm test` (26), and `pnpm build` green. |
| 2026-08-19/20 | Technical code and structure migrated from Spanish to English across the whole frontend: files, folders, components, hooks, types, routes, and imports. Catalog values, error-response field names, and a few real backend contract fields (`score`, `errorMessage`) were re-verified and corrected against the actual `SmartPlan-back` entities and seeds after the backend completed its own English migration and implemented CU1-CU4 (auth). Two CSS class references left over from a partial rename (`notaPendiente(Oscura)`) were fixed. `pnpm lint`, `pnpm test` (26), and `pnpm build` green. |
| 2026-08-22 | CU9: search box with `useDebouncedValue` (400ms), `ActivityCard` results grid, loading/empty/error states, and load-more pagination, calling `GET /activities` (`searchActivities` in `src/lib/api/activities.ts`) per the backend's `docs/exploration-api.md`. Replaced `explore/page.tsx`'s `PendingScreen`. `pnpm lint`, `pnpm test` (33), and `pnpm build` green. |
| 2026-08-22 | `ActivityCard` restyled to match `SmartPlanSystemDesign/v2/Results.jsx`: 140px image, hover lift, compact 15px title, duration/cost/rating meta row, pulsing-dot loading state, and title+copy empty/error states. Added `formatDuration` and test coverage for `ActivitySearch`'s states and pagination. `pnpm lint`, `pnpm test` (39), and `pnpm build` green. |
| 2026-08-22 | F19's row was still `In progress`, but its branch had already been merged via PR #80 — corrected to `Completed`. Located the real `SmartPlanSystemDesign/v2/*.jsx` prototype files (kept outside git) and, comparing them against the shipped Navbar, found real drift from the written design-system skill: centered the main nav links (`flex: 1` on `.nav`, matching the prototype's layout technique), swapped the active-link highlight for a small dot indicator, replaced the "Mi cuenta" text-pill trigger with a circular gradient avatar, and added a confirmation dialog before "Cerrar sesión" fires. Gave `Button` `ref` support (React 19 plain-prop ref, no `forwardRef`) so the dialog can focus its Cancelar button on open. `pnpm lint`, `pnpm test` (27), and `pnpm build` green. |
