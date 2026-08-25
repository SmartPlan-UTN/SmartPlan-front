---
name: smartplan-design-system
description: EMBER design system — color tokens, typography, spacing, radii, and primitive components. Read before writing any style or visual component.
---

# SmartPlan - "EMBER" Design System

Specific to `SmartPlan-front`. Original source: `SmartPlanSystemDesign` folder
(outside the repositories).

## ⚠️ There are two versions. Use v2

Two incompatible systems coexist in the design folder:

| Version | Palette | Status |
|---|---|---|
| **v1** — `uploads/smartplan Design System/` | Ink `#0D0D0D`, Lime `#C8F135`, Violet `#5B3CF5`, Slate `#F4F3F0` | **Deprecated.** Do not use |
| **v2 "EMBER"** — `standalone/v2/tokens.css` | Ember, Char, Cream, Electric, Gold | **Current** |

v2 is the one that matches the delivery document's visual guide. If you open
the v1 folder's `README.md` and see lime and violet colors, that's the old
iteration: ignore it.

The current tokens are copied into
[`src/styles/tokens.css`](../../src/styles/tokens.css).

## Palette

### Core
| Token | Hex | Use |
|---|---|---|
| `--ember` | `#E85D20` | Primary color. CTAs, accents, active state |
| `--char` | `#1A1109` | Main text and dark surfaces (hero, navbar) |
| `--cream` | `#F5F0E8` | General application background |
| `--electric` | `#2B5BFF` | Everything AI-related: plan generation, suggestions |
| `--gold` | `#FFD166` | Ratings and stars |

### Status
`--success #22C06B` · `--warning #F5A623` · `--error #F04040`

Auxiliary shades needed by the primitives are also tokens: `--white`,
`--white-15`, `--white-18`, `--gold-22`, `--warning-15`, `--rating-ink`, and
`--warning-ink`. Their values are never repeated inline inside components.

> `--rating-ink #7A5C00` comes from the prototype (it's the text of the
> `rating` badge). `--warning-ink #7A4A00` **was chosen while porting the
> primitives**: EMBER v2 doesn't define the `warn` badge's text. The same
> applies to the backgrounds of the `success`, `tag`, and `dark` badges. If
> the prototype shows up, it's worth contrasting them.

### Surfaces
| Token | Hex | Use |
|---|---|---|
| `--surface` | `#F5F0E8` | Background (= cream) |
| `--surface-card` | `#FFFCF8` | Card over a light background. **Never pure white** |
| `--char-surface` | `#1E1812` | Card over a dark background |
| `--char-surface2` | `#241D14` | Elevated / hover over dark |
| `--hairline` | `#E2DDD5` | Thin border over light |
| `--hairline-dark` | `rgba(255,255,255,0.07)` | Thin border over dark |

### Text
Over light: `--fg-1 #1A1109` (primary) · `--fg-2 #5C5448` (secondary) ·
`--fg-3 #9E9589` (placeholder).
Over dark: `--fg-on-dark #F5F0E8` · `--fg-on-dark-2` (55%) · `--fg-on-dark-3` (30%).

**Never hand-write a hex value.** Always use the CSS variable.

## Typography

Single font: **Bricolage Grotesque** (variable, weights 200-800),
self-hosted in [`src/app/fonts/`](../../src/app/fonts/). Loaded with
`next/font/local`.

| Class | Size | Weight | Tracking |
|---|---|---|---|
| `.sp-display` | 78px | 800 | -0.03em |
| `.sp-h1` | 50px | 800 | -0.02em |
| `.sp-h2` | 36px | 700 | -0.01em |
| `.sp-h3` | 26px | 700 | -0.01em |
| `.sp-h4` | 20px | 700 | — |
| `.sp-body-lg` | 18px | 400 | — |
| `.sp-body` | 16px | 400 | — |
| `.sp-small` | 14px | 400 | — |
| `.sp-label` | 12px | 600 | +0.05em, uppercase |

> **Discrepancy with the delivery document:** Stage 5 defines H1 42px, H2
> 32px, H3 24px. The design system evolved to 50 / 36 / 26. v2 is the one
> that's valid; the document should be updated.

## Spacing, radii, and shadows

**Spacing** (scale of 4): `--s-1 4` · `--s-2 8` · `--s-3 12` · `--s-4 16` ·
`--s-5 24` · `--s-6 32` · `--s-7 48` · `--s-8 64`.

**Radii:** `--r-btn 10` (buttons) · `--r-card 16` · `--r-card-sm 12` ·
`--r-chip 99` (chips and badges) · `--r-pill 40`.

**Shadows:** `--shadow-card 0 4px 16px rgba(0,0,0,.08)` over light,
`--shadow-card-dark 0 4px 20px rgba(0,0,0,.30)` over dark.
Focus: `--focus-ember 0 0 0 3px rgba(232,93,32,.18)`.

> `--focus-ember` is a **glow, not a focus indicator**: at 18% over `--cream`
> it gives 1.2:1 contrast, well below the 3:1 required by WCAG 1.4.11 and
> 2.4.11. Never use it with `outline: none`. Always pair it with
> `outline: 2px solid var(--ember); outline-offset: 2px`, as `Button` and
> `Chip` do.

**Layout:** navbar `60px` · content max width `1200px` · vertical section
spacing `64px`.

> **The navbar itself is NOT capped at `1200px`.** `v2/Navbar.jsx` spans the
> full window edge to edge with `padding: 0 48px` (`--s-7`); only the page
> *content* below it (via `Container`) is capped at `--max-w`. Capping
> `.navbarInner` at `--max-w` too — an easy mistake, since it's tempting to
> reuse the same width as the content it sits above — makes the bar look
> narrow and boxed-in on anything wider than 1200px, with dead space on
> both sides that the prototype doesn't have. Found and fixed while
> building CU9-CU16 (2026): see `.navbarInner` in
> `src/components/layout/layout.module.css`.

## ⚠️ The prototype isn't in the repository

The high-fidelity kit —20 screens in React— lives in the
`SmartPlanSystemDesign` folder, on one team member's machine, **kept out of
git by team decision**. It won't be uploaded.

**This section is the only durable record of that design.** It's described
here so you can build screens without access to the prototype. If you do
have the folder handy, it's served like this:

```powershell
cd "<path>\SmartPlanSystemDesign"
python -m http.server 8080
# http://127.0.0.1:8080/SmartPlan%20v3.html
```

An HTTP server is required because Babel loads the `.jsx` files via XHR and
`file://` blocks that. There's also a `SmartPlan standalone.html`, with
everything embedded, that opens with a double click.

## Designed screens

### Public and session screens

**Login** — CU1, CU2, CU3 · PAN 04
Toggles between login and signup. Password strength meter (Débil / Media /
Fuerte), show-hide with an `eye-off` icon, inline validation ("Este campo es
requerido", "Las contraseñas no coinciden", "Ingresá un email válido"). Dark
surface with `blur(8px)`. Redirects to `admin-inicio` if the role is admin.

### Application

**Landing / Home** — CU17, CU20 · PAN 07
Hero over a dark background with an animated `MoodBackground` behind it.
Central natural-language field: *"Contale qué querés"*, submitted with
Enter. Below it, suggestion chips (*"Algo romántico y sorpresa para hoy"*,
*"Aventura serrana familiar"*, *"Algo que no se me ocurriría nunca"*).
Further down, a carousel of categories and featured plans with their
summarized sequence (*"Café → Paseo → Cena"*), distance (*"A 2.5 km"*), and
time (*"Esta tarde"*). Default location: Mendoza.

**PlanGenerator** — CU17, CU19, CU31 · PAN 07 / PAN 09
Parameter form: budget, area (neighborhoods), time, outing type (Con amigos
/ En pareja / Familiar), features (Aire libre, Accesible, Con
estacionamiento). Waiting screen with progressive steps —"Analizando tus
preferencias", "Buscando actividades compatibles", "Armando combinaciones
perfectas"— in `--electric`, the only live animation allowed.

**Results** — CU9–CU12 · PAN 11
Grid of plan and activity cards. Each card carries a title, sequence
(*"Bodega → Almuerzo → Degustación"*), category `Badge` (Cultural,
Gastronómico, Romántico, Activo, Al aire libre), `Stars` with the rating,
and distance. Top row of filter chips with horizontal scroll and no visible
scrollbar. Loading state: *"Buscando lo mejor cerca tuyo..."*.

**PlanDetail** — CU13, CU25–CU30, CU43 · PAN 17
Header with the plan's name and route (*"Valle de Uco → Luján de Cuyo"*).
Ordered list of activities, each with a time, place name, type (*"Bodega ·
Degustación"*), address, and cost. `Divider` between items. Total cost at
the bottom and a **Guardar plan** button.

**ActivityDetail** — CU14, CU15, CU35, CU44, CU45 · PAN 18
Detail with a photo, description, hours (*"Lun–Dom: 12:00–16:00"*), a link
to Google Maps, and a list of ratings with author and `Stars`. Save button
with two states: **Guardar** / **Guardada**. Información tab.

**Favorites** — CU39–CU43 · PAN 12
Three tabs: Actividades, Planes, and Colecciones. Each with its own empty
state: *"Aún no guardaste ninguna actividad"*, *"Aún no guardaste ningún
plan"*, *"Aún no creaste ninguna colección"*. Collections have a free-form
name (*"Bodegas para visitar"*).

**History** — CU23 · PAN 13
List of plans by status, with a `DRAFT` badge for drafts and a `generating`
status for the ones still being processed. Empty state: *"Tus planes
guardados aparecerán acá"*.

**Profile** — CU5, CU7 · PAN 14
Personal data with inline validation. Includes the password section with
the same rules as Security.

**Preferences** — CU8, CU18 · PAN 15
A progressive recommendation profile with three focused sections: categories
of interest, usual budget, and preferred area, laid out as a step rail
(desktop) / horizontal numbered stepper (mobile) next to the active section's
panel. Only one section is expanded at a time so the screen does not present
every setting at once. A compact progress summary explains how each completed
answer improves plan results without making optional fields feel mandatory.
Budget validation says *"Ingresá un presupuesto válido mayor a $0"*. The
preferred area accepts a neighborhood, city, or department and makes clear
that an exact address is not required. PAN 15 uses a plain text header, no
`MoodBackground` — it's a focused form, not a full-bleed hero.

**Security** — CU6
Password change with a strength meter and a requirements checklist:
*"Mínimo 8 caracteres"*, *"Al menos una mayúscula"*, *"Incluir números y
símbolos"*.

### Administration panel

**AdminHome** — CU58 · REP-01
KPI cards: Total de Usuarios, Planes Activos, Actividades en Catálogo,
Valoraciones Pendientes. Below that, acceptance rate, average rating, and
retention. Distribution by mood (Relax, Festiva, Romántica, Aventura,
Cultural) and by group size (En pareja, Grupo chico, Grupo grande) with
percentage bars. Ranking of most popular activities and a recent activity
feed. Range selector: Hoy / 7 días / 30 días / Este mes.

**AdminUsers** — CU57 · PAN 19 / REP-02
Header metrics (total, active today, new signups this week) and a user
table with name, email, signup date, and status: Activo, Suspendido,
Baneado. Per-row actions, including **Reactivar cuenta**. Filter by status.

**AdminActivities** — CU53 · PAN 21
Catalog table with filters by category (Aventura, Cultura & Arte,
Bienestar, Entretenimiento, Gastronomía) and by outing type. Create, edit,
and delete.

**AdminPlans** — CU60 · PAN 22
Plans table with status and filters. Edit and delete from administration.

**AdminReviews** — CU55 · PAN 20
Moderation inbox with Pendientes / Aprobadas tabs. Each row shows the
author, the rated plan, and a relative age (*"Hace 2 horas"*, *"Hace 3
días"*).

### Cross-cutting

**Navbar** — 60px bar with `backdrop-filter: blur(18px)`, spanning the full
window width with `48px` of side padding on desktop (`24px`/`--s-4` below
900px) — **not** capped at `--max-w`, see the layout note above. Always the
light variant: cream background, ink logo, `--fg-1`/`--fg-2` text. The
`Navbar` component in `v2/Navbar.jsx` still has a `dark` prop, but the
shipped `SmartPlan v3.html` hardcodes `navDark = false` ("Results is now
light theme") — there's no dark-over-hero navbar in the current design, on
any screen. Nav links center between the logo and the session control; the
active one gets a small ember dot below it, not a filled pill. The border
under the bar is transparent until the page scrolls past 10px. The account
trigger is a circular ember-gradient avatar (icon-only until there's a real
user name/photo); its dropdown is always light-card styled
(`--surface-card` / `--hairline` / `--shadow-card`) regardless of the
navbar's own background — same as in the prototype. "Cerrar sesión" opens a
confirmation dialog instead of logging out immediately. Navigation: Inicio,
Explorar, Favoritos, Historial, and a user menu with Mi Perfil and
Preferencias.

**Carousel** — infinite carousel of categories: Gastronomía, Vinos &
Bodegas, Cultura & Arte, Vida nocturna, Cócteles, Café & Brunch, and of
moments: Con amigos, Noche especial, Tarde de semana, Fin de semana. The
`sp-carousel` keyframe in `tokens.css` shifts exactly one set of 5 items.
The React port (CU10's category chip row, `CategoryChips.tsx` +
`useMarqueeScroll`) diverges from a CSS-keyframe loop on purpose: it
measures whether the row's *single* copy actually overflows the visible
width before rendering a second, identical copy back to back — a set that
already fits renders once and stays still, instead of visibly duplicating
for no reason. Once it does need to loop, it scrolls one direction forever
and wraps `scrollLeft` back by exactly one copy's width the instant it
crosses that point (invisible, since the copy it wraps into is identical) —
never a ping-pong bounce, and always a real animation regardless of how
little the content actually overflows by (measuring only the "leftover"
overflow, rather than a full copy's width, reads as stuck on a wide screen
where the content barely spills past the edge). Pauses on hover/touch so a
chip stays clickable.

**MoodBackground** — animated hero background. Very subtle color blobs
(5-10% opacity) that transition over 1.4s based on the selected mood. It's
decorative; it must not compete with the content.

> **Size the SVG off the actual container, not the viewport.** The React
> port originally set the wave `viewBox` from `window.innerWidth/Height`,
> which only matches the box it paints into (`position: absolute; inset:
> 0` on a `position: relative` parent) when that parent happens to be
> exactly one screen tall. A sparse results page (few cards) made the
> parent shorter than the viewport, so the waves — positioned as a
> fraction of the wrong, taller height — ended up compressed near the
> bottom and cut off; a long page had the opposite mismatch, briefly
> visible as one wrongly-proportioned frame before a resize handler
> corrected it. Fixed by measuring the wrapper's own
> `getBoundingClientRect()` via `ResizeObserver`, in `useLayoutEffect` (not
> `useEffect` — that runs after the first paint, which is exactly the
> flash this avoids). The page that hosts it also needs its own
> `min-height` (e.g. `calc(100dvh - var(--navbar-h))` on `.backdrop`): a
> background is expected to cover at least one screen even when its
> content doesn't reach that far.

### What's still missing a design

There is no screen in the kit for:

- **PAN 05** — Password recovery (CU3 has the form in Login, but not the
  token flow)
- **PAN 08** — Map search (CU16)
- **PAN 10** — Recommended plans (CU20 appears embedded in Home, with no
  screen of its own)
- **Full collections module** — CU32 through CU38. Favorites has a
  collections tab, but neither the detail view nor the creation flow exist.

That's 7 use cases with no design. They need to be resolved while building
the screens, or the designer needs to be asked for them.

## Card image placeholders

Neither activities nor plans have real photos yet (no catalog images, no
S3 integration wired up). Both `ActivityCard` and `PlanCard` show the same
"no photo" treatment instead: one of six warm pastel gradients
(`gradientFor()` in `src/lib/utils/gradient.ts`, deterministic by id — the
same item always gets the same tile) with a single centered `Icon`. **Use
`route` for that icon on both entity types**, not `image` — an "image"
glyph reads as "a broken photo," which is the wrong signal for "this
catalog entry simply has no photo yet, by design." Same reasoning applies
to `ActivityDetailView`'s hero (also `route`, larger).

## Reference content

The prototype uses data from Mendoza and Buenos Aires: Ruta del vino in
Luján de Cuyo, Bodega Zuccardi Valle de Uco, Termas de Cacheuta,
Potrerillos, Chacras de Coria, Uspallata, San Telmo, Palermo. Prices are in
**Argentine pesos**.

It serves as a reference for tone and text volume when building screens.
**It is not real content**: it's sample data.

## Primitive components

The seven from `v2/Primitives.jsx`. When porting them to React with
TypeScript, keep these variants:

### Button
Radius `--r-btn`, weight 700, `scale(0.97)` when pressed, `brightness(1.1)`
on hover.

| Variant | Background | Text |
|---|---|---|
| `primary` | `--ember` | white |
| `secondary` | `--char` | `--cream` |
| `ghost` | transparent | `--fg-on-dark`, border `rgba(255,255,255,.15)` |
| `ghostLight` | transparent | `--fg-1`, border `--hairline` |
| `ghostEmber` | `ember-15` | `--ember` |
| `ai` | `--electric` | white |
| `danger` | `--error` | white |

Sizes: `sm` 12px/`7px 14px` · `md` 14px/`10px 20px` · `lg` 16px/`14px 28px`.

### Chip
Radius `--r-chip`, weight 600, 14px. Active: filled `--ember` with white
text. Inactive: transparent with a border (`--hairline` over light,
`rgba(255,255,255,.18)` over dark).

### Badge
Radius 99, 12px, weight 600. Variants: `ai` (electric-15), `cost`
(ember-10), `rating` (gold-15 with `#7A5C00` text), `success`, `tag`,
`warn`, `dark`.

### Icon
Wraps Lucide. Props: `name`, `size` (18 by default), `color`, `stroke` (2).
The names are Lucide's in `kebab-case`, same as in the prototype, but
resolved against a **static registry** in
[`iconRegistry.ts`](../../src/components/ui/iconRegistry.ts) — see below.

### Stars
Rating from 0 to 5 with half-stars. Filled `#FFD166`, empty
`rgba(255,209,102,0.22)`. Props: `rating`, `size` (12).

### Logo
Props: `variant` (`white` | `ink`), `kind` (`full` | `mark`), `height` (26).
Resolves the file by convention `logo-{kind}-{variant}.png`. When porting
it, point it to `public/brand/` and use `<Image>` from `next/image`.

### Divider
1px line. `--hairline` over light, `--hairline-dark` over dark. `dark` prop.

### React implementation

The primitives live in [`src/components/ui/`](../../src/components/ui/) and
are imported from their public barrel:

```tsx
import { Badge, Button, Chip, Divider, Icon, Logo, Stars } from "@/components/ui";

<Button variant="ai" size="lg">Generar plan</Button>
<Chip active>Gastronomía</Chip>
<Badge variant="rating">4.5</Badge>
<Icon name="map-pin" aria-label="Ubicación" />
<Stars rating={4.5} />
<Logo variant="white" kind="full" />
<Divider dark />
```

- `Button` keeps `<button>`'s native props and uses `type="button"` by
  default so it doesn't accidentally submit forms.
- `Chip` exposes the `active` state as `aria-pressed`; `dark` selects the
  right border when inactive over dark surfaces. A chip that doesn't toggle
  state (for example, one that navigates) can remove the attribute with
  `aria-pressed={undefined}`.
- `Badge` keeps `<span>`'s native props.
- `Icon` accepts the `kebab-case` names registered in `iconRegistry.ts`. An
  icon with no `aria-label` or `aria-labelledby` is treated as decorative.
- `Stars` clamps the rating to the 0-5 range and rounds it to the nearest
  half point. It generates its own accessible label automatically; it can
  be overridden with `aria-label`, or delegated to an external label with
  `aria-labelledby`.
- `Logo` keeps the asset's aspect ratio for the given `height` and accepts
  `alt`, `className`, and `priority`.
- `Divider` keeps `<hr>`'s native props.

All contracts and variants are exported as TypeScript types from
`@/components/ui`; none of them use `any`.

None of them carry `"use client"`: all seven render on the server. If a
screen component needs state or events, `"use client"` goes on that
component, not here.

#### To use a new icon, add it to the registry

`Icon` resolves the name against
[`iconRegistry.ts`](../../src/components/ui/iconRegistry.ts), an explicit
map from `kebab-case` to the Lucide component. If the name isn't in the
map, it's a TypeScript error. To add one: import the icon from
`lucide-react` in `PascalCase` and add the `kebab-case` entry, in
alphabetical order. Valid names are at <https://lucide.dev/icons>.

**Don't use `lucide-react/dynamic`.** `DynamicIcon` resolves the icon on
the client inside a `useEffect`, with these consequences measured in this
repo:

| | Icons in server HTML | Chunks emitted | Initial JS for a page with one `<Button>` |
|---|---|---|---|
| `DynamicIcon` | none | 1706 | 874 KB |
| Static registry | all | 9 | 646 KB |

It's the same problem as the global Lucide script the prototype used —
runtime name resolution— just with `import()` instead of a `<script>`. The
registry costs one line per icon and in exchange gives server rendering,
tree-shaking, and strict typing.

> **There is no Card primitive.** The card is a pattern, not a component:
> `--surface-card` over a light background, `--r-card` radius, `1px
> --hairline` border, `--shadow-card` shadow. Over dark, `--char-surface`
> with `--hairline-dark`.

> **A field nested inside a `--r-card` panel should use `--r-card` too, not
> `--r-btn`.** `FiltersPanel`'s inputs originally used the button radius
> (`10px`) inside a `16px`-rounded panel (CU10/CU11); the mismatch read as
> "boxy" — a flat-ish rectangle sitting inside a visibly rounder container.
> Matching the parent's own radius on a nested field reads as one coherent
> shape instead of two different ones stacked together.

### Select

Not one of the original seven — added while building CU10/CU11's sort and
direction dropdowns. **Never use a native `<select>` for anything that
needs to look like the rest of the design system.** Its closed state can be
restyled with CSS, but the open option list is painted by the OS/browser —
on Windows Chrome/Edge specifically, that list ignores `border-radius`
entirely, which is exactly the "rounded panel, square dropdown" mismatch
that motivated this component. `Select` (`src/components/ui/Select.tsx`) is
a `<button>` trigger plus an absolutely-positioned `role="listbox"` styled
entirely with this system's own tokens (`--r-card` trigger, `--r-card-sm`
list, `--ember` for the active option) — closes on `Escape` or an outside
click, like the primitives' other small popovers (the user menu's
dropdown). Reach for it any time a filter or form needs a closed set of
options; reserve a native `<select>` for places where the browser's own
mobile picker UX is actually wanted (there are none of those yet).

### FloatingBackLink

Also added outside the original seven, for CU13/CU14's detail views and the
CU16 map view: a "Volver" pill that follows the scroll for the whole page
(`position: fixed`, pinned just under the sticky navbar) instead of living
inside the hero and disappearing the moment it scrolls past. When it starts
over a dark hero, pass `heroRef` (a ref to that hero element) and it
switches from a translucent dark pill to a light card-styled one via an
`IntersectionObserver` on that element, the instant the hero scrolls behind
the navbar — so it's always readable against whatever's now behind it.
Omit `heroRef` on a page with no dark hero (the map view) and it stays in
its light style throughout. See `src/components/ui/FloatingBackLink.tsx`.

## Iconography

**Lucide**, already installed as `lucide-react`. Stroke `1.75-2`, color
`currentColor`. Always consumed through the `Icon` primitive and its
registry: see
[To use a new icon](#to-use-a-new-icon-add-it-to-the-registry).

Don't use emoji as icons. Don't use filled icons: always outline, to match
the isotype's stroke.

## Logos

In [`public/brand/`](../../public/brand/):

| File | When |
|---|---|
| `logo-full-ink.png` | Full logo over a light background (cream) |
| `logo-full-white.png` | Full logo over a dark background (char) |
| `logo-mark-ink.png` | Isotype only, over light |
| `logo-mark-white.png` | Isotype only, over dark |

All with a transparent background. Always serve them with `<Image>` from
`next/image`.

## Motion

Fast and restrained. Entrances with fade + 8-12px displacement, 180-320ms,
`cubic-bezier(.2,.8,.2,1)`. On press, `scale(0.97-0.98)`.

Keyframes already defined in `tokens.css`: `fadeUp`, `pulseDot`, `spin`,
`glowPulse`, `shimmer`, `float`, `sp-carousel`.

No bouncing or infinite decorative animations. The only live animation
allowed is the plan-generation loader, in `--electric`.

## Brand voice

- The brand is written **`smartplan`**: one word, all lowercase. Never
  "SmartPlan" or "Smart Plan" in the interface.
- Lowercase as a signature. Avoid Title Case and ALL CAPS, except in
  `.sp-label`.
- Warm and concrete tone: talk **about the plan**, not about options.
- No emoji in the product interface.

- **Argentine "vos" form**, not "tú". The prototype is already written this
  way: *"Contale qué querés"*, *"cerca tuyo"*, *"Aún no guardaste ninguna
  actividad"*, *"Ingresá un email válido"*. It matches the delivery
  document's acceptance criteria.
- **Argentine pesos.**

> An earlier brief was written for Spain, with "tú" and euros. It belonged
> to design system v1 and **was removed**. If it shows up in an old copy,
> ignore it.

## Pending integration

The assets are already in the repo, but **not wired up yet**:

- [x] Load Bricolage Grotesque with `next/font/local` in `layout.tsx`
- [x] Import `src/styles/tokens.css` in `globals.css`. `tokens.css`'s own
      `@font-face` was removed (the font is now loaded by
      `next/font/local`) and the `--font` token now points to
      `var(--font-bricolage-grotesque)` instead of a literal family name
- [x] Expose the tokens to Tailwind 4 with `@theme inline` in
      `globals.css`: colors (`bg-ember`, `text-fg-1`, `bg-surface-card`,
      ...) and radii (`rounded-btn`, `rounded-card`, ...) are already
      available as utilities. Shadows and spacing (`--shadow-*`, `--s-*`)
      were deliberately left out: their names already match Tailwind's
      namespace (`--shadow-*`), and mapping them as-is
      (`--shadow-card: var(--shadow-card)`) creates a circular reference.
      If they're needed as a utility, the source token in `tokens.css`
      needs to be renamed first
- [x] Port the 7 primitives from `v2/Primitives.jsx` to React components
      with TypeScript

## What's in the repo and what isn't

| | |
|---|---|
| **In the repo** | Tokens (`src/styles/tokens.css`), logos (`public/brand/`), font (`src/app/fonts/`), sample images (`public/mock/`), and this documentation |
| **Not in the repo** | The 20-screen React prototype, by team decision |

Consequence: **the "Designed screens" section of this file is the only
versioned record of the design.** If a screen changes in the prototype,
update it here too. Otherwise the documentation and the design drift apart
and nobody knows which one is authoritative.

## Sample images

In [`public/mock/`](../../public/mock/) there are five photos from the
prototype (coffee, pizza, wine, martini, camera). They are **placeholders
for building screens**, not real catalog content. Delete them once the
actual activity images exist.
