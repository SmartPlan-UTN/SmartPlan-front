"use client";

import { Icon } from "@/components/ui";
import { useReducedMotion, useScrollProgress } from "@/hooks";

import { Reveal } from "./Reveal";
import { HOW } from "./landingContent";
import styles from "./how.module.css";

/**
 * Progress is measured across the whole section's travel, but the steps
 * should be lit by the time the section is comfortably on screen rather
 * than only at the very bottom of the page. This compresses the useful
 * range into the first two-thirds of that travel.
 */
const RANGE = 0.62;

/**
 * How smartplan works, placed deliberately late.
 *
 * By this point a visitor has already used the field and seen what the
 * product produces, so this section is confirmation rather than
 * instruction — which is why it is four short lines and a diagram, not
 * documentation.
 *
 * The four steps are connected by a line that fills as the section
 * scrolls, and each step lights when the line reaches it. That is the
 * one thing the section adds over four static cards: the steps are a
 * sequence, and a sequence should be shown happening in order.
 */
export function HowItWorks() {
  const { ref, progress } = useScrollProgress<HTMLElement>();
  const reduced = useReducedMotion();

  // Reduced motion gets the finished diagram: every step lit, line full.
  // The information is the point; the filling is the flourish.
  const fill = reduced ? 1 : Math.min(progress / RANGE, 1);
  const reached = Math.round(fill * HOW.steps.length);

  return (
    <section ref={ref} className={styles.section} aria-labelledby="how-title">
      <div className={styles.shell}>
        <Reveal className={styles.header}>
          <p className={`sp-label ${styles.kicker}`}>{HOW.kicker}</p>
          <h2 id="how-title" className={styles.title}>
            {HOW.title[0]}
            <span className={styles.titleSoft}> {HOW.title[1]}</span>
          </h2>
        </Reveal>

        <ol
          className={styles.steps}
          style={{ "--fill": fill } as React.CSSProperties}
        >
          <span className={styles.track} aria-hidden="true">
            <span className={styles.trackFill} />
          </span>

          {HOW.steps.map((step, index) => (
            <li
              key={step.n}
              className={styles.step}
              data-lit={index < reached ? "true" : undefined}
            >
              <span className={styles.stepMarker} aria-hidden="true">
                <Icon name={step.icon} size={18} stroke={1.9} />
              </span>
              <p className={styles.stepNumber}>{step.n}</p>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepCopy}>{step.copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
