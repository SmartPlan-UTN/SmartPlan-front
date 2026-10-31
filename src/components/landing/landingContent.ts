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
export const INTENTS: readonly {
  label: string;
  icon: IconName;
  queries: readonly string[];
}[] = [
  {
    label: "Hoy a la noche",
    icon: "moon",
    queries: [
      "¿Hacemos algo hoy a la noche? No tengo nada en mente.",
      "Tengo ganas de salir esta noche, ¿qué hay para hacer por Mendoza?",
      "Quiero una salida tranquila hoy a la noche.",
    ],
  },
  {
    label: "Con amigos",
    icon: "users",
    queries: [
      "Che, juntada con amigos hoy a la noche. ¿Qué se te ocurre?",
      "Somos varios y queremos comer algo rico, ¿a dónde podemos ir?",
      "Tenemos ganas de tomar algo y charlar tranqui.",
    ],
  },
  {
    label: "Cita",
    icon: "heart",
    queries: [
      "Quiero invitar a alguien a salir y no se me ocurre nada.",
      "Una cita linda para dos, con hasta $80.000 entre los dos. ¿Qué puede funcionar?",
      "Cena y cine esta noche. Elegí vos una peli de la cartelera y decime qué horarios hay y cuánto sale.",
    ],
  },
  {
    label: "Comer algo",
    icon: "utensils",
    queries: [
      "Me dio hambre: quiero comer algo rico y sin tantas vueltas.",
      "Tengo ganas de una buena pizza esta noche, ¿qué me recomendás?",
      "¿Un lugar lindo para merendar y después dar una vuelta?",
    ],
  },
  {
    label: "Aire libre",
    icon: "trees",
    queries: [
      "Necesito salir un rato, ¿qué lugar lindo hay al aire libre?",
      "¿Dónde podemos ver el atardecer hoy?",
      "Algo para hacer afuera este finde, tranqui.",
    ],
  },
  {
    label: "Barato",
    icon: "wallet",
    queries: [
      "No quiero gastar mucho, pero sí salir. ¿Qué hacemos?",
      "¿Un plan lindo y barato para este finde?",
      "Tenemos poca plata para salir los dos; ¿qué puede salir?",
    ],
  },
  {
    label: "Cerca mío",
    icon: "map-pin",
    queries: [
      "¿Qué hay cerca para hacer ahora?",
      "Tengo ganas de salir, pero no quiero irme lejos.",
      "¿Qué hay cerca para hacer hoy? No tengo ganas de manejar.",
    ],
  },
] as const;

/* ── Inspiration scene ────────────────────────────────────────────── */

export interface InspirationTile {
  id: string;
  /** Short enough to sit beside a photograph without becoming a caption. */
  label: string;
  media: MediaKey;
}

/**
 * The section that answers the hero.
 *
 * The hero asks for an idea; this says that not having one is fine —
 * that a loose sentence about how you want the afternoon to feel is
 * enough, and that what comes back can take very different shapes. The
 * five photographs are the argument, so the words stay out of their way:
 * one headline, one line under it, and a two-to-four word label per
 * image. The long captions this section used to carry were unreadable at
 * the size they were painted and were already hidden on mobile.
 */
export const INSPIRATION = {
  kicker: "Empezá por una idea",
  title: ["No hace falta saber", "qué hacer."],
  lead: "Contanos cómo querés que se sienta el plan. smartplan arma el resto.",
  tiles: [
    { id: "mesa", label: "Mesas para compartir", media: "mesaCompartida" },
    { id: "cordillera", label: "El valle a esta hora", media: "atardecerPareja" },
    { id: "noche", label: "Salir sin plan fijo", media: "feriaNocturna" },
    { id: "cafe", label: "Una tarde para quedarse", media: "cafeLectura" },
    { id: "vinos", label: "Tarde de viñedos", media: "bodegaParral" },
  ] satisfies InspirationTile[],
} as const;

/* ── The evening scene ────────────────────────────────────────────── */

/**
 * The section that demonstrates.
 *
 * The hero promises and the gallery inspires; this one has to *show* the
 * product's actual claim — that a handful of loose wants becomes an evening
 * that closes. So the copy stays out of the way and lets the scene make the
 * argument: eight intentions, three that survive, one recorrido.
 *
 * The title is deliberately split across the section. "Las ganas no vienen
 * ordenadas." opens it over the scattered words on cream; "El plan sí."
 * lands at the end, over the resolved evening. The sentence finishes at the
 * moment the scene has finished proving it.
 *
 * Per the honesty constraint at the top of this file, the three stops name
 * *kinds* of moment and no venue, no price and no rating appears anywhere.
 */
export const STORY = {
  kicker: "smartplan ordena la salida",
  title: ["Las ganas no vienen ordenadas.", "El plan sí."],
  lead: "Contás qué querés hacer. smartplan encuentra la mejor forma de organizarlo.",
  /**
   * The scene's accessible equivalent, rendered visually hidden. A scrubbed
   * composition of words and photographs says nothing to a screen reader, so
   * this carries the same argument in one sentence.
   */
  summary:
    "Ocho ganas sueltas: atardecer, buena comida, sobremesa, tranquilo, con amigos, cerca, poco tiempo, sin reserva. smartplan se queda con las tres que combinan y las convierte en un recorrido: 19:00 Atardecer, 20:30 Cena compartida, 22:30 Sobremesa.",
  stops: [
    { id: "atardecer", time: "19:00", label: "Atardecer", media: "atardecerDeck" },
    { id: "cena", time: "20:30", label: "Cena compartida", media: "mesaNoche" },
    { id: "sobremesa", time: "22:30", label: "Sobremesa", media: "patioCerveza" },
  ],
} as const;

/* ── How it works ─────────────────────────────────────────────────── */

/**
 * A plan alternative that only exists inside the "how it works" scene — one
 * of the two that the visitor does *not* pick. Lighter than `ShowcasePlan`:
 * no tags, no moment list, no icon. The one that *is* picked is a real
 * `ShowcasePlan` (`SHOWCASE.plans` keyed by `HOW.chosenId`), because it goes
 * on to become the featured card in "Así se ve una respuesta".
 */
export interface HowOption {
  id: string;
  title: string;
  duration: string;
  budget: 1 | 2 | 3;
  tone: ShowcasePlan["tone"];
  media: MediaKey;
}

/**
 * The section that shows how little the visitor has to do.
 *
 * The story next door demonstrated smartplan's *intelligence*; this one has
 * a single job — its *ease*. One scene that transforms four times: a phrase
 * is written, it is understood, options come back, one is chosen. The
 * headline is kept from the previous version ("Cuatro pasos. / Sólo el
 * primero es tuyo.") because the copy already worked; only its shape
 * changed.
 *
 * `phrase` is the sentence that types itself into the composer replica.
 * `signals` are pulled from words inside it, so they must stay a substring
 * match. The chosen option is `SHOWCASE.plans` → `chosenId`; the two that
 * lose are `options`, and the scene renders them around the winner.
 */
export const HOW = {
  kicker: "Cómo funciona",
  title: ["Cuatro pasos.", "Sólo el primero es tuyo."],
  phrase: "algo tranqui hoy a la noche con amigos",
  /** Each one is a literal fragment of `phrase`. */
  signals: ["algo tranqui", "hoy a la noche", "con amigos"],
  /** The scene's accessible equivalent, rendered visually hidden — a
   * scrubbed composition says nothing to a screen reader. */
  summary:
    "Escribís una frase suelta, por ejemplo «algo tranqui hoy a la noche con amigos», y smartplan la entiende, te devuelve recorridos completos y te quedás con el que más te cierra. El único paso tuyo es el primero.",
  steps: [
    { n: "01", label: "Contás qué querés hacer" },
    { n: "02", label: "smartplan entiende" },
    { n: "03", label: "Recibís opciones" },
    { n: "04", label: "Elegís y salís" },
  ],
  /** The alternative the scene ends on — a real `SHOWCASE.plans` entry. */
  chosenId: "noche-amigos",
  /** The two the visitor does not choose. Scene-only. */
  options: [
    {
      id: "feria-noche",
      title: "Feria nocturna y cena al paso",
      duration: "3 h",
      budget: 1,
      tone: "electric",
      media: "feriaNocturna",
    },
    {
      id: "patio-birra",
      title: "Cena en una bodega y sobremesa sin apuro",
      duration: "5 h",
      budget: 2,
      tone: "gold",
      media: "bodegaParral",
    },
  ] satisfies HowOption[],
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
      /**
       * The plan the "how it works" scene ends on (`HOW.chosenId`). It leads
       * this section as the featured card, so the alternative the visitor
       * just watched win is the same object they now read in full.
       */
      id: "noche-amigos",
      title: "Cena tranquila con amigos, a buen precio",
      duration: "4 h",
      budget: 1,
      tags: ["Noche", "Con amigos", "Económico"],
      moments: [
        { time: "21:00", label: "Cena para compartir en una mesa larga" },
        { time: "23:00", label: "Un bar con música tranquila para conversar" },
        { time: "00:30", label: "Regreso a pie, todo a pocas cuadras" },
      ],
      icon: "utensils",
      tone: "char",
      media: "mesaNoche",
    },
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
  ] satisfies ShowcasePlan[],
} as const;

/* ── Recommended plans (CU20 · US19 · PAN 10) ─────────────────────── */

/**
 * For a signed-in visitor, this replaces the illustrative showcase above
 * with their real recommendations. The copy stays honest about what shaped
 * the list: `personalized` and `locationUsed` come from the API's `meta`,
 * and the per-card `reason` is the only "why" the backend actually supports
 * — no "IA", no "recomendaciones inteligentes", no SaaS voice.
 */
export const RECOMMENDATIONS = {
  eyebrow: "Para vos",
  eyebrowPopular: "Lo más elegido",
  title: "Algo de esto te va a gustar.",
  titlePopular: "Los planes que más gustan en smartplan.",
  /** Chosen by which signals `meta` says were used. */
  subcopy: {
    full: "Según los planes que ya hiciste y lo que elegiste que te gusta.",
    history: "Según los planes que ya hiciste.",
    preferences: "Según lo que elegiste que te gusta.",
    popular: "Elegí tus preferencias y empezamos a encontrar ideas para vos.",
  },
  /** Non-intrusive line when coordinates were not available. */
  locationHint: "Activá la ubicación para ver planes cerca tuyo.",
  /**
   * One honest line, only when the API's `meta.adjustedFromFeedback` is true —
   * i.e. the user's own experiences actually moved the order (CU21).
   */
  adjustedFromFeedback: "Ajustado según tus últimas experiencias.",
  /** One soft chip per card, from the plan's dominant ranking signal. */
  reasonChip: {
    history: "Va con lo tuyo",
    preferences: "Como lo que te gusta",
    near_you: "Cerca tuyo",
    popular: "Muy elegido",
    within_budget: "Dentro de tu presupuesto",
    well_rated_by_you: "Como lo que disfrutaste",
  },
  /** Discreet "no me interesa" action on a card, and its undo affordance (CU21). */
  dismiss: {
    action: "No me interesa",
    live: (title: string) => `Quitamos «${title}» de tus recomendaciones.`,
    done: "No lo mostramos más",
    undo: "Deshacer",
  },
  /** While the rail is fetching. */
  loading: "Buscando planes para vos…",
  /** Fetch failed — a quiet inline retry, never a vanished section. */
  error: {
    title: "No pudimos cargar tus recomendaciones.",
    retry: "Reintentar",
  },
  /** Signed-in, has history, but nothing left to show right now. */
  caughtUp: {
    title: "Por ahora, esto es todo.",
    body: "Ya viste lo que teníamos para vos. Armá un plan nuevo y seguimos aprendiendo.",
    action: "Armá un plan",
  },
  /** Shown to a signed-in user with nothing to recommend yet. */
  empty: {
    eyebrow: "Para vos",
    title: "Todavía estamos conociendo tus gustos.",
    body: "Armá tu primer plan o elegí lo que te gusta, y empezamos a encontrar ideas para vos.",
    primary: "Armá un plan",
    secondary: "Elegí tus preferencias",
  },
} as const;
