"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { Button, Icon } from "@/components/ui";
import type {
  AdminActivity,
  AdminActivityInput,
  CategoryOption,
  PlaceOption,
} from "@/types";

import styles from "./AdminManagement.module.css";

interface AdminActivityDialogProps {
  activity: AdminActivity | null;
  categories: CategoryOption[];
  places: PlaceOption[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: AdminActivityInput) => Promise<void>;
}

export function AdminActivityDialog({
  activity,
  categories,
  places,
  saving,
  error,
  onClose,
  onSave,
}: AdminActivityDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  const savingRef = useRef(saving);
  const [name, setName] = useState(activity?.name ?? "");
  const [description, setDescription] = useState(activity?.description ?? "");
  const [estimatedCost, setEstimatedCost] = useState(
    activity ? String(activity.estimatedCost) : "",
  );
  const [estimatedDuration, setEstimatedDuration] = useState(
    activity ? String(activity.estimatedDuration) : "",
  );
  const [type, setType] = useState(activity?.type ?? "");
  const [categoryIds, setCategoryIds] = useState(
    () => new Set(activity?.categories.map((item) => item.id) ?? []),
  );
  const [placeIds, setPlaceIds] = useState(
    () => new Set(activity?.places.map((item) => item.id) ?? []),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
    savingRef.current = saving;
  }, [onClose, saving]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    nameRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !savingRef.current) {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  function toggle(
    id: number,
    setValues: React.Dispatch<React.SetStateAction<Set<number>>>,
  ) {
    setValues((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cost = Number(estimatedCost);
    const duration = Number(estimatedDuration);
    if (!name.trim() || !description.trim()) {
      setValidationError("Completá el nombre y la descripción.");
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      setValidationError("Ingresá un costo válido, igual o mayor a cero.");
      return;
    }
    if (!Number.isInteger(duration) || duration < 1) {
      setValidationError("La duración debe ser un número entero de minutos.");
      return;
    }
    setValidationError(null);
    await onSave({
      name: name.trim(),
      description: description.trim(),
      estimatedCost: cost,
      estimatedDuration: duration,
      type: type.trim() || null,
      categoryIds: [...categoryIds],
      placeIds: [...placeIds],
    });
  }

  return (
    <div className={styles.dialogOverlay}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={titleId} className="sp-h4">
              {activity ? "Editar actividad" : "Nueva actividad"}
            </h2>
            <p className="sp-small">
              Los lugares son opcionales; Maps se sincroniza automáticamente.
            </p>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Cerrar formulario"
            disabled={saving}
            onClick={onClose}
          >
            <Icon name="x" size={18} />
          </button>
        </header>

        <form className={styles.form} onSubmit={(event) => void submit(event)}>
          <label className={styles.field}>
            Nombre
            <input ref={nameRef} value={name} maxLength={150} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className={styles.field}>
            Descripción
            <textarea value={description} maxLength={5000} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              Costo estimado
              <input type="number" min="0" step="0.01" value={estimatedCost} onChange={(event) => setEstimatedCost(event.target.value)} />
            </label>
            <label className={styles.field}>
              Duración en minutos
              <input type="number" min="1" step="1" value={estimatedDuration} onChange={(event) => setEstimatedDuration(event.target.value)} />
            </label>
          </div>
          <label className={styles.field}>
            Tipo de salida (opcional)
            <input value={type} maxLength={80} placeholder="Ej. cultural" onChange={(event) => setType(event.target.value)} />
          </label>

          <fieldset className={styles.choiceGroup}>
            <legend>Categorías</legend>
            <div className={styles.choiceList}>
              {categories.length === 0 ? <span className="sp-small">No hay categorías disponibles.</span> : categories.map((category) => (
                <label className={styles.checkOption} key={category.id}>
                  <input type="checkbox" checked={categoryIds.has(category.id)} onChange={() => toggle(category.id, setCategoryIds)} />
                  <span className={styles.optionCopy}><strong>{category.name}</strong></span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.choiceGroup}>
            <legend>Lugares registrados (opcional)</legend>
            <div className={styles.choiceList}>
              {places.length === 0 ? <span className="sp-small">No hay lugares disponibles.</span> : places.map((place) => (
                <label className={styles.checkOption} key={place.id}>
                  <input type="checkbox" checked={placeIds.has(place.id)} onChange={() => toggle(place.id, setPlaceIds)} />
                  <span className={styles.optionCopy}>
                    <strong>{place.name}</strong>
                    <small>{place.address}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {validationError || error ? <p className={styles.formError} role="alert">{validationError ?? error}</p> : null}
          <div className={styles.dialogActions}>
            <Button variant="ghostLight" disabled={saving} onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar actividad"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
