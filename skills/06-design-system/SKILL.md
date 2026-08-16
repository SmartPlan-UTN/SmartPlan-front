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

## ⚠️ El prototipo no está en el repositorio

El kit de alta fidelidad —20 pantallas en React— vive en la carpeta
`SmartPlanSystemDesign`, en la máquina de un integrante, **fuera de git por decisión
del equipo**. No se va a subir.

**Esta sección es el único registro durable de ese diseño.** Está descrita para que
puedas maquetar sin acceso al prototipo. Si tenés la carpeta a mano, se levanta así:

```powershell
cd "<ruta>\SmartPlanSystemDesign"
python -m http.server 8080
# http://127.0.0.1:8080/SmartPlan%20v3.html
```

Hace falta servidor HTTP porque Babel carga los `.jsx` por XHR y `file://` los bloquea.
También existe `SmartPlan standalone.html`, con todo embebido, que abre con doble clic.

## Pantallas diseñadas

### Públicas y de sesión

**Login** — CU1, CU2, CU3 · PAN 04
Alterna entre iniciar sesión y registro. Medidor de fortaleza de contraseña
(Débil / Media / Fuerte), mostrar-ocultar con icono `eye-off`, validación inline
("Este campo es requerido", "Las contraseñas no coinciden", "Ingresá un email
válido"). Superficie oscura con `blur(8px)`. Deriva a `admin-inicio` si el rol es
administrador.

### Aplicación

**Landing / Home** — CU17, CU20 · PAN 07
Hero sobre fondo oscuro con `MoodBackground` animado detrás. Campo central de
lenguaje natural: *"Contale qué querés"*, se envía con Enter. Debajo, chips de
sugerencias (*"Algo romántico y sorpresa para hoy"*, *"Aventura serrana familiar"*,
*"Algo que no se me ocurriría nunca"*). Más abajo, carrusel de categorías y planes
destacados con su secuencia resumida (*"Café → Paseo → Cena"*), distancia
(*"A 2.5 km"*) y momento (*"Esta tarde"*). Ubicación por defecto: Mendoza.

**PlanGenerator** — CU17, CU19, CU31 · PAN 07 / PAN 09
Formulario de parámetros: presupuesto, zona (barrios), momento, tipo de salida
(Con amigos / En pareja / Familiar), características (Aire libre, Accesible,
Con estacionamiento). Pantalla de espera con pasos progresivos —"Analizando tus
preferencias", "Buscando actividades compatibles", "Armando combinaciones
perfectas"— en `--electric`, que es la única animación viva permitida.

**Results** — CU9–CU12 · PAN 11
Grilla de tarjetas de plan y actividad. Cada tarjeta lleva título, secuencia
(*"Bodega → Almuerzo → Degustación"*), `Badge` de categoría (Cultural,
Gastronómico, Romántico, Activo, Al aire libre), `Stars` con la valoración y
distancia. Fila superior de chips de filtro con scroll horizontal sin barra.
Estado de carga: *"Buscando lo mejor cerca tuyo..."*.

**PlanDetail** — CU13, CU25–CU30, CU43 · PAN 17
Cabecera con nombre del plan y recorrido (*"Valle de Uco → Luján de Cuyo"*).
Lista ordenada de actividades, cada una con horario, nombre del lugar, tipo
(*"Bodega · Degustación"*), dirección y costo. `Divider` entre items. Costo total
al pie y botón **Guardar plan**.

**ActivityDetail** — CU14, CU15, CU35, CU44, CU45 · PAN 18
Detalle con foto, descripción, horarios (*"Lun–Dom: 12:00–16:00"*), enlace a
Google Maps y listado de valoraciones con autor y `Stars`. Botón de guardar con
dos estados: **Guardar** / **Guardada**. Pestaña de Información.

**Favorites** — CU39–CU43 · PAN 12
Tres solapas: Actividades, Planes y Colecciones. Cada una con su estado vacío
propio: *"Aún no guardaste ninguna actividad"*, *"Aún no guardaste ningún plan"*,
*"Aún no creaste ninguna colección"*. Las colecciones tienen nombre libre
(*"Bodegas para visitar"*).

**History** — CU23 · PAN 13
Listado de planes por estado, con badge `DRAFT` para los borradores y estados
`generating` para los que están procesándose. Estado vacío: *"Tus planes guardados
aparecerán acá"*.

**Profile** — CU5, CU7 · PAN 14
Datos personales con validación inline. Incluye la sección de contraseña con las
mismas reglas que Security.

**Preferences** — CU8, CU18 · PAN 15
Categorías de interés como chips seleccionables (cultura, compras, gastronomía…),
presupuesto habitual con validación (*"Ingresá un presupuesto válido mayor a $0"*)
y zona de preferencia.

**Security** — CU6
Cambio de contraseña con medidor de fortaleza y checklist de requisitos:
*"Mínimo 8 caracteres"*, *"Al menos una mayúscula"*, *"Incluir números y símbolos"*.

### Panel de administración

**AdminHome** — CU58 · REP-01
Tarjetas de KPI: Total de Usuarios, Planes Activos, Actividades en Catálogo,
Valoraciones Pendientes. Debajo, tasa de aceptación, valoración promedio y
retención. Distribución por estado de ánimo (Relax, Festiva, Romántica, Aventura,
Cultural) y por tamaño de grupo (En pareja, Grupo chico, Grupo grande) con barras
de porcentaje. Ranking de actividades más populares y feed de actividad reciente.
Selector de rango: Hoy / 7 días / 30 días / Este mes.

**AdminUsers** — CU57 · PAN 19 / REP-02
Métricas de encabezado (total, activos hoy, nuevos registros de la semana) y tabla
de usuarios con nombre, email, fecha de alta y estado: Activo, Suspendido, Baneado.
Acciones por fila, entre ellas **Reactivar cuenta**. Filtro por estado.

**AdminActivities** — CU53 · PAN 21
Tabla del catálogo con filtros por categoría (Aventura, Cultura & Arte, Bienestar,
Entretenimiento, Gastronomía) y por tipo de salida. Alta, edición y baja.

**AdminPlanes** — CU60 · PAN 22
Tabla de planes con estado y filtros. Edición y baja desde administración.

**AdminReviews** — CU55 · PAN 20
Bandeja de moderación con solapas Pendientes / Aprobadas. Cada fila con autor,
plan valorado y antigüedad relativa (*"Hace 2 horas"*, *"Hace 3 días"*).

### Transversales

**Navbar** — barra de 60px con `backdrop-filter: blur(18px)` sobre el hero.
Navegación: Inicio, Explorar, Favoritos, Historial, y menú de usuario con Mi Perfil
y Preferencias.

**Carousel** — carrusel infinito de categorías: Gastronomía, Vinos & Bodegas,
Cultura & Arte, Vida nocturna, Cócteles, Café & Brunch, y de momentos: Con amigos,
Noche especial, Tarde de semana, Fin de semana. El keyframe `sp-carousel` de
`tokens.css` desplaza exactamente un set de 5 items.

**MoodBackground** — fondo animado del hero. Manchas de color muy tenues (opacidad
5–10%) que transicionan en 1.4s según el estado de ánimo seleccionado. Es
decorativo; no debe competir con el contenido.

### Lo que falta diseñar

No hay pantalla en el kit para:

- **PAN 05** — Recuperar contraseña (CU3 tiene el formulario en Login, pero no el
  flujo de token)
- **PAN 08** — Búsqueda por mapa (CU16)
- **PAN 10** — Planes recomendados (CU20 aparece embebido en el Home, sin pantalla propia)
- **Módulo de colección completo** — CU32 a CU38. En Favorites hay una solapa de
  colecciones, pero no están el detalle ni el alta.

Son 7 casos de uso sin diseño. Hay que resolverlos al maquetar o pedirle las
pantallas al diseñador.

## Contenido de referencia

El prototipo usa datos de Mendoza y Buenos Aires: Ruta del vino en Luján de Cuyo,
Bodega Zuccardi Valle de Uco, Termas de Cacheuta, Potrerillos, Chacras de Coria,
Uspallata, San Telmo, Palermo. Los precios van en **pesos argentinos**.

Sirve como referencia de tono y de volumen de texto al maquetar. **No es contenido
real**: son datos de ejemplo.

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

- **Voseo argentino**, no "tú". El prototipo ya está escrito así: *"Contale qué
  querés"*, *"cerca tuyo"*, *"Aún no guardaste ninguna actividad"*, *"Ingresá un
  email válido"*. Coincide con los criterios de aceptación del documento entregable.
- **Pesos argentinos.**

> Existió un brief anterior escrito para España, con "tú" y euros. Pertenecía a la
> versión v1 del design system y **se eliminó**. Si aparece en alguna copia vieja,
> ignoralo.

## Pendiente de integración

Los assets ya están en el repo, pero **todavía no están cableados**:

- [x] Cargar Bricolage Grotesque con `next/font/local` en `layout.tsx`
- [ ] Importar `src/styles/tokens.css` en `globals.css` — al hacerlo, borrar el
      `@font-face` que trae el archivo: la fuente ya la carga `next/font/local`,
      y dejar los dos significa declararla dos veces
- [ ] Exponer los tokens a Tailwind 4 con `@theme` para poder usarlos como utilidades
- [ ] Portar los 7 primitivos de `v2/Primitives.jsx` a componentes React con TypeScript

## Qué está en el repo y qué no

| | |
|---|---|
| **En el repo** | Tokens (`src/styles/tokens.css`), logos (`public/brand/`), fuente (`src/app/fonts/`), imágenes de ejemplo (`public/mock/`) y esta documentación |
| **Fuera del repo** | El prototipo React de 20 pantallas, por decisión del equipo |

Consecuencia: **la sección "Pantallas diseñadas" de este archivo es el único
registro versionado del diseño.** Si cambian una pantalla en el prototipo,
actualizá acá también. Si no, la documentación y el diseño se separan y nadie
sabe cuál vale.

## Imágenes de ejemplo

En [`public/mock/`](../../public/mock/) hay cinco fotos del prototipo (café, pizza,
vino, martini, cámara). Son **placeholders para maquetar**, no contenido real del
catálogo. Borralas cuando existan las imágenes de las actividades.
