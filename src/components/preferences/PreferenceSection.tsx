import type { ReactNode } from "react";

import styles from "./preferences.module.css";

export interface PreferenceSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Card wrapper for one preference group (interests, budget, location...),
 * matching the v2 system design's `PrefSection` (`Preferences.jsx`).
 */
export function PreferenceSection({ title, subtitle, children }: PreferenceSectionProps) {
  return (
    <div className={styles.section}>
      <div>
        <p className={styles.sectionTitle}>{title}</p>
        {subtitle ? <p className={styles.sectionSubtitle}>{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
