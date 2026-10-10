"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { Button, Icon } from "@/components/ui";
import { MediaGalleryManager } from "@/components/media";
import type {
  AdminActivity,
  AdminActivityInput,
  CategoryOption,
  PlaceOption,
} from "@/types";
import type { PriceInput, PriceKind, PriceUnit } from "@/types/pricing";

import styles from "./AdminManagement.module.css";

const PRICE_KIND_OPTIONS: Array<{ value: PriceKind; label: string }> = [
  { value: "UNKNOWN", label: "Sin precio confirmado" },
  { value: "FREE", label: "Gratis (con evidencia)" },
  { value: "FIXED", label: "Precio fijo" },
  { value: "FROM", label: "Desde (depende del consumo)" },
  { value: "RANGE", label: "Rango de precios" },
];

const PRICE_UNIT_OPTIONS: Array<{ value: PriceUnit; label: string }> = [
  { value: "PER_PERSON", label: "Por persona" },
  { value: "PER_GROUP", label: "Por grupo" },
  { value: "ENTRY", label: "Entrada (por persona)" },
  { value: "CONSUMPTION", label: "Consumo (por persona)" },
];

/** Validates the price fields; returns an error message or null. */
function priceError(
  kind: PriceKind,
  min: string,
  max: string,
  source: string,
): string | null {
  if (kind === "UNKNOWN") return null;
  if (!source) return "Indicá la fuente del precio.";
  if (kind === "FREE") return null;
  const lo = Number(min);
  if (min.trim() === "" || !Number.isFinite(lo) || lo <= 0) {
    return "Ingresá un monto mayor a cero.";
  }
  if (kind === "RANGE") {
    const hi = Number(max);
    if (max.trim() === "" || !Number.isFinite(hi) || hi <= lo) {
      return "El máximo debe ser mayor que el mínimo.";
    }
  }
  return null;
}

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
  const [priceKind, setPriceKind] = useState<PriceKind>(
    activity?.price?.kind ??
      (activity && activity.estimatedCost !== null ? "FIXED" : "UNKNOWN"),
  );
  const [priceMin, setPriceMin] = useState(
    activity?.price?.min != null ? String(activity.price.min) : "",
  );
  const [priceMax, setPriceMax] = useState(
    activity?.price?.max != null ? String(activity.price.max) : "",
  );
  const [priceUnit, setPriceUnit] = useState<PriceUnit>(
    activity?.price?.unit && activity.price.unit !== "UNSPECIFIED"
      ? activity.price.unit
      : "PER_PERSON",
  );
  const [priceSource, setPriceSource] = useState<"OFFICIAL" | "CURATED">(
    activity?.price?.source === "OFFICIAL" ? "OFFICIAL" : "CURATED",
  );
  const [priceSourceRef, setPriceSourceRef] = useState(
    activity?.price?.sourceRef ?? "",
  );
  // The price is only sent when the administrator touched it, so editing a
  // name never silently "verifies" a legacy or estimated amount.
  const [priceTouched, setPriceTouched] = useState(false);
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
    const duration = Number(estimatedDuration);
    if (!name.trim() || !description.trim()) {
      setValidationError("Completá el nombre y la descripción.");
      return;
    }
    const priceProblem = priceTouched
      ? priceError(priceKind, priceMin, priceMax, priceSource)
      : null;
    if (priceProblem) {
      setValidationError(priceProblem);
      return;
    }
    if (!Number.isInteger(duration) || duration < 1) {
      setValidationError("La duración debe ser un número entero de minutos.");
      return;
    }
    setValidationError(null);
    const price: PriceInput | undefined =
      priceTouched || !activity
        ? {
            kind: priceKind,
            ...(priceKind === "UNKNOWN"
              ? {}
              : {
                  min: priceKind === "FREE" ? 0 : Number(priceMin),
                  max: priceKind === "RANGE" ? Number(priceMax) : null,
                  unit: priceUnit,
                  source: priceSource,
                  sourceRef: priceSourceRef.trim() || null,
                  verifiedAt: new Date().toISOString(),
                }),
          }
        : undefined;
    await onSave({
      name: name.trim(),
      description: description.trim(),
      ...(price ? { price } : {}),
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
          <fieldset className={styles.choiceGroup}>
            <legend>Precio</legend>
            <label className={styles.field}>
              Tipo de precio
              <select
                value={priceKind}
                onChange={(event) => {
                  setPriceKind(event.target.value as PriceKind);
                  setPriceTouched(true);
                }}
              >
                {PRICE_KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {priceKind === "UNKNOWN" ? (
              <p className="sp-small">
                Mientras no haya un precio confirmado, la actividad se muestra como
                &quot;Precio no disponible&quot; y no cuenta en los totales.
              </p>
            ) : (
              <>
                {priceKind !== "FREE" && (
                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      {priceKind === "RANGE" ? "Mínimo (ARS)" : "Monto (ARS)"}
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={priceMin}
                        onChange={(event) => {
                          setPriceMin(event.target.value);
                          setPriceTouched(true);
                        }}
                      />
                    </label>
                    {priceKind === "RANGE" && (
                      <label className={styles.field}>
                        Máximo (ARS)
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={priceMax}
                          onChange={(event) => {
                            setPriceMax(event.target.value);
                            setPriceTouched(true);
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}
                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    Se cobra
                    <select
                      value={priceUnit}
                      onChange={(event) => {
                        setPriceUnit(event.target.value as PriceUnit);
                        setPriceTouched(true);
                      }}
                    >
                      {PRICE_UNIT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    Fuente
                    <select
                      value={priceSource}
                      onChange={(event) => {
                        setPriceSource(event.target.value as "OFFICIAL" | "CURATED");
                        setPriceTouched(true);
                      }}
                    >
                      <option value="OFFICIAL">Sitio o tarifario oficial</option>
                      <option value="CURATED">Relevado por el equipo</option>
                    </select>
                  </label>
                </div>
                <label className={styles.field}>
                  Enlace a la fuente (opcional)
                  <input
                    value={priceSourceRef}
                    maxLength={500}
                    placeholder="https://"
                    onChange={(event) => {
                      setPriceSourceRef(event.target.value);
                      setPriceTouched(true);
                    }}
                  />
                </label>
              </>
            )}
          </fieldset>
          <div className={styles.formGrid}>
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
        {activity ? (
          <div className={styles.gallerySection}>
            <MediaGalleryManager target="activity" resourceId={activity.id} resourceName={activity.name} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
