/**
 * The wave simulation, with no DOM dependencies.
 *
 * It lives apart from `MoodBackground` because it runs in two places: a
 * worker, where it normally draws into an `OffscreenCanvas`, and the main
 * thread, as the fallback for browsers without one. Both drive the exact
 * same renderer, so the water looks identical either way.
 */

export type Mood =
  | "idle"
  | "romantica"
  | "nocturna"
  | "aire_libre"
  | "cultural"
  | "gastronomia";

export interface WavePalette {
  wave1: string;
  wave2: string;
  wave3: string;
  wave4: string;
  topGlow: string;
}

/** Very subtle (5-10% opacity) color blobs that transition over 1.4s with
 * the mood. Ported from `SmartPlanSystemDesign/v2/MoodBackground.jsx`. */
export const WAVE_PALETTES: Record<Mood, WavePalette> = {
  idle: {
    wave1: "rgba(232,93,32,0.07)",
    wave2: "rgba(255,209,102,0.08)",
    wave3: "rgba(232,93,32,0.05)",
    wave4: "rgba(43,91,255,0.04)",
    topGlow: "transparent",
  },
  romantica: {
    wave1: "rgba(232,93,32,0.14)",
    wave2: "rgba(196,74,20,0.10)",
    wave3: "rgba(255,170,80,0.09)",
    wave4: "rgba(180,40,80,0.06)",
    topGlow: "rgba(232,93,32,0.03)",
  },
  nocturna: {
    wave1: "rgba(43,91,255,0.12)",
    wave2: "rgba(100,60,180,0.10)",
    wave3: "rgba(26,17,9,0.08)",
    wave4: "rgba(232,93,32,0.05)",
    topGlow: "rgba(26,17,9,0.05)",
  },
  aire_libre: {
    wave1: "rgba(34,192,107,0.10)",
    wave2: "rgba(43,91,255,0.08)",
    wave3: "rgba(255,209,102,0.07)",
    wave4: "rgba(34,192,107,0.05)",
    topGlow: "transparent",
  },
  cultural: {
    wave1: "rgba(43,91,255,0.11)",
    wave2: "rgba(100,60,180,0.09)",
    wave3: "rgba(232,93,32,0.07)",
    wave4: "rgba(255,209,102,0.05)",
    topGlow: "rgba(43,91,255,0.02)",
  },
  gastronomia: {
    wave1: "rgba(232,93,32,0.13)",
    wave2: "rgba(200,121,65,0.10)",
    wave3: "rgba(255,209,102,0.08)",
    wave4: "rgba(139,34,82,0.05)",
    topGlow: "rgba(232,93,32,0.02)",
  },
};

interface WaveLayer {
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  /** Fraction from the top where the wave rests. */
  yOffset: number;
  fillKey: keyof WavePalette;
}

const WAVE_LAYERS: WaveLayer[] = [
  { amplitude: 40, frequency: 1.2, speed: 0.0006, phase: 0, yOffset: 0.55, fillKey: "wave1" },
  { amplitude: 30, frequency: 1.6, speed: 0.0009, phase: 1.8, yOffset: 0.62, fillKey: "wave2" },
  { amplitude: 22, frequency: 2.0, speed: 0.0013, phase: 3.5, yOffset: 0.7, fillKey: "wave3" },
  { amplitude: 16, frequency: 2.4, speed: 0.0018, phase: 5.2, yOffset: 0.78, fillKey: "wave4" },
];


/** Peak amplitude multiplier where a swell is at full strength. */
const TIDE_STRENGTH = 0.9;
/** How far the water level itself rises under a swell, as a fraction of
 * the height. */
const TIDE_RISE = 0.04;
/** How long the fills take to cross-fade when the mood changes. */
const MOOD_MS = 1400;
/** Viewport height the `WAVE_LAYERS` amplitudes were drawn against. */
const REFERENCE_HEIGHT = 800;
/** Below this width the waves get a stronger swell — see `motionScale`. */
const NARROW_WIDTH = 720;

/**
 * Points sampled per wave across the visible width. These curves turn
 * over roughly twice across the screen, so 40 segments is already past
 * the point where more of them change the shape.
 */
const WAVE_POINTS = 40;

/** How far past each edge to keep sampling, as a fraction of the width.
 * Comfortably more than the largest horizontal shove a crest can apply
 * (`MAX_STEEPNESS` × Σ share ÷ 2π × the slowest harmonic ≈ 0.15). */
const EDGE_MARGIN = 0.22;

/**
 * How much to scale wave motion for the box it's drawn in.
 *
 * Amplitudes are authored in pixels against a desktop-height viewport, so
 * on a phone the same numbers cover a much smaller share of the screen and
 * the water barely seems to move. Scaling by height keeps the waves the
 * same size *relative to the screen*, and narrow viewports get an extra
 * push: they're taller than they are wide, so a swell has less room to
 * read horizontally and needs more vertical travel to land.
 */
function motionScale(width: number, height: number): number {
  const byHeight = Math.max(0.75, Math.min(1.25, height / REFERENCE_HEIGHT));
  return width < NARROW_WIDTH ? byHeight * 1.55 : byHeight;
}

/**
 * Each layer is three sines stacked: a carrier plus a slower and a faster
 * overtone, at amplitudes that add to 1.55. `share` is each one's cut of
 * the total, which is what keeps the Gerstner displacement below the
 * folding limit — see `steepnessFor`.
 */
const HARMONICS = [
  { amp: 1.0, freq: 1.0, phaseMul: 1.0, share: 1.0 / 1.55 },
  { amp: 0.4, freq: 0.6, phaseMul: 1.3, share: 0.4 / 1.55 },
  { amp: 0.15, freq: 1.8, phaseMul: 0.7, share: 0.15 / 1.55 },
];

/**
 * Gerstner steepness: how far points slide sideways toward the crest.
 *
 * A plain sine has crests and troughs of the same shape, which is why the
 * old waves read as a graph rather than as water — real swell has a
 * narrow, pointed crest and a long flat trough. Displacing each sampled
 * point horizontally by the wave's own slope bunches them under the crest
 * and spreads them through the trough, which is the whole difference.
 *
 * The bound matters: the surface folds back on itself at steepness 1, and
 * because the harmonic `share`s sum to 1 the horizontal derivative is
 * exactly `1 - steepness · Σ share·sin(θ)`, so anything under 1 is
 * provably fold-free no matter how the harmonics line up.
 *
 * As a feel for the numbers: measured as the trough's width over the
 * crest's, a plain sine is 1.00, resting water here is 1.44, and the
 * crest of a swell reaches about 2.0.
 */
const BASE_STEEPNESS = 0.42;
/** Where steepness saturates. Under 1, so the crest can sharpen a lot
 * under a passing swell without ever cusping. */
const MAX_STEEPNESS = 0.88;

/** Approaches `MAX_STEEPNESS` smoothly as the local swell grows, so water
 * under a swell doesn't just get taller — it gets steeper, which is the
 * part that reads as the wave gathering itself up. */
function steepnessFor(swell: number): number {
  return (
    MAX_STEEPNESS - (MAX_STEEPNESS - BASE_STEEPNESS) * Math.exp(-1.2 * swell)
  );
}

/**
 * A swell is a packet that crosses the water, not a level that rises.
 *
 * This is the second half of making it read as water. Scaling every point
 * of the wave at once is a volume knob: the whole line inflates in place.
 * A real disturbance is *somewhere*, and travels — so each navigation
 * spawns a packet that enters off the right edge, rolls left with the
 * current, and dies out. Packets simply sum, which is also what keeps
 * rapid navigation smooth: a new one never has to interrupt an old one.
 */
interface Swell {
  born: number;
  energy: number;
}

/** When a packet reaches full strength. */
const SWELL_PEAK_MS = 320;
/** After this a packet is off-screen and spent; it gets dropped. */
const SWELL_LIFE_MS = 2400;
/** Ceiling on the summed strength of every live packet. New ones are
 * scaled by the headroom left below it, so navigating fast builds a
 * bigger swell that still can't climb off the top of the screen. */
const SWELL_MAX = 1.5;
/** Where a packet enters, in screen widths — just past the right edge. */
const SWELL_START_X = 1.3;
/** How fast it travels, in screen widths per second, leftward with the
 * drift of the water. */
const SWELL_SPEED = 1.35;
/** Half-width of the packet's gaussian, in screen widths. Broad, so it
 * reads as a swell passing rather than a bump. */
const SWELL_WIDTH = 0.42;
/** How far each deeper layer's crest trails the one above it, so the
 * swell visibly rolls back through the water instead of hitting all four
 * layers at once. */
const SWELL_LAYER_LAG = 0.1;
/** Live packets are capped; past this the weakest is retired. */
const MAX_SWELLS = 6;

/**
 * Strength of a packet at `age`, peaking at exactly 1 when `age` is
 * `SWELL_PEAK_MS`. Rises fast, trails off slowly — the same asymmetry as
 * the critically damped spring this replaces, but as a closed form, so a
 * frame's strength depends only on its timestamp and never on how long
 * the previous frame took.
 */
function swellEnvelope(age: number): number {
  if (age < 0 || age >= SWELL_LIFE_MS) return 0;
  const t = age / SWELL_PEAK_MS;
  return t * Math.exp(1 - t);
}

type Rgba = [number, number, number, number];

/** Parses the `rgba(r,g,b,a)` literals above. Not a general CSS color
 * parser — it only has to read the palettes in this file, and the worker
 * has no DOM to borrow one from. */
function parseRgba(color: string): Rgba {
  const parts = color.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return [0, 0, 0, 0];
  return [
    Number(parts[0]),
    Number(parts[1]),
    Number(parts[2]),
    parts.length > 3 ? Number(parts[3]) : 1,
  ];
}

/** Palettes pre-parsed once, so a frame never touches a regex. */
const PARSED_PALETTES = Object.fromEntries(
  Object.entries(WAVE_PALETTES).map(([mood, palette]) => [
    mood,
    WAVE_LAYERS.map((layer) => parseRgba(palette[layer.fillKey])),
  ]),
) as Record<Mood, Rgba[]>;

/** The same palettes as ready-made `fillStyle` strings, in layer order.
 * A settled mood is the common case by far, and reusing these keeps it
 * from allocating four strings every frame forever. */
const PALETTE_STRINGS = Object.fromEntries(
  Object.entries(WAVE_PALETTES).map(([mood, palette]) => [
    mood,
    WAVE_LAYERS.map((layer) => palette[layer.fillKey]),
  ]),
) as Record<Mood, string[]>;

function mixRgba(from: Rgba, to: Rgba, t: number): string {
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  const a = from[3] + (to[3] - from[3]) * t;
  return `rgba(${r},${g},${b},${a.toFixed(4)})`;
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

const TWO_PI = Math.PI * 2;

/** Anything we can draw into: the worker hands us an `OffscreenCanvas`
 * context, the fallback a plain one. Only 2D path calls are used. */
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface WaveScene {
  /** CSS pixel size of the box plus the backing-store ratio to draw at. */
  resize(width: number, height: number, dpr: number): void;
  setMood(mood: Mood, now: number): void;
  /** Breaks a wave: sends one more swell across the water. */
  tide(now: number): void;
  /** Draws the frame for `now` (a `performance.now()`-style timestamp). */
  draw(now: number): void;
}

/**
 * Builds a renderer bound to one canvas context.
 *
 * Every moving part is a closed-form function of the timestamp handed to
 * `draw` — the drift of the water, the swell packets, the mood fade — so
 * a late frame lands where the water *should* be by then rather than one
 * step further along, and a hitch never shifts anything. That is what
 * lets the loop live on a worker's timer instead of a vsync signal.
 */
export function createWaveScene(
  ctx: Ctx,
  initialMood: Mood = "idle",
): WaveScene {
  const startTime = Date.now();
  let width = 0;
  let height = 0;
  let dpr = 1;

  const swells: Swell[] = [];

  // `-Infinity` reads as a fade that finished long ago, so the first frame
  // is painted in the mood it was built with rather than fading up to it.
  let mood: Mood = initialMood;
  let moodStart = -Infinity;
  // The fade's starting colors are a *snapshot*, not a palette. Changing
  // mood again mid-fade has to continue from the color actually on screen;
  // reading it back off the previous mood's palette would jump to a color
  // the waves had already left behind.
  let fadeFrom: Rgba[] = PARSED_PALETTES[initialMood];

  function colorsAt(now: number): Rgba[] {
    const t = clamp01((now - moodStart) / MOOD_MS);
    if (t >= 1) return PARSED_PALETTES[mood];
    const to = PARSED_PALETTES[mood];
    return fadeFrom.map(
      (from, index) =>
        [
          from[0] + (to[index][0] - from[0]) * t,
          from[1] + (to[index][1] - from[1]) * t,
          from[2] + (to[index][2] - from[2]) * t,
          from[3] + (to[index][3] - from[3]) * t,
        ] as Rgba,
    );
  }

  /** Drops spent packets and returns the live ones as flat arrays — one
   * pass per frame instead of per sampled point, which matters because
   * the inner loop runs a few hundred times a frame. */
  function livePackets(now: number) {
    for (let i = swells.length - 1; i >= 0; i--) {
      if (now - swells[i].born >= SWELL_LIFE_MS) swells.splice(i, 1);
    }
    const strengths: number[] = [];
    const centers: number[] = [];
    for (const swell of swells) {
      const age = now - swell.born;
      strengths.push(swell.energy * swellEnvelope(age));
      centers.push(SWELL_START_X - (age / 1000) * SWELL_SPEED);
    }
    return { strengths, centers };
  }

  return {
    resize(nextWidth, nextHeight, nextDpr) {
      width = nextWidth;
      height = nextHeight;
      dpr = nextDpr;
      ctx.canvas.width = Math.max(1, Math.round(width * dpr));
      ctx.canvas.height = Math.max(1, Math.round(height * dpr));
    },

    setMood(nextMood, now) {
      if (nextMood === mood) return;
      fadeFrom = colorsAt(now);
      mood = nextMood;
      moodStart = now;
    },

    tide(now) {
      const { strengths } = livePackets(now);
      let total = 0;
      for (const strength of strengths) total += strength;

      const energy = clamp01(1 - total / SWELL_MAX);
      if (energy <= 0) return;
      swells.push({ born: now, energy });

      if (swells.length > MAX_SWELLS) {
        // Retire the faintest rather than the oldest: it is the one whose
        // disappearance is least visible.
        let weakest = 0;
        for (let i = 1; i < swells.length; i++) {
          const age = now - swells[i].born;
          const strength = swells[i].energy * swellEnvelope(age);
          const weakestAge = now - swells[weakest].born;
          if (strength < swells[weakest].energy * swellEnvelope(weakestAge)) {
            weakest = i;
          }
        }
        swells.splice(weakest, 1);
      }
    },

    draw(now) {
      if (width <= 0 || height <= 0) return;

      // The wave clock is deliberately anchored to when the scene was
      // built, never to when a loop last (re)started, so a resize or a
      // paused tab can't send the water back to its starting phase.
      const elapsed = Date.now() - startTime;
      const scale = motionScale(width, height);
      const { strengths, centers } = livePackets(now);
      const packetCount = strengths.length;

      const moodT = clamp01((now - moodStart) / MOOD_MS);
      const settled = moodT >= 1;
      const to = PARSED_PALETTES[mood];
      const settledFills = PALETTE_STRINGS[mood];

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Points slide sideways, so the sampled span has to reach past both
      // edges or a steep crest would drag the end of the path inward and
      // leave a wedge of bare background in the corner.
      const margin = width * EDGE_MARGIN;
      const spanStart = -margin;
      const span = width + 2 * margin;
      const points = Math.round(WAVE_POINTS * (1 + 2 * EDGE_MARGIN));

      for (let index = 0; index < WAVE_LAYERS.length; index++) {
        const layer = WAVE_LAYERS[index];
        const phase = layer.phase + elapsed * layer.speed;
        // Deeper layers swell a little less, and a little later, so the
        // crest reads as one body of water rolling back through itself
        // rather than four strips moving in lockstep.
        const depth = 1 - index * 0.15;
        const lag = index * SWELL_LAYER_LAG;
        const restY = height * layer.yOffset;
        const baseAmplitude = layer.amplitude * scale;

        ctx.beginPath();
        ctx.moveTo(spanStart, height);

        for (let i = 0; i <= points; i++) {
          const x0 = spanStart + (span * i) / points;
          const u = x0 / width;

          let swell = 0;
          for (let k = 0; k < packetCount; k++) {
            const d = (u - (centers[k] + lag)) / SWELL_WIDTH;
            swell += strengths[k] * Math.exp(-d * d);
          }
          swell *= depth;

          const amplitude = baseAmplitude * (1 + TIDE_STRENGTH * swell);
          const steepness = steepnessFor(swell);

          let dx = 0;
          let dy = 0;
          for (let h = 0; h < HARMONICS.length; h++) {
            const harmonic = HARMONICS[h];
            const waveNumber = TWO_PI * layer.frequency * harmonic.freq;
            const theta = u * waveNumber + phase * harmonic.phaseMul;
            dy += amplitude * harmonic.amp * Math.sin(theta);
            // The horizontal shove that turns the sine into water:
            // everything slides toward the nearest crest, packing the
            // crest narrow and stretching the trough wide.
            //
            // The minus sign is load-bearing. Canvas y grows downward, so
            // the crest a viewer sees is the *minimum* of `dy`, at
            // θ = 3π/2 — not the maximum the textbook form assumes.
            // Without it the water comes out upside down: broad round
            // crests and pinched troughs, which reads as anything but.
            dx -=
              ((steepness * harmonic.share) / (waveNumber / width)) *
              Math.cos(theta);
          }

          const y = restY - height * TIDE_RISE * scale * swell + dy;
          ctx.lineTo(x0 + dx, y);
        }

        ctx.lineTo(spanStart + span, height);
        ctx.closePath();
        ctx.fillStyle = settled
          ? settledFills[index]
          : mixRgba(fadeFrom[index], to[index], moodT);
        ctx.fill();
      }
    },
  };
}
