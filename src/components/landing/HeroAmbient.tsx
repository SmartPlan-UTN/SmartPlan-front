"use client";

import styles from "./hero-ambient.module.css";

/**
 * The scene's background plane: small, faint marks that fill the space
 * between the centre column and the photographic objects, so the hero
 * reads as a composed surface rather than a few cut-outs on cream.
 *
 * Pure inline SVG — no image requests, no bytes over the wire. Each mark
 * barely moves: a sliver of pointer parallax (`--pf` is tiny) and a soft
 * one-time fade-in, nothing on scroll beyond the shared exit the objects
 * already ride.
 */

type MarkKind = "coordPin" | "routeArc";

interface AmbientMark {
  id: string;
  kind: MarkKind;
  /** Placement + resting opacity + tint, all via CSS custom props. */
  className: string;
}

const MARKS: readonly AmbientMark[] = [
  { id: "arc", kind: "routeArc", className: styles.arc },
  { id: "pin", kind: "coordPin", className: styles.pin },
];

function Mark({ kind }: { kind: MarkKind }) {
  if (kind === "coordPin") {
    return (
      <svg viewBox="0 0 48 64" fill="none" aria-hidden="true">
        <path
          d="M24 62C24 62 6 40 6 24a18 18 0 1 1 36 0c0 16-18 38-18 38Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="24" r="5.5" fill="currentColor" />
      </svg>
    );
  }
  // routeArc — a single soft dotted sweep behind the column, the only
  // ambient mark that earns its place: it is the "recorrido" the copy
  // promises, drawn faint under everything.
  return (
    <svg viewBox="0 0 600 220" fill="none" aria-hidden="true" preserveAspectRatio="none">
      <path
        d="M8 196C150 70 330 60 348 120s150 96 244-64"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="1 14"
      />
    </svg>
  );
}

export function HeroAmbient() {
  return (
    <div className={styles.layer} aria-hidden="true" data-testid="hero-ambient">
      {MARKS.map((mark, index) => (
        <span
          key={mark.id}
          className={`${styles.mark} ${mark.className}`}
          style={{ "--mark-in-delay": `${160 + index * 70}ms` } as React.CSSProperties}
        >
          <Mark kind={mark.kind} />
        </span>
      ))}
    </div>
  );
}
