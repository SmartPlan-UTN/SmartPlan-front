"use client";

import Image from "next/image";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";

import { Icon } from "@/components/ui";
import { useReducedMotion } from "@/hooks";

import { Reveal } from "./Reveal";
import { INSPIRATION, type InspirationTile } from "./landingContent";
import { MEDIA } from "./landingMedia";
import styles from "./gallery.module.css";

/** Maximum tilt, in degrees. Past ~3° this stops reading as depth. */
const TILT = 2.6;

/**
 * What a salida can be, shown rather than described.
 *
 * An asymmetric grid, not a row of equal cards: six tiles at four
 * different sizes, so the eye moves through the section instead of
 * scanning a shelf. The composition is the argument — "there is more here
 * than you were thinking of" is not a sentence the page has to write if
 * the layout already says it.
 *
 * Every tile is a photograph now, bled to the edge of its frame. The
 * colour field underneath is what the tile holds while the image loads,
 * so a slow connection sees a composed page in the brand's palette
 * rather than six grey rectangles.
 *
 * Sizes are chosen against the shapes: the two `wide` tiles take
 * landscape photographs, the `tall` one takes a picture whose subject
 * sits in the middle of the frame and survives a vertical crop, and the
 * `feature` takes the one with the most going on.
 */
export function InspirationGallery() {
  return (
    <section className={styles.section} aria-labelledby="inspiration-title">
      <div className={styles.shell}>
        <Reveal className={styles.header}>
          <p className={`sp-label ${styles.kicker}`}>{INSPIRATION.kicker}</p>
          <h2 id="inspiration-title" className={styles.title}>
            {INSPIRATION.title[0]}
            <span className={styles.titleSoft}> {INSPIRATION.title[1]}</span>
          </h2>
          <p className={styles.lead}>{INSPIRATION.lead}</p>
        </Reveal>
      </div>

      <Reveal className={styles.gridWrap}>
        <ul className={styles.grid}>
          {INSPIRATION.tiles.map((tile) => (
            <Tile key={tile.id} tile={tile} />
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

function Tile({ tile }: { tile: InspirationTile }) {
  const ref = useRef<HTMLLIElement>(null);
  const reduced = useReducedMotion();

  const image = MEDIA[tile.media];

  /**
   * Pointer-relative tilt, written straight to custom properties.
   *
   * State would re-render the tile on every pointer move; custom
   * properties are read by the compositor and skip React entirely.
   */
  function onPointerMove(event: ReactPointerEvent<HTMLLIElement>) {
    if (reduced) return;
    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    node.style.setProperty("--tilt-x", `${(-y * TILT).toFixed(2)}deg`);
    node.style.setProperty("--tilt-y", `${(x * TILT).toFixed(2)}deg`);
  }

  function resetTilt() {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <li
      ref={ref}
      className={styles.tile}
      data-id={tile.id}
      data-tone={tile.tone}
      data-scale={tile.scale}
      onPointerMove={onPointerMove}
      onPointerLeave={resetTilt}
    >
      <div className={styles.tileInner}>
        <div className={styles.tileField} aria-hidden="true" />

        <div className={styles.tileMedia}>
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 620px) 80vw, (max-width: 900px) 50vw, 42vw"
            className={styles.tilePhoto}
            style={image.focus ? { objectPosition: image.focus } : undefined}
            // The gallery sits immediately under the hero, so its first
            // tile is a plausible LCP element on a short viewport.
            // `fetchPriority` rather than `preload`: several tiles could
            // be the LCP depending on the width, and preloading all of
            // them would be worse than preloading none.
            {...(tile.scale === "feature"
              ? { loading: "eager" as const, fetchPriority: "high" as const }
              : {})}
          />
        </div>

        <div className={styles.tileScrim} aria-hidden="true" />

        <div className={styles.tileBody}>
          <p className={styles.tileKicker}>
            <Icon name={tile.icon} size={13} stroke={2} aria-hidden="true" />
            {tile.kicker}
          </p>
          <h3 className={styles.tileTitle}>{tile.title}</h3>
          <p className={styles.tileCaption}>{tile.caption}</p>
        </div>
      </div>
    </li>
  );
}
