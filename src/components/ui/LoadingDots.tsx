import styles from "./loading-dots.module.css";

export interface LoadingDotsProps {
  /** Announced to screen readers and shown under the dots. */
  label: string;
  /**
   * A bigger heading shown between the dots and `label` (CU12's "Armando
   * tu plan perfecto..." transition) — `ResultsLoading` in `Results.jsx`
   * pairs a fixed `sp-h3` title with a variable subtitle underneath it,
   * which a single `label` string can't express. Every other caller keeps
   * passing just `label`, so this stays optional and additive.
   */
  title?: string;
  /**
   * Reserve the height of the content that is coming, so the page doesn't
   * jump when it arrives. Any CSS length.
   */
  minHeight?: string;
  className?: string;
}

/**
 * The app's waiting state: three ember dots pulsing in sequence, matching
 * ResultsLoading in SmartPlanSystemDesign/v2/Results.jsx.
 *
 * Lived in `activity.module.css` until six components across three folders
 * were reaching into it for the same four lines of markup. Holds still
 * under `prefers-reduced-motion`.
 */
export function LoadingDots({ label, title, minHeight, className }: LoadingDotsProps) {
  return (
    <div
      className={[styles.wrapper, className].filter(Boolean).join(" ")}
      style={{ minHeight }}
      role="status"
    >
      <div className={styles.dots} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
      {title ? <p className={`sp-h3 ${styles.title}`}>{title}</p> : null}
      <p className="sp-body">{label}</p>
    </div>
  );
}
