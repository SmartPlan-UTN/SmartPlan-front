/**
 * Choreography data for the third section: "de ganas sueltas a un recorrido".
 *
 * The section's argument is that loose intentions become a plan. It runs on
 * the same machine as the inspiration scene next door — a fixed composition
 * inside a 100 x 100 stage, plus one pure function mapping two scroll clocks
 * onto beats — so the two sections share a rhythm rather than merely a
 * palette. Both live away from the component so the timing can be reasoned
 * about, and tested, without a DOM.
 *
 * ── The four rules this file exists to hold ─────────────────────────
 *
 *  1. **Nothing animates layout.** Words and frames are placed once at
 *     their final position with `left`/`top` (and `width`/`height`) in
 *     percent of the stage. Only `transform`, `opacity` and one
 *     `stroke-dashoffset` are scrubbed.
 *
 *  2. **The page never leaves cream.** An earlier version darkened the
 *     whole scene to `--char` as it advanced. It read well on paper and
 *     badly on screen: the page went from a delicate editorial cream
 *     composition to a brown ground with photographic cards and white
 *     text, which is a different, more generic landing. The passage of
 *     time is now told *inside the photographs* — sunset, candlelit
 *     dinner, lit courtyard — while the ground only warms by a few
 *     degrees. See `warm` in `getStoryBeats`.
 *
 *  3. **No line exists before it means something.** The thread does not
 *     start until the sort has been read. Orange strokes drawn across an
 *     empty stage look like leftover SVG, not like a route.
 *
 *  4. **A surviving word is never replaced, only resolved.** The three
 *     that survive travel to their anchor and *become* their moment in
 *     place — they gain a time above and a photograph below, and their
 *     text settles into the stop's name. Nothing disappears and
 *     reappears somewhere else, because that reads as "here are the three
 *     resulting activities" rather than as "what you just watched turned
 *     into this".
 */

/** Which stop a word turns into, when it survives. */
export type StoryStop = "atardecer" | "cena" | "sobremesa";

export interface StoryWord {
  label: string;
  /** Home position, % of the stage. `rot` in degrees — barely off level. */
  home: { x: number; y: number; rot: number };
  /** Type size step. 2 is the largest. */
  size: 0 | 1 | 2;
  /**
   * Set when the word survives the sort. It then travels to that stop's
   * anchor and turns into the moment there — see rule 4 above.
   */
  keeps?: StoryStop;
  /** Where a word that did not survive drifts to as it loses presence. */
  drift?: { x: number; y: number };
}

export interface StoryMoment {
  id: StoryStop;
  /** The photograph's frame, % of the stage. */
  frame: { x: number; y: number; w: number; h: number };
  /**
   * The caption's **top-left corner**, and the point the surviving word
   * travels to. Two sit above their frame and one below — three captions in
   * the same relative place turns the composition back into a row of cards,
   * which is what the gallery next door learned the hard way.
   */
  anchor: { x: number; y: number };
  /**
   * Where this moment sits along the thread, 0..1. Its whole appearance is
   * derived from the route's own progress rather than from a window of its
   * own, so the photograph arrives exactly where and when the line reaches
   * it. That is what makes three appearances read as one recorrido.
   */
  at: number;
  /** `sizes` for `next/image`, matched to the frame's real painted width. */
  sizes: string;
}

/** Roughly how tall a caption is, in stage units. Used by the tests that
 * keep captions off their own and each other's photographs. */
export const CAPTION_H = 11;

/**
 * The eight intentions, and where they start.
 *
 * The left column (x < 40, y 24..76) is the copy column and is kept clear,
 * exactly as in the inspiration scene — which is why the words gather in the
 * right two-thirds and in the strips above and below the headline. The three
 * that survive are spread across the composition rather than clustered, so
 * the sort reads as a judgement about *which* rather than about *where*.
 */
export const STORY_WORDS: StoryWord[] = [
  { label: "atardecer", home: { x: 60, y: 20, rot: -3 }, size: 2, keeps: "atardecer" },
  { label: "buena comida", home: { x: 58, y: 44, rot: 2 }, size: 2, keeps: "cena" },
  { label: "sobremesa", home: { x: 76, y: 70, rot: -4 }, size: 2, keeps: "sobremesa" },
  { label: "tranquilo", home: { x: 28, y: 8, rot: -2 }, size: 1, drift: { x: -9, y: -5 } },
  { label: "con amigos", home: { x: 86, y: 12, rot: 4 }, size: 1, drift: { x: 6, y: -6 } },
  { label: "cerca", home: { x: 93, y: 40, rot: -3 }, size: 0, drift: { x: 2, y: 6 } },
  { label: "poco tiempo", home: { x: 46, y: 92, rot: 3 }, size: 1, drift: { x: -7, y: 5 } },
  { label: "sin reserva", home: { x: 13, y: 84, rot: 5 }, size: 0, drift: { x: -6, y: 7 } },
];

/**
 * The payoff composition.
 *
 * Not a row of three. The frames differ in size and zigzag down the right
 * two-thirds — the same lopsided hierarchy that makes the inspiration scene
 * read as a picture with a subject instead of a grid with the gutters
 * removed. The dominant frame is the middle of the evening, not the first
 * moment, so the eye lands on the meal rather than on a timeline's origin.
 *
 * The left column stays empty throughout: it holds the headline first, and
 * then "El plan sí." lands in exactly that place.
 */
export const STORY_MOMENTS: StoryMoment[] = [
  {
    id: "atardecer",
    frame: { x: 40, y: 16, w: 26, h: 30 },
    anchor: { x: 40, y: 3 },
    at: 0.05,
    sizes: "(max-width: 900px) 92vw, 28vw",
  },
  {
    id: "cena",
    frame: { x: 73, y: 30, w: 25, h: 40 },
    anchor: { x: 73, y: 17 },
    at: 0.4,
    sizes: "(max-width: 900px) 92vw, 27vw",
  },
  {
    id: "sobremesa",
    frame: { x: 42, y: 58, w: 23, h: 28 },
    anchor: { x: 42, y: 88 },
    at: 0.7,
    sizes: "(max-width: 900px) 92vw, 25vw",
  },
];

/**
 * The thread, as points in stage units (0..100), and the function that turns
 * them into a path in real pixels.
 *
 * ── Why this is not a static `d` string in a stretched viewBox ──────
 *
 * It used to be, with `preserveAspectRatio="none"` so the 0..100 coordinates
 * lined up with the percentage-positioned frames, plus
 * `vector-effect: non-scaling-stroke` so the anisotropic stretch would not
 * make the stroke fat horizontally and thin vertically. That combination is
 * what drew the line as a row of disconnected orange fragments: with a
 * non-scaling stroke the browser computes the **dash pattern in device
 * space**, where the painted path is an order of magnitude longer than the
 * 81 user units `getTotalLength()` reports — so a dash array meant to be one
 * unbroken segment tiled into a dozen of them. No amount of tuning the dash
 * fixes that, because the two numbers are in different coordinate systems.
 *
 * Building the path in the stage's own pixels removes the mismatch at the
 * source: the viewBox equals the element's real size, so there is no stretch,
 * no need for a non-scaling stroke, and the measured length and the dash
 * array are finally in the same unit.
 */
const ROUTE_POINTS = {
  from: { x: 53, y: 31 },
  curves: [
    { c1: { x: 68, y: 34 }, c2: { x: 83, y: 40 }, to: { x: 85.5, y: 50 } },
    { c1: { x: 88, y: 61 }, c2: { x: 70, y: 69 }, to: { x: 53.5, y: 72 } },
  ],
};

/** The thread as an SVG `d`, in pixels, for a stage of `w` by `h`. */
export function routePath(w: number, h: number): string {
  const px = (p: { x: number; y: number }) =>
    `${((p.x / 100) * w).toFixed(2)} ${((p.y / 100) * h).toFixed(2)}`;
  const curves = ROUTE_POINTS.curves
    .map((c) => `C ${px(c.c1)}, ${px(c.c2)}, ${px(c.to)}`)
    .join(" ");
  return `M ${px(ROUTE_POINTS.from)} ${curves}`;
}

export interface StoryBeats {
  /**
   * The stage's own presence, across the approach only. Everything else is
   * placed inside it, so this is what keeps the scene from being painted
   * over the one above. The exit belongs to the sticky release.
   */
  present: number;
  /** Kicker, first title line and lead. Rises on approach, leaves on the track. */
  copy: number;
  /** The sort: three words gain presence, five lose it. */
  sort: number;
  /** The five loose words leaving. The survivors are never faded. */
  fade: number;
  /** The ground warming a few degrees, and settling back. Not monotonic. */
  warm: number;
  /** The thread drawing itself. Everything downstream derives from this. */
  route: number;
  /** The closing line, "El plan sí." */
  payoff: number;
}

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

const span = (value: number, start: number, end: number) =>
  clamp01((value - start) / (end - start));

/** Smoothstep. Linear scrubbing reads mechanical; this reads directed. */
const ease = (value: number) => value * value * (3 - 2 * value);

/**
 * The two clocks, resolved into seven beats.
 *
 * `enter` is the section's approach, 0 when its top edge is at the bottom of
 * the viewport and 1 when it reaches the top; `t` is the pinned track. Only
 * the copy's arrival and the scene's own presence hang off the approach —
 * everything else needs the room the track buys.
 *
 * ── `present`, and why it only fades in ─────────────────────────────
 *
 * The words are placed by the pinned clock, which is zero until the section
 * pins — so without this beat the whole field of intentions is painted at
 * full ink the instant the section's top edge crosses into the viewport,
 * while the inspiration scene above still owns most of the screen. Two
 * scenes at once is the overlap that reads as clutter, and this closes it.
 *
 * It deliberately has no matching fade *out*. The exit is already carried
 * by the sticky release — the scene scrolls away with its viewport — and
 * fading on top of that empties the stage while the track still has most
 * of a screen of scroll left in it, which buys a blank one instead of a
 * hand-off. The seam that made the exit look abrupt was the ground, not
 * the content: see `warm`.
 *
 * ── `warm`, and why it goes back to nothing ─────────────────────────
 *
 * The only change of ground in the section, and it is deliberately almost
 * invisible: an overlay of a warm sand the hero already paints in its own
 * gradient, so it is not a new colour on the page. It rises to full between
 * 0.30 and 0.66 and then **recedes all the way to zero**, so the ground the
 * section hands to `HowItWorks` is that section's cream exactly. It used to
 * settle at about a third, which left a visible horizontal step at the
 * boundary — the seam this curve exists to avoid.
 *
 * ── `route`, and why nothing precedes it ────────────────────────────
 *
 * The thread is exactly zero until `t = 0.42`. Before the sort has been
 * read, a line joining the words means nothing to someone seeing the page
 * for the first time — it reads as stray strokes rather than as a route.
 * Every moment's arrival derives from this beat via `momentProgress`, so a
 * photograph can never precede the line that explains it.
 *
 * ── The one place two things share a spot ───────────────────────────
 *
 * `copy` and `payoff` both live in the left column. `copy` is at zero by
 * `t = 0.46` and `payoff` does not begin until 0.76, so the headline is long
 * gone before "El plan sí." lands in its place — which is the point: the
 * sentence finishes exactly where it started.
 */
export function getStoryBeats(enter: number, t: number): StoryBeats {
  return {
    present: ease(span(enter, 0.3, 0.68)),
    copy: ease(span(enter, 0.38, 0.7)) * (1 - ease(span(t, 0.26, 0.46))),
    sort: ease(span(t, 0.06, 0.38)),
    fade: ease(span(t, 0.4, 0.56)),
    warm: ease(span(t, 0.3, 0.66)) * (1 - ease(span(t, 0.78, 1))),
    route: ease(span(t, 0.42, 0.86)),
    payoff: ease(span(t, 0.76, 0.9)),
  };
}

/**
 * A moment's own progress, derived from how far the thread has travelled.
 * Zero while there is no line, so the photographs can only ever follow it.
 */
export function momentProgress(route: number, at: number): number {
  return ease(span(route, at, at + 0.3));
}
