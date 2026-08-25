import type { UserStatusKey } from "@/types";

import styles from "./administration.module.css";

const STATUS_LABELS: Record<UserStatusKey, string> = {
  active: "Activo",
  suspended: "Suspendido",
  banned: "Baneado",
};

export interface UserStatusBadgeProps {
  status: UserStatusKey;
}

export function UserStatusBadge({ status }: UserStatusBadgeProps) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status_${status}`]}`}>
      <span className={styles.statusDot} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
