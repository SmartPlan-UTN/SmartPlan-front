"use client";

import { ConfirmationDialog, Icon } from "@/components/ui";

import styles from "./AutoPlanUnavailableDialog.module.css";

export interface AutoPlanUnavailableDialogProps {
  onClose: () => void;
}

/**
 * Notice shown behind every "generar plan automático" entry point (CU31).
 *
 * The screens that offer it (PAN 16 and the create form) both need the same
 * copy, so it lives here instead of being pasted into each one. It only
 * acknowledges — there is nothing to cancel — hence `hideCancel`.
 */
export function AutoPlanUnavailableDialog({
  onClose,
}: AutoPlanUnavailableDialogProps) {
  return (
    <ConfirmationDialog
      title="Módulo en construcción"
      confirmLabel="Entendido, crear manualmente"
      hideCancel
      onCancel={onClose}
      onConfirm={onClose}
    >
      <div className={styles.body}>
        <Icon name="sparkles" size={36} className={styles.icon} />
        <p>
          La{" "}
          <strong>
            generación automática de itinerarios con Inteligencia Artificial
          </strong>{" "}
          (CU31) se encuentra actualmente en desarrollo.
        </p>
        <p className={styles.note}>
          Estará disponible próximamente en SmartPlan. Por el momento podés
          armar tu plan de forma personalizada agregando las actividades
          manualmente.
        </p>
      </div>
    </ConfirmationDialog>
  );
}
