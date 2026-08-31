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

/**
 * Each tile arrives differently — one from the side, one uncovered by a
 * mask, one growing in from small — and the shared transition (below,
 * on the element) carries a per-tile delay so the section deals itself
 * out rather than popping in as one block.
 */
const RECIPES: Record<string, Variants> = {
  cordillera: {
    hidden: { opacity: 0, x: 44 },
    shown: { opacity: 1, x: 0 },
  },
  noche: {
    hidden: { opacity: 0, clipPath: "inset(0 0 100% 0)" },
    shown: { opacity: 1, clipPath: "inset(0 0 0% 0)" },
  },
  cafe: {
    hidden: { opacity: 0, scale: 0.96 },
    shown: { opacity: 1, scale: 1 },
  },
  informal: {
    hidden: { opacity: 0, y: 34 },
    shown: { opacity: 1, y: 0 },
  },
  vinos: {
    hidden: { opacity: 0, y: 40, rotate: 1.5 },
    shown: { opacity: 1, y: 0, rotate: 0 },
  },
};

const DEFAULT_RECIPE: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  shown: { opacity: 1, y: 0, scale: 1 },
};

const BODY_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT, delay: 0.16 } },
};

/** Reading order of the grid, so the deal runs top-left to bottom-right. */
const TILE_ORDER: Record<string, number> = {
  mesa: 0,
  cordillera: 1,
  noche: 2,
  cafe: 3,
  informal: 4,
  vinos: 5,
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
  const order = TILE_ORDER[tile.id] ?? 0;

  return (
    <motion.li
      className={styles.tile}
      data-id={tile.id}
      variants={variants}
      initial={variants ? "hidden" : false}
      whileInView={variants ? "shown" : undefined}
      viewport={viewportOnce}
      transition={{ duration: 0.62, ease: EASE_OUT, delay: order * 0.07 }}
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
    offset: ["start end", "center 62%"],
  });

  // Born from below: it starts well down the viewport, small and masked
  // almost shut, and reaches full size and a clean frame only once it is
  // near centred — the hand-off from the emptied hero.
  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [128, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.15, 1], [0, 1, 1]);
  const inset = useTransform(scrollYProgress, [0, 1], [52, 0]);
  const clipPath = useTransform(inset, (v) => `inset(${v}% round 14px)`);

  return (
    <motion.li
      ref={ref}
      className={styles.tile}
      data-id={tile.id}
      style={{ scale, y, opacity, clipPath }}
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
