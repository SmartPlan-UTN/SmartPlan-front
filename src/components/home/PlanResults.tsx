"use client";

import { useMemo, useRef, useState } from "react";

import { PLAN_SELECTION } from "@/components/plan/planSelectionContent";
import { Button, Icon } from "@/components/ui";
import { usePlanSelection, useReducedMotion } from "@/hooks";
import { buildPlanPins } from "@/lib/maps/buildPlanPins";
import type { PlanDetailResult, PlanSelectionResult, ResolvedPlanContext } from "@/types";

import { PlanResultCard } from "./PlanResultCard";
import { ResultsMap, type ResultsMapHandle } from "./ResultsMap";
import { SearchContextHeader } from "./SearchContextHeader";
import styles from "./generation.module.css";
import layoutStyles from "./results-layout.module.css";

export interface PlanResultsProps {
  plans: PlanDetailResult[];
  /** The free-text idea that produced these plans, for the "Buscaste:" line. `null`/absent for surprise mode. */
  query?: string | null;
  /** What the system understood from the request (budget/location/party size/categories). */
  resolvedContext?: ResolvedPlanContext | null;
  /** Back to the composer with the previous idea loaded, ready to edit. */
  onAdjust: () => void;
  onDiscard: () => void;
  /** Hidden when there is nothing to adjust (a surprise plan has no query). */
  canAdjust?: boolean;
  /** `surprise` swaps the copy and offers "Sorpréndeme de nuevo" (CU19). */
  mode?: "auto" | "surprise";
  /** One-line note under the header (e.g. fallback / no-preferences, CU19). */
  note?: string | null;
  /** Creates a fresh surprise request from the same coordinates (CU19). */
  onRegenerate?: () => void;
  /**
   * A plan's intent changed (CU22): the caller updates the alternatives in
   * place from the backend result — no refetch.
   */
  onPlanSelected?: (result: PlanSelectionResult) => void;
  /**
   * The change was rejected because the request advanced (or the plan is
   * gone). The list here is stale — the caller reconciles it from the server.
   */
  onSelectionReconcile?: () => void;
}

/** CU17 and CU19 both surface at most three alternatives. */
const MAX_VISIBLE_PLANS = 3;

/**
 * Up to 3 generated plans (CU17, CU19), Airbnb-style: a card list on the
 * left, a branded interactive map on the right (desktop), a List/Map toggle
 * on mobile. Shown as a continuation of the landing hero rather than as a
 * new screen.
 *
 * CU17 asks for three things to be possible on a result: adjust it, discard
 * it, or say you're going to do it. That last one is CU22 — a reversible
 * intent toggle: "Lo voy a hacer" fires `PATCH /plans/:id/select` directly
 * (no modal — the state and the "Ya no lo voy a hacer" control are the safety
 * net); the card then reads "✓ Lo vas a hacer". The others stay exactly as
 * they were, because nothing was rejected — the user just plans to do one.
 */
export function PlanResults({
  plans,
  query = null,
  resolvedContext = null,
  onAdjust,
  onDiscard,
  canAdjust = true,
  mode = "auto",
  note = null,
  onRegenerate,
  onPlanSelected,
  onSelectionReconcile,
}: PlanResultsProps) {
  const surprise = mode === "surprise";
  const visiblePlans = useMemo(() => plans.slice(0, MAX_VISIBLE_PLANS), [plans]);
  const reducedMotion = useReducedMotion();

  const selection = usePlanSelection();
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [statusNote, setStatusNote] = useState<{
    tone: "ok" | "warn";
    text: string;
  } | null>(null);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  const mapRef = useRef<ResultsMapHandle>(null);
  const cardRefs = useRef(new Map<number, HTMLElement>());

  const mapPins = useMemo(() => buildPlanPins(visiblePlans), [visiblePlans]);
  const planColors = useMemo(() => {
    const byId = new Map<number, string>();
    mapPins.forEach((pin) => byId.set(pin.planId, pin.color));
    return byId;
  }, [mapPins]);

  function registerCardRef(id: number, el: HTMLElement | null) {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }

  function handleViewRoute(planId: number) {
    setActivePlanId(planId);
    mapRef.current?.panToPlan(planId);
    if (mobileView !== "map") setMobileView("map");
  }

  function handlePinClick(planId: number) {
    setActivePlanId(planId);
    mapRef.current?.panToPlan(planId);
    cardRefs.current.get(planId)?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
    if (mobileView !== "list") setMobileView("list");
  }

  async function toggleIntent(plan: PlanDetailResult, direction: "on" | "off") {
    if (selection.status === "working" || workingId !== null) return;
    setStatusNote(null);
    setWorkingId(plan.id);

    const outcome = await (direction === "on"
      ? selection.select(plan.id)
      : selection.deselect(plan.id));

    setWorkingId(null);
    if (!outcome) return;

    if (outcome.ok) {
      onPlanSelected?.(outcome.result);
      setStatusNote({
        tone: "ok",
        text:
          direction === "on"
            ? PLAN_SELECTION.results.announceOn(plan.title)
            : PLAN_SELECTION.results.announceOff(plan.title),
      });
      selection.reset();
      return;
    }

    if (outcome.error.reconcile) {
      // The plan's real state moved on — reconcile from the server.
      onSelectionReconcile?.();
      setStatusNote({ tone: "warn", text: PLAN_SELECTION.error.reconciled });
    } else {
      // Network / unknown: nothing changed, let them try again.
      setStatusNote({ tone: "warn", text: PLAN_SELECTION.error.retry });
    }
    selection.reset();
  }

  if (plans.length === 0) {
    return (
      <div className={styles.resultsWrapper}>
        <div className={styles.emptyResults}>
          <Icon name="inbox" size={32} />
          <p className="sp-h4">
            {surprise
              ? "No encontramos suficientes actividades cerca de tu ubicación"
              : "No encontramos un plan para eso"}
          </p>
          <p className="sp-body">
            {surprise
              ? "Intentá en otro momento o explorá otras zonas."
              : "Probá contarnos tu idea de otra forma."}
          </p>
          <div className={styles.resultsActions}>
            {canAdjust ? (
              <Button variant="ghostEmber" onClick={onAdjust}>
                Ajustar la idea
              </Button>
            ) : null}
            {surprise && onRegenerate ? (
              <Button variant="ghostEmber" onClick={onRegenerate}>
                <Icon name="sparkles" size={15} aria-hidden="true" />
                Sorpréndeme de nuevo
              </Button>
            ) : null}
            <Button variant="ghostLight" onClick={onDiscard}>
              {surprise ? "Volver al inicio" : "Empezar de nuevo"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.resultsWrapper}>
      <SearchContextHeader
        mode={mode}
        query={query}
        resolvedContext={resolvedContext}
        planCount={visiblePlans.length}
        note={note}
      />
      <p
        className={statusNote?.tone === "warn" ? styles.resultLiveWarn : styles.resultLive}
        role="status"
        aria-live="polite"
      >
        {statusNote?.text ?? ""}
      </p>

      <div className={layoutStyles.viewToggle} role="tablist" aria-label="Vista de resultados">
        <span
          className={[layoutStyles.viewTogglePill, mobileView === "map" ? layoutStyles.viewTogglePillMap : ""]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        />
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === "list"}
          className={layoutStyles.viewToggleTab}
          onClick={() => setMobileView("list")}
        >
          <Icon name="list" size={14} aria-hidden="true" />
          Lista
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === "map"}
          className={layoutStyles.viewToggleTab}
          onClick={() => setMobileView("map")}
        >
          <Icon name="map" size={14} aria-hidden="true" />
          Mapa
        </button>
      </div>

      <div className={layoutStyles.resultsLayout}>
        <div className={layoutStyles.resultsListCol} data-mobile-hidden={mobileView !== "list"}>
          {visiblePlans.map((plan, index) => {
            const intended = plan.viewerPlanState === "selected";
            return (
              <PlanResultCard
                key={plan.id}
                plan={plan}
                index={index}
                accentColor={planColors.get(plan.id) ?? "#E85D20"}
                active={activePlanId === plan.id}
                intended={intended}
                busy={workingId === plan.id}
                selectionWorking={selection.status === "working"}
                onActivate={setActivePlanId}
                onDeactivate={(id) => setActivePlanId((current) => (current === id ? null : current))}
                onViewRoute={handleViewRoute}
                onToggleIntent={(target, direction) => void toggleIntent(target, direction)}
                registerRef={registerCardRef}
              />
            );
          })}
        </div>

        <div className={layoutStyles.resultsMapCol} data-mobile-hidden={mobileView !== "map"}>
          <ResultsMap
            ref={mapRef}
            plans={mapPins}
            activePlanId={activePlanId}
            onPinHover={setActivePlanId}
            onPinClick={handlePinClick}
            visible={mobileView === "map"}
          />
        </div>
      </div>

      <div className={styles.resultsFooter}>
        {canAdjust ? (
          <Button variant="ghostEmber" onClick={onAdjust}>
            <Icon name="pencil" size={15} aria-hidden="true" />
            Ajustar la búsqueda
          </Button>
        ) : null}
        {surprise && onRegenerate ? (
          <Button variant="ghostEmber" onClick={onRegenerate}>
            <Icon name="sparkles" size={15} aria-hidden="true" />
            Sorpréndeme de nuevo
          </Button>
        ) : null}
        <Button variant="ghostLight" onClick={onDiscard}>
          {surprise ? "Volver al inicio" : "Descartar"}
        </Button>
      </div>
    </div>
  );
}
