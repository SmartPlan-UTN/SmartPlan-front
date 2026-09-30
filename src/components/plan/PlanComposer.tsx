"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, ConfirmationDialog, Icon } from "@/components/ui";
import type { ComposerStep } from "@/components/plan/composer/ComposerStepper";
import { useDebouncedValue, useExplorationSearch } from "@/hooks";
import {
  createPlanFromComposer,
  getActivity,
  searchActivities,
  updatePlanFromComposer,
} from "@/lib/api";
import { activityDetailRoute, planDetailRoute, ROUTES } from "@/lib/routes";
import { formatArs, formatDuration } from "@/lib/utils";
import type {
  ActivitySearchParams,
  ActivitySearchResult,
  OwnPlanDetail,
  PlanVisibility,
} from "@/types";

import { ActivitiesStep, type ComposerPane } from "./composer/ActivitiesStep";
import { ComposerStepper } from "./composer/ComposerStepper";
import {
  createInitialDraft,
  getDraftKey,
  type ComposerDraft,
} from "./composer/draft";
import { IdeaStep } from "./composer/IdeaStep";
import { ReviewStep } from "./composer/ReviewStep";
import styles from "./PlanComposer.module.css";

type ComposerMode =
  | {
      mode: "create";
      plan?: never;
      initialActivityId?: number;
      returnToActivity?: boolean;
    }
  | {
      mode: "edit";
      plan: OwnPlanDetail;
      initialActivityId?: never;
      returnToActivity?: never;
    };

export type PlanComposerProps = ComposerMode;

const CATALOG_PAGE_SIZE = 12;
const MAX_PEOPLE = 1000;

export function PlanComposer({
  mode,
  plan,
  initialActivityId,
  returnToActivity = false,
}: PlanComposerProps) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const createRequestIdRef = useRef<string | null>(null);
  const updateRequestIdRef = useRef<string | null>(null);
  const initialDraftKeyRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<ComposerDraft>(() =>
    createInitialDraft(mode === "edit" ? plan : undefined),
  );
  if (initialDraftKeyRef.current === null) {
    initialDraftKeyRef.current = getDraftKey(draft);
  }

  const [step, setStep] = useState<ComposerStep>(initialActivityId ? 1 : 0);
  const [mobilePane, setMobilePane] = useState<ComposerPane>("catalog");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] =
    useState<NonNullable<ActivitySearchParams["sortBy"]>>("relevance");
  const [expanded, setExpanded] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(
    Boolean(initialActivityId),
  );
  const [prefillError, setPrefillError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [itineraryError, setItineraryError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const trimmedSearch = search.trim();
  const trimmedDebouncedSearch = debouncedSearch.trim();
  const isSearchTermTooShort = trimmedSearch.length === 1;
  const isSearchSettling =
    trimmedSearch.length >= 2 && trimmedSearch !== trimmedDebouncedSearch;
  const catalogEnabled =
    step === 1 &&
    (trimmedSearch.length === 0 ||
      (trimmedSearch.length >= 2 && !isSearchSettling));
  const searchParams = useMemo<ActivitySearchParams>(
    () => ({
      search: trimmedSearch.length >= 2 ? trimmedDebouncedSearch : undefined,
      categoryIds: categoryIds.length ? categoryIds : undefined,
      minPrice: parsePrice(minPrice),
      maxPrice: parsePrice(maxPrice),
      sortBy,
    }),
    [
      trimmedSearch.length,
      trimmedDebouncedSearch,
      categoryIds,
      minPrice,
      maxPrice,
      sortBy,
    ],
  );
  const catalog = useExplorationSearch(
    searchActivities,
    searchParams,
    CATALOG_PAGE_SIZE,
    catalogEnabled,
  );

  const totals = useMemo(
    () =>
      draft.stops.reduce(
        (sum, stop) => ({
          cost: sum.cost + stop.estimatedCost,
          duration: sum.duration + stop.estimatedDuration,
        }),
        { cost: 0, duration: 0 },
      ),
    [draft.stops],
  );
  const costPerPerson =
    draft.peopleCount > 0 ? totals.cost / draft.peopleCount : 0;
  const isDirty = getDraftKey(draft) !== initialDraftKeyRef.current;
  const destination =
    mode === "edit"
      ? planDetailRoute(plan.id)
      : returnToActivity && initialActivityId
        ? activityDetailRoute(initialActivityId)
        : ROUTES.plans;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (!initialActivityId) return;
    let active = true;

    getActivity(initialActivityId)
      .then((activity) => {
        if (!active) return;
        updateRequestIdRef.current = null;
        setSubmitError(null);
        setDraft((current) =>
          current.stops.some((stop) => stop.activity.id === activity.id)
            ? current
            : {
                ...current,
                stops: [
                  ...current.stops,
                  {
                    activity,
                    estimatedCost: activity.estimatedCost,
                    estimatedDuration: activity.estimatedDuration,
                  },
                ],
              },
        );
        setAnnouncement(`${activity.name} se agregó al recorrido.`);
      })
      .catch(() => {
        if (!active) return;
        setPrefillError(
          "No pudimos cargar la actividad inicial. Podés buscarla en el catálogo.",
        );
      })
      .finally(() => {
        if (active) setPrefillLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialActivityId]);

  function updateDraft<Key extends keyof ComposerDraft>(
    field: Key,
    value: ComposerDraft[Key],
  ) {
    updateRequestIdRef.current = null;
    setSubmitError(null);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function validateIdea(): boolean {
    const nextTitleError = draft.title.trim()
      ? null
      : "Escribí un nombre para el plan.";
    const nextPeopleError =
      Number.isInteger(draft.peopleCount) &&
      draft.peopleCount >= 1 &&
      draft.peopleCount <= MAX_PEOPLE
        ? null
        : `La cantidad de personas debe estar entre 1 y ${MAX_PEOPLE.toLocaleString("es-AR")}.`;
    setTitleError(nextTitleError);
    setPeopleError(nextPeopleError);
    return !nextTitleError && !nextPeopleError;
  }

  function goToStep(nextStep: ComposerStep) {
    if (nextStep > step) {
      if (step === 0 && !validateIdea()) return;
      if (step === 1 && draft.stops.length === 0) {
        setItineraryError("Sumá al menos una actividad para revisar el plan.");
        setAnnouncement("El recorrido necesita al menos una actividad.");
        return;
      }
    }
    setStep(nextStep);
    setSubmitError(null);
  }

  function addActivity(activity: ActivitySearchResult) {
    if (draft.stops.some((stop) => stop.activity.id === activity.id)) {
      setAnnouncement(`${activity.name} ya está en el recorrido.`);
      return;
    }
    updateDraft("stops", [
      ...draft.stops,
      {
        activity,
        estimatedCost: activity.estimatedCost,
        estimatedDuration: activity.estimatedDuration,
      },
    ]);
    setItineraryError(null);
    setAnnouncement(`${activity.name} se agregó al recorrido.`);
  }

  function removeActivity(activityId: number) {
    const removed = draft.stops.find((stop) => stop.activity.id === activityId);
    if (!removed) return;
    updateDraft(
      "stops",
      draft.stops.filter((stop) => stop.activity.id !== activityId),
    );
    setAnnouncement(`${removed.activity.name} se quitó del recorrido.`);
  }

  function moveActivity(activityId: number, direction: -1 | 1) {
    const index = draft.stops.findIndex(
      (stop) => stop.activity.id === activityId,
    );
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= draft.stops.length) return;
    const next = [...draft.stops];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    updateDraft("stops", next);
    setAnnouncement(
      `${draft.stops[index].activity.name} quedó en la posición ${nextIndex + 1}.`,
    );
  }

  function reorderActivities(
    sourceActivityId: number,
    targetActivityId: number,
  ) {
    const sourceIndex = draft.stops.findIndex(
      (stop) => stop.activity.id === sourceActivityId,
    );
    const targetIndex = draft.stops.findIndex(
      (stop) => stop.activity.id === targetActivityId,
    );
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex)
      return;
    const next = [...draft.stops];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    updateDraft("stops", next);
    setAnnouncement(
      `${moved.activity.name} quedó en la posición ${targetIndex + 1}.`,
    );
  }

  function exitComposer() {
    if (isDirty) setShowExitDialog(true);
    else router.push(destination);
  }

  async function savePlan() {
    if (prefillLoading) {
      setSubmitError(
        "Estamos cargando la actividad inicial. Esperá un momento para guardar.",
      );
      return;
    }
    if (!validateIdea()) {
      setStep(0);
      return;
    }
    if (draft.stops.length === 0) {
      setItineraryError("El plan necesita al menos una actividad.");
      setStep(1);
      return;
    }

    setIsSaving(true);
    setSubmitError(null);
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      peopleCount: draft.peopleCount,
      visibility: draft.visibility,
      stops: draft.stops.map((stop) => ({
        activityId: stop.activity.id,
        ...(stop.detailId === undefined ? {} : { detailId: stop.detailId }),
      })),
    };

    try {
      const saved =
        mode === "create"
          ? await createPlanFromComposer({
              ...payload,
              requestId: (createRequestIdRef.current ??= crypto.randomUUID()),
            })
          : await updatePlanFromComposer(plan.id, {
              ...payload,
              requestId: (updateRequestIdRef.current ??= crypto.randomUUID()),
            });
      initialDraftKeyRef.current = getDraftKey(createInitialDraft(saved));
      const afterSave =
        mode === "edit"
          ? planDetailRoute(plan.id)
          : returnToActivity && initialActivityId
            ? activityDetailRoute(initialActivityId)
            : planDetailRoute(saved.id);
      router.push(afterSave);
    } catch {
      setSubmitError(
        "No pudimos guardar el plan. Tu borrador sigue acá; revisá tu conexión e intentá de nuevo.",
      );
      setAnnouncement(
        "No se guardó el plan. El borrador sigue disponible para reintentar.",
      );
      setIsSaving(false);
    }
  }

  return (
    <section
      className={styles.composer}
      aria-label={mode === "create" ? "Crear un plan" : "Editar plan"}
    >
      <div className={styles.topline}>
        <div>
          <p className={styles.kicker}>
            {mode === "create"
              ? "UN VIAJE EMPIEZA CON UNA IDEA"
              : "TU RECORRIDO, A TU MANERA"}
          </p>
          <h2 ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
            {step === 0
              ? "Dale forma a tu plan"
              : step === 1
                ? "Armemos el recorrido"
                : "Así queda tu plan"}
          </h2>
        </div>
        <Button
          type="button"
          variant="ghostLight"
          onClick={exitComposer}
          disabled={isSaving}
        >
          Salir
        </Button>
      </div>

      <ComposerStepper
        currentStep={step}
        disabled={isSaving}
        onStepChange={goToStep}
      />

      {step === 0 ? (
        <IdeaStep
          title={draft.title}
          description={draft.description}
          peopleCount={draft.peopleCount}
          visibility={draft.visibility}
          titleError={titleError}
          peopleError={peopleError}
          isSaving={isSaving}
          onTitleChange={(value) => {
            if (value.trim()) setTitleError(null);
            updateDraft("title", value);
          }}
          onDescriptionChange={(value) => updateDraft("description", value)}
          onPeopleCountChange={(value) => {
            if (value >= 1 && value <= MAX_PEOPLE) setPeopleError(null);
            updateDraft("peopleCount", value);
          }}
          onVisibilityChange={(value: PlanVisibility) =>
            updateDraft("visibility", value)
          }
        />
      ) : null}

      {step === 1 ? (
        <ActivitiesStep
          catalog={catalog}
          stops={draft.stops}
          totalCost={totals.cost}
          totalDuration={totals.duration}
          costPerPerson={costPerPerson}
          search={search}
          minPrice={minPrice}
          maxPrice={maxPrice}
          categoryIds={categoryIds}
          sortBy={sortBy}
          expanded={expanded}
          mobilePane={mobilePane}
          isSearchTermTooShort={isSearchTermTooShort}
          isSearchSettling={isSearchSettling}
          prefillLoading={prefillLoading}
          prefillError={prefillError}
          itineraryError={itineraryError}
          isSaving={isSaving}
          announcement={announcement}
          onSearchChange={setSearch}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          onToggleCategory={(categoryId) => {
            setCategoryIds((current) =>
              current.includes(categoryId)
                ? current.filter((id) => id !== categoryId)
                : [...current, categoryId],
            );
          }}
          onSortChange={setSortBy}
          onExpand={() => setExpanded(true)}
          onPaneChange={setMobilePane}
          onAdd={addActivity}
          onRemove={removeActivity}
          onMove={moveActivity}
          onReorder={reorderActivities}
        />
      ) : null}

      {step === 2 ? (
        <ReviewStep
          title={draft.title}
          description={draft.description}
          peopleCount={draft.peopleCount}
          visibility={draft.visibility}
          stops={draft.stops}
          totalCost={totals.cost}
          totalDuration={totals.duration}
          costPerPerson={costPerPerson}
          disabled={isSaving}
          onEditIdea={() => goToStep(0)}
          onEditRoute={() => goToStep(1)}
        />
      ) : null}

      {submitError ? (
        <div className={styles.submitError} role="alert">
          <Icon name="triangle-alert" size={17} aria-hidden="true" />
          {submitError}
        </div>
      ) : null}

      <footer className={styles.footer}>
        {step === 1 ? (
          <div
            className={styles.footerSummary}
            aria-label="Resumen del recorrido"
          >
            <span>
              {draft.stops.length}{" "}
              {draft.stops.length === 1 ? "parada" : "paradas"}
              {" · "}
              {formatDuration(totals.duration)}
            </span>
            <strong>{formatArs(totals.cost)}</strong>
          </div>
        ) : null}

        {step > 0 ? (
          <Button
            type="button"
            variant="ghostLight"
            onClick={() => goToStep((step - 1) as ComposerStep)}
            disabled={isSaving}
          >
            <Icon name="arrow-left" size={16} aria-hidden="true" /> Atrás
          </Button>
        ) : (
          <span className={styles.footerHint}>
            Tu borrador se guarda cuando confirmes
          </span>
        )}

        {step < 2 ? (
          <Button
            type="button"
            variant="primary"
            onClick={() => goToStep((step + 1) as ComposerStep)}
            disabled={isSaving}
          >
            {step === 0 ? "Elegir actividades" : "Revisar plan"}
            <Icon name="arrow-right" size={16} aria-hidden="true" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={() => void savePlan()}
            disabled={isSaving || draft.stops.length === 0 || prefillLoading}
          >
            {isSaving ? (
              <>
                <Icon
                  name="loader-circle"
                  size={16}
                  className={styles.spin}
                  aria-hidden="true"
                />
                Guardando…
              </>
            ) : (
              <>
                <Icon name="check" size={16} aria-hidden="true" />
                {mode === "create" ? "Crear plan" : "Guardar cambios"}
              </>
            )}
          </Button>
        )}
      </footer>

      {showExitDialog ? (
        <ConfirmationDialog
          title="¿Salir sin guardar?"
          confirmLabel="Salir y descartar"
          cancelLabel="Seguir editando"
          onCancel={() => setShowExitDialog(false)}
          onConfirm={() => router.push(destination)}
        >
          <p>
            Los cambios de este borrador se van a perder. El plan actual sigue
            como estaba.
          </p>
        </ConfirmationDialog>
      ) : null}
    </section>
  );
}

function parsePrice(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}
