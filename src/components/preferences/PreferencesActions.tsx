"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, Icon } from "@/components/ui";
import styles from "./preferences.module.css";

interface PreferencesActionsProps {
  formId: string;
  onboarding: boolean;
  dirty: boolean;
  saving: boolean;
  busy: boolean;
  error: string | null;
  progress: ReactNode;
  onDiscard?: () => void;
  onReset?: () => void;
  onSkip?: () => void;
}

export function PreferencesActions({
  formId, onboarding, dirty, saving, busy, error, progress, onDiscard, onReset, onSkip,
}: PreferencesActionsProps) {
  const idleLabel = onboarding ? "Todo es opcional" : "Preferencias guardadas";
  return (
    <div className={styles.actionArea}>
      {progress}
      {onReset ? (
        <button type="button" className={styles.resetButton} onClick={onReset} disabled={busy}>
          <Icon name="trash-2" size={14} /> Restablecer preferencias
        </button>
      ) : null}
      {createPortal(
        <div className={dirty ? `${styles.saveDock} ${styles.actionAreaDirty}` : styles.saveDock}
          role="region" aria-label="Guardar preferencias">
          {error ? <p className={styles.formError} role="alert"><Icon name="circle-alert" size={18} />{error}</p> : null}
          <p className={styles.dirtyState} role="status">
            <span className={styles.dirtyDot} aria-hidden="true" />
            {dirty ? "Cambios sin guardar · Todavía no se aplicaron" : idleLabel}
          </p>
          {onDiscard ? (
            <button type="button" className={styles.discardButton} onClick={onDiscard} disabled={!dirty || busy}>
              Descartar cambios
            </button>
          ) : null}
          {onSkip ? <button type="button" className={styles.discardButton} onClick={onSkip} disabled={busy}>Omitir por ahora</button> : null}
          <Button type="submit" form={formId} size="lg" className={styles.saveButton} disabled={!dirty || busy}>
            {saving ? <><Icon name="loader-circle" size={18} className={styles.saveSpinner} />Guardando…</>
              : <>Guardar preferencias<Icon name="arrow-right" size={17} className={styles.saveArrow} /></>}
          </Button>
        </div>, document.body,
      )}
    </div>
  );
}
