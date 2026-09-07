/**
 * The landing's image manifest.
 *
 * Every photograph on the page is declared here and nowhere else, so
 * swapping the imagery is a change to one file.
 *
 * ── What changed, and why the cut-out machinery is gone ─────────────
 *
 * This used to describe a `treatment` per asset, because the only images
 * available were objects isolated on flat backgrounds — a mockup cup, a
 * bottle, a 3D pizza — which had to be composited onto colour fields with
 * `mix-blend-mode` to look like anything but a catalogue.
 *
 * They have been replaced with real photographs of the thing the product
 * is actually about: people out in Mendoza. So the compositing is gone,
 * and with it the reason for tiles that were colour fields rather than
 * pictures. Every entry below is a photograph that bleeds to the edge of
 * its frame.
 *
 * ── Sizes ───────────────────────────────────────────────────────────
 *
 * Sources are capped at 2400px wide and re-encoded; the originals ran
 * 3-4MB each, which `next/image` would never serve but the repository
 * would still carry. The `width`/`height` here are the real intrinsic
 * dimensions — `next/image` needs them to reserve space, and a wrong
 * value is a layout shift.
 */

export interface LandingImage {
  src: string;
  /** Empty string marks the image as decorative (`alt=""`). */
  alt: string;
  width: number;
  height: number;
  /**
   * `object-position` for the crop, when the centre is the wrong place to
   * keep. Every tile is `object-fit: cover`, so a wide photograph in a
   * tall frame loses its sides and a tall crop of a landscape loses its
   * top and bottom — which is how a sunset ends up cropped to a deck
   * railing. Set this to whatever has to survive the crop.
   */
  focus?: string;
}

export const MEDIA = {
  /** Long table, wine and a picada — the sharing table, mid-afternoon. */
  mesaCompartida: {
    src: "/landing/mesa-compartida.jpg",
    alt: "Cuatro personas riendo alrededor de una mesa con tabla de fiambres, pan y copas de vino",
    width: 2400,
    height: 1309,
    focus: "50% 46%",
  },
  /** A couple on a deck as the sun goes down behind the cordillera. */
  atardecerPareja: {
    src: "/landing/atardecer-pareja.jpg",
    alt: "Una pareja abrazada en un deck de madera mirando el atardecer sobre la cordillera",
    width: 1024,
    height: 559,
    focus: "50% 38%",
  },
  /** Night market: string lights, a food truck, live music. */
  feriaNocturna: {
    src: "/landing/feria-nocturna.jpg",
    alt: "Feria nocturna al aire libre con guirnaldas de luces, puestos de artesanías y música en vivo",
    width: 2400,
    height: 1309,
    focus: "50% 42%",
  },
  /** Someone reading alone by the window of a café. */
  cafeLectura: {
    src: "/landing/cafe-lectura.jpg",
    alt: "Una persona leyendo un libro junto a la ventana de un café, con un cortado sobre la mesa",
    width: 1024,
    height: 559,
    focus: "58% 50%",
  },
  /** Pizza and beer in a courtyard, hands reaching in. */
  pizzaPatio: {
    src: "/landing/pizza-patio.jpg",
    alt: "Amigos compartiendo pizzas y cerveza en el patio de un bar con luces colgantes",
    width: 1024,
    height: 559,
    focus: "50% 56%",
  },
  /** Lunch under a pergola with the vineyard and the mountains behind. */
  bodegaParral: {
    src: "/landing/bodega-parral.jpg",
    alt: "Mesa bajo un parral en una bodega, con viñedos y la cordillera de fondo",
    width: 1024,
    height: 559,
    focus: "50% 46%",
  },
  /** Working over a long coffee, notebook and laptop by the window. */
  cafeEstudio: {
    src: "/landing/cafe-estudio.jpg",
    alt: "Una persona estudiando con notebook y cuaderno en la ventana de un café",
    width: 1024,
    height: 559,
    focus: "52% 46%",
  },
  /** A long table set in the middle of the vines. */
  vinedoMesa: {
    src: "/landing/vinedo-mesa.jpg",
    alt: "Mesa larga servida en medio de un viñedo, con la cordillera al fondo",
    width: 1024,
    height: 559,
    focus: "50% 44%",
  },
  /** A group on a deck watching the valley go orange. */
  atardecerAmigos: {
    src: "/landing/atardecer-amigos.jpg",
    alt: "Un grupo de amigos en un deck mirando el atardecer sobre el valle y la cordillera",
    width: 1024,
    height: 559,
    focus: "50% 40%",
  },
  /** The same hour, from a table for two. */
  atardecerDeck: {
    src: "/landing/atardecer-deck.jpg",
    alt: "Una pareja sentada frente a la montaña mientras se pone el sol, con copas de vino en la mesa",
    width: 2400,
    height: 1309,
    focus: "50% 42%",
  },
  /** Beers in a courtyard, close and warm. */
  amigosCerveza: {
    src: "/landing/amigos-cerveza.jpg",
    alt: "Amigos brindando con cerveza en el patio de un bar al atardecer",
    width: 1024,
    height: 559,
    focus: "50% 42%",
  },
  /** A long table at night, mid-meal — the middle of the evening. */
  mesaNoche: {
    src: "/landing/mesa-noche.jpg",
    alt: "Mesa larga de noche con amigos comiendo y brindando bajo luces cálidas",
    width: 2400,
    height: 1309,
    focus: "50% 46%",
  },
  /** A courtyard at the top of the evening: string lights, brick, beers. */
  patioCerveza: {
    src: "/landing/patio-cerveza.jpg",
    alt: "Amigos riendo con cervezas en el patio de un bar con guirnaldas de luces",
    width: 1024,
    height: 559,
    focus: "50% 46%",
  },
} as const satisfies Record<string, LandingImage>;

export type MediaKey = keyof typeof MEDIA;
