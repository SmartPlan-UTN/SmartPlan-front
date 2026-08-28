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
| **Last update** | 2026-08-25 |
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
| [F06] Continuous integration: lint and tests on every PR | `In review` | `SMART-f06-integracion-continua-lint-y-tests-en-prs` | [#84](https://github.com/SmartPlan-UTN/SmartPlan-front/pull/84) | Ref [`SmartPlan-back#28`](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/28). F20's `ci.yml` already covered lint/test/build on push and PR against develop/main; this ticket aligns the job id to `ci` (was `quality`) and the setup to `pnpm/action-setup` + `actions/setup-node` with `node-version-file: '.nvmrc'` (was the composite `pnpm/setup`), matching `SmartPlan-back`. The branch-protection row above says `Completed`, but there was no evidence the check was configured as a required status check — F06 confirms and configures it. The manual GitHub step is still pending (exact check name after the first run) |

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
| CU4 | Log out | — | `In progress` | `SMART-16-cu4-cerrar-sesion` | |

### User management

| CU | Feature | Screen | Status | Branch | PR |
|---|---|---|---|---|---|
| CU5 | Edit profile | PAN 14 | `In progress` | `SMART-17-cu5-editar-perfil` | |
| CU6 | Change password | PAN 14 | `In progress` | `SMART-18-cu6-cambiar-contrasena` | |
| CU7 | Delete account | PAN 14 | `In review` | `SMART-19-cu7-eliminar-cuenta` | #19 |
| CU8 | Edit preferences | PAN 15 | `Not started` | | |

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
| CU24 | Create plan | — | `In review` | `feature/planificacion-cu24-cu25-cu26` | #96, #103 |
| CU25 | Edit plan | PAN 17 | `In review` | `feature/planificacion-cu24-cu25-cu26` | #96, #103 |
| CU26 | Delete plan | PAN 17 | `In review` | `feature/planificacion-cu24-cu25-cu26` | #96, #103 |
| CU27 | Add activity to plan | PAN 17, PAN 18 | `In review` | `feature/planificacion-cu24-cu25-cu26` | #96, #103 |
| CU28 | Remove activity from plan | PAN 17 | `In review` | `feature/planificacion-cu24-cu25-cu26` | #96, #103 |
| CU29 | View plan | PAN 17 | `In review` | `feature/planificacion-cu24-cu25-cu26` | #96, #103 |
| CU30 | Calculate plan cost | PAN 17 | `Not started` | | |
| CU31 | Generate suggested plan | — | `In progress` | `feature/planificacion-cu24-cu25-cu26` | #103 |

### Collections

| CU | Feature | Screen | Status | Branch | PR |
|---|---|---|---|---|---|
| CU32 | Create collection | `/collections/new` | `In review` | `SMART-44-cu32-create-collection` | #93 |
| CU33 | Edit collection | `/collections/:id/edit` | `In review` | `SMART-44-cu32-create-collection` | #93 |
| CU34 | Delete collection | `/favorites` collections section | `In review` | `SMART-44-cu32-create-collection` | #93 |
| CU35 | Add activity to collection | PAN 18 | `In review` | `SMART-47-cu35-cu38-collections` | #94 |
| CU36 | Remove activity from collection | `/collections/:id` | `In review` | `SMART-47-cu35-cu38-collections` | #94 |
| CU37 | View collection details | `/collections/:id` | `In review` | `SMART-47-cu35-cu38-collections` | #94 |
| CU38 | View collection | `/favorites` collections section | `In review` | `SMART-47-cu35-cu38-collections` | #94 |

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
| CU57 | Manage users | PAN 19 | `In review` | `SMART-62-cu58-panel-de-control` | #99 |
| CU58 | View system metrics | REP-01 | `In review` | `SMART-62-cu58-panel-de-control` | #99 |
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
| 2026-08-25 | The wave background is drawn into a canvas from a Web Worker (`OffscreenCanvas`), not animated as SVG paths on the main thread | The swell fires the instant a route changes, which is exactly when the main thread is busiest rendering the new screen, so a `requestAnimationFrame` loop there lost its frames at the crest of the wave and the water visibly froze on every navigation. A worker owns its own clock and nothing React does can take a frame from it. Canvas rather than SVG for two reasons: rewriting four full-viewport path `d` attributes per frame re-parses and re-rasterizes them through the document, and an `OffscreenCanvas` is the only surface a worker can draw into. A main-thread canvas fallback covers browsers without one. |
| 2026-08-25 | A navigation sends a travelling swell packet across the water; it does not scale the wave's amplitude | Multiplying the amplitude of the whole line at once is a volume knob — the wave inflates in place, which does not read as water. Each navigation now spawns a gaussian packet that enters past the right edge, rolls left with the drift and decays, with each deeper layer receiving it later. Packets sum rather than replace, which is also what makes rapid navigation smooth: the previous model restarted a timed animation, so a second navigation mid-swell snapped the amplitude from its crest back to zero in one frame and read as a hard flicker. |
| 2026-08-25 | Wave points are displaced horizontally (Gerstner), and the displacement is negative | A sine has crests and troughs of the same shape; water has a narrow pointed crest and a broad flat trough. Sliding each sampled point toward the nearest crest packs the crest and stretches the trough — measured as trough width over crest width, a plain sine is 1.00, resting water here is 1.44, and a swell's crest reaches about 2.0. The sign is load-bearing and easy to "fix" wrongly: canvas y grows downward, so the crest a viewer sees is the minimum of the wave, at 3pi/2, not the maximum the textbook form assumes. Steepness is capped below 1, where the surface would fold; because the harmonic shares sum to 1 the horizontal derivative is exactly `1 - steepness * sum(share*sin)`, so any value under 1 is provably fold-free. |
| 2026-08-25 | CU57's REP-02 header reports active accounts, not “active today” | `SmartPlan-back`'s merged administration contract exposes account status and registration timestamps, but no last-activity/session timestamp. Presenting `status=active` as daily activity would be false. Total and active counts come from pagination metadata; weekly registrations are counted newest-first until the seven-day cutoff. |
| 2026-08-25 | Creating a collection from PAN 18 is a two-request flow that preserves the new collection if adding its activity fails | The backend deliberately exposes collection creation and activity membership as separate CU32/CU35 endpoints. The selector keeps the successfully created collection and retries only the membership request, avoiding duplicate collection creation after a partial failure. |
| 2026-08-25 | Collection management uses the Colecciones section of `/favorites`, with dedicated create and edit routes | The v2 design groups access under one saved-content screen, but the domain remains separate: collections are named activity groupings, while favorites are quick saves of activities or plans. The inactive Planes and Actividades sections contain no CU39-CU43 behavior; only real collections are loaded for CU32-CU34 management. |
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
| 2026-08-25 | `AuthField` promoted from `components/auth/` to `components/ui/Field`, no behavior change | CU5's profile form needed the exact same label/input/error field CU1/CU2 already had. Reaching from `components/profile/` into `components/auth/` would have been a worse cross-domain smell than moving it once a second domain needed it; duplicating it would have let the two copies drift. `LoginForm`/`RegisterForm` updated to import it from `@/components/ui` |
| 2026-08-25 | CU5's profile screen shows only what `Profile.jsx` (the v2 prototype) actually renders: name, last name, email — no phone field, no avatar upload, no role/status display | The prototype's phone and avatar have no backing field in `GET/PATCH /users/me`'s contract, and the prototype itself never shows role or status on this screen either, even though the endpoint returns them. Matches the established pattern from CU13/CU14 of not building UI for something the backend (or here, the design) doesn't actually support |
| 2026-08-25 | CU5's save-error mapping never surfaces `error.message` for an unmapped or 5xx failure | The ticket explicitly asks for "manejo de error sin exponer detalles internos," and the backend's own fallback message for those cases is an internal, technical, English string (`SmartPlan-back`'s `MESSAGES_BY_STATUS[500]`) — exactly the kind of detail not to show. Every other unmapped/5xx case in the app already follows this same pattern (`LoginForm`, `RegisterForm`) |
| 2026-08-25 | CU4's `logout()` never rejects: it calls `DELETE /sessions` best-effort, then always clears local state in a `finally` | Matches the backend's own idempotency guarantee (succeeds with no cookie, or an already-expired/revoked one) — a network error on the DELETE call is exactly the kind of failure someone needs to be able to log out *through*, not get stuck behind |
| 2026-08-25 | Logout redirects with `router.replace(ROUTES.login)`, not `push` | Same reasoning already applied to `ProtectedRoute`'s guard redirect and the post-login navigation in `LoginForm`/`RegisterForm`: `push` would leave the page that required the now-closed session in history, so "back" would land on it |
| 2026-08-25 | The global 401 handler (`isSessionInvalidating` in `src/lib/api/client.ts`) excludes `INVALID_CURRENT_PASSWORD` from triggering `notifyUnauthorized()`/logout | `SmartPlan-back` reuses HTTP 401 for two different things: an actually-invalid/expired/revoked session (`INVALID_TOKEN`, `INVALID_SESSION`, a bare `UNAUTHENTICATED`) and a business check on a *different* credential (CU6's current-password check, and CU7's account-deletion confirmation later). Verified against the real running backend: submitting the wrong current password returns `401`, but the access token used to make that request still works on the next request — the session was never touched. Without this exclusion, a mistyped current password would have silently logged the user out of an otherwise-valid session instead of just showing a field error |
| 2026-08-25 | CU6 doesn't port the v2 prototype's password-requirements checklist ("Mínimo 8 caracteres", "Al menos una mayúscula", "Incluir números y símbolos") | The real rule (`SmartPlan-back`'s `change-password.dto.ts`) is 12-128 characters with no complexity requirement at all — the prototype's 8-char minimum is also wrong for this codebase, matching `MIN_PASSWORD_LENGTH`. The frontend-facing integration doc is explicit that "any additional strength meter is a frontend UX rule and must not imply backend enforcement"; a pass/fail checklist for uppercase/digits/symbols would do exactly that. Kept the non-normative `PasswordStrength` bar and the field's placeholder instead |
| 2026-08-25 | CU6 redirects to `/login?passwordChanged=1` (new `passwordChangedLoginRoute()`) instead of a bare `/login` | The integration doc recommends explaining why the session just closed ("Tu contraseña fue actualizada. Iniciá sesión nuevamente.") rather than a silent, unexplained login form after being kicked out of a page that assumed an active session |
| 2026-08-25 | `AuthField`'s sibling `PasswordStrength`, and the auth-only `validation.ts` constants (`EMAIL_PATTERN`, `MIN_PASSWORD_LENGTH`, `REQUIRED_MESSAGE`), promoted from `components/auth/` to `components/ui/` and `lib/utils/` respectively | Same reasoning as `Field`'s promotion for CU5: CU6's password form needed the exact same strength meter and validation constants CU2's signup form already had. `LoginForm`/`RegisterForm` updated to import from the new locations, no behavior change |

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
- **A plan has no date and no location.** CU24's form asked for both, but
  `CreatePlanDto` is `{title, description, peopleCount}`, so neither was
  ever persisted and both were dropped from the form (PR #96). Putting them
  back means extending `Plan` in `SmartPlan-back` (`scheduledFor`, a place
  reference) with its migration, and re-adding the fields here.
- **`GET /plans/:id` can't tell you whose plan it is.** The public
  projection has no owner field, so PAN 17 probes `GET /users/me/plans/:id`
  to decide whether to offer "Editar plan" / "Cancelar plan" — an extra
  request per detail view. An `isOwner` flag on the public projection would
  remove it.
- **`tsc --noEmit` isn't part of CI.** `pnpm build` skips test files, so
  type errors inside `*.test.tsx` pass lint, tests, and build (PR #96
  shipped four before review caught them). Worth adding a `typecheck`
  script to `ci.yml`.
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
| 2026-08-28 | PR #103 on the same planning branch: CU27's `AddToPlanDialog` (PAN 18's "Agregar a plan" now opens a real plan picker that can also create the plan inline), a confirmation before CU28 removes the last stop, and CU31's entry points wired to an "under construction" notice while the backend's `POST /plan-suggestions` still answers 501. CU26 changed meaning on the frontend: the owner's listing now hides cancelled plans instead of keeping them as read-only history, so "Eliminar" reads as a delete end to end — the backend's logical delete already hides them from everyone else (`GET /plans/:id` 404s and `createSearchBuilder` filters them), and only `GET /users/me/plans` still returns them, so the filter lives in `MyPlansPanel`. Review fixes on top: `createPlan` was typed `Promise<Plan>` but the endpoint answers `OwnPlanDetailDto`; three guards compared against a `"deleted"` status key that isn't in `PlanStatusKey`; `AddToPlanDialog` sent `NaN` for `peopleCount` from an emptied number field; `EditPlanForm` rendered the remove failure behind the modal overlay; and `ConfirmationDialog` gained `hideCancel` because `cancelLabel=""` still rendered a focusable button with no accessible name. `pnpm lint`, `pnpm test` (147), and `tsc --noEmit` green. |
| 2026-08-25 | The app-wide wave background moved to review in PR #98 on `feature/fondo-olas`. The root layout mounts one `MoodBackground` across every user route so the water keeps its phase across navigation; administration hides and pauses that canvas because it has a separate visual language. `section-mood.ts` maps each route to a palette, and every navigation breaks a wave. Rapid navigations always add an impulse and use smooth saturation below the safe strength ceiling, instead of either overshooting it or dropping later events. Rendering runs in a Web Worker drawing to an `OffscreenCanvas`, with a main-thread fallback and a static frame under reduced motion. Static presentation lives in a CSS Module and canvas palettes live with the design tokens in `src/styles/`. No CU: cross-cutting UI, no associated issue. `pnpm lint`, `pnpm test` (128), and `pnpm build` pass. |
| 2026-08-25 | CU35-CU38 moved to review together in PR #94: PAN 18 now adds activities to existing or inline-created collections; `/collections/:id` shows the real activity list and confirms membership removal; `/favorites` links collection cards to their detail, paginates them, provides an explicit empty state, and reuses the shared animated `MoodBackground` from Explorar. Responsive behavior covers 360px through desktop, dialogs trap and restore focus, and partial collection-creation failures retry only the missing membership (except terminal missing-activity/collection errors). Integrated against the existing SmartPlan-back `develop` collections contract. `pnpm lint`, `pnpm test` (84), and `pnpm build` pass. |
| 2026-08-25 | CU32-CU34 moved to review together in PR #93 as the collections ABM: real collection cards in the Colecciones section, protected create/edit forms, duplicate-name validation, guarded cancellation, and confirmed soft deletion that preserves activities. Integrated with backend PR SmartPlan-back#70. `pnpm lint`, `pnpm test` (66), and `pnpm build` pass. |
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
| 2026-08-25 | CU4: implemented logout. `logout()` in `src/lib/auth/api.ts` (`DELETE /sessions`, no body, 204, `@Public()` on the backend since it reads the session from the refresh cookie, not the `Authorization` header). `SessionProvider.logout` calls it best-effort inside a `try`/`finally` — local state (token, user, status) always clears, even if the request fails, matching the backend's own idempotent-logout guarantee. `UserMenu`'s existing confirmation dialog (from the Navbar-alignment pass) now awaits `logout()` on confirm and `router.replace(ROUTES.login)`, instead of only clearing local state with no redirect. Extended `Navbar.test.tsx`'s confirm-logout test to assert the redirect, and added a test for the DELETE call failing. `pnpm lint`, `pnpm test`, and `pnpm build` green. |
| 2026-08-25 | CU5: implemented profile editing (PAN 14). `getProfile()`/`updateProfile()` in `src/lib/api/users.ts` (`GET`/`PATCH /users/me`); `UserProfile` added to `types/users.ts` as the DTO shape (role/status always embedded, unlike the raw `User` entity's `idRole`/`idUserStatus`). `ProfileForm` (`src/components/profile/`) loads name/last name/email, shows email disabled, and saves name/last name with client validation, per-field `VALIDATION_FAILED` mapping, a generic message for `403`/unmapped/`5xx` (never the backend's raw internal message), and a save-confirmation toast — matches the v2 prototype's `Profile.jsx` card, minus the phone field, avatar upload, and role/status display it has no backend contract for, and minus the password-change/delete-account sections on the same prototype screen (CU6/CU7, separate tickets). Promoted `AuthField` to `components/ui/Field` along the way, since this is the second domain that needed it; `LoginForm`/`RegisterForm` updated accordingly, no behavior change. Verified `GET`/`PATCH /users/me` end to end against the real running backend (success and `400 VALIDATION_FAILED`). Added `Field.test.tsx` and `ProfileForm.test.tsx`. `pnpm lint`, `pnpm test` (63), and `pnpm build` green. |
| 2026-08-25 | CU6: implemented password change (PAN 14). `changePassword()` in `src/lib/api/users.ts` (`PATCH /users/me/password`, 204). `ChangePasswordForm` (`src/components/profile/`) is a second, collapsed-by-default card next to `ProfileForm` — extracted the shared "Mi perfil" heading/wrapper into a new `ProfileScreen` composition so both cards sit under it. On success, closes the local session (`useSession().logout()`, CU4's real `DELETE /sessions`) and redirects to `/login?passwordChanged=1` (new `passwordChangedLoginRoute()`), which `LoginForm` reads to show an explanatory notice — matches the backend revoking every session for the account, including the one making the request. Found and fixed a real bug surfaced by this ticket: the global 401 handler treated `INVALID_CURRENT_PASSWORD` (a business check on a different credential) the same as an actually-invalid session, which would have logged the user out for typing the wrong current password — `isSessionInvalidating()` in `client.ts` now excludes it, verified against the real backend (the access token used for a failed attempt still works afterward). Deliberately skipped the prototype's password-requirements checklist: it implies uppercase/digit/symbol rules the backend doesn't enforce (only 12-128 length), which the integration doc explicitly warns against implying. Promoted `PasswordStrength` to `components/ui/` and the auth-only validation constants to `lib/utils/validation.ts`, same reasoning as `Field`'s promotion for CU5. This branch also merged CU4's `SMART-16-cu4-cerrar-sesion` (real `logout()` didn't exist on the CU5 branch this one is stacked on). Added `client.test.ts`, `ChangePasswordForm.test.tsx`, and extended `LoginForm.test.tsx`/`routes.test.ts`. `pnpm lint`, `pnpm test` (76), and `pnpm build` green; the wrong-password and successful-change flows also verified against the real running backend. |
| 2026-08-25 | Visual audit of both profile cards against `SmartPlanSystemDesign-v2/v2/Profile.jsx` (same rigor as the CU3/CU4 audit) surfaced real drift, all fixed: the shared `.card` had a hairline border the prototype's card doesn't (elevation is shadow-only there), a 16px radius instead of 24, and `--shadow-card` instead of the prototype's wider, softer double shadow — same gap for `.toast`'s shadow. The avatar circle was 64px instead of 72, with a lighter shadow (`--ember-20` vs. the prototype's literal 32%) and 20px initials instead of 26. The outer `.wrapper` was capped at 640px instead of 680. Several one-off paddings/gaps didn't match the prototype's own rhythm either: `.identity` and `.form`'s bottom padding, CU6's `.toggleRow` and `.passwordForm`, and the Nombre/Apellido `.row2` gap (fixed to the exact `--s-4` token — the one case where an existing token happened to match precisely). Also: CU6's toggle subtitle was sharing `sp-small` (14px) with its title, when the prototype sizes them differently (14px title, 12px subtitle) — fixed with an element-qualified `p.toggleSubtitle` override, same reasoning as CU3's `button.resendButton` fix. Verified in the compiled CSS output. |
| 2026-08-25 | F06 (ref back#28): F20's `ci.yml` already met most of the ticket (lint + test + build on push/PR against develop/main); aligned the job id to `ci` (was `quality`) and the setup to `pnpm/action-setup@v6` + `actions/setup-node@v7` with `node-version-file: '.nvmrc'`, making explicit where Node comes from (it used to be fully delegated to the composite `pnpm/setup@v2` action) — the same pattern implemented in `SmartPlan-back`. No trigger changes and no changes to the three real checks. Documented the `CI` check as a required status check in `skills/02-git-flow/` (SKILL.md and DEFINITION-OF-DONE.md), and fixed SKILL.md's broken link to the testing skill (`skills/06-testing/` → `skills/07-testing/`). Still pending: configuring the `CI` status check as required in `develop` and `main` branch protection, using the exact name GitHub reports after the first run, and removing the old `Quality` check if it was configured. `pnpm lint`, `pnpm test`, and `pnpm build` green. |
| 2026-08-25 | Merged the latest `develop` (CU32-CU34 collections, F06's CI alignment) into this CU6 branch to clear a merge-conflict block GitHub reported on the PR. Two conflicts, both trivial: `TRACKING.md` (docs, kept both sides) and `src/lib/api/index.ts` (CU32's `collections.ts` export block landed on the same line as this branch's `users.ts` one — kept both, no naming collisions). |
| 2026-08-25 | CU24, CU25, CU26 (+CU27, CU28) — PR #96: planning module. `/plans/create` (CU24) posts `POST /users/me/plans` and then one `POST /users/me/plans/:id/details` per stop; the two-step submit is resumable, so a failure partway through resumes on the created plan instead of duplicating it. `/plans/:id/edit` (CU25) preloads from `GET /users/me/plans/:id`, patches title/description/peopleCount, and adds (CU27) / removes (CU28) stops, refetching after a remove because the backend renumbers `order`. CU26 cancels from PAN 17 via `DELETE /users/me/plans/:id` (204) and leaves the plan read-only with a banner. `PlanDetailView`'s owner actions hang off an ownership probe against `GET /users/me/plans/:id`: the screen reads from the public `GET /plans/:id`, which returns the same projection to everyone and has no owner field. Date and location were dropped from the create form — `CreatePlanDto` is `{title, description, peopleCount}` and neither field was persisted; adding them needs a backend change (see Pending below). Added `/plans` (CU29), a "Mis planes" listing off the navbar that reads `GET /users/me/plans` and carries the create-plan entry point, built on the same grid as `CollectionsPanel` so both private listings read alike; cancelling is offered there too, leaving the plan in place as read-only history. The create and edit screens now share that page shell (eyebrow, heading, back link), so the forms no longer carry their own `h1`, and the activity panel goes search -> itinerary -> totals instead of burying the search box under the summary. `ConfirmationDialog` moved from `components/collection/` to `components/ui/` and now backs all four prompts, and the three-dot waiting animation moved out of `activity.module.css` into a `LoadingDots` primitive that six components across three folders were already reaching across for. The plan detail's 300px hero is gone: there are no photos in the catalog, so it was a flat gradient with an oversized icon taking a third of the first screenful — replaced by a header sized to its own content, which also frees `FloatingBackLink` from tracking a dark hero. `pnpm lint`, `pnpm test` (116), and `pnpm build` green, plus `tsc --noEmit` clean. |
| 2026-08-28 | CU7: implemented delete account (PAN 14), branched off CU6 (SMART-18) since its `ProfileScreen` is where the prototype's danger zone lives, not built yet on `develop`. `deleteAccount()` in `src/lib/api/users.ts` (`DELETE /users/me`, `{currentPassword}`, 204). The prototype's danger-zone card (`DangerZone`) is otherwise unchanged, but its "Eliminar cuenta" button has no wired confirmation there — this ticket's own addition reuses `ConfirmationDialog` (the same blurred-backdrop-plus-card treatment as the Navbar's "Cerrar sesión" prompt, not a one-off dialog) for `DeleteAccountDialog`, adding the current-password field the backend requires and the explicit plans/favorites/collections warning CU7 asks for, beyond the prototype's generic "eliminará todos tus datos". On success, closes the local session the same way CU6 does (`useSession().logout()`) and redirects to Login with a new `accountDeleted` flag (`ACCOUNT_DELETED_PARAM`, mirroring `PASSWORD_CHANGED_PARAM`) so `LoginForm` explains why the session just closed. `pnpm lint`, `pnpm test` (183), and `pnpm build` green. |
