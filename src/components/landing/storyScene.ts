/**
 * The constellation → recorrido scene.
 *
 * Pure geometry and drawing, kept out of the component so the React side
 * is only "how big is the canvas and how far has the visitor scrolled".
 *
 * ── The idea being animated ─────────────────────────────────────────
 *
 * Someone writing to smartplan is not filling in filters — they say
 * several things at once ("vinos", "con amigos", "sin manejar", "no muy
 * caro"), unordered and partly incompatible. The product's actual work is
 * to cross those against each other, drop what cannot hold together, and
 * put what survives in an order with times attached.
 *
 * So the animation is that sentence: a drifting cloud of fragments, then
 * connections finding each other, then the survivors settling onto a
 * route with three stops. It is not decoration that happens to sit near
 * the copy — every stage of it is a claim the copy is also making.
 *
 * ── Why everything is normalised ────────────────────────────────────
 *
 * Positions are stored 0..1 and multiplied by the pixel size at draw
 * time. A resize is then free and, more importantly, does not reshuffle
 * the composition: the same seeded layout maps onto the new box.
 */

export interface SceneNode {
  label: string;
  /** Survives the crossing and lands on the route. */
  keep: boolean;
  /** Which stop it belongs to. Meaningless when `keep` is false. */
  stop: number;
  /** Scattered start, normalised. */
  sx: number;
  sy: number;
  /**
   * Unit vector from the node's stop toward where it rests.
   *
   * A direction rather than a normalised point, because the fan has to be
   * sized in *pixels* at draw time: an offset stored as a fraction of the
   * box stretches with the aspect ratio, so a spacing that separated
   * labels on a wide screen collapsed them on a narrow one.
   */
  fanX: number;
  fanY: number;
  /** Idle drift, so the cloud breathes before anything happens. */
  driftX: number;
  driftY: number;
  driftPhase: number;
  /** Where a discarded node drifts off to. */
  exitX: number;
  exitY: number;
  radius: number;
}

export interface Scene {
  nodes: SceneNode[];
  stops: { x: number; y: number }[];
}

export interface SceneTheme {
  ember: string;
  gold: string;
  electric: string;
  ink: string;
  font: string;
}

/** Deterministic PRNG. A fixed layout survives resizes and remounts. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Maps `value` from the range [a, b] onto 0..1, clamped. */
function remap(value: number, a: number, b: number): number {
  return clamp01((value - a) / (b - a));
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Stops sit slightly off a straight line, so the route reads as a path. */
const STOP_POSITIONS = [
  { x: 0.21, y: 0.585 },
  { x: 0.5, y: 0.475 },
  { x: 0.79, y: 0.6 },
];

/**
 * What survives the crossing, and where it lands.
 *
 * Explicit per stop rather than "the first nine that match": the whole
 * point of the resolved frame is that the three groups read as a coherent
 * evening, and grouping by array order put "café" at the dinner stop and
 * "algo rico" at the café. A viewer who reads the labels has to find them
 * sensible, or the animation quietly contradicts the copy beside it.
 *
 * Index matches `STORY.stops`: atardecer, mesa, café.
 */
const KEPT_BY_STOP: readonly (readonly string[])[] = [
  ["atardecer", "vista", "tranquilo"],
  ["buena comida", "algo rico", "en pareja"],
  ["café", "sobremesa", "cerca"],
];

export interface CreateSceneOptions {
  /** Total nodes to place, kept ones included. */
  count: number;
  /**
   * Narrow screens. One fragment per stop instead of three: at 390px a
   * fan of three labels around a stop is three labels on top of each
   * other, and the scene's job is to be read, not to be dense.
   */
  compact?: boolean;
}

export function createScene(
  labels: readonly string[],
  { count, compact = false }: CreateSceneOptions,
): Scene {
  const random = mulberry32(0x5107);

  // One label per stop when compact, three otherwise.
  const groups = KEPT_BY_STOP.map((group) => (compact ? group.slice(0, 1) : group));

  const stopFor = new Map<string, number>();
  const fanIndex = new Map<string, number>();
  groups.forEach((group, stopIndex) => {
    group.forEach((label, index) => {
      stopFor.set(label, stopIndex);
      fanIndex.set(label, index);
    });
  });

  // Kept labels are always placed, whatever `count` is. Slicing the
  // source array first silently dropped the ones that happen to sit late
  // in it, which left the route with stops that had nothing on them.
  const kept = groups.flat();
  const rest = labels.filter((label) => !stopFor.has(label));
  const chosen = [...kept, ...rest.slice(0, Math.max(0, count - kept.length))];

  const nodes: SceneNode[] = chosen.map((label) => {
    const stop = stopFor.get(label) ?? -1;
    const keep = stop >= 0;
    const anchor = keep ? STOP_POSITIONS[stop] : null;

    // Deterministic placement, not a random angle: random put two labels
    // on top of each other often enough to be a real defect, and a wider
    // radius only blurs the three groups into one another.
    //
    // A trio fans across an arc *above* its stop, at -150° / -90° / -30°;
    // a lone compact label sits straight above it. Above matters — the
    // stop's time and name are drawn underneath the marker.
    const index = fanIndex.get(label) ?? 0;
    const angle = compact
      ? -Math.PI / 2
      : ((-150 + index * 60) * Math.PI) / 180;

    return {
      label,
      keep,
      stop,
      sx: 0.07 + random() * 0.86,
      sy: 0.14 + random() * 0.72,
      fanX: anchor ? Math.cos(angle) : 0,
      fanY: anchor ? Math.sin(angle) : 0,
      driftX: (random() - 0.5) * 0.016,
      driftY: (random() - 0.5) * 0.014,
      driftPhase: random() * Math.PI * 2,
      exitX: random() < 0.5 ? -0.12 : 1.12,
      exitY: 0.1 + random() * 0.8,
      radius: keep ? 3.4 : 2.2,
    };
  });

  return { nodes, stops: STOP_POSITIONS };
}

export interface DrawOptions {
  /** 0 → scattered cloud, 1 → settled recorrido. */
  progress: number;
  /** Seconds since the scene started, for the idle drift. */
  time: number;
  width: number;
  height: number;
  theme: SceneTheme;
  /** Stop labels drawn once the route has formed. */
  stopLabels: readonly { time: string; label: string }[];
}

/**
 * Draws one frame.
 *
 * The four stages overlap on purpose — a scene that switched cleanly
 * between them would read as four animations played in sequence rather
 * than as one process happening.
 */
export function drawScene(
  context: CanvasRenderingContext2D,
  scene: Scene,
  { progress, time, width, height, theme, stopLabels }: DrawOptions,
): void {
  context.clearRect(0, 0, width, height);

  const crossing = remap(progress, 0.24, 0.58);
  const settling = easeInOut(remap(progress, 0.5, 0.88));
  const routeDraw = easeInOut(remap(progress, 0.58, 0.94));
  const resolved = remap(progress, 0.86, 1);

  // Idle drift fades out as things start settling: the cloud breathes
  // while it is a cloud, and holds still once it is a route.
  const breathing = 1 - settling;

  // The fan is sized in pixels, and clamped so a label never lands off
  // the canvas on a narrow screen.
  const fanX = Math.min(width * 0.1, 132);
  const fanY = Math.min(height * 0.09, 74);

  const placed = scene.nodes.map((node) => {
    const wobbleX = Math.sin(time * 0.42 + node.driftPhase) * node.driftX * breathing;
    const wobbleY = Math.cos(time * 0.36 + node.driftPhase * 1.4) * node.driftY * breathing;

    if (node.keep) {
      const anchor = scene.stops[node.stop];
      const targetX = anchor.x * width + node.fanX * fanX;
      const targetY = anchor.y * height + node.fanY * fanY;
      const startX = (node.sx + wobbleX) * width;
      const startY = (node.sy + wobbleY) * height;
      return {
        node,
        x: startX + (targetX - startX) * settling,
        y: startY + (targetY - startY) * settling,
        alpha: 1,
      };
    }

    // Discarded fragments drift out and fade rather than blinking off.
    const exit = easeInOut(crossing);
    const x = node.sx + (node.exitX - node.sx) * exit + wobbleX;
    const y = node.sy + (node.exitY - node.sy) * exit + wobbleY;
    return { node, x: x * width, y: y * height, alpha: 1 - crossing };
  });

  /* ── Connections between what survives ───────────────────────── */
  // Peaks mid-crossing and recedes as the route takes over: the mesh is
  // the working-out, and it should not still be on screen once the
  // answer is.
  const meshAlpha = Math.sin(remap(progress, 0.2, 0.72) * Math.PI) * 0.5;

  if (meshAlpha > 0.01) {
    context.lineWidth = 1;
    for (let i = 0; i < placed.length; i += 1) {
      const a = placed[i];
      if (!a.node.keep) continue;

      for (let j = i + 1; j < placed.length; j += 1) {
        const b = placed[j];
        if (!b.node.keep) continue;

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.hypot(dx, dy);
        const reach = Math.min(width, height) * 0.42;
        if (distance > reach) continue;

        // Nearer pairs draw stronger, which is what makes the mesh look
        // like it is finding relationships rather than drawing a graph.
        const strength = (1 - distance / reach) * meshAlpha;
        context.strokeStyle = withAlpha(theme.ember, strength * 0.55);
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }
    }
  }

  /* ── The route ───────────────────────────────────────────────── */

  if (routeDraw > 0) {
    const points = scene.stops.map((stop) => ({ x: stop.x * width, y: stop.y * height }));

    context.save();
    context.lineWidth = 2;
    context.lineCap = "round";
    context.strokeStyle = withAlpha(theme.ember, 0.9);
    context.shadowColor = withAlpha(theme.ember, 0.5);
    context.shadowBlur = 18;

    // A dash offset is what "draws" the line: one dash as long as the
    // whole path, slid into view.
    const length = pathLength(points);
    context.setLineDash([length, length]);
    context.lineDashOffset = length * (1 - routeDraw);

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      const previous = points[i - 1];
      const current = points[i];
      const midX = (previous.x + current.x) / 2;
      context.bezierCurveTo(midX, previous.y, midX, current.y, current.x, current.y);
    }
    context.stroke();
    context.restore();
  }

  /* ── Nodes ───────────────────────────────────────────────────── */

  context.font = `500 12px ${theme.font}`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (const { node, x, y, alpha } of placed) {
    if (alpha <= 0.01) continue;

    const colour = node.keep ? theme.ember : theme.electric;

    context.beginPath();
    context.arc(x, y, node.radius, 0, Math.PI * 2);
    context.fillStyle = withAlpha(colour, alpha * (node.keep ? 0.95 : 0.5));
    context.fill();

    if (node.keep) {
      context.beginPath();
      context.arc(x, y, node.radius + 4 + settling * 2, 0, Math.PI * 2);
      context.strokeStyle = withAlpha(theme.ember, 0.18 + settling * 0.22);
      context.lineWidth = 1;
      context.stroke();
    }

    context.fillStyle = withAlpha(theme.ink, alpha * (node.keep ? 0.9 : 0.42));
    context.fillText(node.label, x, y - node.radius - 11);
  }

  /* ── Stop markers, once there is a route to mark ─────────────── */

  if (resolved > 0) {
    scene.stops.forEach((stop, index) => {
      const x = stop.x * width;
      const y = stop.y * height;
      const label = stopLabels[index];
      if (!label) return;

      context.beginPath();
      context.arc(x, y, 7 + resolved * 2, 0, Math.PI * 2);
      context.fillStyle = withAlpha(theme.gold, resolved);
      context.fill();

      context.font = `700 15px ${theme.font}`;
      context.fillStyle = withAlpha(theme.ink, resolved);
      context.fillText(label.time, x, y + 30);

      context.font = `500 12px ${theme.font}`;
      context.fillStyle = withAlpha(theme.ink, resolved * 0.6);
      context.fillText(label.label, x, y + 48);
    });
  }
}

function pathLength(points: { x: number; y: number }[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  // Bezier control points push the drawn curve past the straight-line
  // distance; the dash has to be at least as long as what is drawn.
  return total * 1.35;
}

/**
 * `rgb(r g b / a)` from an `r, g, b` triple string.
 *
 * The theme carries channels rather than finished colours precisely so
 * alpha can be applied per-draw without parsing hex on every frame.
 */
function withAlpha(channels: string, alpha: number): string {
  return `rgba(${channels}, ${clamp01(alpha).toFixed(3)})`;
}
