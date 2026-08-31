"use client";

import { useEffect, useRef } from "react";

import { useReducedMotion } from "@/hooks";

export interface HeroAtmosphereProps {
  /**
   * When the composer holds focus the air goes still. Someone who has
   * started writing should not have anything else moving in their
   * periphery — the motion exists to make an idle hero feel alive, and
   * the moment the hero stops being idle it has no job left.
   */
  calm?: boolean;
}

interface Mote {
  x: number;
  y: number;
  /** Radius in CSS pixels. */
  r: number;
  /** Drift per second, in CSS pixels. */
  vx: number;
  vy: number;
  alpha: number;
  /** 0 = ember, 1 = gold. Interpolated, so the field is never two flat colours. */
  warmth: number;
  /** Parallax factor: bigger motes sit nearer and travel further. */
  depth: number;
}

const EMBER = [232, 93, 32] as const;
const GOLD = [255, 209, 102] as const;

/** Density is a rate, not a count: the same air at any window size. */
const MOTES_PER_MEGAPIXEL = 34;
const MAX_MOTES = 46;
const MIN_MOTES = 14;

function mix(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/**
 * The hero's depth layer: slow warm motes drifting behind the composer,
 * with a little parallax against the pointer.
 *
 * This is the third of three background layers, and the quietest. The
 * mood waves underneath it carry the colour; this carries the sense that
 * the page has air in it. If it ever becomes noticeable on its own, it is
 * too strong.
 *
 * Canvas rather than DOM nodes: forty absolutely-positioned divs each
 * with their own keyframe animation is forty composited layers and a
 * measurable hit on a mid-range phone. One canvas is one layer.
 */
export function HeroAtmosphere({ calm = false }: HeroAtmosphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  // Read by the animation loop without re-subscribing it. Putting `calm`
  // in the effect's dependencies would tear down and rebuild the whole
  // mote field every time the composer gained or lost focus. Written in
  // an effect rather than during render: a render can be discarded, and a
  // ref mutated during one would then describe a frame that never was.
  const calmRef = useRef(calm);
  useEffect(() => {
    calmRef.current = calm;
  }, [calm]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let motes: Mote[] = [];
    let width = 0;
    let height = 0;
    let frame: number | null = null;
    let visible = true;
    let last = performance.now();
    // Eased toward `calmRef`, so focusing the field slows the air over
    // about a second instead of freezing it on the spot.
    let stillness = 0;

    const pointer = { x: 0.5, y: 0.5, currentX: 0.5, currentY: 0.5 };

    function seed() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (width === 0 || height === 0) return;

      // Capped at 2: past that the extra pixels cost real time on phones
      // and buy nothing the eye can resolve on a blurred dot.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context?.setTransform(dpr, 0, 0, dpr, 0, 0);

      const megapixels = (width * height) / 1_000_000;
      const count = Math.round(
        Math.min(MAX_MOTES, Math.max(MIN_MOTES, megapixels * MOTES_PER_MEGAPIXEL)),
      );

      motes = Array.from({ length: count }, () => {
        const depth = 0.35 + Math.random() * 0.65;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          r: 0.9 + depth * 2.4,
          vx: (Math.random() - 0.5) * 7,
          vy: -3 - Math.random() * 7,
          alpha: 0.14 + Math.random() * 0.3,
          warmth: Math.random(),
          depth,
        };
      });
    }

    function draw(now: number) {
      if (!canvas || !context) return;

      // Seconds, and clamped: a backgrounded tab resumes with a delta of
      // several seconds, which would teleport every mote across the hero.
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;

      const target = calmRef.current ? 1 : 0;
      stillness += (target - stillness) * Math.min(delta * 3.2, 1);
      const speed = 1 - stillness * 0.86;

      pointer.currentX += (pointer.x - pointer.currentX) * Math.min(delta * 2.4, 1);
      pointer.currentY += (pointer.y - pointer.currentY) * Math.min(delta * 2.4, 1);

      context.clearRect(0, 0, width, height);

      const shiftX = (pointer.currentX - 0.5) * 26;
      const shiftY = (pointer.currentY - 0.5) * 18;

      for (const mote of motes) {
        mote.x += mote.vx * delta * speed;
        mote.y += mote.vy * delta * speed;

        // Wrap rather than respawn: a mote that fades in at a random spot
        // is a twinkle, and this field is meant to drift, not sparkle.
        if (mote.y < -12) {
          mote.y = height + 12;
          mote.x = Math.random() * width;
        }
        if (mote.x < -12) mote.x = width + 12;
        if (mote.x > width + 12) mote.x = -12;

        const r = mix(EMBER[0], GOLD[0], mote.warmth);
        const g = mix(EMBER[1], GOLD[1], mote.warmth);
        const b = mix(EMBER[2], GOLD[2], mote.warmth);
        // Fades along with the air going still, so a focused composer
        // sits against a genuinely quieter field.
        const alpha = mote.alpha * (1 - stillness * 0.55);

        context.beginPath();
        context.arc(
          mote.x + shiftX * mote.depth,
          mote.y + shiftY * mote.depth,
          mote.r,
          0,
          Math.PI * 2,
        );
        context.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        context.fill();
      }

      frame = visible ? requestAnimationFrame(draw) : null;
    }

    function onPointerMove(event: PointerEvent) {
      pointer.x = event.clientX / window.innerWidth;
      pointer.y = event.clientY / window.innerHeight;
    }

    seed();

    // Once the hero has scrolled away there is nothing to animate for —
    // stop the loop entirely rather than drawing motes nobody can see, and
    // pick it up again if the visitor scrolls back up.
    const visObserver =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              const next = entry.isIntersecting;
              if (next === visible) return;
              visible = next;
              if (reduced) return;
              if (visible && frame == null) {
                last = performance.now();
                frame = requestAnimationFrame(draw);
              } else if (!visible && frame != null) {
                cancelAnimationFrame(frame);
                frame = null;
              }
            },
            { rootMargin: "120px" },
          );
    visObserver?.observe(canvas);

    if (reduced) {
      // Still draw one frame: the motes are part of the composition, and
      // reduced motion asks for less movement, not a barer page.
      draw(performance.now());
      if (frame != null) cancelAnimationFrame(frame);
      frame = null;
    } else {
      frame = requestAnimationFrame(draw);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(seed);
    observer?.observe(canvas);

    return () => {
      if (frame != null) cancelAnimationFrame(frame);
      observer?.disconnect();
      visObserver?.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}
