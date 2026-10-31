"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";

import { PLAN_SELECTION } from "@/components/plan/planSelectionContent";
import { Button, Icon } from "@/components/ui";
import { usePlanSelection, useReducedMotion } from "@/hooks";
import { buildPlanPins } from "@/lib/maps/buildPlanPins";
import { anchorOf, itineraryOf, planHeadline } from "@/lib/plans/story";
import { stopClock, stopLabel, stopPlace } from "@/lib/plans/stops";
import type {
  PlanDetailResult,
  PlanFunnel,
  PlanUnderstanding,
  ResolvedPlanContext,
} from "@/types";

import { DecisionTrail } from "./DecisionTrail";
import { CommunityFindings } from "@/components/community/CommunityFindings";
import { HeroRecommendation } from "./HeroRecommendation";
import { ResultsMap, type ResultsMapHandle } from "./ResultsMap";
import { UnderstandingChips } from "./ResultsHeader";
import styles from "./results-story.module.css";

export interface PlanResultsProps {
  plans: PlanDetailResult[];
  returnTo?: string;
  /** The person's request that produced these plans. `null`/absent for surprise mode. */
  query?: string | null;
  /** What the system understood from the request (budget/location/party size/categories). */
  resolvedContext?: ResolvedPlanContext | null;
  /** "Entendí lo que buscás" from the planning engine. */
  understanding?: PlanUnderstanding | null;
  /** Real counts of what the planner did. */
  funnel?: PlanFunnel | null;
  /** Asked-for experiences SmartPlan cannot plan yet ("Cine"). */
  unsupportedExperiences?: string[];
  /** Back to the composer with the previous request loaded, ready to edit. */
  onAdjust: () => void;
  onDiscard: () => void;
  /** Hidden when there is nothing to adjust (a surprise plan has no query). */
  canAdjust?: boolean;
  /** `surprise` swaps the copy and offers "Sorpréndeme de nuevo" (CU19). */
  mode?: "auto" | "surprise";
  /** One-line note under the header (e.g. fallback / no-preferences, CU19). */
  note?: string | null;
  /** The screen already shows its own header (editable request + chips). */
  hideHeader?: boolean;
  /** Creates a fresh surprise request from the same coordinates (CU19). */
  onRegenerate?: () => void;
  /**
   * "Lo voy a hacer" added the plan to Mis salidas (CU22): the caller marks
   * the alternative as chosen in place, with its outing — no refetch.
   */
  onPlanSelected?: (planId: number, outingId: number) => void;
  /**
   * The plan could not be chosen anymore (or is gone). The list here is
   * stale — the caller reconciles it from the server.
   */
  onSelectionReconcile?: () => void;
  /** Adjustments under the recommendation ("Más tranqui", change a stop…). */
  renderRefinement?: (plan: PlanDetailResult) => ReactNode;
  /** Matching public plans appear below the itinerary and map, before the footer. */
  communityRecommendations?: import("@/types").CommunityPlanRecommendation[];
}

/** CU17 and CU19 both surface at most three alternatives. */
const MAX_VISIBLE_PLANS = 3;

/**
 * What each option is, in one or two words. "Algo distinto" only when the
 * planner says what actually differs; swapping one venue is "Otra opción".
 */
function optionLabel(plan: PlanDetailResult, index: number): string {
  if (index === 0) return "Mi elección";
  const role = plan.insight?.role;
  if (role === "VALUE") return "Mejor precio";
  if (role === "DIFFERENT" && plan.insight?.difference) return "Algo distinto";
  return "Otra opción";
}

/** A real "cómo llegar": Google Maps directions to the place, from wherever they are. */
function directionsLink(plan: PlanDetailResult): string | null {
  const anchor = anchorOf(plan);
  const place = anchor?.place;
  if (!place) return null;
  const destination =
    place.latitude != null && place.longitude != null
      ? `${place.latitude},${place.longitude}`
      : [place.name, place.address, place.departmentName ?? "Mendoza"]
          .filter(Boolean)
          .join(" ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

function mapsLink(plan: PlanDetailResult): string | null {
  const anchor = anchorOf(plan);
  const place = anchor?.place;
  if (!place) return null;
  const query = [place.name, place.address, place.departmentName ?? "Mendoza"]
    .filter(Boolean)
    .join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * The results as one story, not a list: the recommendation smartplan stands
 * behind, where it is, how it was chosen, and the runners-up. Selection,
 * the map and refinement keep the behaviour of CU17/CU19/CU22: "Lo voy a
 * hacer" adds the plan to Mis salidas once and never offers an undo.
 */
export function PlanResults({
  plans,
  returnTo,
  understanding = null,
  funnel = null,
  unsupportedExperiences = [],
  onAdjust,
  onDiscard,
  canAdjust = true,
  mode = "auto",
  note = null,
  hideHeader = false,
  onRegenerate,
  onPlanSelected,
  onSelectionReconcile,
  renderRefinement,
  communityRecommendations = [],
}: PlanResultsProps) {
  const surprise = mode === "surprise";
  const visiblePlans = useMemo(
    () => plans.slice(0, MAX_VISIBLE_PLANS),
    [plans],
  );
  const reducedMotion = useReducedMotion();

  const selection = usePlanSelection();
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [statusNote, setStatusNote] = useState<{
    tone: "ok" | "warn";
    text: string;
  } | null>(null);
  const [hoverPlanId, setHoverPlanId] = useState<number | null>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);

  const mapRef = useRef<ResultsMapHandle>(null);
  const mapSectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef(new Map<number, HTMLElement>());

  const mapPins = useMemo(() => buildPlanPins(visiblePlans), [visiblePlans]);
  const planColors = useMemo(() => {
    const byId = new Map<number, string>();
    mapPins.forEach((pin) => byId.set(pin.planId, pin.color));
    return byId;
  }, [mapPins]);

  const hero = visiblePlans[0] ?? null;
  const focused = visiblePlans.find((plan) => plan.id === focusedId) ?? hero;
  const focusedPins = mapPins.find((pin) => pin.planId === focused?.id);
  const anyPins = mapPins.some((pin) => pin.stops.length > 0);

  function registerCardRef(id: number, el: HTMLElement | null) {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }

  function focusPlan(planId: number, scroll: boolean) {
    setFocusedId(planId);
    mapRef.current?.panToPlan(planId);
    if (scroll)
      mapSectionRef.current?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
  }

  async function intend(plan: PlanDetailResult) {
    if (selection.status === "working" || workingId !== null) return;
    setStatusNote(null);
    setWorkingId(plan.id);

    const outcome = await selection.choose(plan.id);

    setWorkingId(null);
    if (!outcome) return;

    if (outcome.ok) {
      onPlanSelected?.(plan.id, outcome.result.outing.id);
      setStatusNote({
        tone: "ok",
        text: PLAN_SELECTION.announceAdded(plan.title),
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

  if (!hero) {
    return (
      <div className={styles.results}>
        <div className={styles.empty}>
          <Icon name="inbox" size={32} />
          <p className="sp-h4">No hay planes disponibles para esa consulta</p>
          <p className="sp-body">
            Probá con otra zona o cambiá los filtros de tu búsqueda.
          </p>
          <div className={styles.footerActions}>
            {canAdjust ? (
              <Button variant="ghostEmber" onClick={onAdjust}>
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
              {surprise ? "Volver al inicio" : "Empezar de nuevo"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const shared = (plan: PlanDetailResult) => ({
    plan,
    returnTo,
    accentColor: planColors.get(plan.id) ?? "var(--ember)",
    active: (hoverPlanId ?? focused?.id) === plan.id,
    intended: plan.viewerPlanState === "selected",
    busy: workingId === plan.id,
    selectionWorking: selection.status === "working",
    onActivate: setHoverPlanId,
    onDeactivate: (id: number) =>
      setHoverPlanId((current) => (current === id ? null : current)),
    onViewRoute: (id: number) => focusPlan(id, true),
    onIntend: (target: PlanDetailResult) => void intend(target),
    registerRef: registerCardRef,
  });

  const displayed = focused ?? hero;
  const focusedItinerary = focused ? itineraryOf(focused) : [];
  const focusedAnchor = focused ? anchorOf(focused) : null;
  const fallbackLink = focused ? mapsLink(focused) : null;
  const directions = focused ? directionsLink(focused) : null;

  return (
    <div className={styles.results}>
      {!hideHeader ? (
        <div className={styles.intro}>
          {understanding?.chips.length ? (
            <UnderstandingChips
              chips={understanding.chips}
              missing={[]}
              onAddContext={() => undefined}
            />
          ) : null}
          {note ? <p className={styles.note}>{note}</p> : null}
        </div>
      ) : note ? (
        <p className={styles.note}>{note}</p>
      ) : null}

      <p
        className={statusNote?.tone === "warn" ? styles.liveWarn : styles.live}
        role="status"
        aria-live="polite"
      >
        {statusNote?.text ?? ""}
      </p>

      {unsupportedExperiences.length ? (
        <p className={styles.liveWarn} role="status" aria-live="polite">
          No encontramos opciones verificables para{" "}
          {unsupportedExperiences
            .map((experience) => experience.toLocaleLowerCase("es-AR"))
            .join(", ")}
          . Estas propuestas son alternativas y no incluyen{" "}
          {unsupportedExperiences.length === 1
            ? "esa experiencia."
            : "esas experiencias."}
        </p>
      ) : null}

      {visiblePlans.length > 1 ? (
        <div
          className={styles.switcher}
          role="group"
          aria-label="Elegir un plan"
        >
          {visiblePlans.map((plan, index) => (
            <button
              key={plan.id}
              type="button"
              className={styles.tab}
              aria-pressed={displayed.id === plan.id}
              onClick={() => focusPlan(plan.id, false)}
              style={{
                ["--accent" as string]:
                  planColors.get(plan.id) ?? "var(--ember)",
              }}
            >
              <span className={styles.tabDot} aria-hidden="true" />
              <span className={styles.tabLabel}>
                {optionLabel(plan, index)}
              </span>
              <span className={styles.tabPlan}>{planHeadline(plan)}</span>
            </button>
          ))}
        </div>
      ) : null}

      <HeroRecommendation
        key={displayed.id}
        {...shared(displayed)}
        mode={mode}
        funnel={funnel}
        refinement={
          displayed.viewerPlanState === "selected"
            ? undefined
            : renderRefinement?.(displayed)
        }
      />

      <section
        ref={mapSectionRef}
        className={styles.where}
        aria-label="Dónde queda"
      >
        <div className={styles.whereCopy}>
          <p className={styles.eyebrow}>Dónde queda</p>
          {focused ? (
            <>
              <h2 className={styles.whereTitle}>{planHeadline(focused)}</h2>
              {focusedItinerary.length > 1 ? (
                <ol className={styles.stops}>
                  {focusedItinerary.map((item, index) => {
                    const leg =
                      focusedItinerary[index + 1]?.stop?.legTravelMinutes;
                    return (
                      <li key={item.id}>
                        <span className={styles.stopNumber} aria-hidden="true">
                          {index + 1}
                        </span>
                        <span className={styles.stopText}>
                          <strong>
                            {stopPlace(item)?.name ?? stopLabel(item)}
                          </strong>
                          <small>
                            {[stopClock(item), stopLabel(item)]
                              .filter(Boolean)
                              .join(" · ")}
                          </small>
                          {leg != null && leg > 0 ? (
                            <em>
                              {leg < 5
                                ? "A pocas cuadras de la próxima parada"
                                : `${leg} min hasta la próxima parada`}
                            </em>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className={styles.address}>
                  {[
                    focusedAnchor?.place?.address,
                    focusedAnchor?.place?.departmentName,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Ubicación a confirmar"}
                </p>
              )}
              {focused.insight?.travelMinutes != null &&
              focusedItinerary.length > 1 ? (
                <p className={styles.travel}>
                  <Icon name="car" size={14} aria-hidden="true" />
                  {focused.insight.travelMinutes < 5
                    ? "Todo a pocas cuadras"
                    : `${focused.insight.travelMinutes} min de traslado en total`}
                </p>
              ) : null}
            </>
          ) : null}

          {directions ? (
            <a
              className={styles.directions}
              href={directions}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="route" size={15} aria-hidden="true" />
              Cómo llegar
              <Icon name="external-link" size={13} aria-hidden="true" />
            </a>
          ) : null}
        </div>

        <div className={styles.mapFrame}>
          {anyPins ? (
            <ResultsMap
              ref={mapRef}
              plans={mapPins}
              focusPlanId={displayed.id}
              activePlanId={hoverPlanId ?? focused?.id ?? null}
              onPinHover={setHoverPlanId}
              onPinClick={(planId) => focusPlan(planId, false)}
            />
          ) : (
            <div className={styles.noMap}>
              <Icon name="map-pin" size={26} aria-hidden="true" />
              <p>Todavía no tenemos la ubicación exacta para dibujarlo.</p>
              {fallbackLink ? (
                <a href={fallbackLink} target="_blank" rel="noreferrer">
                  Buscarlo en Google Maps
                  <Icon name="external-link" size={13} aria-hidden="true" />
                </a>
              ) : null}
            </div>
          )}
          {anyPins && focused && !focusedPins?.stops.length ? (
            <p className={styles.mapHint}>
              Este lugar no se dibuja todavía: no tenemos su ubicación exacta.
            </p>
          ) : null}
        </div>
      </section>

      <CommunityFindings
        recommendations={communityRecommendations}
        returnTo={returnTo}
      />

      {funnel ? (
        <details className={styles.decisionDetails}>
          <summary>Cómo elegimos estos planes</summary>
          <DecisionTrail funnel={funnel} finalists={visiblePlans.length} />
        </details>
      ) : null}

      <div className={styles.footerActions}>
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
  );
}
