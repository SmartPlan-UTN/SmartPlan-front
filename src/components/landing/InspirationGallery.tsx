"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  type Variants,
} from "motion/react";

import { Icon } from "@/components/ui";
import { useEntrance, EASE_OUT, viewportOnce } from "@/lib/motion";

import { Reveal } from "./Reveal";
import { INSPIRATION, type InspirationTile } from "./landingContent";
import { MEDIA } from "./landingMedia";
import styles from "./gallery.module.css";

/**
 * The gallery no longer reveals as one block. Each tile carries its own
 * entrance so the section has rhythm rather than a single fade-up: one
 * grows in from small, one arrives from the side, one is uncovered by a
 * mask. The feature tile is scroll-linked — it is the photograph that
 * "is born inside the hero" as the objects clear away.
 *
 * Recipes are keyed by tile id and kept deliberately few; the brief's
 * rule is that composition outranks the catalogue of effects.
 */

const RECIPES: Record<string, Variants> = {
  cordillera: {
    hidden: { opacity: 0, x: 44 },
    shown: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE_OUT } },
  },
  noche: {
    hidden: { opacity: 0, clipPath: "inset(0 0 100% 0)" },
    shown: {
      opacity: 1,
      clipPath: "inset(0 0 0% 0)",
      transition: { duration: 0.7, ease: EASE_OUT },
    },
  },
  cafe: {
    hidden: { opacity: 0, scale: 0.96 },
    shown: { opacity: 1, scale: 1, transition: { duration: 0.55, ease: EASE_OUT } },
  },
  informal: {
    hidden: { opacity: 0, y: 34 },
    shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
  },
  vinos: {
    hidden: { opacity: 0, y: 40, rotate: 1.5 },
    shown: {
      opacity: 1,
      y: 0,
      rotate: 0,
      transition: { duration: 0.65, ease: EASE_OUT },
    },
  },
};

const DEFAULT_RECIPE: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE_OUT } },
};

const BODY_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT, delay: 0.12 } },
};

export function InspirationGallery() {
  const { active } = useEntrance();

  return (
    <section className={styles.section} aria-labelledby="inspiration-title">
      <div className={styles.shell}>
        <Reveal className={styles.header}>
          <h2 id="inspiration-title" className={styles.title}>
            {INSPIRATION.title[0]}
            <span className={styles.titleSoft}> {INSPIRATION.title[1]}</span>
          </h2>
          <p className={styles.lead}>{INSPIRATION.lead}</p>
        </Reveal>
      </div>
      <div className={styles.gridWrap}>
        <ul className={styles.grid}>
          {INSPIRATION.tiles.map((tile) => (
            <Tile key={tile.id} tile={tile} active={active} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function Tile({ tile, active }: { tile: InspirationTile; active: boolean }) {
  const isFeature = tile.scale === "feature";

  if (isFeature && active) {
    return <FeatureTile tile={tile} />;
  }

  const image = MEDIA[tile.media];
  const variants = active ? RECIPES[tile.id] ?? DEFAULT_RECIPE : undefined;

  return (
    <motion.li
      className={styles.tile}
      data-id={tile.id}
      variants={variants}
      initial={variants ? "hidden" : false}
      whileInView={variants ? "shown" : undefined}
      viewport={viewportOnce}
    >
      <div className={styles.tileMedia}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(max-width: 620px) 88vw, (max-width: 900px) 52vw, 44vw"
          className={styles.tilePhoto}
          style={image.focus ? { objectPosition: image.focus } : undefined}
        />
      </div>
      <div className={styles.tileScrim} aria-hidden="true" />
      <motion.div
        className={styles.tileBody}
        variants={active ? BODY_VARIANTS : undefined}
      >
        <p className={styles.tileMeta}>
          <Icon name={tile.icon} size={14} stroke={2} aria-hidden="true" />
          {tile.kicker}
        </p>
        <h3 className={styles.tileTitle}>{tile.title}</h3>
        <p className={styles.tileCaption}>{tile.caption}</p>
      </motion.div>
    </motion.li>
  );
}

/**
 * The feature tile is scrubbed by scroll as it rises into view: it starts
 * small and masked at the bottom of the viewport and reaches full size
 * and a clean frame by the time it is centred — the hand-off from the
 * emptying hero.
 */
function FeatureTile({ tile }: { tile: InspirationTile }) {
  const ref = useRef<HTMLLIElement>(null);
  const image = MEDIA[tile.media];

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start center"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [64, 0]);
  const inset = useTransform(scrollYProgress, [0, 1], [38, 0]);
  const clipPath = useTransform(inset, (v) => `inset(${v}% round 14px)`);

  return (
    <motion.li
      ref={ref}
      className={styles.tile}
      data-id={tile.id}
      style={{ scale, y, clipPath }}
    >
      <div className={styles.tileMedia}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(max-width: 620px) 88vw, (max-width: 900px) 52vw, 44vw"
          className={styles.tilePhoto}
          style={image.focus ? { objectPosition: image.focus } : undefined}
          loading="eager"
          fetchPriority="high"
        />
      </div>
      <div className={styles.tileScrim} aria-hidden="true" />
      <div className={styles.tileBody}>
        <p className={styles.tileMeta}>
          <Icon name={tile.icon} size={14} stroke={2} aria-hidden="true" />
          {tile.kicker}
        </p>
        <h3 className={styles.tileTitle}>{tile.title}</h3>
        <p className={styles.tileCaption}>{tile.caption}</p>
      </div>
    </motion.li>
  );
}
