---
name: smartplan Landing
description: Un editorial cálido de Mendoza que convierte una idea cotidiana en un recorrido posible.
colors:
  terracotta: "#E85D20"
  espresso: "#1A1109"
  cream: "#F5F0E8"
  paper: "#FFFCF8"
  sand: "#EFE2D3"
  ink-muted: "#5C5448"
  ink-quiet: "#9E9589"
  gold: "#FFD166"
  white: "#FFFFFF"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Arial Narrow, sans-serif"
    fontSize: "clamp(48px, 6.5vw, 88px)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Bricolage Grotesque, Arial Narrow, sans-serif"
    fontSize: "clamp(34px, 5vw, 64px)"
    fontWeight: 800
    lineHeight: 0.96
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Bricolage Grotesque, Arial Narrow, sans-serif"
    fontSize: "clamp(15px, 1.4vw, 18px)"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Bricolage Grotesque, Arial Narrow, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.05em"
rounded:
  button: "10px"
  card-small: "12px"
  card: "16px"
  composer: "19px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
  4xl: "64px"
components:
  composer:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.espresso}"
    rounded: "{rounded.composer}"
    height: "64px"
  primary-action:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.white}"
    rounded: "{rounded.card-small}"
    height: "46px"
---

# Design System: smartplan Landing

## Overview

**Creative North Star: "El cuaderno de una salida mendocina"**

El landing combina la claridad de una página editorial con fragmentos físicos de un plan real: mapa, entrada, cámara, café y fotografías de personas compartiendo experiencias. La composición es cálida, humana y local sin recurrir a folclore decorativo; el composer sigue siendo el centro de gravedad y el resto de la página demuestra qué puede surgir de una idea.

**Características clave:**

- Grandes titulares compactos, de ritmo editorial, con una frase o línea en terracota.
- Mucho aire, secciones de lectura clara y cambios de superficie que marcan el argumento.
- Fotografía humana a sangre para inspirar; objetos recortados sólo como marco del hero.
- Movimiento breve y compuesto, siempre prescindible.

## Colors

La base es crema y papel; terracota comunica acción y deseo; espresso aporta el contraste narrativo. Arena, tinta apagada y oro sostienen jerarquía sin competir con esos tres roles.

- **Terracota:** CTA principal, líneas decisivas de titulares, iconos activos, foco y trazado de recorridos. Debe ser escaso y reconocible.
- **Espresso:** texto principal y la sección inmersiva oscura. En fondos oscuros, usar crema para texto y oro para tiempos o hitos.
- **Crema y papel:** lienzo general y superficies elevadas. El papel es ligeramente más claro que el fondo para separar campos y tarjetas sin blanco clínico.
- **Arena:** banda de exploración manual y transiciones cálidas entre secciones.
- **Tinta apagada y silenciosa:** cuerpo secundario, leyendas, placeholders y palabras desactivadas en titulares.
- **Oro:** acento informativo dentro de espresso; no reemplaza al terracota como llamada a la acción.

**The One Ember Rule.** En una zona de lectura, una sola voz terracota debe dominar: CTA, frase o recorrido, no todos a la vez.

## Typography

Bricolage Grotesque se carga localmente como fuente variable (peso 200–800) y se usa en toda la experiencia. Su anchura compacta permite titulares expresivos sin introducir una segunda familia.

- **Display:** peso 800, interletraje muy cerrado y altura de línea 0.9–0.96. Usar `text-wrap: balance` y limitar a 10–18 caracteres de ancho según la sección.
- **Titulares de sección:** escala fluida, peso 800 y una palabra o frase secundaria en terracota o tinta silenciosa.
- **Cuerpo:** 15–18px, altura de línea 1.55–1.6 y medida habitual de 46–65 caracteres.
- **Etiquetas:** 11–12px, peso 600–700, tracking positivo; mayúsculas sólo para kicker, metadata o disclosure.

**The Compressed Headline Rule.** La personalidad proviene de escala, peso y cortes de línea; no de sombras, contornos ni tipografías decorativas.

## Layout

El landing avanza como un argumento: idea y composer, inspiración visual, explicación inmersiva, cuatro pasos, forma de la respuesta, exploración manual y CTA final. Las secciones usan contenedores de 1200–1320px, padding lateral fluido de 20–56px y padding vertical aproximado de 60–132px. El hero ocupa al menos el viewport disponible y centra un escenario de 780px con composer de hasta 720px.

Los principales cambios responsivos son:

- **≤1180px:** se limpia la periferia del hero y se reduce su titular.
- **≤900px:** la historia deja de ser sticky, pasa a flujo estático y las composiciones complejas se simplifican; la galería pasa a dos columnas.
- **≤860–820px:** pasos y bloque de exploración pasan a una columna.
- **≤620px:** la galería se convierte en carril horizontal con `scroll-snap`; se ocultan objetos y textos secundarios antes de comprimirlos.
- **≤560px:** el composer oculta el icono inicial y convierte la acción en botón cuadrado; por debajo de 430–380px se reducen opciones, nunca el objetivo táctil principal.

**The Editorial Sequence Rule.** Cada sección debe responder una sola pregunta y preparar la siguiente; no apilar widgets ni repetir la misma promesa.

## Elevation & Depth

La profundidad es suave y material. Campos y tarjetas usan hairlines, una sombra ambiental corta y, al interactuar, una elevación de pocos píxeles. Los gradientes crema, el velo radial del hero y los cambios crema–arena–espresso separan planos con más frecuencia que las sombras. Los objetos recortados son la excepción: llevan una sombra proyectada cálida para parecer apoyados sobre papel.

**The Flat-by-Default Rule.** Las superficies descansan casi planas; el lift y el brillo pertenecen a hover, foco o al objeto físico del hero.

## Shapes

Las superficies funcionales tienen esquinas suaves de 10–19px. Chips, marcadores y metadata son píldoras completas. Las fotografías se recortan en tarjetas editoriales de 16px; el hero evita contenedores visibles y deja que sus objetos entren parcialmente desde fuera del viewport. Las líneas finas conectan pasos, recorridos y listas de capacidades.

## Components

### Composer

Es la pieza protagonista: una sola superficie papel de 64px de alto, radio de 19px, hairline y halo terracota ambiental. El foco se comunica con borde terracota, anillo exterior y un lift de 1px. La acción es terracota, 46px de alto; en mobile conserva un objetivo de 44×44px. Starter ideas y sorpresa viven debajo, visualmente subordinados.

### Hero objects

Usar exclusivamente los PNG transparentes de `public/landing/hero/`: `map`, `polaroid`, `camera`, `ticket`, `coffee`, `wine`, `headphones` y `compass`. Son decorativos (`alt=""`, `aria-hidden`) y nunca deben invadir el velo central que protege la legibilidad del titular y composer. Mapa y polaroid se cargan con prioridad; el resto puede diferirse. En tablet sobreviven mapa, polaroid, ticket y café; en mobile bajan su opacidad y quedan parcialmente recortados. No sumar objetos sin resolver posición, crop y densidad en 1440, 820 y 390px.

### Editorial photography

Las fotos muestran personas, comida, cafés, viñedos y paisaje mendocino en situaciones vividas, no packshots. Van a sangre con `object-fit: cover`, crop intencional por imagen, scrim oscuro inferior y texto blanco. La grilla asimétrica de desktop se vuelve carril horizontal en mobile. Toda foto informativa requiere `alt` descriptivo; el scrim es decorativo.

### Motion

La gramática compartida prioriza `transform` y `opacity`, sin rebote ni spring. Los controles responden en 180–220ms y los objetos del hero entran en 260ms; las transiciones ligadas al scroll siguen su progreso directamente mediante variables CSS actualizadas en un `requestAnimationFrame`, sin estado React por frame. Los reveals parten visibles sin JavaScript. Con `prefers-reduced-motion: reduce`, no hay parallax, sticky story, autoplay, scroll suave ni contenido oculto por animación: todos los estados de la historia aparecen completos en flujo normal.

## Do's and Don'ts

### Do

- **Do** mantener al composer como la acción más clara del primer viewport y repetirlo sólo como cierre más silencioso.
- **Do** validar composición y crops en las referencias 1440, 820 y 390px.
- **Do** preservar landmarks, headings asociados, texto alternativo, foco visible terracota y carriles operables con teclado.
- **Do** conservar contraste y contenido completo cuando no hay JavaScript o se solicita movimiento reducido.

### Don't

- **Don't** convertir el landing en un dashboard, una grilla SaaS uniforme o una colección de cards equivalentes.
- **Don't** usar objetos recortados fuera del hero ni sustituir la fotografía humana por renders de catálogo.
- **Don't** agregar acentos de color al mismo nivel que terracota, crema y espresso; azul eléctrico y oro son apoyos puntuales.
- **Don't** esconder información esencial detrás de hover, animación o scroll no accesible.
