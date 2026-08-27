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
| **Last update** | 2026-08-24 |
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
| CU1 | Log in | PAN 04 | `In progress` | `SMART-13-cu1-iniciar-sesion` | |
| CU2 | Register user | PAN 04 | `In progress` | `SMART-13-cu1-iniciar-sesion` | |
| CU3 | Recover password | — | `Not started` | | |
| CU4 | Log out | — | `Not started` | | |

### User management

| CU | Feature | Screen | Status | Branch | PR |
|---|---|---|---|---|---|
| CU5 | Edit profile | PAN 14 | `Not started` | | |
| CU6 | Change password | — | `Not started` | | |
| CU7 | Delete account | PAN 14 | `Not started` | | |
| CU8 | Edit preferences | PAN 15 | `In progress` | `SMART-30-cu18-personalizar-preferencias-de-usuario` | |

### Search and discovery

| CU | Feature | Screen | Status | Branch | PR |
|---|---|---|---|---|---|
| CU9 | Search activities | PAN 11 | `In review` | `SMART-21-cu9-buscar-actividades` | [#87](https://github.com/SmartPlan-UTN/SmartPlan-front/pull/87) |
| CU10 | Filter results | PAN 11 | `In review` | `SMART-21-cu9-buscar-actividades` | [#87](https://github.com/SmartPlan-UTN/SmartPlan-front/pull/87) |
| CU11 | Sort results | PAN 11 | `In review` | `SMART-21-cu9-buscar-actividades` | [#87](https://github.com/SmartPlan-UTN/SmartPlan-front/pull/87) |
| CU12 | Search plans | PAN 10, PAN 11 | `In review` | `SMART-21-cu9-buscar-actividades` | [#87](https://github.com/SmartPlan-UTN/SmartPlan-front/pull/87) |
| CU13 | View plan | PAN 17 | `In review` | `SMART-21-cu9-buscar-actividades` | [#87](https://github.com/SmartPlan-UTN/SmartPlan-front/pull/87) |
| CU14 | View activity | PAN 18 | `In review` | `SMART-21-cu9-buscar-actividades` | [#87](https://github.com/SmartPlan-UTN/SmartPlan-front/pull/87) |
| CU15 | Save activity | PAN 18, PAN 12 | `Not started` | | |
| CU16 | View activities on a map | PAN 08 | `In review` | `SMART-21-cu9-buscar-actividades` | [#87](https://github.com/SmartPlan-UTN/SmartPlan-front/pull/87) |

### Recommendation

| CU | Feature | Screen | Status | Branch | PR |
|---|---|---|---|---|---|
| CU17 | Generate automatic plan | PAN 07 | `In progress` | `29-cu17-generar-plan-automatico` | |
| CU18 | Customize user preferences | PAN 15 | `In progress` | `SMART-30-cu18-personalizar-preferencias-de-usuario` | |
| CU19 | Generate surprise plan | PAN 09 | `In progress` | `31-cu19-generar-plan-sorpresa` | |
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
| 2026-08-22 | CU9-CU12 use real page-by-page pagination (`Pagination`, `goToPage`), not infinite "load more" | Explicit product decision: predictable page numbers over an open-ended scroll, and it composes with `useExplorationSearch`'s single fetch effect without a separate "append" code path |
| 2026-08-22 | `Navbar`'s inner row is not capped at `--max-w` | `SmartPlanSystemDesign/v2/Navbar.jsx` spans the full window with 48px padding; the ported version had wrongly reused `Container`'s content width, making the bar look boxed-in above 1200px. See `skills/06-design-system/SKILL.md` |
| 2026-08-22 | `MoodBackground` measures its own wrapper (`ResizeObserver` + `useLayoutEffect`), not `window.innerHeight` | The wrapper's real height is the page's content height, not the viewport's — sizing the wave `viewBox` off the wrong one cut the waves off on a short page and briefly mis-proportioned them on a tall one before a resize event corrected it |
| 2026-08-22 | Added a `Select` primitive instead of a native `<select>` for CU10/CU11's sort/direction | A native `<select>`'s open option list is painted by the OS/browser; on Windows Chrome/Edge it ignores `border-radius` entirely, which read as a square dropdown inside a rounded filters panel with no CSS fix available |
| 2026-08-22 | CU10's category chip row loops via `useMarqueeScroll` (measure-then-duplicate, one direction, wrap by exactly one copy's width) instead of a CSS `sp-carousel` keyframe or a ping-pong bounce | A ping-pong reverse-at-the-edges version looked "stuck" on a wide screen where the row barely overflowed (little distance to bounce across); duplicating content only when it actually overflows keeps a single chip, or a set that already fits, from visibly rendering twice for no reason |
| 2026-08-24 | CU1 access token lives in memory only (`SessionProvider` state), never `localStorage` | Matches `SmartPlan-back`'s actual CU1-CU4 contract (`docs/authentication.md` there): the access token expires in 15 min and is meant to be memory-only; the 30-day session is carried by the `smartplan_refresh` `httpOnly` cookie instead. Session persistence on reload comes from `POST /sessions/refresh` on `SessionProvider` mount, not from reading a stored token. This supersedes the 2026-08-18 decision below about `localStorage` |
| 2026-08-24 | `ProtectedRoute` stays a client-side navigation barrier, not a server one, even after CU1 | Only the *refresh* token became an `httpOnly` cookie; the *access* token still lives in JS memory, which a Server Component or `proxy.ts` can't read either. Moving the guard server-side would require making the access token itself a cookie, which the backend contract doesn't do |
| 2026-08-24 | `withCredentials: true` set globally on the shared Axios instance (`src/lib/api/client.ts`), not only for session endpoints | Required for the browser to send/receive the `smartplan_refresh` cookie on `/sessions*`. Sending credentials on every request is harmless for endpoints that ignore cookies, and keeping one shared instance (per `skills/03-frontend/`'s "don't instantiate a loose Axios") is simpler than branching per call |
| 2026-08-25 | PAN 15 persists categories, usual budget, and preferred area; party size, GPS mode, and maximum distance remain outside the profile | CU18 expanded `GET`/`PATCH /users/me/preferences` with nullable `usualBudget` and `preferredArea`. Those are stable recommendation defaults documented for PAN 15. Party size and distance vary per outing and stay in the plan-generation flow; GPS is an input method, not a durable preference |
| 2026-08-25 | CU8 and CU18 are implemented as a single screen/component tree (`src/components/preferences/`), not two | Both point at PAN 15 and the same `/preferences` route; the issue for CU18 explicitly asks to reuse CU8's flow rather than duplicate it. `src/app/(main)/(private)/preferences/page.tsx` is the one source of truth for both use cases |
| 2026-08-25 | Preference chips get a locally-scoped `min-height: 44px` and a selected-elevation shadow in `preferences.module.css`, not in the shared `primitives.module.css` | Every chip on this screen is a primary tap target, unlike the CU10 filter row (a dense scrolling strip that would break if its chips grew). Keeping the override local avoids affecting `/explore`'s existing chip row |
| 2026-08-25 | A saved preference id absent from the currently active category catalog is silently filtered out on load, not surfaced as an error | Mirrors the backend's own `updatePreferences`, which already treats the active catalog as the source of truth and rejects anything outside it. The frontend applies the same rule to its own read path so it never renders or round-trips a selection with no visible chip |

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
- **The "¿Sos admin?" link on `/login` (v2 design) is rendered but inert**
  (`src/app/login/layout.tsx`, `.adminLink` in `layout.module.css`): the v2
  prototype sends it to a separate admin-only login screen that has no
  counterpart in this app — a real admin account already lands on `/admin`
  after a normal login, based on its role. Needs its own ticket to decide
  whether a dedicated admin entry point is actually wanted, and if so, what
  it should do.

---

## Log

| Date | What happened |
|---|---|
| 2026-08-26 | CU19 (PAN 09, "Sorpréndeme"): built the surprise-plan entry experience on top of CU17's shared generation infra. New `SurpriseButton` — a small ember-spark pill in the composer's hint line (replacing the "Enter para planificar" keyboard hint and the old plain-text `SurpriseAction`): identity without volume, sized like a toolbar button, right under "Planificar". Split the two composers by role instead of duplicating options: the hero is the simple door (`hideContext` — field, Planificar, Sorpréndeme, "Probá con" chips, no parameters), and the closing composer near the footer is the precise one (carries the optional Momento/Personas/Presupuesto chips, no Sorpréndeme, no duplicate intent chips). Also `useSurpriseLocation` (device GPS on explicit press only, never on mount; on denial/unavailability falls back to the profile's saved `preferredArea` coordinates from `GET /users/me/preferences`, which the real merged contract *does* expose — verified against `SmartPlan-back` `origin/develop`; with neither, an actionable error routing to `/preferences`, never a dead end). `usePlanRequestPolling` gained `regenerate()` for "Sorpréndeme de nuevo" — a fresh POST from the same coordinates, only from an explicit action on a generated result, no-op while in flight (distinct from `retry` after failure and `keepWaiting` after the display timeout). `GenerationState` and `PlanResults` parametrised with a `mode` (copy only; states, motion, timeout, cleanup all shared) plus a one-line non-intrusive `note` (fallback location / no saved preferences, per the spec). New `planRequestErrors.ts` maps `NO_LOCATION_AVAILABLE` / `NO_VALID_COMBINATIONS` / `TOO_MANY_ACTIVE_REQUESTS` / network / geolocation kinds to the spec's exact Spanish copy, never leaking Gemini/Maps details. `PlanRequestPlanSummary` now types and the cards render `activityNames`; results hard-capped at 3. Coordinated `SmartPlan-back` branch `31-cu19-surprise-distance-limits` closes the three end-to-end gaps (`maxDistanceKm` radius, minimum-2-activities, 3-alternative cap) — no schema change. New tests: `SurprisePanel.test.tsx`, `useSurpriseLocation.test.ts`, `planRequestErrors.test.ts`, plus surprise cases in `GenerationState`/`PlanResults`/`usePlanRequestPolling` tests. `pnpm lint`, `pnpm test` (127), and `pnpm build` green. |
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
| 2026-08-22 | Navbar was still styled as the dark variant (`--char` background, white logo) after comparing against a screenshot of the running `SmartPlanSystemDesign` prototype. Traced it to `SmartPlan v3.html`, which hardcodes `navDark = false` for every screen ("Results is now light theme") — the design settled on a single light navbar, not the dark-over-hero one the written skill implied. Switched the navbar to cream/blur with the ink logo, `--fg-1`/`--fg-2` text, a scroll-triggered border (transparent until 10px), and light-card dropdown/mobile-panel styling (they were wrongly using dark tokens even before this pass — the prototype's dropdown was never conditioned on `dark` either). Documented in `skills/06-design-system/SKILL.md`. `pnpm lint`, `pnpm test` (40), and `pnpm build` green. |
| 2026-08-22 | A side-by-side screenshot comparison against the running prototype showed more `/explore` drift beyond the navbar: no decorative background, a plain input instead of a search-bar-with-button, and a page title the prototype doesn't show. Ported `MoodBackground` (the layered animated SVG waves from `v2/MoodBackground.jsx`, `mood="idle"`) as a new cross-cutting component, stopped under `prefers-reduced-motion`; rebuilt the search field as one pill (icon + input + "Buscar" button, Enter also submits immediately instead of waiting for the debounce — the debounce still drives typing on its own); replaced the `Explorar` / `Buscá actividades cerca tuyo` header with a visually-hidden `<h1>` plus a "N actividades encontradas cerca tuyo" line, matching the prototype's framing; and swapped the stock-photo card image for the pastel-gradient tile from `Results.jsx` (`IMG_GRADS`, ported verbatim) with a muted icon instead of the source's emoji, since the brand voice forbids emoji. Added `sp-sr-only` to `tokens.css` for the hidden heading. `pnpm lint`, `pnpm test` (43), and `pnpm build` green. |
| 2026-08-22 | CU10, CU11: `useExplorationFilters` (category/price/rating/sort state) and `FiltersPanel` (price range, min rating, sort by/direction, matching the design system's own field/panel styling since the prototype never designed this panel), and `useExplorationSearch` rewritten from infinite "load more" to real page-by-page pagination (`Pagination` component). Fixed axios's default bracket-notation array serialization (`categoryIds[]=1`), which the backend's comma-separated query parser silently ignored — added a custom `paramsSerializer` in `client.ts`. `pnpm lint`, `pnpm test`, and `pnpm build` green. |
| 2026-08-22 | CU12: `PlanSearch`/`PlanCard`, sharing `ActivitySearch`'s filter/pagination shell over plan-specific fields (itinerary chain, activity count), plus `ExploreTabs` to switch Actividades/Planes on the shared PAN 11 screen. Needed a small backend change (`SmartPlan-back` PR #57): `PlanSummaryDto.activityNames`, so the plan card can show the real route chain instead of just a count. `pnpm lint`, `pnpm test`, and `pnpm build` green. |
| 2026-08-22 | CU13, CU14: `PlanDetailView` and `ActivityDetailView`, matching `PlanDetail.jsx`/`ActivityDetail.jsx` (dark hero, tabs, itinerary timeline, cost breakdown, embedded Google Maps location preview via a new `loadGoogleMaps`/`useGoogleMap`). Deliberately left out two things the mockup shows with no real backend behind them: `PlanDetail`'s social-proof strip and per-person cost split, and `ActivityDetail`'s per-review list (only an aggregate rating exists). `pnpm lint`, `pnpm test`, and `pnpm build` green. |
| 2026-08-22 | CU16: `MapView`, loading the Google Maps JS SDK, fetching markers for the current viewport on `idle`, and rendering a click-to-open info window built through DOM APIs (not raw HTML, since activity/place names are admin-editable catalog data). Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. `pnpm lint`, `pnpm test`, and `pnpm build` green. |
| 2026-08-22 | Self-requested `/code-review` pass across the whole CU9-CU16 diff surfaced and fixed: a failed page/filter refetch was wiping already-shown results instead of preserving them; a stale, out-of-order map marker fetch could overwrite a newer one; `loadGoogleMaps`'s retry left a dead `<script>` tag in the DOM that could never fire its listeners again; `ActivityCard`/`PlanCard`'s new `aria-label` hid price/duration/rating from screen readers; the map view ignored the list's filters; and several efficiency issues (no debounce on the price/rating filter inputs, `CategoryChips` refetching on every tab switch, an unreleased map idle listener). Also reduced duplication: a shared `useDetailFetch` hook for both detail views, a shared `useGoogleMap` hook for both map consumers, a shared `gradientFor()` placeholder helper, and the card/grid CSS moved into the shared `explore.module.css`. `pnpm lint`, `pnpm test` (44), and `pnpm build` green. |
| 2026-08-22 | Iterated on visual feedback against the running prototype and the app itself: the "Volver" back link on detail pages now follows the scroll and switches from a dark to a light style once its hero scrolls behind the navbar (`FloatingBackLink`, new primitive); the category chip row now loops continuously in one direction instead of a ping-pong bounce (`useMarqueeScroll`, only duplicating content when it actually overflows the row); `Select` replaces the native `<select>` for CU10/CU11's sort/direction (native option lists ignore `border-radius` on Windows Chrome/Edge); `Navbar`'s inner row is no longer capped at `--max-w`, matching the prototype's full-width bar; `MoodBackground` now measures its actual container instead of the viewport, fixing the wave background looking cut off on a sparse results page. Opened PRs: `SmartPlan-front#87` (CU9-CU14, CU16) and `SmartPlan-back#57` (supports CU12). `pnpm lint`, `pnpm test` (44), and `pnpm build` green in both repositories. |
| 2026-08-24 | CU1: implemented the login screen (PAN 04) and reworked the session foundation around SmartPlan-back's real CU1-CU4 contract. `POST /sessions` and startup `POST /sessions/refresh` in `src/lib/auth/api.ts`; `SessionProvider` now holds the access token and user in memory instead of `localStorage`, rehydrating on mount from the `smartplan_refresh` `httpOnly` cookie. Removed `src/lib/auth/session.ts` (the old `localStorage` module) and the now-dead `localStorage` fallback in `token-provider.ts`. Added `withCredentials: true` to the shared Axios instance. `LoginForm` (`src/components/auth/`) validates email/password client-side, maps the backend's documented error codes (`INVALID_CREDENTIALS`, `ACCOUNT_SUSPENDED`, `ACCOUNT_BANNED`, `ATTEMPT_LIMIT_EXCEEDED`, `VALIDATION_FAILED` with per-field mapping) to Spanish messages, and redirects to the saved destination, or to `/admin` for an admin account, or Home. Verified the exact contract (routes, DTOs, error codes, cookie name and `expiresIn`) by reading `SmartPlan-back`'s `origin/develop` directly — the shared integration doc had the rate-limit code wrong (`TOO_MANY_REQUESTS` vs. the real `ATTEMPT_LIMIT_EXCEEDED`); the code handles both. Rewrote `Navbar.test.tsx` and `ProtectedRoute.test.tsx`, which used to fake a session via `localStorage`, to mock `refreshSession` instead; added `LoginForm.test.tsx`. `pnpm lint`, `pnpm test` (33), and `pnpm build` green. |
| 2026-08-24 | Resolved the merge conflict between this branch and `develop`'s CU1 login work: `MoodBackground` moved from `@/components/layout` to `@/components/ui` on `develop` while this branch fixed its container-measurement bug in place — reapplied that fix (`ResizeObserver` + `useLayoutEffect`, `prefers-reduced-motion`) onto the moved `ui/MoodBackground.tsx`, keeping `develop`'s new `style` prop (used by `AuthSplitShell` to force `position: fixed`). `Navbar.test.tsx`'s logout tests were rewritten to use `mockAuthenticatedStartup()` instead of the now-removed `localStorage`-based session stub, while keeping the confirmation-dialog assertions `develop`'s simplified version had dropped (the dialog is still real, current behavior). Also fixed two PR review comments: `/explore/[id]` and `/plans/[id]` now reject a non-positive-integer route param with `notFound()` instead of forwarding `NaN` to the API, and `UserMenu`'s logout confirmation dialog traps focus and returns it to the "Cerrar sesión" trigger on close. `pnpm lint`, `pnpm test`, and `pnpm build` green. |
| 2026-08-25 | CU8/CU18: implemented preference editing (PAN 15), replacing the `/preferences` placeholder with the real screen. `getPreferences()`/`updatePreferences()` in the new `src/lib/api/users.ts` (`GET`/`PATCH /users/me/preferences`, verified against the real contract merged into `SmartPlan-back`'s `develop`, `src/users/users.controller.ts`); `PreferenceCategory`/`UserPreferencesResponse` added to `types/users.ts`, kept distinct from the existing raw `UserPreference` join-row type. `PreferencesForm` (`src/components/preferences/`) loads the active category catalog and the user's current preferences in parallel, renders them as selectable `Chip`s in a `fieldset`, and saves the full desired set on `PATCH` — an empty selection is a valid save that clears every preference, matching the backend's contract (no minimum). Save/Discard stay disabled until the selection actually changes (order-independent `Set` comparison), a save failure leaves the user's toggles untouched so they can just retry, and a saved preference id no longer present in the active catalog is filtered out on load rather than shown as a phantom selection or round-tripped in the next save. Visual direction pulled from the real `v2/Preferences.jsx` prototype (chip styling, selected-elevation shadow) and from `/profile`'s shipped card/toast/skeleton-adjacent conventions — no `MoodBackground` (reserved for full-bleed screens, `/preferences` sits in the `(private)` group's `Container` like `/profile`), no invented category iconography (no icon field on `Category`, no existing category→icon mapping anywhere in the app). Added a shimmer skeleton for the loading state (first real use of the `shimmer` keyframe already defined, unused, in `tokens.css`) with a visually-hidden `role="status"` announcement for screen readers. `prefers-reduced-motion` disables the card entrance fade, toast slide, skeleton shimmer, and chip press-scale. No sticky mobile action bar — evaluated and rejected, no existing precedent in the app and the form is short enough to stay in normal flow. Added `PreferencesForm.test.tsx` (13 tests: load/select/save/discard, empty-save, save-failure preserves selection, 422 mapping, load-retry, catalog-only failure, stale-preference filtering, accessible group name). `pnpm lint`, `npx tsc --noEmit`, and the focused test file all green (full `pnpm test`/`pnpm build` pending final pre-PR run). |
| 2026-08-25 | CU18/PAN 15 redesign supersedes the initial category-only layout: a progressive three-step recommendation profile now separates interests, usual budget, and preferred area, shows completion without making optional data mandatory, and keeps one primary question visible at a time. Circular status markers carry the step progression. The coordinated backend branch adds nullable `usualBudget` and `preferredArea` fields to the existing preference contract; zero categories and clearing either optional field remain valid. |
| 2026-08-25 | Reworked PAN 15's layout to a sidebar step rail (desktop) / horizontal numbered stepper (mobile) matching the shipped prototype's structure more closely, then fixed several real defects found in that pass: the step rail's connector lines used an approximate fixed offset instead of being derived from the actual circle size, drifting out of alignment with the numbered markers; `MoodBackground` was briefly added to the page header with `position: fixed`, which escapes its container's stacking context (against this file's own `MoodBackground` sizing guidance) and, combined with `.wrapper`'s `display: flex; align-items: center` on a page taller than one viewport, produced a wave band visibly cut off mid-page — removed `MoodBackground` from `/preferences` entirely (this screen never asked for it) and reverted `.wrapper` to plain document flow; a leftover `.fieldset { min-height: 100% }` from an earlier fixed-height layout left dead vertical space once the panel's height became content-driven; the desktop action bar's DOM order put "Guardar preferencias" before "Descartar cambios" while CSS `order` displayed them reversed, so keyboard Tab order didn't match the visual order — reordered the DOM instead of masking it with more `order`; the mobile sticky save bar had no compensating `padding-bottom`, risking it covering the form's own last field. Removed `PreferenceSummary.tsx`, a component that was never imported anywhere and referenced CSS classes already deleted from `preferences.module.css`. `pnpm lint`, `pnpm test` (68), and `pnpm build` green. |
| 2026-08-25 | Landing (PAN 07): rebuilt the Home as a full landing experience in a new `src/components/landing/`, replacing the old `home/` sections. **Fixed a defect that made the page look broken: `PhotoBand` and `PlanExample` pointed at five `/home/*.jpg` files that were never committed — `public/home/` was empty, so every photograph on the landing 404'd.** Assets now come from a single manifest (`landingMedia.ts`) over `public/landing/`. Only one available asset (`table.jpg`) is a real photograph; the rest are objects isolated on flat backgrounds, so the manifest declares a `treatment` and they are composited onto EMBER colour fields with `mix-blend-mode` instead of being bled into tiles like photos. Sections: hero (headline and centred composer kept, plus quick-intent chips that write a whole sentence into the field), an asymmetric inspiration grid, a scroll-scrubbed canvas that resolves a cloud of intentions into a three-stop recorrido, four connected steps, a rail of clearly-labelled example recorridos, and a real second composer that shares the hero's `usePlanRequestPolling` state. `HomeFooter` promoted to `components/layout/SiteFooter.tsx` for reuse. `PlanComposer` gained a `variant`, an `id`, and a `fill()` handle; its focus-after-fill was frame-dependent and therefore racy, and is now synchronous. Recovered the generation/results CSS from the build output into `home/generation.module.css` after it was lost with the deleted `hero.module.css`. Zero new dependencies: canvas 2D, `IntersectionObserver` and scroll-linked CSS only. Fixed along the way: a horizontal scrollbar on every viewport (a scroll rail leaks into the document's scroll width; `overflow-x: clip` on the section, which the reveal's transform had been masking, so it only showed under reduced motion), rails auto-scrolling on load because snap alignment ignored their padding, story labels colliding on narrow screens, and half the scene's labels being silently dropped by the mobile node budget. `useTypewriter` and `useReducedMotion` rewritten to derive state instead of writing it from effects (`react-hooks/set-state-in-effect`), and a pre-existing mistimed assertion in `useTypewriter.test.ts` corrected — it advanced 600ms and expected one character where two are typed by then. Verified in Chrome over CDP: no horizontal overflow at 1440/1024/768/390/360 with and without `prefers-reduced-motion`, no broken images, one `h1`, full keyboard traversal with the 2px ember focus ring on every control. `pnpm lint` (`src` clean), `pnpm test` (96), and `pnpm build` green. |
| 2026-08-25 | CU17 (PAN 07): completé los criterios del ticket #29 sobre la landing nueva. **Faltaban dos de las tres acciones que pide el caso de uso sobre un plan generado**: sólo existía descartar. Ahora `PlanResults` ofrece *aceptar* ("Elegir este plan", que navega al detalle CU13 — deliberadamente no dice guardar ni reservar, porque persistir un plan elegido es CU22 y no tiene endpoint), *ajustar* (vuelve al composer con la frase anterior ya cargada, para editarla en vez de reescribirla) y *descartar*. En el estado de error, "Volver a intentar" en realidad **reseteaba** todo: `usePlanRequestPolling` ahora guarda `lastSubmission` y expone `retry()`, que reemite el mismo POST (distinto de `keepWaiting`, que reanuda el polling sin postear porque el timeout es nuestro y la solicitud sigue viva en el backend). `LandingScreen` cablea "ajustar" con un `prefill` que el hero aplica cuando el composer vuelve a montarse. Tests nuevos que verifican los criterios uno por uno: `PlanResults.test.tsx` (aceptar/ajustar/descartar, y el caso sin resultados), `GenerationState.test.tsx` (espera asíncrona con `aria-busy`, timeout que no descarta, y fallo del servicio externo que reintenta sin resetear) y dos casos más en el test del hook. Imágenes: reemplacé los renders 3D de mockup por las 19 fotografías reales que aportó el equipo — renombradas semánticamente, recortadas a 2400px y recomprimidas (26,6 MB → 4,1 MB), con punto focal por imagen en `landingMedia.ts` para que el recorte no decapite el sujeto. Eso volvió innecesaria toda la maquinaria de composición con `mix-blend-mode`, que se eliminó. Animaciones añadidas, todas con `prefers-reduced-motion`: entrada escalonada de tiles y cards, barrido de luz en hover, parallax por scroll con `animation-timeline: view()` detrás de `@supports` (cero JS), gradiente que recorre el titular y cabeza luminosa en la línea de progreso. Dos defectos propios encontrados y corregidos por regresión visual: una limpieza con regex había fusionado selectores y dejado el scrim de la galería y el badge "Ejemplo ilustrativo" aplicándose **sólo en hover** — el badge es el compromiso de honestidad de `PRODUCT.md`, no puede depender del puntero. Verificado en Chrome por CDP: sin overflow horizontal en 1440/1024/768/390/360 con y sin reduced-motion, 13 imágenes sin roturas, un solo `h1`. `pnpm lint` (`src` limpio), `pnpm test` (107) y `pnpm build` en verde. |
