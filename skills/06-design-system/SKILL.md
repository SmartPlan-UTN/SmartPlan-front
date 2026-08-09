---
name: smartplan-design-system
description: Design system EMBER — tokens de color, tipografía, espaciado, radios y los componentes primitivos (Button, Chip, Badge, Card). Leer antes de escribir cualquier estilo o componente visual.
---

# SmartPlan — Design System "EMBER"

Específico de `SmartPlan-front`. Fuente original: carpeta `SmartPlanSystemDesign`
(fuera de los repositorios).

## ⚠️ Hay dos versiones. Usá la v2

En la carpeta de diseño conviven dos sistemas incompatibles:

| Versión | Paleta | Estado |
|---|---|---|
| **v1** — `uploads/smartplan Design System/` | Ink `#0D0D0D`, Lime `#C8F135`, Violet `#5B3CF5`, Slate `#F4F3F0` | **Obsoleta.** No usar |
| **v2 "EMBER"** — `standalone/v2/tokens.css` | Ember, Char, Cream, Electric, Gold | **Vigente** |

La v2 es la que coincide con la guía visual del documento entregable. Si abrís el
`README.md` de la carpeta v1 y ves colores lima y violeta, es la iteración vieja:
ignorala.

Los tokens vigentes están copiados en [`src/styles/tokens.css`](../../src/styles/tokens.css).

## Paleta

### Núcleo
| Token | Hex | Uso |
|---|---|---|
| `--ember` | `#E85D20` | Color primario. CTAs, acentos, estado activo |
| `--char` | `#1A1109` | Texto principal y superficies oscuras (hero, navbar) |
| `--cream` | `#F5F0E8` | Fondo general de la aplicación |
| `--electric` | `#2B5BFF` | Todo lo relacionado con IA: generación de planes, sugerencias |
| `--gold` | `#FFD166` | Valoraciones y estrellas |

### Estado
`--success #22C06B` · `--warning #F5A623` · `--error #F04040`

### Superficies
| Token | Hex | Uso |
|---|---|---|
| `--surface` | `#F5F0E8` | Fondo (= cream) |
| `--surface-card` | `#FFFCF8` | Tarjeta sobre fondo claro. **Nunca blanco puro** |
| `--char-surface` | `#1E1812` | Tarjeta sobre fondo oscuro |
| `--char-surface2` | `#241D14` | Elevada / hover sobre oscuro |
| `--hairline` | `#E2DDD5` | Borde fino sobre claro |
| `--hairline-dark` | `rgba(255,255,255,0.07)` | Borde fino sobre oscuro |

### Texto
Sobre claro: `--fg-1 #1A1109` (principal) · `--fg-2 #5C5448` (secundario) · `--fg-3 #9E9589` (placeholder).
Sobre oscuro: `--fg-on-dark #F5F0E8` · `--fg-on-dark-2` (55%) · `--fg-on-dark-3` (30%).

**Nunca escribas un hex a mano.** Usá siempre la variable CSS.

## Tipografía

Fuente única: **Bricolage Grotesque** (variable, pesos 200–800), self-hosted en
[`src/app/fonts/`](../../src/app/fonts/). Se carga con `next/font/local`.

| Clase | Tamaño | Peso | Tracking |
|---|---|---|---|
| `.sp-display` | 78px | 800 | -0.03em |
| `.sp-h1` | 50px | 800 | -0.02em |
| `.sp-h2` | 36px | 700 | -0.01em |
| `.sp-h3` | 26px | 700 | -0.01em |
| `.sp-h4` | 20px | 700 | — |
| `.sp-body-lg` | 18px | 400 | — |
| `.sp-body` | 16px | 400 | — |
| `.sp-small` | 14px | 400 | — |
| `.sp-label` | 12px | 600 | +0.05em, mayúsculas |

> **Discrepancia con el documento entregable:** la Etapa 5 define H1 42px, H2 32px,
> H3 24px. El design system evolucionó a 50 / 36 / 26. Vale la v2; conviene
> actualizar el documento.

## Espaciado, radios y sombras

**Espaciado** (escala de 4): `--s-1 4` · `--s-2 8` · `--s-3 12` · `--s-4 16` ·
`--s-5 24` · `--s-6 32` · `--s-7 48` · `--s-8 64`.

**Radios:** `--r-btn 10` (botones) · `--r-card 16` · `--r-card-sm 12` ·
`--r-chip 99` (chips y badges) · `--r-pill 40`.

**Sombras:** `--shadow-card 0 4px 16px rgba(0,0,0,.08)` sobre claro,
`--shadow-card-dark 0 4px 20px rgba(0,0,0,.30)` sobre oscuro.
Foco: `--focus-ember 0 0 0 3px rgba(232,93,32,.18)`.

**Layout:** navbar `60px` · ancho máximo `1200px` · separación vertical de sección `64px`.

## Dónde está la fuente

```
SmartPlanSystemDesign/
├── v2/                     ← FUENTE DE VERDAD: 20 pantallas + tokens + primitivos
├── SmartPlan v3.html       ← el kit completo; necesita servidor HTTP
├── SmartPlan standalone.html   ← todo embebido, abre con doble clic (congelado)
├── assets/                 ← logos
└── fonts/                  ← Bricolage Grotesque
```

`standalone/v2/` es una **copia congelada** para el HTML autocontenido. No la edites
ni la tomes como referencia: usá siempre `v2/` de la raíz.

Para ver el kit hay que servirlo por HTTP, porque Babel carga los `.jsx` por XHR y
`file://` los bloquea:

```powershell
cd "c:\Users\lenovo\Desktop\SmartPlan\SmartPlanSystemDesign"
python -m http.server 8080
# http://127.0.0.1:8080/SmartPlan%20v3.html
```

## Pantallas del kit

Las 20 pantallas de `v2/`, mapeadas contra los casos de uso y las pantallas del
documento entregable:

| Componente | Pantalla | Casos de uso |
|---|---|---|
| `Landing.jsx` | PAN 07 — Home | CU17, CU20 |
| `Login.jsx` | PAN 04 — Login | CU1, CU2, CU3 |
| `PlanGenerator.jsx` | PAN 07 / PAN 09 | CU17, CU19, CU31 |
| `Results.jsx` | PAN 11 — Resultados | CU9, CU10, CU11, CU12 |
| `PlanDetail.jsx` | PAN 17 — Consultar plan | CU13, CU25–CU30, CU43 |
| `ActivityDetail.jsx` | PAN 18 — Consultar actividad | CU14, CU15, CU35, CU44, CU45 |
| `Favorites.jsx` | PAN 12 — Ver favoritos | CU39–CU43 |
| `History.jsx` | PAN 13 — Ver historial | CU23 |
| `Profile.jsx` | PAN 14 — Editar perfil | CU5, CU7 |
| `Preferences.jsx` | PAN 15 — Editar preferencias | CU8, CU18 |
| `Security.jsx` | — | CU6 |
| `AdminHome.jsx` | REP-01 — Panel de control | CU58 |
| `AdminUsers.jsx` | PAN 19 / REP-02 | CU57 |
| `AdminActivities.jsx` | PAN 21 — Gestionar actividades | CU53 |
| `AdminPlanes.jsx` | PAN 22 — Gestionar Plan | CU60 |
| `AdminReviews.jsx` | PAN 20 — Moderar valoraciones | CU55 |
| `Navbar.jsx` | transversal | — |
| `Carousel.jsx` | transversal | — |
| `MoodBackground.jsx` | transversal | — |
| `Primitives.jsx` | transversal | — |

**Antes de maquetar un issue, mirá su pantalla en el kit.** El diseño ya está
resuelto; no hay que inventarlo.

Falta diseño para PAN 05 (recuperar contraseña), PAN 08 (búsqueda por mapa),
PAN 10 (planes recomendados) y las pantallas de colección (CU32–CU38).

## Componentes primitivos

Los siete de `v2/Primitives.jsx`. Al portarlos a React con TypeScript, respetá
estas variantes:

### Button
Radio `--r-btn`, peso 700, `scale(0.97)` al presionar, `brightness(1.1)` en hover.

| Variante | Fondo | Texto |
|---|---|---|
| `primary` | `--ember` | blanco |
| `secondary` | `--char` | `--cream` |
| `ghost` | transparente | `--fg-on-dark`, borde `rgba(255,255,255,.15)` |
| `ghostLight` | transparente | `--fg-1`, borde `--hairline` |
| `ghostEmber` | `ember-15` | `--ember` |
| `ai` | `--electric` | blanco |
| `danger` | `--error` | blanco |

Tamaños: `sm` 12px/`7px 14px` · `md` 14px/`10px 20px` · `lg` 16px/`14px 28px`.

### Chip
Radio `--r-chip`, peso 600, 14px. Activo: relleno `--ember` con texto blanco.
Inactivo: transparente con borde (`--hairline` sobre claro, `rgba(255,255,255,.18)`
sobre oscuro).

### Badge
Radio 99, 12px, peso 600. Variantes: `ai` (electric-15), `cost` (ember-10),
`rating` (gold-15 con texto `#7A5C00`), `success`, `tag`, `warn`, `dark`.

### Icon
Envuelve Lucide. Props: `name`, `size` (18 por defecto), `color`, `stroke` (2).
Al portarlo, usá directamente `lucide-react` en vez del script global.

### Stars
Puntuación de 0 a 5 con medias estrellas. Relleno `#FFD166`, vacío
`rgba(255,209,102,0.22)`. Props: `rating`, `size` (12).

### Logo
Props: `variant` (`white` | `ink`), `kind` (`full` | `mark`), `height` (26).
Resuelve el archivo por convención `logo-{kind}-{variant}.png`. Al portarlo,
apuntá a `public/brand/` y usá `<Image>` de `next/image`.

### Divider
Línea de 1px. `--hairline` sobre claro, `--hairline-dark` sobre oscuro.
Prop `dark`.

> **No existe un primitivo Card.** La tarjeta es un patrón, no un componente:
> `--surface-card` sobre fondo claro, radio `--r-card`, borde `1px --hairline`,
> sombra `--shadow-card`. Sobre oscuro, `--char-surface` con `--hairline-dark`.

## Iconografía

**Lucide**, ya instalado como `lucide-react`. Trazo `1.75–2`, color `currentColor`.

No uses emoji como iconos. No uses iconos rellenos: siempre de línea, para que
acompañen el trazo del isotipo.

## Logos

En [`public/brand/`](../../public/brand/):

| Archivo | Cuándo |
|---|---|
| `logo-full-ink.png` | Logo completo sobre fondo claro (cream) |
| `logo-full-white.png` | Logo completo sobre fondo oscuro (char) |
| `logo-mark-ink.png` | Solo isotipo sobre claro |
| `logo-mark-white.png` | Solo isotipo sobre oscuro |

Todos con fondo transparente. Servilos siempre con `<Image>` de `next/image`.

## Movimiento

Rápido y sobrio. Entradas con fade + desplazamiento de 8–12px, 180–320ms,
`cubic-bezier(.2,.8,.2,1)`. Al presionar, `scale(0.97–0.98)`.

Keyframes ya definidos en `tokens.css`: `fadeUp`, `pulseDot`, `spin`, `glowPulse`,
`shimmer`, `float`, `sp-carousel`.

Sin rebotes ni animaciones decorativas infinitas. La única animación viva permitida
es el loader de generación de plan, en `--electric`.

## Voz de marca

- La marca se escribe **`smartplan`**: una palabra, todo en minúscula. Nunca
  "SmartPlan" ni "Smart Plan" en la interfaz.
- Minúsculas como firma. Evitá Title Case y MAYÚSCULAS, salvo en `.sp-label`.
- Tono cercano y concreto: hablá **del plan**, no de opciones.
- Sin emoji en la interfaz de producto.

> **Conflicto a resolver con el equipo:** el brief original está escrito para
> España — trata de **"tú"** ("dinos qué te apetece") y usa **euros**. El proyecto
> es de Mendoza, Argentina: corresponde **voseo** ("decinos qué te gusta") y
> **pesos argentinos**. Los criterios de aceptación del documento entregable ya usan
> voseo ("Aún no tenés planes guardados"), así que la referencia correcta es el
> documento, no el brief.

## Pendiente de integración

Los assets ya están en el repo, pero **todavía no están cableados**:

- [ ] Cargar Bricolage Grotesque con `next/font/local` en `layout.tsx` (hoy carga Geist)
- [ ] Importar `src/styles/tokens.css` en `globals.css`
- [ ] Exponer los tokens a Tailwind 4 con `@theme` para poder usarlos como utilidades
- [ ] Portar los 7 primitivos de `v2/Primitives.jsx` a componentes React con TypeScript

## ⚠️ El design system no está versionado

La carpeta `SmartPlanSystemDesign` vive en el escritorio de una sola máquina, fuera
de los dos repositorios. **No está en git.** Si esa máquina se pierde, se pierden
las 20 pantallas y no hay copia.

Acá solo están los tokens, los logos y la fuente. Los `.jsx` de las pantallas, no.
Conviene commitear la carpeta `v2/` en algún lado antes de seguir.

## Imágenes de ejemplo

En [`public/mock/`](../../public/mock/) hay cinco fotos del prototipo (café, pizza,
vino, martini, cámara). Son **placeholders para maquetar**, no contenido real del
catálogo. Borralas cuando existan las imágenes de las actividades.
