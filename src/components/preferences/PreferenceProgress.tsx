import styles from "./preferences.module.css";

interface PreferenceProgressProps { completed: number; total: number; }

export function PreferenceProgress({ completed, total }: PreferenceProgressProps) {
  const percentage = Math.round((completed / total) * 100);
  return (
    <p className={styles.srOnly} role="status" aria-live="polite">
      Perfil de preferencias {percentage}% completo.
    </p>
  );
}
