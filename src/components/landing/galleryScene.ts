/**
 * Choreography data for the inspiration scene.
 *
 * The scene is a fixed composition — five photographs at known places
 * inside a 100 x 100 box — plus one function that maps two scroll clocks
 * onto the beats that move them. Both live here, away from the component,
 * so the timing can be reasoned about (and tested) without a DOM.
 *
 * ── Why frames are percentages and motion is transform ──────────────
 *
 * Every tile is laid out once, at its *final* frame, with `left/top/
 * width/height` in percent of the stage. Nothing animates those. What
 * moves is `transform`, from an offset/scaled start back to identity, so
 * the whole scene runs on the compositor and no beat costs a layout.
 */

export type GalleryRole = "lead" | "second" | "satellite";

/**
 * Where a tile's label sits. Deliberately different per tile: four
 * identical badges over four rectangles turns the composition back into
 * a row of cards, which is the thing this section is replacing.
 */
export type LabelPlacement = "none" | "below-left" | "below-right" | "above" | "inside";

export interface GalleryFrame {
  /** Left edge, % of the stage. */
  x: number;
  /** Top edge, % of the stage. */
  y: number;
  w: number;
  h: number;
}

export interface GalleryTile {
  id: string;
  role: GalleryRole;
  frame: GalleryFrame;
  label: LabelPlacement;
  /**
   * Where the tile travels from during the deploy beat, in % of itself.
   *
   * A tile that settles against the stage's edge must not travel in from
   * beyond it: the viewport clips, so the entrance would be a hard
   * straight edge sliding across the picture. The two tiles on the right
   * margin come in vertically for exactly that reason.
   */
  from: { x: number; y: number };
  /** Its slot in the deploy stagger, 0..1 of that beat's length. */
  delay: number;
  /** `sizes` for `next/image`, matched to the frame's real painted width. */
  sizes: string;
}

/**
 * The final composition.
 *
 * The hierarchy is deliberately lopsided — one dominant photograph, one
 * that answers it, and three fragments. Five tiles at five *different but
 * comparable* sizes would read as a grid with the gutters removed; this
 * reads as a picture with a subject.
 *
 * The left third (x < 36, y 24..76) is the copy column and is kept clear.
 */
export const GALLERY_TILES: GalleryTile[] = [
  {
    id: "mesa",
    role: "lead",
    frame: { x: 40, y: 5, w: 40, h: 88 },
    label: "none",
    from: { x: 0, y: 0 },
    delay: 0,
    sizes: "(max-width: 900px) 92vw, 42vw",
  },
  {
    id: "cordillera",
    role: "second",
    frame: { x: 83, y: 13, w: 16, h: 25 },
    label: "below-left",
    from: { x: 0, y: -22 },
    delay: 0,
    sizes: "(max-width: 900px) 60vw, 18vw",
  },
  {
    id: "noche",
    role: "satellite",
    frame: { x: 83, y: 62, w: 14, h: 19 },
    label: "inside",
    from: { x: 0, y: 26 },
    delay: 0.22,
    sizes: "(max-width: 900px) 44vw, 15vw",
  },
  {
    id: "cafe",
    role: "satellite",
    frame: { x: 4, y: 78, w: 17, h: 16 },
    label: "below-right",
    from: { x: -22, y: 16 },
    delay: 0.38,
    sizes: "(max-width: 900px) 44vw, 18vw",
  },
  {
    id: "vinos",
    role: "satellite",
    frame: { x: 23, y: 6, w: 13, h: 14 },
    label: "above",
    from: { x: -8, y: -20 },
    delay: 0.54,
    sizes: "(max-width: 900px) 40vw, 14vw",
  },
];

export interface GalleryBeats {
  /** The lead photograph arriving, before the scene pins. */
  enter: number;
  /** Copy opacity. Reaches 1 early and never comes back down. */
  copy: number;
  /** The lead reframing from near-bleed to a portrait. */
  shift: number;
  /** The rest of the composition deploying. */
  open: number;
}

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

const span = (value: number, start: number, end: number) =>
  clamp01((value - start) / (end - start));

/** Smoothstep. Linear scrubbing reads mechanical; this reads directed. */
const ease = (value: number) => value * value * (3 - 2 * value);

/**
 * The two clocks, resolved into four beats.
 *
 * `enter` is the section's approach — 0 when its top edge is at the
 * bottom of the viewport, 1 when it reaches the top. It is what removes
 * the dead screen: the photograph is already climbing while the hero's
 * own copy is still fading, because this clock runs *before* the scene
 * pins rather than after.
 *
 * `t` is the pinned track, and carries the two beats that need room.
 *
 * Both windows are set against the real geometry, not by feel. With the
 * hero at `100svh - navbar` and this section bridged up under it, the
 * page loads at `enter ~= 0.12`, so both beats have to stay at zero
 * there or a photograph smudges over an untouched hero. And the hero's
 * own copy is gone once it has scrolled 0.525 of its height, which lands
 * at `enter ~= 0.62` — where the photograph is already at ~0.95. That is
 * the dead screen closed: the scene is fully arrived at the exact moment
 * the hero has nothing left to show.
 *
 * The second rule: `copy` completes at `enter = 0.72`, while the
 * headline is still entering from the lower part of the viewport, and
 * nothing takes it back down. Text at a fractional opacity while it is
 * the thing being read is the defect this section had.
 */
export function getGalleryBeats(enter: number, t: number): GalleryBeats {
  return {
    enter: ease(span(enter, 0.3, 0.66)),
    copy: ease(span(enter, 0.42, 0.72)),
    shift: ease(span(t, 0.06, 0.52)),
    open: span(t, 0.5, 0.94),
  };
}

/**
 * A tile's own progress inside the deploy beat, given its stagger slot.
 * Each tile still travels the full eased curve — it just starts later —
 * so the group arrives as a sequence rather than as one block.
 */
export function tileProgress(open: number, delay: number): number {
  return ease(span(open, delay, delay + 0.46));
}
