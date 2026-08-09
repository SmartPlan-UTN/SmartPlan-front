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

## Componentes primitivos

Definidos en `standalone/v2/Primitives.jsx` del design system. Al portarlos a React
con TypeScript, respetá estas variantes:

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

### Card
`--surface-card` sobre fondo claro, radio `--r-card`, borde `1px --hairline`,
sombra `--shadow-card`.

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
- [ ] Portar los primitivos de `Primitives.jsx` a componentes React con TypeScript

## Imágenes de ejemplo

En [`public/mock/`](../../public/mock/) hay cinco fotos del prototipo (café, pizza,
vino, martini, cámara). Son **placeholders para maquetar**, no contenido real del
catálogo. Borralas cuando existan las imágenes de las actividades.
