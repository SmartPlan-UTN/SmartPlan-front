"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, ConfirmationDialog } from "@/components/ui";
import type { ComposerStep } from "@/components/plan/composer/ComposerStepper";
import { useDebouncedValue, useExplorationSearch } from "@/hooks";
import {
  createPlanFromComposer,
  getActivity,
  searchActivities,
  updatePlanFromComposer,
} from "@/lib/api";
import { activityDetailRoute, planDetailRoute, ROUTES } from "@/lib/routes";
import type {
  ActivitySearchParams,
  ActivitySearchResult,
  AssistantProposal,
  OwnPlanDetail,
  PlanVisibility,
} from "@/types";

import { ActivitiesStep, type ComposerPane } from "./composer/ActivitiesStep";
import type { DiscoveryView } from "./composer/CatalogPanel";
import { ComposerStepper } from "./composer/ComposerStepper";
import {
  createInitialDraft,
  getDraftKey,
  type ComposerDraft,
  type ComposerStop,
} from "./composer/draft";
import { IdeaStep } from "./composer/IdeaStep";
import {
  validateDescription,
  validatePeople,
  validatePriceRange,
  validateTitle,
} from "./composer/limits";
import { mapSaveError } from "./composer/mapSaveError";
import { getDurationHealth } from "./composer/planDuration";
import { ReviewStep } from "./composer/ReviewStep";
import { RoutePanel, type RouteStage } from "./composer/RoutePanel";
import { UndoToast, type UndoNotice } from "./composer/UndoToast";
import { useStopInfo } from "./composer/useStopInfo";
import { roundCoords } from "./composer/mapGeometry";
import { useCatalogLocation } from "./composer/useCatalogLocation";
import {
  useAssistantSearch,
  useRouteAssistance,
  useRouteImprovement,
} from "./composer/useAssistant";
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

const CATALOG_PAGE_SIZE = 8;
const ROUTE_STAGE: Record<ComposerStep, RouteStage> = {
  0: "plan",
  1: "build",
  2: "review",
};
const STAGE_CLASS: Record<ComposerStep, string> = {
  0: styles.planStage,
  1: styles.buildStage,
  2: styles.reviewStage,
};
const HIGHLIGHT_MS = 1200;

export function PlanComposer({
  mode,
  plan,
  initialActivityId,
  returnToActivity = false,
}: PlanComposerProps) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const noticeIdRef = useRef(0);
  const stopsRef = useRef<ComposerStop[]>([]);
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
  // List or map: two views of the same search, kept across steps.
  const [discoveryView, setDiscoveryView] = useState<DiscoveryView>("list");
  const [search, setSearch] = useState("");
  // The sentence the assistant is answering; null while it was not asked.
  const [askedQuery, setAskedQuery] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 350);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [userSort, setUserSort] = useState<NonNullable<
    ActivitySearchParams["sortBy"]
  > | null>(null);
  const [highlightedActivityId, setHighlightedActivityId] = useState<
    number | null
  >(null);
  // The activity pointed at anywhere (a catalog row, a stop in the route, a
  // marker): the other two views answer, so they read as one object.
  const [focusedActivityId, setFocusedActivityId] = useState<number | null>(
    null,
  );
  // A stop picked on the review's map stays picked when the pointer moves
  // on (or a finger lifts), until the map is clicked elsewhere.
  const [pinnedStopId, setPinnedStopId] = useState<number | null>(null);
  const linkedActivityId = focusedActivityId ?? pinnedStopId;
  const [prefillLoading, setPrefillLoading] = useState(
    Boolean(initialActivityId),
  );
  const [prefillError, setPrefillError] = useState<string | null>(null);
  const [notice, setNotice] = useState<UndoNotice | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [itineraryError, setItineraryError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const lastStop = draft.stops.at(-1)?.activity ?? null;
  const location = useCatalogLocation(lastStop);
  const nearbyReady = location.active && location.status === "ready";
  const nearbyLocating = location.active && location.status === "locating";

  const trimmedSearch = search.trim();
  const trimmedDebouncedSearch = debouncedSearch.trim();
  const isSearchTermTooShort = trimmedSearch.length === 1;
  const isSearchSettling =
    trimmedSearch.length >= 2 && trimmedSearch !== trimmedDebouncedSearch;
  const stopIds = useMemo(
    () => draft.stops.map((stop) => stop.activity.id),
    [draft.stops],
  );
  const assistantSearch = useAssistantSearch(askedQuery, stopIds);
  // A sentence the assistant could not read is not a keyword: sent to the
  // regular search word for word it would match nothing, so the person gets
  // the catalog instead of an empty list.
  const sentenceUnread = assistantSearch.status === "unavailable";
  const assistantAnswering =
    assistantSearch.status === "loading" || assistantSearch.status === "ready";
  const priceRangeError = validatePriceRange(
    parsePrice(minPrice),
    parsePrice(maxPrice),
  );
  const catalogEnabled =
    step === 1 &&
    !nearbyLocating &&
    !priceRangeError &&
    // While the assistant answers a sentence, the regular search stays quiet.
    !assistantAnswering &&
    (trimmedSearch.length === 0 ||
      (trimmedSearch.length >= 2 && !isSearchSettling));
  // Nearby results default to closest first; anything the person picks wins.
  // Distance needs a position, so it only exists while there is one (and a
  // zone drawn on the map is a place to look in, not a point to be near).
  const defaultSort =
    nearbyReady && location.kind !== "area" ? "distance" : "relevance";
  const effectiveSort: NonNullable<ActivitySearchParams["sortBy"]> =
    userSort && (userSort !== "distance" || nearbyReady)
      ? userSort
      : defaultSort;
  // The API takes coordinates with at most 6 decimals; a device position
  // has more.
  const anchor = useMemo(
    () =>
      nearbyReady && location.anchor ? roundCoords(location.anchor) : null,
    [nearbyReady, location.anchor],
  );
  const searchParams = useMemo<ActivitySearchParams>(
    () => ({
      search:
        trimmedSearch.length >= 2 && !sentenceUnread
          ? trimmedDebouncedSearch
          : undefined,
      categoryIds: categoryIds.length ? categoryIds : undefined,
      minPrice: parsePrice(minPrice),
      maxPrice: parsePrice(maxPrice),
      sortBy: effectiveSort,
      ...(anchor
        ? {
            latitude: anchor.latitude,
            longitude: anchor.longitude,
            maxDistanceKm: location.radiusKm,
          }
        : {}),
    }),
    [
      location.radiusKm,
      trimmedSearch.length,
      trimmedDebouncedSearch,
      sentenceUnread,
      categoryIds,
      minPrice,
      maxPrice,
      effectiveSort,
      anchor,
    ],
  );
  const catalog = useExplorationSearch(
    searchActivities,
    searchParams,
    CATALOG_PAGE_SIZE,
    catalogEnabled,
    { abortable: true },
  );

  const assistance = useRouteAssistance({
    title: draft.title,
    description: draft.description,
    stops: draft.stops,
    enabled: step === 1,
  });
  const showAssistance =
    trimmedSearch.length === 0 &&
    categoryIds.length === 0 &&
    !minPrice.trim() &&
    !maxPrice.trim() &&
    !location.active &&
    catalog.page === 1;

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
  const health = useMemo(
    () => getDurationHealth(totals.duration),
    [totals.duration],
  );
  const costPerPerson =
    draft.peopleCount > 0 ? totals.cost / draft.peopleCount : 0;
  useEffect(() => {
    stopsRef.current = draft.stops;
  }, [draft.stops]);
  const draftKey = useMemo(() => getDraftKey(draft), [draft]);
  const isDirty = draftKey !== initialDraftKeyRef.current;
  // From the first step: an edited plan shows its route (with distances) there too.
  const stopInfo = useStopInfo(draft.stops, true);
  const improvement = useRouteImprovement(draft.title, draft.stops);
  const destination =
    mode === "edit"
      ? planDetailRoute(plan.id)
      : returnToActivity && initialActivityId
        ? activityDetailRoute(initialActivityId)
        : ROUTES.plans;

  // Move focus to the new step's headline when the step changes, but not on
  // arrival: there the first field (or the page itself) should keep it.
  const previousStepRef = useRef(step);
  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;
    const target =
      step === 0
        ? document.getElementById("composer-title")
        : headingRef.current;
    target?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (highlightedActivityId === null) return;
    const timer = window.setTimeout(
      () => setHighlightedActivityId(null),
      HIGHLIGHT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [highlightedActivityId]);

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
    const nextTitleError = validateTitle(draft.title);
    const nextDescriptionError = validateDescription(draft.description);
    const nextPeopleError = validatePeople(draft.peopleCount);
    setTitleError(nextTitleError);
    setDescriptionError(nextDescriptionError);
    setPeopleError(nextPeopleError);
    return !nextTitleError && !nextDescriptionError && !nextPeopleError;
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
    setFocusedActivityId(null);
    setPinnedStopId(null);
  }

  // A marker pressed in the review: its stop comes forward in the route,
  // brought into view only when it is off-screen.
  const revealStop = useCallback((activityId: number | null) => {
    setPinnedStopId(activityId);
    if (activityId === null) return;
    const row = document.querySelector<HTMLElement>(
      `[data-route-object] li[data-activity-id="${activityId}"]`,
    );
    if (!row) return;
    const { top, bottom } = row.getBoundingClientRect();
    if (top < 0 || bottom > window.innerHeight) {
      const reduced = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      row.scrollIntoView({
        block: "center",
        behavior: reduced ? "auto" : "smooth",
      });
    }
  }, []);

  // Stable identity: the catalog rows are memoized on it.
  const addActivity = useCallback((activity: ActivitySearchResult) => {
    if (stopsRef.current.some((stop) => stop.activity.id === activity.id)) {
      setAnnouncement(`${activity.name} ya está en el recorrido.`);
      return;
    }
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
    setItineraryError(null);
    setHighlightedActivityId(activity.id);
    setAnnouncement(`${activity.name} se agregó al recorrido.`);
  }, []);

  const showNotice = useCallback((message: string, onUndo: () => void) => {
    noticeIdRef.current += 1;
    setNotice({ id: noticeIdRef.current, message, onUndo });
  }, []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  // The route's own edits (remove, move, drag) read the current stops from
  // `stopsRef`, like `addActivity`, so their identity is stable and the
  // memoized rows do not re-render while the person types in the search.
  const setStops = useCallback((stops: ComposerStop[]) => {
    updateRequestIdRef.current = null;
    setSubmitError(null);
    setDraft((current) => ({ ...current, stops }));
  }, []);

  const removeActivity = useCallback(
    (activityId: number) => {
      const stops = stopsRef.current;
      const index = stops.findIndex((stop) => stop.activity.id === activityId);
      if (index < 0) return;
      const removed = stops[index];
      setStops(stops.filter((stop) => stop.activity.id !== activityId));
      setFocusedActivityId((current) =>
        current === activityId ? null : current,
      );
      setAnnouncement(`${removed.activity.name} se quitó del recorrido.`);
      showNotice(`Quitaste ${removed.activity.name}`, () => {
        updateRequestIdRef.current = null;
        setDraft((current) => {
          if (current.stops.some((stop) => stop.activity.id === activityId)) {
            return current;
          }
          const next = [...current.stops];
          next.splice(Math.min(index, next.length), 0, removed);
          return { ...current, stops: next };
        });
        setItineraryError(null);
        setAnnouncement(`${removed.activity.name} volvió al recorrido.`);
      });
    },
    [setStops, showNotice],
  );

  const moveActivity = useCallback(
    (activityId: number, direction: -1 | 1) => {
      const stops = stopsRef.current;
      const index = stops.findIndex((stop) => stop.activity.id === activityId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= stops.length) return;
      const next = [...stops];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      setStops(next);
      setAnnouncement(
        `${stops[index].activity.name} quedó en la posición ${nextIndex + 1}.`,
      );
    },
    [setStops],
  );

  // Dragging reports every intermediate order, so this only updates the draft.
  const setOrder = setStops;

  // A proposed order (nearest first) that the person accepted from the notes.
  function applyOrder(next: ComposerStop[]) {
    const previous = draft.stops;
    updateDraft("stops", next);
    setAnnouncement("Ordenamos las paradas por cercanía.");
    showNotice("Ordenaste el recorrido por cercanía", () => {
      updateRequestIdRef.current = null;
      setDraft((current) =>
        current.stops.length === previous.length
          ? { ...current, stops: previous }
          : current,
      );
      setAnnouncement("Volvió el orden anterior.");
    });
  }

  // A proposal from "Mejorar": nothing happened until the person pressed its
  // button, and everything it does can be undone.
  function applyProposal(proposal: AssistantProposal) {
    const previous = draft.stops;
    improvement.dismiss();
    if (proposal.kind === "remove") {
      removeActivity(proposal.activityId);
      return;
    }
    if (proposal.kind === "reorder") {
      const byId = new Map(previous.map((stop) => [stop.activity.id, stop]));
      const next = proposal.orderedActivityIds
        .map((id) => byId.get(id))
        .filter((stop): stop is ComposerStop => stop !== undefined);
      if (next.length !== previous.length) return;
      updateDraft("stops", next);
      setAnnouncement("Reordenaste el recorrido como se propuso.");
      showNotice("Reordenaste el recorrido", () => {
        updateRequestIdRef.current = null;
        setDraft((current) =>
          current.stops.length === previous.length
            ? { ...current, stops: previous }
            : current,
        );
        setAnnouncement("Volvió el orden anterior.");
      });
      return;
    }
    const { activity } = proposal;
    if (previous.some((stop) => stop.activity.id === activity.id)) return;
    const slot = Math.min(
      proposal.position ?? previous.length,
      previous.length,
    );
    const next = [...previous];
    next.splice(slot, 0, {
      activity,
      estimatedCost: activity.estimatedCost,
      estimatedDuration: activity.estimatedDuration,
    });
    updateDraft("stops", next);
    setItineraryError(null);
    setHighlightedActivityId(activity.id);
    setAnnouncement(`${activity.name} se agregó al recorrido.`);
    showNotice(`Sumaste ${activity.name}`, () => {
      updateRequestIdRef.current = null;
      setDraft((current) => ({
        ...current,
        stops: current.stops.filter((stop) => stop.activity.id !== activity.id),
      }));
      setAnnouncement(`${activity.name} se quitó del recorrido.`);
    });
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
    } catch (error) {
      const failure = mapSaveError(error);
      if (failure.newRequestId) {
        createRequestIdRef.current = null;
        updateRequestIdRef.current = null;
      }
      setSubmitError(failure.message);
      setAnnouncement(`No se guardó el plan. ${failure.message}`);
      setIsSaving(false);
      if (failure.step !== undefined) setStep(failure.step);
    }
  }

  return (
    <section
      className={styles.composer}
      aria-label={mode === "create" ? "Crear un plan" : "Editar plan"}
    >
      {/* The route scrolls under the navbar; this keeps what shows through it
          plain cream instead of a dark smear. */}
      <div className={styles.navbarCap} aria-hidden="true" />
      <div className={styles.topline}>
        <ComposerStepper
          currentStep={step}
          disabled={isSaving}
          onStepChange={goToStep}
        />
        <Button
          type="button"
          variant="ghostLight"
          onClick={exitComposer}
          disabled={isSaving}
        >
          Salir
        </Button>
      </div>

      <div className={`${styles.stage} ${STAGE_CLASS[step]}`}>
        {step === 0 ? (
          <IdeaStep
            title={draft.title}
            description={draft.description}
            peopleCount={draft.peopleCount}
            titleError={titleError}
            descriptionError={descriptionError}
            peopleError={peopleError}
            isSaving={isSaving}
            onTitleChange={(value) => {
              if (!validateTitle(value)) setTitleError(null);
              updateDraft("title", value);
            }}
            onDescriptionChange={(value) => {
              if (!validateDescription(value)) setDescriptionError(null);
              updateDraft("description", value);
            }}
            onPeopleCountChange={(value) => {
              if (!validatePeople(value)) setPeopleError(null);
              updateDraft("peopleCount", value);
            }}
            onContinue={() => goToStep(1)}
          />
        ) : null}

        {step === 1 ? (
          <ActivitiesStep
            title={draft.title}
            headingRef={headingRef}
            health={health}
            catalog={catalog}
            location={location}
            assistant={{
              search: assistantSearch,
              askedQuery,
              assistance,
              showAssistance,
              onAsk: setAskedQuery,
              onClear: () => {
                // Back to the whole catalog: the sentence goes too, or the
                // regular search would try to match it word for word.
                setAskedQuery(null);
                setSearch("");
              },
            }}
            stops={draft.stops}
            totalCost={totals.cost}
            totalDuration={totals.duration}
            search={search}
            minPrice={minPrice}
            maxPrice={maxPrice}
            priceRangeError={priceRangeError}
            categoryIds={categoryIds}
            sortBy={effectiveSort}
            defaultSort={defaultSort}
            mobilePane={mobilePane}
            view={discoveryView}
            map={{
              params: searchParams,
              enabled: catalogEnabled,
              stops: draft.stops,
              stopInfo,
            }}
            isSearchTermTooShort={isSearchTermTooShort}
            isSearchSettling={isSearchSettling}
            prefillLoading={prefillLoading}
            prefillError={prefillError}
            isSaving={isSaving}
            announcement={announcement}
            onSearchChange={(value) => {
              setSearch(value);
              // Editing the sentence ends the assistant's answer to it.
              if (askedQuery !== null && value.trim() !== askedQuery) {
                setAskedQuery(null);
              }
            }}
            onMinPriceChange={setMinPrice}
            onMaxPriceChange={setMaxPrice}
            onToggleCategory={(categoryId) => {
              setCategoryIds((current) =>
                current.includes(categoryId)
                  ? current.filter((id) => id !== categoryId)
                  : [...current, categoryId],
              );
            }}
            onSortChange={setUserSort}
            onPaneChange={setMobilePane}
            onViewChange={setDiscoveryView}
            onAdd={addActivity}
            onRemove={removeActivity}
            focusedActivityId={focusedActivityId}
            onPoint={setFocusedActivityId}
          />
        ) : null}

        {step === 2 ? (
          <ReviewStep
            headingRef={headingRef}
            title={draft.title}
            description={draft.description}
            peopleCount={draft.peopleCount}
            visibility={draft.visibility}
            stops={draft.stops}
            stopInfo={stopInfo}
            totalDuration={totals.duration}
            costPerPerson={costPerPerson}
            isSaving={isSaving}
            focusedActivityId={linkedActivityId}
            onPoint={setFocusedActivityId}
            onRevealStop={revealStop}
            onEditIdea={() => goToStep(0)}
            onBack={() => goToStep(1)}
            onVisibilityChange={(value: PlanVisibility) =>
              updateDraft("visibility", value)
            }
          />
        ) : null}

        {/* One object through the three steps: drafted, built, confirmed. It
            stays mounted, so moving between steps never rebuilds it. */}
        <RoutePanel
          stage={ROUTE_STAGE[step]}
          className={styles.route}
          stops={draft.stops}
          stopInfo={stopInfo}
          health={health}
          totalCost={totals.cost}
          totalDuration={totals.duration}
          costPerPerson={costPerPerson}
          highlightedActivityId={highlightedActivityId}
          itineraryError={itineraryError}
          isSaving={isSaving}
          visibleOnMobile={mobilePane === "itinerary"}
          improvement={improvement.state}
          onImprove={improvement.request}
          onDismissImprovement={improvement.dismiss}
          onApplyProposal={applyProposal}
          onRemove={removeActivity}
          onMove={moveActivity}
          onSetOrder={setOrder}
          onApplyOrder={applyOrder}
          onExplore={() => {
            setMobilePane("catalog");
            document.getElementById("composer-tab-catalog")?.focus();
          }}
          onReview={() => goToStep(2)}
          onEditRoute={() => goToStep(1)}
          save={{
            label: submitError
              ? "Reintentar"
              : mode === "create"
                ? "Crear plan"
                : "Guardar cambios",
            canSave: draft.stops.length > 0 && !prefillLoading,
            error: submitError,
            onSave: () => void savePlan(),
          }}
          focusedActivityId={linkedActivityId}
          onPoint={setFocusedActivityId}
        />
      </div>

      <UndoToast notice={notice} onDismiss={dismissNotice} />

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
