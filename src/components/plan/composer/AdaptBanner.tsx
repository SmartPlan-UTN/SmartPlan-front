import { Icon } from "@/components/ui";
import { InspiredByChip } from "@/components/community/InspiredByChip";
import { PersonLink } from "@/components/community/Person";

import styles from "./adaptBanner.module.css";

/** What the original looked like when the adaptation began. */
export interface AdaptSource {
  id: number;
  title: string;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  peopleCount: number;
  /** One key per stop, in order. */
  stopKeys: string[];
  totalCost: number | null;
  /** The original's total as people read it, and how long it takes. */
  totalLabel: string;
  duration: number;
}

export interface AdaptCurrent {
  peopleCount: number;
  stopKeys: string[];
  totalCost: number | null;
}

/** Which of the things worth adapting the person has already changed. */
export function adaptationChanges(source: AdaptSource, current: AdaptCurrent): string[] {
  const changes: string[] = [];
  if (current.peopleCount !== source.peopleCount) changes.push("Compañía");
  const sameStops =
    current.stopKeys.length === source.stopKeys.length &&
    current.stopKeys.every((key, index) => key === source.stopKeys[index]);
  if (!sameStops) changes.push("Paradas");
  if (current.totalCost !== source.totalCost) changes.push("Presupuesto");
  return changes;
}

const ADAPTABLE = ["Compañía", "Paradas", "Presupuesto"] as const;

/**
 * Tells the person what is happening while they adapt someone else's plan:
 * this is their own copy, the original stays as it is, and the credit goes
 * with it. The chips light up as they change what matters to them.
 */
export function AdaptBanner({ source, current }: { source: AdaptSource; current: AdaptCurrent }) {
  const changed = adaptationChanges(source, current);
  return (
    <aside className={styles.banner} aria-label="Estás adaptando un plan">
      <div className={styles.copy}>
        <p className={styles.lead}>
          <Icon name="sparkles" size={16} aria-hidden="true" />
          Estás armando tu versión. El original no cambia y queda el crédito.
        </p>
        <div className={styles.origin}>
          {source.authorUsername ? (
            <PersonLink username={source.authorUsername} avatarUrl={source.authorAvatarUrl} size={26} />
          ) : null}
          <InspiredByChip plan={source} creatorUsername={source.authorUsername} />
        </div>
      </div>
      <ul className={styles.changes} aria-label="Lo que ya cambiaste">
        {ADAPTABLE.map((item) => (
          <li key={item} data-changed={changed.includes(item)}>
            {changed.includes(item) ? <Icon name="check" size={12} aria-hidden="true" /> : null}
            {item}
            <span className={styles.srOnly}>{changed.includes(item) ? ": cambiado" : ": igual al original"}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
