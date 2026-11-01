import type { PlanInsight } from "@/types";
import styles from "./plan.module.css";
import activityStyles from "../activity/activity.module.css";

export function PlanUncertainties({ insight }: { insight?: PlanInsight | null }) {
  if (!insight?.uncertainties.length) return null;
  return (
    <section className={styles.section} aria-label="Antes de elegir este plan">
      <p className={activityStyles.sectionLabel}>A tener en cuenta</p>
      <ul className="sp-body">
        {insight.uncertainties.map((message) => <li key={message}>{message}</li>)}
      </ul>
    </section>
  );
}
