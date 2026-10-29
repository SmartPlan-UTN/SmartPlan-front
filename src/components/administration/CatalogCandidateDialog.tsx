"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { Button, Chip, Icon } from "@/components/ui";
import { useScrollLock } from "@/hooks";
import { ApiError, listAdminPlaces, updateCatalogCandidate } from "@/lib/api";
import { OCCASIONS, OCCASION_GROUP_LABELS } from "@/lib/occasions";
import type {
  CatalogCandidateDetail,
  CatalogCandidatePrice,
  OccasionGroup,
  PlaceOption,
  UpdateCatalogCandidateInput,
} from "@/types";

import styles from "./AdminManagement.module.css";
import own from "./AdminCatalogCandidates.module.css";

/** Catalog package codes (SmartPlan-back `catalog-package.ts`) in plain Spanish. */
const CODE_MESSAGES: Array<[RegExp, string]> = [
  [/^invalid_name/, "El nombre tiene que tener entre 3 y 150 caracteres."],
  [/^invalid_description/, "Escribí una descripción (hasta 5000 caracteres)."],
  [/^invalid_duration/, "La duración tiene que ser un número entero de minutos."],
  [/price_source_not_allowed/, "Un precio conocido necesita fuente oficial o curada."],
  [/invalid_price_source_ref/, "La fuente del precio tiene que ser un link http(s)."],
  [/price/, "Revisá el precio: un precio conocido necesita monto, fuente con link y fecha."],
  [/occasion/, "Elegí ocasiones del listado."],
  [/people/, "El mínimo de personas no puede superar al máximo."],
  [/min_age/, "La edad mínima va de 0 a 18 años."],
  [/unknown_place/, "Elegí un lugar del catálogo."],
  [/categor/, "La actividad necesita una categoría válida."],
  [/activity_type/, "El tipo de actividad no está en el vocabulario."],
];

export function candidateErrorMessage(code: string): string {
  return CODE_MESSAGES.find(([pattern]) => pattern.test(code))?.[1] ?? code;
}

type FieldErrors = Partial<Record<string, string>>;

/** `400 VALIDATION_FAILED` answers per field; each code gets its message. */
export function fieldErrorsOf(error: unknown): FieldErrors | null {
  if (!(error instanceof ApiError) || error.status !== 400) return null;
  const raw = error.data?.errors;
  if (!Array.isArray(raw)) return null;
  const errors: FieldErrors = {};
  for (const entry of raw as Array<{ field?: unknown; messages?: unknown }>) {
    const field = typeof entry.field === "string" ? entry.field : "payload";
    const messages = Array.isArray(entry.messages) ? entry.messages.map(String) : [];
    errors[field] = messages.map(candidateErrorMessage).join(" ");
  }
  return errors;
}

const PRICE_KINDS: Array<{ value: CatalogCandidatePrice["kind"]; label: string }> = [
  { value: "UNKNOWN", label: "Sin confirmar" },
  { value: "FREE", label: "Gratis" },
  { value: "FIXED", label: "Precio fijo" },
  { value: "FROM", label: "Desde" },
  { value: "RANGE", label: "Rango" },
];

const PRICE_UNITS = [
  { value: "PER_PERSON", label: "Por persona" },
  { value: "PER_GROUP", label: "Por grupo" },
  { value: "ENTRY", label: "Entrada" },
  { value: "CONSUMPTION", label: "Consumo" },
  { value: "UNSPECIFIED", label: "Sin especificar" },
];

const numberOrNull = (value: string): number | null =>
  value.trim() === "" ? null : Number(value);

export interface CatalogCandidateDialogProps {
  candidate: CatalogCandidateDetail;
  onClose: () => void;
  onSaved: (candidate: CatalogCandidateDetail) => void;
}

/** Edits a pending candidate before it is approved (RF44, CU50). */
export function CatalogCandidateDialog({
  candidate,
  onClose,
  onSaved,
}: CatalogCandidateDialogProps) {
  useScrollLock();
  const titleId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const payload = candidate.payload as Record<string, unknown>;
  const price = (payload.price ?? candidate.price ?? {
    kind: "UNKNOWN",
  }) as CatalogCandidatePrice;
  const isActivity = candidate.entityType === "activity";

  const [name, setName] = useState(candidate.name);
  const [description, setDescription] = useState(candidate.description ?? "");
  const [duration, setDuration] = useState(String(candidate.durationMinutes ?? ""));
  const [minPeople, setMinPeople] = useState(String(candidate.minPeople ?? ""));
  const [maxPeople, setMaxPeople] = useState(String(candidate.maxPeople ?? ""));
  const [minAge, setMinAge] = useState(
    typeof payload.minAge === "number" ? String(payload.minAge) : "",
  );
  const [occasions, setOccasions] = useState<string[]>(candidate.occasions);
  const [priceKind, setPriceKind] = useState<CatalogCandidatePrice["kind"]>(price.kind);
  const [priceMin, setPriceMin] = useState(String(price.min ?? ""));
  const [priceMax, setPriceMax] = useState(String(price.max ?? ""));
  const [priceUnit, setPriceUnit] = useState(price.unit ?? "PER_PERSON");
  const [priceSource, setPriceSource] = useState(price.source ?? "OFFICIAL");
  const [priceRef, setPriceRef] = useState(price.sourceRef ?? "");
  const [priceDate, setPriceDate] = useState((price.verifiedAt ?? "").slice(0, 10));
  const [place, setPlace] = useState(candidate.place);
  const [placeSearch, setPlaceSearch] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceOption[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => nameRef.current?.focus(), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  useEffect(() => {
    const search = placeSearch.trim();
    if (search.length < 2) {
      setPlaceResults([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      listAdminPlaces({ search, limit: 8 })
        .then((result) => {
          if (!cancelled) setPlaceResults(result.data);
        })
        .catch(() => {
          if (!cancelled) setPlaceResults([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [placeSearch]);

  function toggleOccasion(key: string) {
    setOccasions((current) =>
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key],
    );
  }

  function buildPrice(): CatalogCandidatePrice {
    if (priceKind === "UNKNOWN")
      return { kind: "UNKNOWN", min: null, max: null, unit: null, source: null, sourceRef: null, verifiedAt: null };
    const min = priceKind === "FREE" ? 0 : numberOrNull(priceMin);
    return {
      kind: priceKind,
      min,
      max: priceKind === "FREE" ? 0 : priceKind === "RANGE" ? numberOrNull(priceMax) : priceKind === "FIXED" ? min : null,
      unit: priceKind === "FREE" ? null : priceUnit,
      source: priceSource,
      sourceRef: priceRef.trim() || null,
      verifiedAt: priceDate ? `${priceDate}T00:00:00.000Z` : null,
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError(null);
    const input: UpdateCatalogCandidateInput = isActivity
      ? {
          name: name.trim(),
          description: description.trim(),
          durationMinutes: Number(duration),
          price: buildPrice(),
          occasions,
          minPeople: numberOrNull(minPeople),
          maxPeople: numberOrNull(maxPeople),
          minAge: numberOrNull(minAge),
          ...(place && place.id !== candidate.place?.id ? { idPlace: place.id } : {}),
        }
      : { name: name.trim(), description: description.trim() };
    try {
      onSaved(await updateCatalogCandidate(candidate.id, input));
    } catch (error) {
      const fieldErrors = fieldErrorsOf(error);
      if (fieldErrors) setErrors(fieldErrors);
      else
        setFormError(
          error instanceof ApiError && error.status === 409
            ? "Otra persona ya revisó este candidato."
            : "No pudimos guardar los cambios. Probá de nuevo.",
        );
    } finally {
      setSaving(false);
    }
  }

  const fieldError = (field: string) =>
    errors[field] ? (
      <span className={own.fieldError} role="alert">
        {errors[field]}
      </span>
    ) : null;

  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={titleId} className="sp-h4">
              Editar candidato
            </h2>
            <p className="sp-small">
              Se guarda en la cola; entra al catálogo recién al aprobarlo.
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

        <form className={styles.form} onSubmit={(event) => void submit(event)} noValidate>
          <label className={styles.field}>
            Nombre
            <input ref={nameRef} value={name} maxLength={150} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} />
            {fieldError("name")}
          </label>
          <label className={styles.field}>
            Descripción
            <textarea value={description} maxLength={5000} onChange={(event) => setDescription(event.target.value)} aria-invalid={Boolean(errors.description)} />
            {fieldError("description")}
          </label>

          {isActivity ? (
            <>
              <fieldset className={styles.choiceGroup}>
                <legend>Lugar</legend>
                <p className="sp-small">
                  {place ? `${place.name}${place.departmentName ? ` · ${place.departmentName}` : ""}` : "Sin lugar"}
                </p>
                <label className={styles.field}>
                  Cambiar de lugar
                  <input
                    type="search"
                    value={placeSearch}
                    placeholder="Buscá un lugar del catálogo"
                    onChange={(event) => setPlaceSearch(event.target.value)}
                  />
                </label>
                {placeResults.length > 0 ? (
                  <ul className={own.placeResults} aria-label="Lugares encontrados">
                    {placeResults.map((option) => (
                      <li key={option.id}>
                        <button
                          type="button"
                          className={own.placeOption}
                          onClick={() => {
                            setPlace({
                              id: option.id,
                              slug: null,
                              name: option.name,
                              kind: null,
                              departmentName: option.department?.name ?? null,
                            });
                            setPlaceSearch("");
                          }}
                        >
                          <strong>{option.name}</strong>
                          <span>
                            {option.department?.name ?? ""}
                            {option.visible === false ? " · sin actividades todavía" : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {fieldError("idPlace")}
              </fieldset>

              <fieldset className={styles.choiceGroup}>
                <legend>Ocasiones</legend>
                {(["who", "mood"] as OccasionGroup[]).map((group) => (
                  <div key={group} className={own.occasionGroup}>
                    <span className={own.occasionGroupLabel}>{OCCASION_GROUP_LABELS[group]}</span>
                    <div className={own.occasionChips}>
                      {OCCASIONS.filter((occasion) => occasion.group === group).map((occasion) => (
                        <Chip
                          key={occasion.key}
                          active={occasions.includes(occasion.key)}
                          onClick={() => toggleOccasion(occasion.key)}
                        >
                          {occasion.label}
                        </Chip>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="sp-small">
                  Sin ocasiones la actividad se publica, pero nunca se recomienda sola.
                </p>
                {fieldError("occasions")}
              </fieldset>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  Duración (minutos)
                  <input type="number" min="1" step="1" value={duration} onChange={(event) => setDuration(event.target.value)} aria-invalid={Boolean(errors.durationMinutes)} />
                  {fieldError("durationMinutes")}
                </label>
                <label className={styles.field}>
                  Edad mínima (opcional)
                  <input type="number" min="0" max="18" value={minAge} onChange={(event) => setMinAge(event.target.value)} aria-invalid={Boolean(errors.minAge)} />
                  {fieldError("minAge")}
                </label>
              </div>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  Mínimo de personas
                  <input type="number" min="1" max="1000" value={minPeople} onChange={(event) => setMinPeople(event.target.value)} />
                </label>
                <label className={styles.field}>
                  Máximo de personas
                  <input type="number" min="1" max="1000" value={maxPeople} onChange={(event) => setMaxPeople(event.target.value)} aria-invalid={Boolean(errors.maxPeople)} />
                  {fieldError("maxPeople")}
                </label>
              </div>

              <fieldset className={styles.choiceGroup}>
                <legend>Precio</legend>
                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    Tipo de precio
                    <select value={priceKind} onChange={(event) => setPriceKind(event.target.value as CatalogCandidatePrice["kind"])}>
                      {PRICE_KINDS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {priceKind !== "UNKNOWN" && priceKind !== "FREE" ? (
                    <label className={styles.field}>
                      Unidad
                      <select value={priceUnit} onChange={(event) => setPriceUnit(event.target.value)}>
                        {PRICE_UNITS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
                {priceKind !== "UNKNOWN" && priceKind !== "FREE" ? (
                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      {priceKind === "RANGE" ? "Mínimo (ARS)" : "Monto (ARS)"}
                      <input type="number" min="0" value={priceMin} onChange={(event) => setPriceMin(event.target.value)} />
                    </label>
                    {priceKind === "RANGE" ? (
                      <label className={styles.field}>
                        Máximo (ARS)
                        <input type="number" min="0" value={priceMax} onChange={(event) => setPriceMax(event.target.value)} />
                      </label>
                    ) : null}
                  </div>
                ) : null}
                {priceKind !== "UNKNOWN" ? (
                  <>
                    <div className={styles.formGrid}>
                      <label className={styles.field}>
                        Fuente
                        <select value={priceSource} onChange={(event) => setPriceSource(event.target.value)}>
                          <option value="OFFICIAL">Oficial (sitio del lugar)</option>
                          <option value="CURATED">Curada por SmartPlan</option>
                        </select>
                      </label>
                      <label className={styles.field}>
                        Verificado el
                        <input type="date" value={priceDate} onChange={(event) => setPriceDate(event.target.value)} />
                      </label>
                    </div>
                    <label className={styles.field}>
                      Link de la fuente
                      <input type="url" value={priceRef} placeholder="https://" onChange={(event) => setPriceRef(event.target.value)} />
                    </label>
                  </>
                ) : (
                  <p className="sp-small">Un precio sin fuente queda sin confirmar: nunca se toma como gratis.</p>
                )}
                {fieldError("price")}
              </fieldset>
            </>
          ) : null}

          {errors.payload ? <p className={styles.formError} role="alert">{errors.payload}</p> : null}
          {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}

          <div className={styles.dialogActions}>
            <Button variant="ghostLight" disabled={saving} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="secondary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
