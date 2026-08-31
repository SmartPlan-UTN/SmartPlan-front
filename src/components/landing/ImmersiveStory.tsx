"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

import { usePrefersReducedMotion, useIsClient } from "@/lib/motion";

import { STORY } from "./landingContent";
import {
  CLUSTER_CENTER,
  DEPTH_Z,
  ROUTE_NODES,
  STORY_TOKENS,
  type StoryToken,
} from "./storyScene";
import styles from "./story.module.css";

const NODE_INDEX: Record<string, number> = { atardecer: 0, mesa: 1, cafe: 2 };

const COMPACT_QUERY = "(max-width: 900px)";

/** matchMedia via `useSyncExternalStore` — reads the real value during
 * render, no setState in an effect. Server snapshot is `false`. */
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

export function ImmersiveStory() {
  const reduced = usePrefersReducedMotion();
  const compact = useCompact();
  const client = useIsClient();
  // Until the client is running, render the scrubbed scene so the server
  // and first client render agree; then swap to the static layout for
  // reduced motion or narrow viewports.
  const staticMode = client && (reduced || compact);

  return (
    <section
      className={styles.section}
      data-static={staticMode ? "true" : undefined}
      aria-labelledby="story-title"
    >
      {staticMode ? <StaticStory /> : <ScrubStory />}
    </section>
  );
}

/* ── Scroll-scrubbed scene (desktop, motion allowed) ─────────────────── */

/** Scene box in px, measured once (and on resize) so paper choreography
 * runs on `transform` alone instead of animating `left`/`top`. */
function useSceneBox(ref: React.RefObject<HTMLDivElement | null>) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const r = node.getBoundingClientRect();
      setBox((prev) =>
        prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height },
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(measure);
    obs.observe(node);
    return () => obs.disconnect();
  }, [ref]);
  return box;
}

/** For each kept scrap, its slot within the cluster's stack. */
function useStackSlots() {
  return useMemo(() => {
    const counters: Record<string, number> = {};
    const totals: Record<string, number> = {};
    for (const t of STORY_TOKENS) {
      if (t.cluster === "discarded") continue;
      totals[t.cluster] = (totals[t.cluster] ?? 0) + 1;
    }
    const slot: Record<string, { i: number; n: number }> = {};
    for (const t of STORY_TOKENS) {
      if (t.cluster === "discarded") continue;
      const i = counters[t.cluster] ?? 0;
      counters[t.cluster] = i + 1;
      slot[t.label] = { i, n: totals[t.cluster] };
    }
    return slot;
  }, []);
}

function ScrubStory() {
  const wrap = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const box = useSceneBox(scene);
  const stack = useStackSlots();
  const { scrollYProgress } = useScroll({
    target: wrap,
    offset: ["start start", "end end"],
  });

  // The camera tilts from a raked table view almost flat as the piles
  // resolve into a route.
  const camRotate = useTransform(scrollYProgress, [0.52, 0.74], [25, 6]);
  const camTransform = useTransform(camRotate, (deg) => `rotateX(${deg}deg)`);
  // A single pass of light across the table while smartplan "reads" it.
  const sweepX = useTransform(scrollYProgress, [0.14, 0.3], ["-30%", "130%"]);
  const sweepOpacity = useTransform(
    scrollYProgress,
    [0.13, 0.16, 0.28, 0.31],
    [0, 1, 1, 0],
  );

  const pathLength = useTransform(scrollYProgress, [0.72, 0.9], [0, 1]);
  const copyOpacity = useTransform(
    scrollYProgress,
    [0, 0.12, 0.42, 0.56],
    [1, 1, 1, 0.32],
  );
  const stampStyle = {
    opacity: useTransform(scrollYProgress, [0.86, 0.93], [0, 1]),
    scale: useTransform(scrollYProgress, [0.86, 0.93], [0.9, 1]),
  };

  return (
    <div ref={wrap} className={styles.wrap}>
      <div className={styles.viewport}>
        <div className={styles.shell}>
          <motion.div className={styles.copy} style={{ opacity: copyOpacity }}>
            <h2 id="story-title" className={styles.title}>
              {STORY.title[0]}
              <span>{` ${STORY.title[1]}`}</span>
            </h2>
            <p className={styles.lead}>{STORY.lead}</p>
          </motion.div>

          <div className={styles.stage}>
            <motion.div
              ref={scene}
              className={styles.table}
              style={{ transform: camTransform }}
              aria-label="De intenciones dispersas a un recorrido ordenado"
            >
              <div className={styles.tableSurface} aria-hidden="true" />
              <motion.div
                className={styles.sweep}
                aria-hidden="true"
                style={{ x: sweepX, opacity: sweepOpacity }}
              />

              <svg
                className={styles.route}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <motion.path
                  d={`M ${ROUTE_NODES[0].x} 52 L ${ROUTE_NODES[2].x} 52`}
                  fill="none"
                  stroke="var(--ember)"
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  style={{ pathLength }}
                />
              </svg>

              {STORY_TOKENS.map((token) => (
                <Scrap
                  key={token.label}
                  token={token}
                  progress={scrollYProgress}
                  box={box}
                  slot={stack[token.label]}
                />
              ))}

              {STORY.stops.map((stop, i) => (
                <Node
                  key={stop.time}
                  stop={stop}
                  index={i}
                  progress={scrollYProgress}
                />
              ))}

              <motion.div className={styles.stamp} aria-hidden="true" style={stampStyle}>
                <Image
                  src="/brand/logo-mark-white.png"
                  alt=""
                  width={44}
                  height={42}
                  sizes="44px"
                />
              </motion.div>
            </motion.div>
          </div>

          <ol className={styles.phases} aria-hidden="true">
            {STORY.phases.map((phase) => (
              <li key={phase.at}>
                <strong>{phase.at}</strong>
                <span>{phase.copy}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Scrap({
  token,
  progress,
  box,
  slot,
}: {
  token: StoryToken;
  progress: MotionValue<number>;
  box: { w: number; h: number };
  slot?: { i: number; n: number };
}) {
  const discarded = token.cluster === "discarded";

  // Where the scrap ends up: its cluster's stack point, then the route
  // node. Kept scraps fan out a few px inside the stack so it reads as a
  // pile, not one card.
  const fan = slot ? slot.i - (slot.n - 1) / 2 : 0;
  const center =
    token.cluster === "discarded"
      ? { x: token.home.x < 50 ? -28 : 128, y: token.home.y + 10 }
      : {
          x: CLUSTER_CENTER[token.cluster].x + fan * 2.4,
          y: CLUSTER_CENTER[token.cluster].y + fan * 1.6,
        };
  const node =
    token.cluster === "discarded"
      ? center
      : ROUTE_NODES[NODE_INDEX[token.cluster]];

  const dx = (a: number) => ((a - token.home.x) / 100) * box.w;
  const dy = (a: number) => ((a - token.home.y) / 100) * box.h;

  const x = useTransform(
    progress,
    [0, 0.26, 0.42, 0.6, 0.72],
    [0, 0, discarded ? dx(center.x) : 0, dx(center.x), dx(node.x)],
  );
  const y = useTransform(
    progress,
    [0, 0.26, 0.42, 0.6, 0.72],
    [0, 0, discarded ? dy(center.y) : 0, dy(center.y), dy(node.y)],
  );
  // Depth off the table plane — pulled back to flat as the camera drops.
  const z = useTransform(
    progress,
    discarded ? [0.28, 0.42] : [0.52, 0.7],
    discarded ? [DEPTH_Z[token.depth], 220] : [DEPTH_Z[token.depth], 0],
  );
  const rotate = useTransform(progress, [0, 0.58], [token.home.rot, 0]);
  const scale = useTransform(progress, [0.58, 0.74], [1, 0.86]);
  const opacity = useTransform(
    progress,
    discarded ? [0.28, 0.42] : [0, 0.03, 0.7, 0.84],
    discarded ? [1, 0] : [0, 1, 1, 0],
  );
  const saturate = useTransform(progress, [0.28, 0.42], [1, 0]);
  const filter = useTransform(saturate, (v) => `saturate(${discarded ? v : 1})`);

  return (
    <motion.div
      className={styles.scrapAnchor}
      style={{ left: `${token.home.x}%`, top: `${token.home.y}%`, x, y, z }}
    >
      <motion.span
        className={styles.scrap}
        data-discarded={discarded ? "true" : undefined}
        data-drift={!discarded ? "true" : undefined}
        style={{ rotate, scale, opacity, filter }}
      >
        {token.label}
      </motion.span>
    </motion.div>
  );
}

function Node({
  stop,
  index,
  progress,
}: {
  stop: { time: string; label: string };
  index: number;
  progress: MotionValue<number>;
}) {
  const appear = 0.7 + index * 0.05;
  const opacity = useTransform(progress, [appear, appear + 0.08], [0, 1]);
  const scale = useTransform(progress, [appear, appear + 0.08], [0.82, 1]);

  return (
    <div
      className={styles.nodeAnchor}
      style={{ left: `${ROUTE_NODES[index].x}%`, top: `${ROUTE_NODES[index].y}%` }}
    >
      <motion.div className={styles.node} style={{ opacity, scale }}>
        <time>{stop.time}</time>
        <span>{stop.label}</span>
      </motion.div>
    </div>
  );
}

/* ── Static fallback (mobile / reduced motion) ───────────────────────── */

function StaticStory() {
  return (
    <div className={styles.viewport}>
      <div className={styles.shell}>
        <div className={styles.copy}>
          <h2 id="story-title" className={styles.title}>
            {STORY.title[0]}
            <span>{` ${STORY.title[1]}`}</span>
          </h2>
          <p className={styles.lead}>{STORY.lead}</p>
        </div>

        <div className={styles.staticScene}>
          {(["atardecer", "mesa", "cafe"] as const).map((cluster, i) => (
            <div key={cluster} className={styles.staticPile}>
              <span className={styles.staticPileTime}>{STORY.stops[i].time}</span>
              <ul className={styles.staticTokens} aria-hidden="true">
                {STORY_TOKENS.filter((t) => t.cluster === cluster).map((t) => (
                  <li key={t.label}>{t.label}</li>
                ))}
              </ul>
              <span className={styles.staticPileLabel}>{STORY.stops[i].label}</span>
            </div>
          ))}
          <ul className={styles.staticDiscarded} aria-hidden="true">
            {STORY_TOKENS.filter((t) => t.cluster === "discarded").map((t) => (
              <li key={t.label}>{t.label}</li>
            ))}
          </ul>
        </div>

        <ol className={styles.phases}>
          {STORY.phases.map((phase) => (
            <li key={phase.at}>
              <strong>{phase.at}</strong>
              <span>{phase.copy}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
