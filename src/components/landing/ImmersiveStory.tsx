"use client";

import { useRef, useSyncExternalStore } from "react";
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

function ScrubStory() {
  const wrap = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: wrap,
    offset: ["start start", "end end"],
  });

  const pathLength = useTransform(scrollYProgress, [0.52, 0.84], [0, 1]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.12, 0.5, 0.62], [1, 1, 1, 0.35]);

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

          <div
            className={styles.scene}
            aria-label="De intenciones dispersas a un recorrido ordenado"
          >
            <svg
              className={styles.route}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <motion.path
                d={`M ${ROUTE_NODES[0].x} 50 L ${ROUTE_NODES[2].x} 50`}
                fill="none"
                stroke="var(--ember)"
                strokeWidth="0.5"
                strokeLinecap="round"
                style={{ pathLength }}
              />
            </svg>

            {STORY_TOKENS.map((token) => (
              <Token key={token.label} token={token} progress={scrollYProgress} />
            ))}

            {STORY.stops.map((stop, i) => (
              <Node
                key={stop.time}
                stop={stop}
                index={i}
                progress={scrollYProgress}
              />
            ))}
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

function Token({
  token,
  progress,
}: {
  token: StoryToken;
  progress: MotionValue<number>;
}) {
  const discarded = token.cluster === "discarded";
  const center =
    token.cluster === "discarded"
      ? { x: token.home.x < 50 ? -30 : 130, y: token.home.y + 12 }
      : CLUSTER_CENTER[token.cluster];
  const node =
    token.cluster === "discarded"
      ? { x: token.home.x < 50 ? -30 : 130, y: token.home.y + 12 }
      : ROUTE_NODES[NODE_INDEX[token.cluster]];

  const x = useTransform(
    progress,
    [0, 0.25, 0.55, 0.8],
    [token.home.x, token.home.x, center.x, node.x],
  );
  const y = useTransform(
    progress,
    [0, 0.25, 0.55, 0.8],
    [token.home.y, token.home.y, center.y, node.y],
  );
  const rotate = useTransform(progress, [0, 0.55], [token.home.rot, 0]);
  const scale = useTransform(progress, [0.55, 0.82], [1, 0.82]);
  const opacity = useTransform(
    progress,
    discarded ? [0.28, 0.5] : [0, 0.04, 0.78, 0.94],
    discarded ? [1, 0.12] : [0, 1, 1, 0],
  );
  const saturate = useTransform(progress, [0.28, 0.5], [1, 0]);
  const filter = useTransform(saturate, (v) => `saturate(${discarded ? v : 1})`);

  const left = useTransform(x, (v) => `${v}%`);
  const top = useTransform(y, (v) => `${v}%`);

  return (
    <motion.div className={styles.tokenAnchor} style={{ left, top }}>
      <motion.span
        className={styles.token}
        data-discarded={discarded ? "true" : undefined}
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
  const appear = 0.8 + index * 0.04;
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
          <ul className={styles.staticTokens} aria-hidden="true">
            {STORY_TOKENS.filter((t) => t.cluster !== "discarded").map((t) => (
              <li key={t.label}>{t.label}</li>
            ))}
          </ul>
          <ol className={styles.staticRoute}>
            {STORY.stops.map((stop) => (
              <li key={stop.time}>
                <time>{stop.time}</time>
                <span>{stop.label}</span>
              </li>
            ))}
          </ol>
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
