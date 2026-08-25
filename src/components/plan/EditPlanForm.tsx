"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button, Icon } from "@/components/ui";
import { useDebouncedValue, useDetailFetch } from "@/hooks";
import {
  getOwnPlan,
  updateOwnPlan,
  addPlanActivity,
  removePlanActivity,
  searchActivities,
  ApiError,
} from "@/lib/api";
import { planDetailRoute, ROUTES } from "@/lib/routes";
import { formatArs, formatDuration } from "@/lib/utils";
import type {
  ActivitySearchResult,
  OwnPlanDetail,
  OwnPlanDetailItem,
} from "@/types";

import styles from "./plan-create.module.css";
import activityStyles from "../activity/activity.module.css";

export interface EditPlanFormProps {
  planId: number;
}

const LOAD_ERROR = "No pudimos cargar el plan para edición. Intentá de nuevo.";

export function EditPlanForm({ planId }: EditPlanFormProps) {
  const result = useDetailFetch<OwnPlanDetail>(getOwnPlan, planId, LOAD_ERROR);

  if (result.status === "loading") {
    return (
      <div className={activityStyles.stateBlock}>
        <div className={activityStyles.loadingDots}>
          <span className={activityStyles.loadingDot} />
          <span className={activityStyles.loadingDot} />
          <span className={activityStyles.loadingDot} />
        </div>
        <p className="sp-body">Cargando el plan...</p>
      </div>
    );
  }

  if (result.status === "not-found") {
    return (
      <div className={activityStyles.stateBlock}>
        <Icon name="inbox" size={32} className={activityStyles.stateIcon} />
        <h1 className="sp-h3">No encontramos este plan</h1>
        <p className="sp-body">Puede haber sido eliminado o no pertenecer a tu cuenta.</p>
        <Link href={ROUTES.explore} className={activityStyles.backLink}>
          <Icon name="arrow-left" size={14} aria-hidden="true" />
          Volver a explorar
        </Link>
      </div>
    );
  }

  if (result.status === "error" || !result.data) {
    return (
      <div className={activityStyles.stateBlock} role="alert">
        <Icon name="triangle-alert" size={32} className={activityStyles.errorIcon} />
        <h1 className="sp-h3">Algo salió mal</h1>
        <p className="sp-body">{result.errorMessage ?? LOAD_ERROR}</p>
        <Link href={ROUTES.explore} className={activityStyles.backLink}>
          <Icon name="arrow-left" size={14} aria-hidden="true" />
          Volver a explorar
        </Link>
      </div>
    );
  }

  if (result.data.status.key === "cancelled") {
    return (
      <div className={activityStyles.stateBlock}>
        <Icon name="triangle-alert" size={32} className={activityStyles.stateIcon} />
        <h1 className="sp-h3">El plan se encuentra cancelado</h1>
        <p className="sp-body">Este plan fue cancelado y se conserva solo como historial de lectura.</p>
        <Link href={planDetailRoute(planId)} className={activityStyles.backLink}>
          <Icon name="arrow-left" size={14} aria-hidden="true" />
          Volver al plan
        </Link>
      </div>
    );
  }

  return <LoadedEditPlanForm plan={result.data} />;
}

function LoadedEditPlanForm({ plan }: { plan: OwnPlanDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form Fields State
  const [title, setTitle] = useState(plan.title);
  const [description, setDescription] = useState(plan.description ?? "");
  const [peopleCount, setPeopleCount] = useState<number>(plan.peopleCount);

  const [savedTitle, setSavedTitle] = useState(plan.title);
  const [savedDescription, setSavedDescription] = useState(plan.description ?? "");
  const [savedPeopleCount, setSavedPeopleCount] = useState<number>(plan.peopleCount);

  // Itinerary Stops
  const [details, setDetails] = useState<OwnPlanDetailItem[]>(plan.details);

  // Activities Search State
  const [activitySearch, setActivitySearch] = useState("");
  const debouncedActivitySearch = useDebouncedValue(activitySearch, 400);
  const [activitySuggestions, setActivitySuggestions] = useState<ActivitySearchResult[]>([]);
  const [isSearchingActivities, setIsSearchingActivities] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  // Feedback & Errors
  const [titleError, setTitleError] = useState<string | null>(null);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Cancel / Discard Confirmation
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Search activities effect
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

  // Calculations
  const totalCost = details.reduce((sum, item) => sum + item.estimatedCost, 0);
  const totalDuration = details.reduce((sum, item) => sum + item.estimatedDuration, 0);
  const costPerPerson = peopleCount > 0 ? totalCost / peopleCount : 0;

  // Form Dirtiness Check
  const isDirty = () => {
    return (
      title !== savedTitle ||
      description !== savedDescription ||
      peopleCount !== savedPeopleCount
    );
  };

  const handleCancelClick = () => {
    if (isDirty()) {
      setShowCancelModal(true);
    } else {
      router.push(planDetailRoute(plan.id));
    }
  };

  const handleConfirmCancel = () => {
    router.push(planDetailRoute(plan.id));
  };

  // Activity Management (CU27)
  const handleAddActivity = async (activity: ActivitySearchResult) => {
    const exists = details.some((item) => item.activity.id === activity.id);
    if (exists) {
      setActivityError("La actividad ya fue incorporada a este plan");
      setTimeout(() => setActivityError(null), 3000);
      return;
    }

    setActivityError(null);
    try {
      const updatedPlan = await addPlanActivity(plan.id, activity.id);
      setDetails(updatedPlan.details);
      setActivitySearch("");
      setActivitySuggestions([]);
    } catch (error: unknown) {
      const message =
        error instanceof ApiError
          ? error.message
          : "No pudimos agregar la actividad. Intentá de nuevo.";
      setActivityError(message);
      setTimeout(() => setActivityError(null), 3500);
    }
  };

  // Activity Management (CU28)
  const handleRemoveActivity = async (detailId: number) => {
    try {
      await removePlanActivity(plan.id, detailId);
      setDetails((prev) => prev.filter((item) => item.id !== detailId));
    } catch (error: unknown) {
      const message =
        error instanceof ApiError
          ? error.message
          : "No pudimos quitar la actividad. Intentá de nuevo.";
      setSubmitError(message);
      setTimeout(() => setSubmitError(null), 3500);
    }
  };

  // Submit Plan Changes (CU25)
  const handleSave = async () => {
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
        const updated = await updateOwnPlan(plan.id, {
          title: title.trim(),
          description: description.trim() || null,
          peopleCount,
        });

        setTitle(updated.title);
        setDescription(updated.description ?? "");
        setPeopleCount(updated.peopleCount);
        setSavedTitle(updated.title);
        setSavedDescription(updated.description ?? "");
        setSavedPeopleCount(updated.peopleCount);

        setSubmitSuccess("Plan actualizado correctamente");
        setTimeout(() => {
          router.push(planDetailRoute(plan.id));
        }, 1200);
      } catch (error: unknown) {
        console.error(error);
        const message =
          error instanceof ApiError
            ? error.message
            : "No pudimos actualizar el plan. Intentá nuevamente.";
        setSubmitError(message);
      }
    });
  };

  return (
    <div className={styles.container}>
      {/* LEFT: General details form */}
      <div>
        <h1 className="sp-h2 styles.title" style={{ marginBottom: "var(--s-4)" }}>
          Editar Plan
        </h1>
        <div className={styles.card}>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
            noValidate
          >
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
                maxLength={150}
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
                maxLength={2000}
              />
            </div>

            {/* Cantidad de Personas */}
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
                type="button"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isPending || (!isDirty() && submitSuccess == null)}
              >
                {isPending ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Icon name="loader-circle" size={16} className="sp-animate-spin" />
                    Guardando...
                  </span>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT: Itinerary stops and activity selector */}
      <div>
        <h2 className="sp-h3" style={{ marginBottom: "var(--s-4)" }}>
          Actividades del plan
        </h2>

        {/* Selected activities itinerary list */}
        {details.length > 0 ? (
          <div className={styles.itineraryList}>
            {details.map((item, index) => (
              <div key={item.id} className={styles.itineraryRow}>
                <div className={styles.timeline}>
                  <span className={styles.timelineDot}>{index + 1}</span>
                  {index < details.length - 1 && (
                    <span className={styles.timelineLine} />
                  )}
                </div>
                <div className={styles.itineraryCard}>
                  <div>
                    <p className={styles.itineraryName}>{item.activity.name}</p>
                    <div className={styles.itineraryMeta}>
                      <span>{item.activity.type || "Actividad"}</span>
                      <span>•</span>
                      <span>{formatDuration(item.estimatedDuration)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span className={styles.itineraryCost}>
                      {formatArs(item.estimatedCost)}
                    </span>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => {
                        void handleRemoveActivity(item.id);
                      }}
                      aria-label={`Quitar ${item.activity.name}`}
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
          <div
            style={{
              padding: "32px 20px",
              textAlign: "center",
              background: "rgba(26,17,9,0.03)",
              border: "1.5px dashed var(--hairline)",
              borderRadius: "var(--r-card-sm)",
              marginBottom: "var(--s-4)",
            }}
          >
            <p style={{ color: "var(--fg-3)", fontSize: "14px", margin: 0 }}>
              El plan no tiene actividades actualmente. Usá el buscador de abajo para sumar paradas.
            </p>
          </div>
        )}

        {/* Real-time estimated totals breakdown card */}
        <div className={styles.summarySection}>
          <p className={styles.summaryTitle}>Resumen Estimado</p>
          <div className={styles.summaryRow}>
            <span>Actividades</span>
            <span>{details.length}</span>
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

        {/* Activity Search Selector (CU27) */}
        <div className={styles.activitySelector}>
          <div className={styles.labelRow}>
            <label htmlFor="plan-activity-search" className={`sp-label ${styles.label}`}>
              Agregar Actividad
            </label>
          </div>
          <div className={styles.autocompleteContainer}>
            <input
              id="plan-activity-search"
              type="text"
              className={styles.activitySearchInput}
              placeholder="Buscar actividad para sumar al plan..."
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
              <div style={{ position: "absolute", right: "12px", top: "14px" }}>
                <Icon name="loader-circle" size={18} className="sp-animate-spin" />
              </div>
            )}
          </div>
          {activityError && <p className={styles.fieldError}>{activityError}</p>}

          {activitySuggestions.length > 0 && (
            <div className={styles.activityList}>
              {activitySuggestions.map((act) => (
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
                    onClick={() => {
                      void handleAddActivity(act);
                    }}
                    disabled={isPending}
                    type="button"
                  >
                    + Agregar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCancelModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>
              <Icon name="triangle-alert" size={24} />
            </div>
            <div>
              <h2 className="sp-h3" style={{ margin: "0 0 6px" }}>Descartar cambios</h2>
              <p style={{ margin: 0, color: "var(--fg-2)", fontSize: "14px", lineHeight: 1.5 }}>
                ¿Seguro que querés cancelar la edición del plan? Se descartarán las modificaciones en los datos del formulario.
              </p>
            </div>
            <div className={styles.modalActions}>
              <Button
                variant="ghostLight"
                style={{ flex: 1 }}
                onClick={() => setShowCancelModal(false)}
                type="button"
              >
                Seguir editando
              </Button>
              <Button
                variant="danger"
                style={{ flex: 1 }}
                onClick={handleConfirmCancel}
                type="button"
              >
                Descartar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
