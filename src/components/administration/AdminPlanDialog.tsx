"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { Button, Icon } from "@/components/ui";
import type { AdminPlan, PlanStatusKey, UpdateAdminPlanInput } from "@/types";

import styles from "./AdminManagement.module.css";

export const PLAN_STATUS_OPTIONS: Array<{ value: PlanStatusKey; label: string }> = [
  { value: "generated", label: "Generado" },
  { value: "selected", label: "Seleccionado" },
  { value: "confirmed", label: "Confirmado" },
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Cancelado" },
];

interface AdminPlanDialogProps {
  plan: AdminPlan;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: UpdateAdminPlanInput) => Promise<void>;
}

export function AdminPlanDialog({ plan, saving, error, onClose, onSave }: AdminPlanDialogProps) {
  const titleId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(plan.title);
  const [description, setDescription] = useState(plan.description ?? "");
  const [peopleCount, setPeopleCount] = useState(String(plan.peopleCount));
  const [status, setStatus] = useState<PlanStatusKey>(plan.status.key);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    titleRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose, saving]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const people = Number(peopleCount);
    if (!title.trim()) {
      setValidationError("Ingresá un título.");
      return;
    }
    if (!Number.isInteger(people) || people < 1 || people > 1000) {
      setValidationError("La cantidad de personas debe estar entre 1 y 1000.");
      return;
    }
    setValidationError(null);
    await onSave({
      title: title.trim(),
      description: description.trim() || null,
      peopleCount: people,
      status,
    });
  }

  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={titleId} className="sp-h4">Editar plan</h2>
            <p className="sp-small">Plan de {plan.owner.name} {plan.owner.lastName}</p>
          </div>
          <button type="button" className={styles.iconButton} aria-label="Cerrar formulario" disabled={saving} onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </header>
        <form className={styles.form} onSubmit={(event) => void submit(event)}>
          <label className={styles.field}>
            Título
            <input ref={titleRef} value={title} maxLength={150} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className={styles.field}>
            Descripción
            <textarea value={description} maxLength={2000} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              Cantidad de personas
              <input type="number" min="1" max="1000" step="1" value={peopleCount} onChange={(event) => setPeopleCount(event.target.value)} />
            </label>
            <label className={styles.field}>
              Estado
              <select value={status} onChange={(event) => setStatus(event.target.value as PlanStatusKey)}>
                {PLAN_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
          {validationError || error ? <p className={styles.formError} role="alert">{validationError ?? error}</p> : null}
          <div className={styles.dialogActions}>
            <Button variant="ghostLight" disabled={saving} onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
