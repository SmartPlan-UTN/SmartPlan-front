"use client";

import Image from "next/image";
import { motion } from "motion/react";

import { EASE_OUT, EASE_PHYSICAL } from "@/lib/motion";
import { useReducedMotion } from "@/hooks";

import styles from "./hero-objects.module.css";

/**
 * Physical fragments of possible plans, arranged around the composer like
 * objects settling onto a table — not icons orbiting a centre.
 *
 * The scene is built in three depth planes, and that is what keeps it from
 * reading as "N cut-outs floating":
 *
 *   fore  large, sharp, high-contrast — clipped by the viewport corners,
 *         most pointer parallax, leaves first and fastest on scroll.
 *   mid   category objects at the sides, moderate everything.
 *   back  small / faint — barely moves, leaves last.
 *
 * Four nested layers keep the choreography from fighting itself:
 *
 *   .object       position + size + media queries + pointer parallax
 *   .objectExit   the scroll-linked departure (CSS, `--object-exit-progress`)
 *   motion.div    the one-time entrance (Motion, on mount)
 *   img
 *
 * Each object carries its own entrance vector, rest rotation, departure
 * vector and its own entrance timing, so nothing moves at a uniform rate:
 * the map anchors first, slow and heavy; the mid-ground follows; the small
 * far pieces snap in last and quick. Depth drives speed.
 */

type Plane = "fore" | "mid" | "back";

interface HeroObject {
  id: string;
  src: string;
  width: number;
  height: number;
  sizes: string;
  priority?: boolean;
  /** Depth plane — drives parallax, drift and exit rate (see CSS). */
  plane: Plane;
  /** Resting opacity. Far / ambient pieces sit back. */
  opacity?: number;
  /** Degrees the piece rests at. */
  rot: number;
  /** Where it enters from, relative to its resting place (px / deg). */
  enter: { x: number; y: number; rot: number; scale: number };
  /**
   * Entrance timing, per piece. Depth drives speed: pieces that read as
   * near travel further and take longer to settle; small far pieces snap
   * in late and quick. `enterDelay + enterDur` must stay <= 0.85.
   */
  enterDelay: number;
  enterDur: number;
  /** Where it travels as the hero scrolls away (multiplied by progress). */
  exit: { x: number; y: number; scale: number; start: number; rate: number };
  /** A few pieces breathe while the hero sits idle. */
  drift?: boolean;
}

export const HERO_OBJECTS: readonly HeroObject[] = [
  /* ── Foreground ─────────────────────────────────────────────────── */
  {
    // The background mass. Rises from below the fold, slow and heavy, and
    // is the last foreground piece still settling when the composer lands.
    id: "map",
    src: "/landing/hero/map.png",
    width: 1254,
    height: 1254,
    sizes: "(max-width: 760px) 66vw, (max-width: 1600px) 38vw, 600px",
    plane: "fore",
    opacity: 0.83,
    rot: -11,
    enter: { x: -60, y: 200, rot: -7, scale: 0.88 },
    enterDelay: 0,
    enterDur: 0.74,
    exit: { x: -560, y: 110, scale: 1.1, start: 0.03, rate: 2 },
  },
  {
    // Drops in from over the top edge and settles onto the table.
    id: "polaroid",
    src: "/landing/hero/polaroid.png",
    width: 1254,
    height: 1254,
    sizes: "(max-width: 760px) 40vw, (max-width: 1600px) 22vw, 320px",
    priority: true,
    plane: "fore",
    rot: 9,
    enter: { x: 44, y: -150, rot: 6, scale: 0.92 },
    enterDelay: 0.05,
    enterDur: 0.6,
    exit: { x: 520, y: -95, scale: 1.05, start: 0.05, rate: 2.05 },
    drift: true,
  },
  {
    // Slides in from off the right edge.
    id: "ticket",
    src: "/landing/hero/ticket.png",
    width: 1536,
    height: 1024,
    sizes: "(max-width: 760px) 46vw, (max-width: 1600px) 24vw, 340px",
    plane: "fore",
    rot: -9,
    enter: { x: 150, y: 44, rot: -6, scale: 0.93 },
    enterDelay: 0.14,
    enterDur: 0.52,
    exit: { x: 560, y: 80, scale: 1.03, start: 0.04, rate: 2.1 },
    drift: true,
  },

  /* ── Midground ──────────────────────────────────────────────────── */
  {
    // Comes in from off the left edge.
    id: "camera",
    src: "/landing/hero/camera.png",
    width: 1536,
    height: 1024,
    sizes: "(max-width: 1600px) 22vw, 300px",
    plane: "mid",
    rot: -13,
    enter: { x: -220, y: -18, rot: -12, scale: 0.9 },
    enterDelay: 0.18,
    enterDur: 0.5,
    exit: { x: -600, y: -90, scale: 1, start: 0.14, rate: 1.66 },
  },
  {
    id: "notebook",
    src: "/landing/hero/notebook.png",
    width: 1254,
    height: 1254,
    sizes: "(max-width: 1600px) 15vw, 210px",
    plane: "mid",
    opacity: 0.96,
    rot: 7,
    enter: { x: -40, y: 40, rot: 4, scale: 0.94 },
    enterDelay: 0.22,
    enterDur: 0.46,
    exit: { x: -520, y: 150, scale: 1, start: 0.16, rate: 1.7 },
    drift: true,
  },
  {
    id: "gorrito",
    src: "/landing/hero/gorrito.png",
    width: 1536,
    height: 1024,
    sizes: "(max-width: 1600px) 12vw, 170px",
    plane: "mid",
    opacity: 0.9,
    rot: -8,
    enter: { x: -34, y: -34, rot: -6, scale: 0.94 },
    enterDelay: 0.3,
    enterDur: 0.42,
    exit: { x: -540, y: -180, scale: 1, start: 0.18, rate: 1.74 },
  },
  {
    id: "wine",
    src: "/landing/hero/wine.png",
    width: 1024,
    height: 1536,
    sizes: "(max-width: 1600px) 11vw, 160px",
    plane: "mid",
    rot: 10,
    enter: { x: 40, y: -22, rot: 6, scale: 0.93 },
    enterDelay: 0.28,
    enterDur: 0.42,
    exit: { x: 460, y: -420, scale: 1.01, start: 0.19, rate: 1.7 },
    drift: true,
  },
  {
    id: "coffee",
    src: "/landing/hero/coffee.png",
    width: 1254,
    height: 1254,
    sizes: "(max-width: 760px) 30vw, (max-width: 1600px) 14vw, 190px",
    plane: "mid",
    rot: 8,
    enter: { x: 38, y: 34, rot: 5, scale: 0.94 },
    enterDelay: 0.32,
    enterDur: 0.4,
    exit: { x: 520, y: 160, scale: 1, start: 0.22, rate: 1.6 },
  },
  {
    id: "popcorn",
    src: "/landing/hero/popcorn.png",
    width: 1254,
    height: 1254,
    sizes: "(max-width: 1600px) 12vw, 170px",
    plane: "mid",
    opacity: 0.94,
    rot: -6,
    enter: { x: 44, y: 40, rot: -4, scale: 0.93 },
    enterDelay: 0.34,
    enterDur: 0.4,
    exit: { x: 560, y: 180, scale: 1, start: 0.2, rate: 1.66 },
  },
  {
    id: "headphones",
    src: "/landing/hero/headphones.png",
    width: 1254,
    height: 1254,
    sizes: "(max-width: 1600px) 14vw, 200px",
    plane: "mid",
    opacity: 0.92,
    rot: 14,
    enter: { x: -38, y: 36, rot: 9, scale: 0.94 },
    enterDelay: 0.36,
    enterDur: 0.38,
    exit: { x: -560, y: 180, scale: 1, start: 0.18, rate: 1.72 },
  },
  {
    id: "copa",
    src: "/landing/hero/copa.png",
    width: 1024,
    height: 1536,
    sizes: "(max-width: 1600px) 9vw, 130px",
    plane: "mid",
    opacity: 0.88,
    rot: 6,
    enter: { x: 30, y: -26, rot: 5, scale: 0.92 },
    enterDelay: 0.38,
    enterDur: 0.36,
    exit: { x: 500, y: -260, scale: 1, start: 0.2, rate: 1.72 },
  },
  {
    id: "lentes",
    src: "/landing/hero/lentes.png",
    width: 1536,
    height: 1024,
    sizes: "(max-width: 1600px) 11vw, 150px",
    plane: "mid",
    opacity: 0.82,
    rot: -16,
    enter: { x: 20, y: 30, rot: -10, scale: 0.92 },
    enterDelay: 0.4,
    enterDur: 0.34,
    exit: { x: 420, y: 220, scale: 1, start: 0.22, rate: 1.68 },
  },

  /* ── Background ─────────────────────────────────────────────────── */
  {
    // Smallest, furthest, last — snaps into the gap and barely drifts.
    id: "compass",
    src: "/landing/hero/compass.png",
    width: 1254,
    height: 1254,
    sizes: "(max-width: 1600px) 8vw, 120px",
    plane: "back",
    opacity: 0.5,
    rot: 22,
    enter: { x: -20, y: -24, rot: 14, scale: 0.9 },
    enterDelay: 0.42,
    enterDur: 0.3,
    exit: { x: -360, y: -280, scale: 1, start: 0.24, rate: 1.24 },
    drift: true,
  },
];

export function HeroObjects() {
  const reduced = useReducedMotion();

  return (
    <div className={styles.scene} aria-hidden="true" data-testid="hero-objects">
      {HERO_OBJECTS.map((object) => (
        <div
          key={object.id}
          className={styles.object}
          data-object={object.id}
          data-plane={object.plane}
          data-drift={object.drift ? "true" : undefined}
          style={
            {
              "--exit-x": `${object.exit.x}px`,
              "--exit-y": `${object.exit.y}px`,
              "--exit-scale": object.exit.scale,
              "--exit-start": object.exit.start,
              "--exit-rate": object.exit.rate,
              "--rot": `${object.rot}deg`,
              "--rest-opacity": object.opacity ?? 1,
            } as React.CSSProperties
          }
        >
          <div className={styles.objectExit}>
            <motion.div
              className={styles.objectInner}
              initial={
                reduced
                  ? false
                  : {
                      x: object.enter.x,
                      y: object.enter.y,
                      rotate: object.enter.rot,
                      scale: object.enter.scale,
                      opacity: 0,
                    }
              }
              animate={{
                x: 0,
                y: 0,
                // The polaroid overshoots its rest angle by 2° and settles
                // back — a weight coming to rest, not a bounce.
                rotate: object.id === "polaroid" ? [object.enter.rot, -2, 0] : 0,
                scale: 1,
                opacity: 1,
              }}
              transition={{
                duration: object.enterDur,
                ease: object.plane === "fore" ? EASE_PHYSICAL : EASE_OUT,
                delay: object.enterDelay,
                ...(object.id === "polaroid"
                  ? { rotate: { times: [0, 0.7, 1], ease: EASE_OUT } }
                  : null),
              }}
            >
              <Image
                src={object.src}
                alt=""
                width={object.width}
                height={object.height}
                sizes={object.sizes}
                priority={object.priority ?? false}
                draggable={false}
              />
            </motion.div>
          </div>
        </div>
      ))}
    </div>
  );
}
