import type { ReactNode } from "react";

import { Button, Icon } from "@/components/ui";

import styles from "./preferences.module.css";

interface PreferencesActionsProps {
  dirty: boolean;
  saving: boolean;
  busy: boolean;
  error: string | null;
  progress: ReactNode;
  /** Editing only: restores the last saved profile. */
  onDiscard?: () => void;
  /** Editing only: opens the dialog that clears the whole profile. */
  onReset?: () => void;
  /** Onboarding only: leaves without saving what was entered. */
  onSkip?: () => void;
}

export function PreferencesActions({
  dirty,
  saving,
  busy,
  error,
  progress,
  onDiscard,
  onReset,
  onSkip,
}: PreferencesActionsProps) {
  const idleLabel = onSkip ? "Todo es opcional" : "Preferencias guardadas";

  return (
    <div
      className={
        dirty
          ? `${styles.actionArea} ${styles.actionAreaDirty}`
          : styles.actionArea
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
          {dirty ? "Cambios sin guardar" : idleLabel}
        </p>

        {onDiscard ? (
          <button
            type="button"
            className={styles.discardButton}
            onClick={onDiscard}
            disabled={!dirty || busy}
          >
            Descartar cambios
          </button>
        ) : null}

        {onSkip ? (
          <button
            type="button"
            className={styles.discardButton}
            onClick={onSkip}
            disabled={busy}
          >
            Omitir por ahora
          </button>
        ) : null}

        {onReset ? (
          <button
            type="button"
            className={styles.resetButton}
            onClick={onReset}
            disabled={busy}
          >
            <Icon name="trash-2" size={14} />
            Restablecer preferencias
          </button>
        ) : null}
      </div>

      <Button
        type="submit"
        size="lg"
        className={styles.saveButton}
        disabled={!dirty || busy}
      >
        {saving ? (
          <>
            <Icon
              name="loader-circle"
              size={18}
              className={styles.saveSpinner}
            />
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
