"use client";

import Image from "next/image";
import { motion } from "motion/react";

import { EASE_PHYSICAL } from "@/lib/motion";
import { useReducedMotion } from "@/hooks";

import styles from "./hero-objects.module.css";

/**
 * Physical fragments of possible plans, arranged around the composer like
 * objects settling onto a table — not icons orbiting a centre.
 *
 * Three nested layers keep the choreography from fighting itself:
 *
 *   .object       position + size + media queries + pointer parallax
 *   .objectExit   the scroll-linked departure (CSS, `--hero-progress`)
 *   motion.div    the one-time entrance (Motion, on mount)
 *
 * Each object carries its own entrance vector, rest rotation, departure
 * vector and stagger band, so nothing moves at a uniform rate. `band`
 * groups objects into arrival waves: the map anchors first, then the
 * mid-ground, then the small foreground pieces.
 */

interface HeroObject {
  id: string;
  src: string;
  width: number;
  height: number;
  sizes: string;
  priority?: boolean;
  /** Degrees the piece rests at. */
  rot: number;
  /** Where it enters from, relative to its resting place (px / deg). */
  enter: { x: number; y: number; rot: number; scale: number };
  /** Where it travels as the hero scrolls away (multiplied by progress). */
  exit: { x: number; y: number; scale: number };
  /** Arrival wave: 0 first, 3 last. */
  band: 0 | 1 | 2 | 3;
  /** A couple of pieces breathe while the hero sits idle. */
  drift?: boolean;
}

const OBJECTS: readonly HeroObject[] = [
  {
    id: "map",
    src: "/landing/hero/map.png",
    width: 1254,
    height: 1254,
    sizes: "(max-width: 760px) 72vw, 42vw",
    priority: true,
    rot: -11,
    enter: { x: -70, y: 60, rot: -5, scale: 0.94 },
    exit: { x: -120, y: 40, scale: 1.08 },
    band: 0,
  },
  {
    id: "polaroid",
    src: "/landing/hero/polaroid.png",
    width: 1254,
    height: 1254,
    sizes: "(max-width: 760px) 42vw, 23vw",
    priority: true,
    rot: 9,
    enter: { x: 54, y: -46, rot: 6, scale: 0.94 },
    exit: { x: 90, y: 120, scale: 1.04 },
    band: 1,
    drift: true,
  },
  {
    id: "ticket",
    src: "/landing/hero/ticket.png",
    width: 1536,
    height: 1024,
    sizes: "(max-width: 760px) 48vw, 25vw",
    rot: -9,
    enter: { x: 60, y: 40, rot: -6, scale: 0.93 },
    exit: { x: 150, y: 30, scale: 1 },
    band: 1,
  },
  {
    id: "camera",
    src: "/landing/hero/camera.png",
    width: 1536,
    height: 1024,
    sizes: "25vw",
    rot: -13,
    enter: { x: -58, y: -30, rot: -8, scale: 0.92 },
    exit: { x: -110, y: -20, scale: 1 },
    band: 2,
  },
  {
    id: "wine",
    src: "/landing/hero/wine.png",
    width: 1024,
    height: 1536,
    sizes: "14vw",
    rot: 10,
    enter: { x: 44, y: -26, rot: 7, scale: 0.93 },
    exit: { x: 96, y: 90, scale: 1.02 },
    band: 2,
    drift: true,
  },
  {
    id: "coffee",
    src: "/landing/hero/coffee.png",
    width: 1254,
    height: 1254,
    sizes: "(max-width: 760px) 32vw, 15vw",
    rot: 8,
    enter: { x: 34, y: 30, rot: 5, scale: 0.94 },
    exit: { x: 130, y: 24, scale: 1 },
    band: 3,
  },
  {
    id: "headphones",
    src: "/landing/hero/headphones.png",
    width: 1254,
    height: 1254,
    sizes: "19vw",
    rot: 14,
    enter: { x: -30, y: 34, rot: 9, scale: 0.94 },
    exit: { x: -90, y: 40, scale: 1 },
    band: 3,
  },
  {
    id: "compass",
    src: "/landing/hero/compass.png",
    width: 1254,
    height: 1254,
    sizes: "12vw",
    rot: 22,
    enter: { x: -18, y: -24, rot: 14, scale: 0.9 },
    exit: { x: -60, y: -30, scale: 1 },
    band: 3,
    drift: true,
  },
];

const BAND_DELAY: Record<HeroObject["band"], number> = {
  0: 0.05,
  1: 0.16,
  2: 0.28,
  3: 0.4,
};

export function HeroObjects() {
  const reduced = useReducedMotion();

  return (
    <div className={styles.scene} aria-hidden="true" data-testid="hero-objects">
      {OBJECTS.map((object) => (
        <div
          key={object.id}
          className={styles.object}
          data-object={object.id}
          data-drift={object.drift ? "true" : undefined}
          style={
            {
              "--exit-x": `${object.exit.x}px`,
              "--exit-y": `${object.exit.y}px`,
              "--exit-scale": object.exit.scale,
              "--rot": `${object.rot}deg`,
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
              animate={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }}
              transition={{
                duration: 0.62,
                ease: EASE_PHYSICAL,
                delay: BAND_DELAY[object.band],
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
