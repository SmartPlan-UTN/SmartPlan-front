import type { ReactNode } from "react";

import { Button, Icon } from "@/components/ui";

import styles from "./preferences.module.css";

interface PreferencesActionsProps {
  dirty: boolean;
  saving: boolean;
  error: string | null;
  progress: ReactNode;
  onDiscard: () => void;
}

export function PreferencesActions({
  dirty,
  saving,
  error,
  progress,
  onDiscard,
}: PreferencesActionsProps) {
  return (
    <div
      className={
        dirty ? `${styles.actionArea} ${styles.actionAreaDirty}` : styles.actionArea
      }
    >
      {progress}

      {error ? (
        <p className={styles.formError} role="alert">
          <Icon name="circle-alert" size={18} />
          {error}
        </p>
      ) : null}

      <div className={styles.actionAreaMeta}>
        <p className={styles.dirtyState} role="status">
          <Icon name="bookmark" size={16} />
          <span className={styles.dirtyDot} aria-hidden="true" />
          {dirty ? "Cambios sin guardar" : "Preferencias guardadas"}
        </p>

        <button
          type="button"
          className={styles.discardButton}
          onClick={onDiscard}
          disabled={!dirty || saving}
        >
          Descartar cambios
        </button>
      </div>

      <Button
        type="submit"
        size="lg"
        className={styles.saveButton}
        disabled={!dirty || saving}
      >
        {saving ? (
          <>
            <Icon name="loader-circle" size={18} className={styles.saveSpinner} />
            Guardando…
          </>
        ) : (
          <>
            Guardar preferencias
            <Icon name="arrow-right" size={17} className={styles.saveArrow} />
          </>
        )}
      </Button>
    </div>
  );
}
