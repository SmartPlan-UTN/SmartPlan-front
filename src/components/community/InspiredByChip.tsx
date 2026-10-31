import Link from "next/link";

import { Icon } from "@/components/ui";
import { planDetailRoute } from "@/lib/routes";

import styles from "./inspired.module.css";

export interface InspiredByChipProps {
  plan: { id: number; title: string };
  creatorUsername?: string | null;
  /** Where the plan's "Volver" leads. */
  returnTo?: string;
  /** "Inspirado en" for an adaptation; "Vivida desde" for a lived outing. */
  label?: string;
  onDark?: boolean;
}

/**
 * Authorship made visible: this plan or experience grew from someone else's
 * plan. One component everywhere it appears (cards, detail, composer).
 */
export function InspiredByChip({
  plan,
  creatorUsername,
  returnTo,
  label = "Inspirado en",
  onDark = false,
}: InspiredByChipProps) {
  return (
    <Link
      href={planDetailRoute(plan.id, returnTo)}
      className={`${styles.chip} ${onDark ? styles.onDark : ""}`}
    >
      <Icon name="sparkles" size={13} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
      <span className={styles.sep} aria-hidden="true">
        ·
      </span>
      <span className={styles.title}>{plan.title}</span>
      {creatorUsername ? (
        <span className={styles.by}>de @{creatorUsername}</span>
      ) : null}
    </Link>
  );
}
