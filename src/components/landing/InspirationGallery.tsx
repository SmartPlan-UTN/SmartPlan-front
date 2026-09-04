"use client";

import { useRef, useSyncExternalStore, type CSSProperties } from "react";
import Image from "next/image";

import { usePrefersReducedMotion, useIsClient } from "@/lib/motion";

import {
  GALLERY_TILES,
  getGalleryBeats,
  tileProgress,
  type GalleryTile,
} from "./galleryScene";
import { INSPIRATION, type InspirationTile } from "./landingContent";
import { MEDIA } from "./landingMedia";
import { Reveal } from "./Reveal";
import { sceneProgress, useSceneClock } from "./sceneClock";
import styles from "./gallery.module.css";

const COMPACT_QUERY = "(max-width: 900px)";

const BY_ID = new Map<string, InspirationTile>(
  INSPIRATION.tiles.map((tile) => [tile.id, tile]),
);

/**
 * matchMedia through `useSyncExternalStore`: the real value is read during
 * render, with a `false` server snapshot, so there is no setState in an
 * effect and no hydration mismatch. Same shape as `ImmersiveStory`'s.
 */
function useCompact(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia?.(COMPACT_QUERY);
      if (!mql) return () => {};
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia?.(COMPACT_QUERY).matches === true,
    () => false,
  );
}

/**
 * The section that answers the hero (CU17 · PAN 07).
 *
 * ── The problem this replaces ───────────────────────────────────────
 *
 * The previous version bound its photograph and its headline to the
 * hero's intro clock, on windows opening at 0.34 and 0.52 of a track
 * measured over 1.75 hero-heights. The hero's own copy was gone by 0.30.
 * So for roughly half a screen you scrolled past an emptied hero and a
 * photograph that had not arrived — and when the headline finally did, it
 * was still at a fraction of its opacity while sitting in the middle of
 * the viewport, which is what read as blurry. Underneath it, a 540px card
 * beside a rigid five-cell grid: nothing in the frame was the subject.
 *
 * ── What it does instead ────────────────────────────────────────────
 *
 * One pinned scene, one measurement per frame, three beats:
 *
 *   1. approach   the lead photograph is already climbing, near-bleed,
 *                 while the hero is still leaving — driven by the
 *                 section's approach to the viewport rather than by its
 *                 pin, which is the only way there is no gap
 *   2. reframe    it retreats into a portrait; the headline settles
 *   3. deploy     four more photographs arrive, staggered, at sizes that
 *                 are deliberately not comparable to each other
 *
 * Under reduced motion or below 900px the same composition renders
 * without the pin — see `StaticScene`.
 */
export function InspirationGallery() {
  const reduced = usePrefersReducedMotion();
  const compact = useCompact();
  const client = useIsClient();
  // Until the client is running, render the scrubbed scene so the server
  // and the first client render agree; then swap if either applies.
  const staticMode = client && (reduced || compact);

  return (
    <section className={styles.section} aria-labelledby="inspiration-title">
      {staticMode ? <StaticScene /> : <ScrubScene />}
    </section>
  );
}

/* ── Scrubbed scene (desktop, motion allowed) ────────────────────────── */

/**
 * The scene's beats, from one rect.
 *
 * A frame does exactly three things, in this order: one
 * `getBoundingClientRect` — the only layout read, since `innerHeight` is
 * cached by the resize listener — then the arithmetic here, then every
 * custom property written at once onto a single node by `useSceneClock`.
 * Reading after writing within a frame is what forces synchronous layout,
 * so it never happens.
 */
function measureGallery(
  rect: DOMRect,
  viewportHeight: number,
): Record<string, number> {
  const { enter, t } = sceneProgress(rect, viewportHeight);
  const beats = getGalleryBeats(enter, t);

  const values: Record<string, number> = {
    "--enter": beats.enter,
    "--copy": beats.copy,
    "--shift": beats.shift,
    "--open": beats.open,
  };
  for (const tile of GALLERY_TILES) {
    if (tile.role === "lead") continue;
    values[`--open-${tile.id}`] = tileProgress(beats.open, tile.delay);
  }
  return values;
}

function ScrubScene() {
  const track = useRef<HTMLDivElement>(null);
  useSceneClock(track, measureGallery);

  return (
    <div ref={track} className={styles.track}>
      <div className={styles.viewport}>
        <div className={styles.stage}>
          {GALLERY_TILES.map((tile) => (
            <SceneTile key={tile.id} tile={tile} />
          ))}
          <Copy />
        </div>
      </div>
    </div>
  );
}

function Copy() {
  return (
    <div className={styles.copy}>
      <p className={styles.kicker}>{INSPIRATION.kicker}</p>
      <h2 id="inspiration-title" className={styles.title}>
        {INSPIRATION.title[0]}{" "}
        <span className={styles.titleSoft}>{INSPIRATION.title[1]}</span>
      </h2>
      <p className={styles.lead}>{INSPIRATION.lead}</p>
    </div>
  );
}

/**
 * Laid out once at its final frame; only `transform` and `opacity` move.
 * The frame percentages ride in as inline custom properties because they
 * are data, not style — the same reason `storyScene.ts` exists.
 */
function SceneTile({ tile }: { tile: GalleryTile }) {
  const content = BY_ID.get(tile.id);
  if (!content) return null;
  const image = MEDIA[content.media];

  const vars = {
    "--x": `${tile.frame.x}%`,
    "--y": `${tile.frame.y}%`,
    "--w": `${tile.frame.w}%`,
    "--h": `${tile.frame.h}%`,
    "--from-x": `${tile.from.x}%`,
    "--from-y": `${tile.from.y}%`,
  } as CSSProperties;

  if (tile.role !== "lead") {
    (vars as Record<string, string>)["--p"] = `var(--open-${tile.id}, 0)`;
  }

  return (
    <figure
      className={styles.tile}
      data-role={tile.role}
      data-label={tile.label}
      style={vars}
    >
      <div className={styles.frame}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={tile.sizes}
          className={styles.photo}
          // Eager, but at the lowest priority the browser offers.
          // Lazy loading is unreliable here: these sit inside a sticky,
          // `overflow: clip` viewport and carry a transform, and one tile
          // was reproducibly painting as an empty placeholder while its
          // neighbours loaded. The whole scene is five small photographs
          // that the section exists to show, so fetching them is not
          // speculative — and `low` keeps them behind the hero, which
          // owns the LCP.
          loading="eager"
          fetchPriority="low"
          style={image.focus ? { objectPosition: image.focus } : undefined}
        />
      </div>
      {tile.label === "none" ? null : (
        <figcaption className={styles.label}>{content.label}</figcaption>
      )}
    </figure>
  );
}

/* ── Static composition (mobile / reduced motion) ────────────────────── */

/**
 * The same argument without the pin. The lead photograph is in normal
 * flow, so it is on screen as the hero leaves for the plainest possible
 * reason — real content in the viewport — and the rest reveals as it is
 * reached. No scroll hijacking on a phone, and every word at full
 * opacity from the moment it exists.
 */
function StaticScene() {
  const [lead, ...rest] = GALLERY_TILES;

  return (
    <div className={styles.staticScene}>
      <StaticTile tile={lead} eager />
      <div className={styles.staticCopy}>
        <Copy />
      </div>
      <ul className={styles.staticGrid}>
        {rest.map((tile, index) => (
          <li key={tile.id} data-role={tile.role}>
            <Reveal delay={index * 70}>
              <StaticTile tile={tile} />
            </Reveal>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StaticTile({ tile, eager }: { tile: GalleryTile; eager?: boolean }) {
  const content = BY_ID.get(tile.id);
  if (!content) return null;
  const image = MEDIA[content.media];

  return (
    <figure className={styles.staticTile} data-role={tile.role}>
      <div className={styles.frame}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={tile.sizes}
          className={styles.photo}
          // Never `priority`: the hero owns the LCP and this must not
          // compete with it for bandwidth. The lead is only un-lazied
          // because on a phone it is the first thing under the fold.
          loading={eager ? "eager" : "lazy"}
          fetchPriority="low"
          style={image.focus ? { objectPosition: image.focus } : undefined}
        />
      </div>
      <figcaption className={styles.label}>{content.label}</figcaption>
    </figure>
  );
}
