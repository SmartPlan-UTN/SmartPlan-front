"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";

import { Icon } from "@/components/ui";
import { usePrefersReducedMotion } from "@/lib/motion";

import { Reveal } from "./Reveal";
import { HOW } from "./landingContent";
import styles from "./how.module.css";

/**
 * The four steps are not a finished timeline. As the section scrolls the
 * line draws itself from the first node to the last, the ember colour
 * travelling along it, and each node lifts from "future" (faint, neutral)
 * to "active" to "done" as the progress reaches it.
 *
 * Progress drives a single CSS custom property; the integer step only
 * changes state four times, so there is no per-frame React work.
 */
export function HowItWorks() {
  const reduced = usePrefersReducedMotion();
  const section = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(0);
  // Reduced motion shows the whole sequence complete; otherwise the
  // active step follows scroll. Derived, so no effect and no mismatch.
  const active = reduced ? HOW.steps.length - 1 : scrolled;

  const { scrollYProgress } = useScroll({
    target: section,
    offset: ["start 78%", "end 65%"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (reduced) return;
    const next = Math.max(0, Math.min(HOW.steps.length - 1, Math.floor(v * HOW.steps.length)));
    setScrolled((current) => (current === next ? current : next));
  });

  return (
    <section className={styles.section} aria-labelledby="how-title">
      <div className={styles.shell}>
        <Reveal className={styles.header}>
          <h2 id="how-title" className={styles.title}>
            {HOW.title[0]}
            <span> {HOW.title[1]}</span>
          </h2>
        </Reveal>

        <motion.div
          ref={section}
          className={styles.sequence}
          data-active={active}
          style={
            { "--how-progress": scrollYProgress } as unknown as React.CSSProperties
          }
        >
          <span className={styles.track} aria-hidden="true" />
          <ol className={styles.steps}>
            {HOW.steps.map((step, index) => (
              <li
                key={step.n}
                className={styles.step}
                data-state={
                  index < active ? "done" : index === active ? "active" : "future"
                }
              >
                <span className={styles.stepMarker} aria-hidden="true">
                  <Icon name={step.icon} size={19} stroke={1.9} />
                </span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepCopy}>{step.copy}</p>
              </li>
            ))}
          </ol>
        </motion.div>
      </div>
    </section>
  );
}
