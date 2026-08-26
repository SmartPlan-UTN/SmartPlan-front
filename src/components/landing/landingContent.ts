import type { IconName } from "@/components/ui";

import type { MediaKey } from "./landingMedia";

/**
 * Every word the landing says, in one file.
 *
 * Copy is Spanish with voseo, per the brand voice; the code around it is
 * English, per `AGENTS.md`. Keeping it here rather than inline in ten
 * components is what makes the page's argument readable end to end — you
 * can see whether it builds, without opening ten files.
 *
 * ── The honesty constraint ──────────────────────────────────────────
 *
 * `PRODUCT.md` is explicit: there is no live catalogue, no verifiable
 * social proof, and no commercial metrics behind this page. So nothing
 * below names a venue, quotes a price, shows a rating, or attributes
 * anything to a user. The example recorridos are labelled as examples on
 * screen, and describe *kinds* of moment — which is real — rather than
 * places, which would be invented.
 */

/* ── Hero ─────────────────────────────────────────────────────────── */

export const HERO = {
  eyebrow: "Salidas por Mendoza",
  /** Kept verbatim from the previous Home: the phrase already works. */
  headline: ["Escribí una idea.", "Recibí un plan."],
  subheadline:
    "Contale a smartplan qué tenés ganas de hacer. Te devuelve alternativas de salida con lugares, tiempos y costos que tienen sentido entre sí.",
} as const;

/**
 * The animated placeholder.
 *
 * Ordered so that any two consecutive phrases show two *different shapes*
 * of intention — company, then moment, then a constraint, then distance.
 * Someone who watches this for four seconds should conclude "I can write
 * anything here", which is the whole job of the animation.
 *
 * Module scope, not a literal in a render: `useTypewriter` restarts
 * whenever this array's identity changes.
 */
export const PLACEHOLDER_PHRASES = [
  "Una tarde de vinos con amigos, sin manejar…",
  "Algo tranquilo para hoy a la noche, cerca del centro…",
  "Un domingo al aire libre con los chicos…",
  "Una cita al atardecer, con buena comida y vista…",
  "Un día en la montaña y volver antes de que oscurezca…",
  "Algo para hacer un sábado de lluvia, sin gastar mucho…",
] as const;

/**
 * Quick intents.
 *
 * Each chip writes a *whole phrase* into the composer, not its own label.
 * That is the point: a chip that inserted the word "Cita" would teach
 * that this is a keyword box. Inserting a full sentence teaches, by
 * demonstration, that the field wants a sentence — which is the single
 * thing a first-time visitor has to learn here.
 */
export const INTENTS: readonly { label: string; icon: IconName; query: string }[] = [
  { label: "Hoy a la noche", icon: "moon", query: "Algo para hacer hoy a la noche, cerca del centro" },
  { label: "Con amigos", icon: "users", query: "Una salida con amigos, para juntarnos y comer algo" },
  { label: "Cita", icon: "heart", query: "Una cita al atardecer, con buena comida y vista" },
  { label: "Comer algo", icon: "utensils", query: "Salir a comer algo rico, sin que sea una producción" },
  { label: "Aire libre", icon: "trees", query: "Un plan al aire libre, con caminata y buen clima" },
  { label: "Barato", icon: "wallet", query: "Un plan barato para el fin de semana, sin gastar mucho" },
  { label: "Cerca mío", icon: "map-pin", query: "Algo cerca de donde estoy, que no me lleve todo el día" },
] as const;

/* ── Inspiration gallery ──────────────────────────────────────────── */

export interface InspirationTile {
  id: string;
  kicker: string;
  title: string;
  caption: string;
  icon: IconName;
  media: MediaKey;
  /** The colour the tile holds while its photograph loads. */
  tone: "ember" | "char" | "gold" | "electric" | "cream";
  /** Grid emphasis. `feature` is the big one. */
  scale: "feature" | "tall" | "wide" | "regular";
}

/**
 * Six tiles, and the copy on each one describes what is actually in its
 * photograph. That sounds obvious, but it is the thing that makes a
 * gallery read as real rather than as stock: a caption about a sunset
 * over a picture of a table is the tell.
 */
export const INSPIRATION = {
  kicker: "Todo esto es una salida",
  title: ["Hay más para hacer", "de lo que uno se acuerda."],
  lead:
    "Una salida no siempre es una cena. A veces es una caminata corta, un café largo, o una tarde que no tenías planeada.",
  tiles: [
    {
      id: "mesa",
      kicker: "Gastronomía",
      title: "Mesas para compartir",
      caption: "Cocina que se disfruta con tiempo, y una sobremesa que se estira.",
      icon: "utensils",
      media: "mesaCompartida",
      tone: "char",
      scale: "feature",
    },
    {
      id: "cordillera",
      kicker: "Atardeceres",
      title: "El valle a esta hora",
      caption: "A una hora del centro, el cielo hace esto todos los días.",
      icon: "sunset",
      media: "atardecerPareja",
      tone: "ember",
      scale: "tall",
    },
    {
      id: "noche",
      kicker: "Noche",
      title: "Salir sin plan fijo",
      caption: "Una feria, música en vivo, y la noche que se acomoda sola.",
      icon: "music-2",
      media: "feriaNocturna",
      tone: "char",
      scale: "regular",
    },
    {
      id: "cafe",
      kicker: "Cafés",
      title: "Una tarde para quedarse",
      caption: "Mesa junto a la ventana, y nadie apurándote.",
      icon: "coffee",
      media: "cafeLectura",
      tone: "cream",
      scale: "regular",
    },
    {
      id: "informal",
      kicker: "Informal",
      title: "Comer con las manos",
      caption: "Lo que se pide para el medio de la mesa y desaparece primero.",
      icon: "pizza",
      media: "pizzaPatio",
      tone: "ember",
      scale: "wide",
    },
    {
      id: "vinos",
      kicker: "Bodegas",
      title: "Tarde de viñedos",
      caption: "Una copa con vista, y alguien más manejando de vuelta.",
      icon: "wine",
      media: "bodegaParral",
      tone: "gold",
      scale: "wide",
    },
  ] satisfies InspirationTile[],
} as const;

/* ── The immersive section ────────────────────────────────────────── */

/**
 * Labels for the constellation. These are fragments of intention, the
 * kind of thing a person actually writes, deliberately unordered — the
 * animation's whole argument is that smartplan is what turns this cloud
 * into a sequence.
 */
export const INTENT_NODES = [
  "vinos",
  "atardecer",
  "con amigos",
  "sin manejar",
  "barato",
  "al aire libre",
  "cerca",
  "tranquilo",
  "buena comida",
  "vista",
  "caminar",
  "música",
  "sábado",
  "café",
  "sobremesa",
  "en pareja",
  "temprano",
  "sin reserva",
  "montaña",
  "de noche",
  "algo rico",
  "en el centro",
  "poco tiempo",
  "que rinda",
] as const;

export const STORY = {
  kicker: "Qué hace smartplan",
  title: ["De muchas ganas sueltas,", "un recorrido que se puede hacer."],
  lead:
    "Lo que escribís no es una lista de filtros: son varias intenciones a la vez. smartplan las cruza, descarta lo que no encaja y ordena el resto en una secuencia con horarios que cierran.",
  /** Rendered as the accessible text equivalent of the canvas. */
  phases: [
    { at: "Escribís", copy: "Todo junto y desordenado, como se piensa." },
    { at: "smartplan cruza", copy: "Descarta lo incompatible y agrupa lo que sí encaja." },
    { at: "Se ordena", copy: "Queda un recorrido con tiempos que se pueden cumplir." },
  ],
  stops: [
    { time: "17:30", label: "Atardecer" },
    { time: "20:00", label: "Mesa" },
    { time: "22:30", label: "Café" },
  ],
} as const;

/* ── How it works ─────────────────────────────────────────────────── */

export const HOW = {
  kicker: "Cómo funciona",
  title: ["Cuatro pasos.", "Sólo el primero es tuyo."],
  steps: [
    {
      n: "01",
      icon: "message-circle" as IconName,
      title: "Contás qué tenés ganas de hacer",
      copy: "Una frase alcanza. No hay filtros que completar antes de empezar.",
    },
    {
      n: "02",
      icon: "sparkles" as IconName,
      title: "smartplan entiende tu idea y tu contexto",
      copy: "Cruza lo que escribiste con lo que quieras sumar y con tus preferencias.",
    },
    {
      n: "03",
      icon: "route" as IconName,
      title: "Te devuelve recorridos posibles",
      copy: "Lugares, tiempos y costos ordenados en una secuencia que se puede hacer.",
    },
    {
      n: "04",
      icon: "check" as IconName,
      title: "Elegís, ajustás y salís",
      copy: "Te quedás con el que más te cierra, y lo cambiás si hace falta.",
    },
  ],
} as const;

/* ── Illustrative showcase ────────────────────────────────────────── */

export interface ShowcasePlan {
  id: string;
  title: string;
  duration: string;
  /** 1-3, rendered as filled/empty glyphs. Never a currency amount. */
  budget: 1 | 2 | 3;
  tags: readonly string[];
  moments: readonly { time: string; label: string }[];
  icon: IconName;
  /** The colour the card holds while its photograph loads. */
  tone: "ember" | "char" | "gold" | "electric" | "cream";
  media: MediaKey;
}

export const SHOWCASE = {
  kicker: "Ideas para arrancar",
  title: ["Así se ve", "una respuesta."],
  lead:
    "Ejemplos de recorridos armados a partir de una sola frase. Sirven para entender la forma de lo que vas a recibir.",
  /** Shown on every card. The page must never imply these are real plans. */
  badge: "Ejemplo ilustrativo",
  plans: [
    {
      id: "cafe-tarde",
      title: "Café largo y una vuelta por el centro",
      duration: "3 h",
      budget: 1,
      tags: ["Café", "Caminata", "Tranquilo"],
      moments: [
        { time: "16:00", label: "Café con mesa junto a la ventana" },
        { time: "17:30", label: "Vuelta a pie por el casco histórico" },
        { time: "19:00", label: "Algo dulce antes de volver" },
      ],
      icon: "coffee",
      tone: "cream",
      media: "cafeEstudio",
    },
    {
      id: "vinos",
      title: "Tarde de vinos con amigos, sin manejar",
      duration: "5 h",
      budget: 3,
      tags: ["Vinos", "Con amigos", "Con traslado"],
      moments: [
        { time: "16:30", label: "Degustación con vista al viñedo" },
        { time: "18:30", label: "Picada larga, sin apuro" },
        { time: "21:00", label: "Vuelta con traslado incluido" },
      ],
      icon: "wine",
      tone: "gold",
      media: "vinedoMesa",
    },
    {
      id: "aire-libre",
      title: "Domingo al aire libre, sin alejarse mucho",
      duration: "6 h",
      budget: 1,
      tags: ["Aire libre", "En familia", "Barato"],
      moments: [
        { time: "09:30", label: "Caminata suave y desayuno afuera" },
        { time: "12:30", label: "Mesa a la sombra, sin apuro" },
        { time: "16:00", label: "Vuelta antes de que baje el sol" },
      ],
      icon: "trees",
      tone: "electric",
      media: "atardecerAmigos",
    },
    {
      id: "cita",
      title: "Cita al atardecer, con buena comida y vista",
      duration: "4 h",
      budget: 2,
      tags: ["En pareja", "Atardecer", "Gastronomía"],
      moments: [
        { time: "18:30", label: "Copa mirando cómo se cae el sol" },
        { time: "20:30", label: "Cena de autor, mesa tranquila" },
        { time: "22:30", label: "Sobremesa corta y a casa" },
      ],
      icon: "heart",
      tone: "ember",
      media: "atardecerDeck",
    },
    {
      id: "noche",
      title: "Noche con amigos gastando poco",
      duration: "4 h",
      budget: 1,
      tags: ["Noche", "Con amigos", "Barato"],
      moments: [
        { time: "21:00", label: "Algo para compartir en el medio de la mesa" },
        { time: "23:00", label: "Barra con música baja" },
        { time: "01:00", label: "Cierre a pie, todo cerca" },
      ],
      icon: "pizza",
      tone: "char",
      media: "amigosCerveza",
    },
  ] satisfies ShowcasePlan[],
} as const;

/* ── Closing ──────────────────────────────────────────────────────── */

export const CLOSING = {
  kicker: "Tu turno",
  title: ["¿Ya sabés", "qué te gustaría hacer?"],
  lead: "No hace falta tenerlo resuelto. Alcanza con la idea.",
  hint: "Sumá contexto sólo si querés. Nada de esto es obligatorio.",
} as const;
