"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button, ConfirmationDialog, Icon, LoadingDots } from "@/components/ui";
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
        <LoadingDots label="Cargando el plan..." />
      </div>
    );
  }

  if (result.status === "not-found") {
    return (
      <div className={activityStyles.stateBlock}>
        <Icon name="inbox" size={32} className={activityStyles.stateIcon} />
        <h2 className="sp-h3">No encontramos este plan</h2>
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
        <h2 className="sp-h3">Algo salió mal</h2>
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
        <h2 className="sp-h3">El plan se encuentra cancelado</h2>
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
  const [pendingRemoveDetail, setPendingRemoveDetail] = useState<OwnPlanDetailItem | null>(null);
  const [isRemovingDetail, setIsRemovingDetail] = useState(false);

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

  // Suggestions minus what's already on the itinerary.
  const availableSuggestions = activitySuggestions.filter(
    (act) => !details.some((item) => item.activity.id === act.id),
  );

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
      // Same reasoning as CreatePlanForm: the box keeps its text, and
      // stops already on the plan are filtered out of the suggestions.
      const updatedPlan = await addPlanActivity(plan.id, activity.id);
      setDetails(updatedPlan.details);
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
  const requestRemoveActivity = (item: OwnPlanDetailItem) => {
    if (details.length === 1) {
      setPendingRemoveDetail(item);
    } else {
      void performRemoveActivity(item.id);
    }
  };

  const performRemoveActivity = async (detailId: number) => {
    setIsRemovingDetail(true);
    try {
      // `DELETE .../details/:detailId` answers 204, so the itinerary has to
      // be refetched rather than filtered locally: the backend renumbers
      // `order` on the remaining stops, and a local filter would leave the
      // timeline showing stale positions until the next full load.
      await removePlanActivity(plan.id, detailId);
      const refreshed = await getOwnPlan(plan.id);
      setDetails(refreshed.details);
      setPendingRemoveDetail(null);
    } catch (error: unknown) {
      const message =
        error instanceof ApiError
          ? error.message
          : "No pudimos quitar la actividad. Intentá de nuevo.";
      setSubmitError(message);
      setTimeout(() => setSubmitError(null), 3500);
    } finally {
      setIsRemovingDetail(false);
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
                  <span className={styles.buttonContent}>
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
        <h2 className={`sp-h3 ${styles.panelTitle}`}>
          Actividades del plan
        </h2>

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
                  <div className={styles.itineraryTrailing}>
                    <span className={styles.itineraryCost}>
                      {formatArs(item.estimatedCost)}
                    </span>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => {
                        requestRemoveActivity(item);
                      }}
                      aria-label={`Quitar ${item.activity.name}`}
                      disabled={isPending || isRemovingDetail}
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
      </div>

      {/* Empty Plan Remove Confirmation Modal (CU28) */}
      {pendingRemoveDetail && (
        <ConfirmationDialog
          title="¿Quitar la última actividad?"
          confirmLabel="Sí, quitar actividad"
          confirmingLabel="Quitando..."
          cancelLabel="Volver"
          isConfirming={isRemovingDetail}
          onCancel={() => setPendingRemoveDetail(null)}
          onConfirm={() => void performRemoveActivity(pendingRemoveDetail.id)}
        >
          <p>
            El plan quedará sin actividades en su itinerario.
          </p>
        </ConfirmationDialog>
      )}

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
            ¿Seguro que querés cancelar la edición del plan? Se descartarán las
            modificaciones en los datos del formulario.
          </p>
        </ConfirmationDialog>
      )}
    </div>
  );
}
