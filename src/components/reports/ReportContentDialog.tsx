"use client";

import { useId, useState, type FormEvent } from "react";

import {
  Button,
  CountedTextarea,
  FormDialog,
  FormDialogActions,
  FormDialogError,
} from "@/components/ui";
import { MODERATION_TEXT_MAX_LENGTH, REPORT_REASONS, type ReportReason } from "@/types";

import styles from "./reports.module.css";

export interface ReportContentDialogProps {
  /** e.g. "Denunciar valoración". */
  title: string;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (reason: ReportReason, detail: string) => void;
}

/**
 * Asks why content is being reported (#156): a reason from the fixed list,
 * and a detail that is optional except for "Otro".
 */
export function ReportContentDialog({
  title,
  submitting,
  error,
  onClose,
  onSubmit,
}: ReportContentDialogProps) {
  const legendId = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const detailRequired = reason === "other";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason) {
      setValidationError("Elegí un motivo.");
      return;
    }
    if (detailRequired && !detail.trim()) {
      setValidationError("Contanos qué pasa con este contenido.");
      return;
    }
    setValidationError(null);
    onSubmit(reason, detail);
  }

  return (
    <FormDialog
      title={title}
      subtitle="Lo va a revisar un administrador. Quien lo publicó no sabrá que lo denunciaste."
      busy={submitting}
      onClose={onClose}
      onSubmit={submit}
    >
      <fieldset className={styles.reasons} aria-labelledby={legendId}>
        <legend id={legendId} className={styles.legend}>
          Motivo
        </legend>
        {REPORT_REASONS.map((option) => (
          <label key={option.value} className={styles.reason}>
            <input
              type="radio"
              name="report-reason"
              value={option.value}
              checked={reason === option.value}
              disabled={submitting}
              onChange={() => setReason(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      <CountedTextarea
        label="Detalle"
        hint={detailRequired ? undefined : "(opcional)"}
        value={detail}
        maxLength={MODERATION_TEXT_MAX_LENGTH}
        placeholder="¿Qué tiene de malo este contenido?"
        disabled={submitting}
        invalid={detailRequired && validationError !== null && !detail.trim()}
        onChange={setDetail}
      />
      <FormDialogError message={validationError ?? error} />
      <FormDialogActions>
        <Button variant="ghostLight" disabled={submitting} onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="danger" disabled={submitting}>
          {submitting ? "Enviando..." : "Denunciar"}
        </Button>
      </FormDialogActions>
    </FormDialog>
  );
}
