"use client";

import { useState, type FormEvent } from "react";

import {
  Button,
  CountedTextarea,
  FormDialog,
  FormDialogActions,
  FormDialogError,
} from "@/components/ui";
import { MODERATION_TEXT_MAX_LENGTH } from "@/types";

interface ReasonDialogProps {
  /** e.g. "Eliminar contenido". */
  title: string;
  /** Whose content and where, under the title. */
  subtitle: string;
  placeholder: string;
  /** What confirming does, said before it. */
  note: string;
  confirmLabel: string;
  confirmingLabel: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

/**
 * Asks for the reason reported content is removed (#156); its author is
 * told it. `ConfirmationDialog` takes no input, and the backend requires a
 * non-empty reason on every removal.
 */
export function ReasonDialog({
  title,
  subtitle,
  placeholder,
  note,
  confirmLabel,
  confirmingLabel,
  saving,
  error,
  onClose,
  onConfirm,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setValidationError("Ingresá el motivo para el autor.");
      return;
    }
    setValidationError(null);
    await onConfirm(trimmed);
  }

  return (
    <FormDialog
      title={title}
      subtitle={subtitle}
      busy={saving}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
    >
      <CountedTextarea
        label="Motivo para el autor"
        value={reason}
        maxLength={MODERATION_TEXT_MAX_LENGTH}
        placeholder={placeholder}
        disabled={saving}
        invalid={validationError !== null}
        onChange={setReason}
      />
      <p className="sp-small">{note}</p>
      <FormDialogError message={validationError ?? error} />
      <FormDialogActions>
        <Button variant="ghostLight" disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="danger" disabled={saving}>
          {saving ? confirmingLabel : confirmLabel}
        </Button>
      </FormDialogActions>
    </FormDialog>
  );
}
