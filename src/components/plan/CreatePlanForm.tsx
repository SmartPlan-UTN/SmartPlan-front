"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button, ConfirmationDialog, Icon } from "@/components/ui";
import { useDebouncedValue } from "@/hooks";
import { searchActivities, createPlan, addPlanActivity, ApiError } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { formatArs, formatDuration } from "@/lib/utils";
import type { ActivitySearchResult } from "@/types";

import { AutoPlanUnavailableDialog } from "./AutoPlanUnavailableDialog";

import styles from "./plan-create.module.css";

export function CreatePlanForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form Fields State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [peopleCount, setPeopleCount] = useState<number>(1);

  // Partial-submit recovery: `POST /users/me/plans` and each
  // `POST /users/me/plans/:id/details` are separate requests with no
  // transaction around them, so a failure halfway through leaves a real
  // plan behind. Remembering what already landed makes "Guardar Plan"
  // resumable instead of creating a duplicate plan on every retry.
  const createdPlanIdRef = useRef<number | null>(null);
  const addedActivityIdsRef = useRef<Set<number>>(new Set());

  // Activities Search State
  const [activitySearch, setActivitySearch] = useState("");
  const debouncedActivitySearch = useDebouncedValue(activitySearch, 400);
  const [activitySuggestions, setActivitySuggestions] = useState<ActivitySearchResult[]>([]);
  const [isSearchingActivities, setIsSearchingActivities] = useState(false);

  // Selected Itinerary State
  const [selectedActivities, setSelectedActivities] = useState<ActivitySearchResult[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);

  // Form validation errors
  const [titleError, setTitleError] = useState<string | null>(null);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Cancel Confirmation Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAutoPlanModal, setShowAutoPlanModal] = useState(false);

  // Activities search effect
  useEffect(() => {
    if (debouncedActivitySearch.trim().length < 2) {
      return;
    }

    let active = true;

    searchActivities({ search: debouncedActivitySearch, limit: 5 })
      .then((res) => {
        if (!active) return;
        setActivitySuggestions(res.data);
        setIsSearchingActivities(false);
      })
      .catch(() => {
        if (!active) return;
        setIsSearchingActivities(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedActivitySearch]);

  const handleAddActivity = (activity: ActivitySearchResult) => {
    // Avoid duplicates
    const exists = selectedActivities.some((act) => act.id === activity.id);
    if (exists) {
      setActivityError("La actividad ya fue incorporada");
      setTimeout(() => setActivityError(null), 3000);
      return;
    }

    // The search box is deliberately left as it is: clearing it used to
    // wipe the suggestions too, and retyping the same text never brought
    // them back — the debounced value hadn't changed, so the effect never
    // re-ran. Stops already on the itinerary are filtered out of the list
    // below instead.
    setSelectedActivities((prev) => [...prev, activity]);
    setActivityError(null);
  };

  const handleRemoveActivity = (id: number) => {
    setSelectedActivities((prev) => prev.filter((act) => act.id !== id));
  };

  // Suggestions minus what's already on the itinerary.
  const availableSuggestions = activitySuggestions.filter(
    (act) => !selectedActivities.some((selected) => selected.id === act.id),
  );

  // Calculations
  const totalCost = selectedActivities.reduce((sum, act) => sum + act.estimatedCost, 0);
  const totalDuration = selectedActivities.reduce((sum, act) => sum + act.estimatedDuration, 0);
  const costPerPerson = peopleCount > 0 ? totalCost / peopleCount : 0;

  // Form Dirtiness Check
  const isDirty = () => {
    return (
      title.trim() !== "" ||
      description.trim() !== "" ||
      peopleCount !== 1 ||
      selectedActivities.length > 0
    );
  };

  const handleCancelClick = () => {
    if (isDirty()) {
      setShowCancelModal(true);
    } else {
      router.push(ROUTES.explore);
    }
  };

  const handleConfirmCancel = () => {
    router.push(ROUTES.explore);
  };

  const submitForm = async () => {
    setTitleError(null);
    setPeopleError(null);
    setSubmitError(null);
    setSubmitSuccess(null);

    let hasErrors = false;

    if (!title.trim()) {
      setTitleError("El nombre del plan es obligatorio");
      hasErrors = true;
    }

    if (!peopleCount || peopleCount < 1) {
      setPeopleError("La cantidad de personas debe ser al menos 1");
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    startTransition(async () => {
      try {
        // Step 1: create the plan, unless a previous attempt already did.
        let planId = createdPlanIdRef.current;
        if (planId == null) {
          const newPlan = await createPlan({
            title: title.trim(),
            description: description.trim() || null,
            peopleCount: peopleCount,
          });
          planId = newPlan.id;
          createdPlanIdRef.current = newPlan.id;
        }

        // Step 2: add the stops that aren't on the plan yet.
        for (const activity of selectedActivities) {
          if (addedActivityIdsRef.current.has(activity.id)) continue;
          await addPlanActivity(planId, activity.id);
          addedActivityIdsRef.current.add(activity.id);
        }

        setSubmitSuccess("Plan creado correctamente");

        // Wait briefly for user to see success state, then redirect
        setTimeout(() => {
          router.push(`${ROUTES.plans}/${planId}`);
        }, 1500);
      } catch (error: unknown) {
        console.error(error);
        const fallback =
          createdPlanIdRef.current == null
            ? "No pudimos crear el plan. Intentá nuevamente."
            : "El plan se creó, pero no pudimos sumar todas las actividades. Volvé a intentarlo para completarlo.";
        const message = error instanceof ApiError ? error.message : fallback;
        setSubmitError(message);
      }
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submitForm();
  };


  return (
    <div className={styles.container}>
      <div className={styles.autoPlanBanner}>
        <div className={styles.autoPlanText}>
          <strong>¿Querés ahorrar tiempo?</strong>
          <p>Generá un itinerario personalizado automáticamente según tus preferencias con Inteligencia Artificial.</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowAutoPlanModal(true)}
        >
          <Icon name="sparkles" size={16} aria-hidden="true" />
          Generar plan automático
        </Button>
      </div>

      {/* LEFT: General details form */}
      <div>
        <div className={styles.card}>
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {/* Nombre */}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="plan-title" className={`sp-label ${styles.label}`}>
                  Nombre del plan
                </label>
                <span className={styles.required} aria-hidden="true">*</span>
              </div>
              <input
                id="plan-title"
                type="text"
                className={[styles.input, titleError ? styles.inputInvalid : ""].join(" ")}
                placeholder="Ej. Domingo de bodegas con amigos"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (e.target.value.trim()) setTitleError(null);
                }}
                disabled={isPending}
              />
              {titleError && <p className={styles.fieldError}>{titleError}</p>}
            </div>

            {/* Descripción */}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="plan-description" className={`sp-label ${styles.label}`}>
                  Descripción
                </label>
              </div>
              <textarea
                id="plan-description"
                className={styles.textarea}
                placeholder="Describí brevemente tu itinerario o plan..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Personas */}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="plan-people" className={`sp-label ${styles.label}`}>
                  Cantidad de personas
                </label>
                <span className={styles.required} aria-hidden="true">*</span>
              </div>
              <input
                id="plan-people"
                type="number"
                min="1"
                max="1000"
                className={[styles.input, peopleError ? styles.inputInvalid : ""].join(" ")}
                value={peopleCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setPeopleCount(Number.isNaN(val) ? 0 : val);
                  if (val >= 1) setPeopleError(null);
                }}
                disabled={isPending}
              />
              {peopleError && <p className={styles.fieldError}>{peopleError}</p>}
            </div>

            {/* Status Feedback */}
            {submitError && (
              <div className={`${styles.toast} ${styles.toastError}`}>
                <Icon name="triangle-alert" size={16} />
                <span>{submitError}</span>
              </div>
            )}
            {submitSuccess && (
              <div className={`${styles.toast} ${styles.toastSuccess}`}>
                <Icon name="circle-check" size={16} />
                <span>{submitSuccess}</span>
              </div>
            )}

            {/* Form Actions */}
            <div className={styles.actionRow}>
              <Button
                variant="ghostLight"
                onClick={handleCancelClick}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isPending}
              >
                {isPending ? (
                  <span className={styles.buttonContent}>
                    <Icon name="loader-circle" size={16} className="sp-animate-spin" />
                    Guardando...
                  </span>
                ) : (
                  "Guardar Plan"
                )}
              </Button>
            </div>

          </form>
        </div>
      </div>

      {/* RIGHT: Itinerary planner and activities selector */}
      <div>
        <h2 className={`sp-h3 ${styles.panelTitle}`}>Actividades del plan</h2>

        {/* Activity Search Selector */}
        <div className={styles.activitySelector}>
          <div className={styles.labelRow}>
            <label htmlFor="plan-activity-search" className={`sp-label ${styles.label}`}>
              Buscar Actividad
            </label>
          </div>
          <div className={styles.autocompleteContainer}>
            <input
              id="plan-activity-search"
              type="text"
              className={styles.activitySearchInput}
              placeholder="Escribí para buscar actividades (ej. Degustación, Jazz)..."
              value={activitySearch}
              onChange={(e) => {
                const val = e.target.value;
                setActivitySearch(val);
                if (val.trim().length >= 2) {
                  setIsSearchingActivities(true);
                } else {
                  setActivitySuggestions([]);
                  setIsSearchingActivities(false);
                }
              }}
              disabled={isPending}
            />
            {isSearchingActivities && (
              <div className={styles.searchSpinner}>
                <Icon name="loader-circle" size={18} className="sp-animate-spin" />
              </div>
            )}
          </div>
          {activityError && <p className={styles.fieldError}>{activityError}</p>}

          {availableSuggestions.length > 0 && (
            <div className={styles.activityList}>
              {availableSuggestions.map((act) => (
                <div key={act.id} className={styles.activityCard}>
                  <div className={styles.activityInfo}>
                    <p className={styles.activityName}>{act.name}</p>
                    <div className={styles.activityMeta}>
                      <span>{formatArs(act.estimatedCost)}</span>
                      <span>•</span>
                      <span>{formatDuration(act.estimatedDuration)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghostEmber"
                    size="sm"
                    onClick={() => handleAddActivity(act)}
                    disabled={isPending}
                  >
                    + Agregar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Selected activities itinerary list */}
        {selectedActivities.length > 0 ? (
          <div className={styles.itineraryList}>
            {selectedActivities.map((act, index) => (
              <div key={act.id} className={styles.itineraryRow}>
                <div className={styles.timeline}>
                  <span className={styles.timelineDot}>{index + 1}</span>
                  {index < selectedActivities.length - 1 && (
                    <span className={styles.timelineLine} />
                  )}
                </div>
                <div className={styles.itineraryCard}>
                  <div>
                    <p className={styles.itineraryName}>{act.name}</p>
                    <div className={styles.itineraryMeta}>
                      <span>{act.type || "Actividad"}</span>
                      <span>•</span>
                      <span>{formatDuration(act.estimatedDuration)}</span>
                    </div>
                  </div>
                  <div className={styles.itineraryTrailing}>
                    <span className={styles.itineraryCost}>
                      {formatArs(act.estimatedCost)}
                    </span>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => handleRemoveActivity(act.id)}
                      aria-label="Quitar actividad"
                      disabled={isPending}
                    >
                      <Icon name="trash-2" size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>
              Aún no agregaste actividades. Usá el buscador de abajo para sumar paradas a tu plan.
            </p>
          </div>
        )}

        {/* Real-time estimated totals breakdown card */}
        <div className={styles.summarySection}>
          <p className={styles.summaryTitle}>Resumen Estimado</p>
          <div className={styles.summaryRow}>
            <span>Actividades</span>
            <span>{selectedActivities.length}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Duración total</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Costo por persona</span>
            <span>{formatArs(costPerPerson)}</span>
          </div>
          <div className={styles.summaryRowTotal}>
            <span>Costo Total</span>
            <span>{formatArs(totalCost)}</span>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <ConfirmationDialog
          title="Descartar cambios"
          confirmLabel="Descartar"
          cancelLabel="Seguir editando"
          onCancel={() => setShowCancelModal(false)}
          onConfirm={handleConfirmCancel}
        >
          <p>
            ¿Seguro que querés cancelar la creación del plan? Se perderán todos
            los datos ingresados en el formulario.
          </p>
        </ConfirmationDialog>
      )}

      {/* Auto Plan Generation - Módulo en construcción Modal (CU31) */}
      {showAutoPlanModal && (
        <AutoPlanUnavailableDialog
          onClose={() => setShowAutoPlanModal(false)}
        />
      )}

    </div>
  );
}
