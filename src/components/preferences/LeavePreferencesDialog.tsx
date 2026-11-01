"use client";

import { Button, FormDialog, FormDialogError } from "@/components/ui";
import styles from "./preferences.module.css";

export function LeavePreferencesDialog({ busy, error, onCancel, onDiscard, onSave }: {
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <FormDialog title="¿Querés guardar tus preferencias antes de salir?" busy={busy} onClose={onCancel}
      onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      <p className="sp-body">Tenés cambios sin guardar. Todavía no se aplican a tus planes.</p>
      <FormDialogError message={error} />
      <div className={styles.leaveActions}>
        <Button type="button" variant="ghostLight" autoFocus disabled={busy} onClick={onCancel}>Seguir editando</Button>
        <Button type="button" variant="ghostLight" disabled={busy} onClick={onDiscard}>Salir sin guardar</Button>
        <Button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar y salir"}</Button>
      </div>
    </FormDialog>
  );
}
