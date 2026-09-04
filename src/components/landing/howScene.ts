/**
 * Choreography for the fourth section: "de una frase a un plan, casi sin
 * hacer nada".
 *
 * It runs on the same machine as the two scenes before it — a fixed
 * composition inside a 100 x 100 stage, plus one pure function mapping two
 * scroll clocks onto beats — so `ImmersiveStory` and this one share a
 * rhythm. The difference is what each one is *for*: the story is the page's
 * art piece and demonstrates smartplan's intelligence; this is the page's
 * product piece and demonstrates its ease. So it is shorter, quicker, and
 * never lopsided for effect — the movement only ever states a fact about the
 * product.
 *
 * ── The four things this file holds ─────────────────────────────────
 *
 *  1. **Nothing animates layout.** The option cards are placed once at their
 *     final frame in percent of the stage; only `transform` and `opacity`
 *     are scrubbed. The composer replica is centred by CSS and only
 *     transformed.
 *
 *  2. **One continuous object.** The composer does not disappear between
 *     beats — it is written into, then shrinks to make room. The chosen
 *     option does not disappear either — it grows into the featured card of
 *     the section that follows.
 *
 *  3. **Every beat is monotonic on the track.** An earlier `signals` beat
 *     rose and retracted three annotations around the composer; it was
 *     removed because they overlapped the field they annotated. Nothing in
 *     the scene now moves backwards.
 *
 *  4. **The chosen option is index 1.** It sits in the middle of the three,
 *     already the largest, so "elegís" reads as one of them coming forward
 *     rather than as a new thing appearing.
 */

/** A slot in the three-option group. The data that fills it is chosen by the
 * component: two `HOW.options` and, in the middle, the real `SHOWCASE.plans`
 * entry keyed by `HOW.chosenId`. */
export interface HowOptionSlot {
  /** Final frame, percent of the stage. */
  frame: { x: number; y: number; w: number; h: number };
  /** Where the card travels in from, percent of the stage. */
  from: { x: number; y: number };
  /** Its slot in the arrival stagger, 0..1 of the `options` beat. */
  delay: number;
  /** The one the visitor ends on. Exactly one slot has this. */
  chosen?: boolean;
}

/**
 * A centred group, not a lopsided fan. The middle card is the tallest and is
 * the one that wins; the outer two are smaller and sit a little lower, so
 * the eye is already on the middle before "elegís" happens. On `choose` the
 * outer two slide out and fade; on `expand` the middle one moves to the
 * centre of the stage and scales toward the featured card waiting below.
 */
export const HOW_OPTION_SLOTS: HowOptionSlot[] = [
  { frame: { x: 5, y: 52, w: 25, h: 30 }, from: { x: -8, y: 7 }, delay: 0 },
  {
    frame: { x: 32, y: 45, w: 36, h: 36 },
    from: { x: 0, y: 8 },
    delay: 0.16,
    chosen: true,
  },
  { frame: { x: 70, y: 52, w: 25, h: 30 }, from: { x: 8, y: 7 }, delay: 0.32 },
];

/** The bottom-left corner the step marker holds for the whole scene. Nothing
 * else may land here — checked by the tests. */
export const STEP_MARKER_ZONE = { x: 24, y: 84 };

export interface HowBeats {
  /** The headline arriving on approach, and leaving once options need room. */
  headline: number;
  /** "Sólo el primero es tuyo." gaining ink and weight. Monotonic on t. */
  emphasis: number;
  /** The phrase typing itself into the composer replica. */
  type: number;
  /** The composer stepping back to make room for the options. */
  shrink: number;
  /** The options arriving. Per-card timing via `optionProgress`. */
  options: number;
  /** The middle option coming forward, the outer two leaving. */
  choose: number;
  /** The chosen option growing into the featured card below. */
  expand: number;
}

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

const span = (value: number, start: number, end: number) =>
  clamp01((value - start) / (end - start));

/** Smoothstep. Linear scrubbing reads mechanical; this reads directed. */
const ease = (value: number) => value * value * (3 - 2 * value);

/**
 * The two clocks, resolved into the scene's beats.
 *
 * `enter` is the section's approach — 0 with its top edge at the bottom of
 * the viewport, 1 when it reaches the top. Only the headline hangs off it,
 * so the title is already settled before the pin. `t` is the pinned track
 * and carries everything else, packed tight: the whole point of this section
 * is that it feels fast, so no beat is given room it does not need.
 *
 * ── The beat that used to sit between `type` and `shrink` ───────────
 *
 * `signals` raised three orange annotations out of the phrase and retracted
 * them again. It is gone: the annotations were positioned against the
 * composer's edges, and at the field's real width they landed on its border
 * and across the phrase they were annotating. Interpretation now reads
 * through the typed sentence itself, and `shrink` follows `type` directly.
 * The static composition still states the fragments as chips in normal flow.
 */
export function getHowBeats(enter: number, t: number): HowBeats {
  return {
    headline: ease(span(enter, 0.34, 0.7)) * (1 - ease(span(t, 0.44, 0.6))),
    emphasis: ease(span(t, 0.02, 0.34)),
    type: ease(span(t, 0.06, 0.24)),
    shrink: ease(span(t, 0.46, 0.62)),
    options: span(t, 0.5, 0.84),
    choose: ease(span(t, 0.8, 0.92)),
    expand: ease(span(t, 0.9, 1)),
  };
}

/**
 * One card's progress inside the arrival beat, given its stagger slot. Each
 * card runs the full eased curve, it just starts later, so the three arrive
 * as a sequence rather than as one block.
 */
export function optionProgress(options: number, delay: number): number {
  return ease(span(options, delay, delay + 0.5));
}

/**
 * Which of the four steps the microcopy shows, from the pinned-track clock.
 * Four thresholds, so the marker changes exactly three times across the
 * whole scroll — the only state this scene keeps in React.
 */
export function activeStep(t: number): 0 | 1 | 2 | 3 {
  if (t < 0.24) return 0;
  if (t < 0.5) return 1;
  if (t < 0.8) return 2;
  return 3;
}
