import { useCallback, useMemo, useRef, type MouseEvent } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Icon } from "@/components/ui";
import { formatArs, formatDuration } from "@/lib/utils";
import type { AssistantProposal } from "@/types";

import type { ComposerStop } from "./draft";
import type { DurationHealth } from "./planDuration";
import { routeLegs, totalLegKm } from "./routeDistance";
import {
  getNearestOrderSaving,
  getRouteInsights,
  type RouteInsight,
} from "./routeInsights";
import { RouteTimeline } from "./RouteTimeline";
import type { ImprovementState } from "./useAssistant";
import { useStickyOverflow } from "./useStickyTop";
import { withStopInfo, type StopInfo } from "./useStopInfo";
import styles from "./RoutePanel.module.css";

import { localizeCatalogText } from "@/lib/utils/catalogLabels";

/** Which step the route is shown in: drafted, being built, or reviewed. */
export type RouteStage = "plan" | "build" | "review";

export interface RouteSave {
  label: string;
  canSave: boolean;
  error: string | null;
  onSave: () => void;
}

interface RoutePanelProps {
  stage: RouteStage;
  className?: string;
  stops: ComposerStop[];
  stopInfo: Record<number, StopInfo>;
  health: DurationHealth;
  totalCost: number;
  totalDuration: number;
  costPerPerson: number;
  highlightedActivityId: number | null;
  itineraryError: string | null;
  isSaving: boolean;
  visibleOnMobile: boolean;
  improvement: ImprovementState;
  onImprove: () => void;
  onDismissImprovement: () => void;
  onApplyProposal: (proposal: AssistantProposal) => void;
  onRemove: (activityId: number) => void;
  onMove: (activityId: number, direction: -1 | 1) => void;
  onSetOrder: (stops: ComposerStop[]) => void;
  /** The person accepted the proposed nearest-first order. */
  onApplyOrder: (stops: ComposerStop[]) => void;
  onExplore: () => void;
  onReview: () => void;
  onEditRoute: () => void;
  save: RouteSave;
  /** The activity pointed at elsewhere (a row, a marker). */
  focusedActivityId: number | null;
  onPoint: (activityId: number | null) => void;
}

const signed = (value: number, format: (n: number) => string) =>
  `${value < 0 ? "−" : "+"}${format(Math.abs(value))}`;

function describeEffect(proposal: AssistantProposal): string[] {
  const { minutes, cost, km } = proposal.effect;
  const parts: string[] = [];
  if (minutes !== 0) parts.push(signed(minutes, formatDuration));
  if (cost !== 0) parts.push(signed(cost, formatArs));
  if (km !== null && Math.abs(km) >= 0.1) {
    parts.push(
      `${km < 0 ? "−" : "+"}${Math.abs(km).toLocaleString("es-AR", { maximumFractionDigits: 1 })} km`,
    );
  }
  return parts;
}

const PROPOSAL_ICON = {
  reorder: "repeat",
  add: "plus",
  remove: "x",
} as const;

const PROPOSAL_ACTION = {
  reorder: "Reordenar",
  add: "Sumar",
  remove: "Quitar",
} as const;

const FADE = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] },
} as const;

const REVEAL = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
} as const;

/**
 * The route, as the object the whole composer is about: one dark ticket that
 * stays in the same place, at the same size, through the three steps. It is
 * drafted empty beside the name, filled while the person builds, and becomes
 * the thing they confirm in the review. Its footer (totals and the way
 * forward) stays in view however long the route grows, and it never scrolls
 * inside itself: a route longer than the screen scrolls with the page, then
 * pins at its end.
 */
export function RoutePanel({
  stage,
  className = "",
  stops,
  stopInfo,
  health,
  totalCost,
  totalDuration,
  costPerPerson,
  highlightedActivityId,
  itineraryError,
  isSaving,
  visibleOnMobile,
  improvement,
  onImprove,
  onDismissImprovement,
  onApplyProposal,
  onRemove,
  onMove,
  onSetOrder,
  onApplyOrder,
  onExplore,
  onReview,
  onEditRoute,
  save,
  focusedActivityId,
  onPoint,
}: RoutePanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  useStickyOverflow(panelRef);

  const positioned = useMemo(
    () => withStopInfo(stops, stopInfo),
    [stops, stopInfo],
  );
  const legs = useMemo(() => routeLegs(positioned), [positioned]);
  const building = stage === "build";
  const reviewing = stage === "review";
  const knownKm =
    reviewing && legs.length > 0 && legs.every((leg) => leg !== null)
      ? totalLegKm(positioned)
      : null;

  // One message dominates: the route's health. A route that cannot happen
  // gets nothing else beside it; a long one gets at most one suggestion.
  const insights = useMemo(() => {
    const all = getRouteInsights(positioned);
    if (health.exceedsDay) return [];
    return all.slice(0, health.level === "normal" ? 2 : 1);
  }, [positioned, health]);

  const proposals =
    building && improvement.status === "ready" ? improvement.proposals : [];
  const showProposals =
    building &&
    (improvement.status === "ready" || improvement.status === "unavailable");

  // The button that commits the plan takes the place of the one that led
  // here. A double click on "Revisar plan" must not land on "Crear plan".
  function handleSave(event: MouseEvent<HTMLButtonElement>) {
    if (event.detail > 1) return;
    save.onSave();
  }

  // Removing the last stop unmounts the list that held focus: hand it to the
  // panel so keyboard users are not dropped back at the top of the page.
  const isLastStop = stops.length === 1;
  const handleRemove = useCallback(
    (activityId: number) => {
      onRemove(activityId);
      if (isLastStop) {
        requestAnimationFrame(() => panelRef.current?.focus());
      }
    },
    [onRemove, isLastStop],
  );

  function applyInsight(insight: RouteInsight) {
    if (insight.action?.kind !== "reorder") return;
    const saving = getNearestOrderSaving(positioned);
    if (!saving) return;
    // The proposal is built from positioned copies; map back to the draft's.
    const byId = new Map(stops.map((stop) => [stop.activity.id, stop]));
    onApplyOrder(
      saving.order.map((stop) => byId.get(stop.activity.id) as ComposerStop),
    );
  }

  const mobileClass = building
    ? visibleOnMobile
      ? styles.visibleOnMobile
      : ""
    : reviewing
      ? styles.shownOnMobile
      : styles.planStage;

  return (
    <aside
      ref={panelRef}
      id="composer-panel-itinerary"
      data-route-object=""
      // While building on small screens the route is one of two tabs; in the
      // other steps it is simply the plan's route.
      {...(building
        ? { role: "tabpanel", "aria-labelledby": "composer-tab-itinerary" }
        : { "aria-labelledby": "composer-route-title" })}
      tabIndex={building ? 0 : -1}
      className={`${styles.panel} ${mobileClass} ${className}`}
    >
      <header className={styles.heading}>
        <h3 id="composer-route-title">Tu recorrido</h3>
        <AnimatePresence initial={false} mode="popLayout">
          {building && stops.length >= 2 ? (
            <motion.button
              key="improve"
              {...FADE}
              type="button"
              className={styles.improve}
              onClick={onImprove}
              disabled={isSaving || improvement.status === "loading"}
            >
              <Icon
                name={
                  improvement.status === "loading"
                    ? "loader-circle"
                    : "sparkles"
                }
                size={14}
                className={
                  improvement.status === "loading" ? styles.spin : undefined
                }
                aria-hidden="true"
              />
              {improvement.status === "loading" ? "Mirando…" : "Mejorar"}
            </motion.button>
          ) : reviewing ? (
            <motion.button
              key="edit"
              {...FADE}
              type="button"
              className={styles.improve}
              onClick={onEditRoute}
              disabled={isSaving}
              aria-label="Editar recorrido"
            >
              <Icon name="pencil" size={13} aria-hidden="true" />
              Editar
            </motion.button>
          ) : null}
        </AnimatePresence>
        {stops.length > 0 ? (
          <p className={styles.summary} aria-label="Estimación del recorrido">
            <span>
              {stops.length} {stops.length === 1 ? "parada" : "paradas"}
            </span>
            <span
              className={
                health.level === "normal" ? undefined : styles[health.level]
              }
            >
              {formatDuration(totalDuration)}
            </span>
            {knownKm !== null ? (
              <span>≈ {Math.round(knownKm)} km en línea recta</span>
            ) : null}
          </p>
        ) : (
          <p className={styles.summary}>Sin paradas todavía</p>
        )}
      </header>

      {building && health.level !== "normal" ? (
        <div
          id="route-health"
          className={`${styles.health} ${styles[health.level]}`}
          role={health.exceedsDay ? "alert" : "status"}
        >
          <Icon
            name={health.exceedsDay ? "triangle-alert" : "clock"}
            size={18}
            aria-hidden="true"
          />
          <div>
            <strong>{health.title}</strong>
            <p>{health.message}</p>
          </div>
        </div>
      ) : null}

      {building && itineraryError ? (
        <p className={styles.error} role="alert">
          {itineraryError}
        </p>
      ) : null}

      <AnimatePresence initial={false}>
        {showProposals ? (
          <motion.section
            key="proposals"
            {...REVEAL}
            className={styles.proposalsWrap}
            aria-label="Ideas para mejorar el recorrido"
          >
            <div className={styles.proposals}>
              <div className={styles.proposalsHead}>
                <h4>
                  <Icon name="sparkles" size={14} aria-hidden="true" />
                  Ideas para mejorarlo
                </h4>
                <button type="button" onClick={onDismissImprovement}>
                  Cerrar
                </button>
              </div>
              {improvement.status === "unavailable" ? (
                <p className={styles.proposalNote} role="status">
                  No pude revisar el recorrido ahora. Probá de nuevo en un rato.
                </p>
              ) : proposals.length === 0 ? (
                <p className={styles.proposalNote} role="status">
                  Lo miré y está bien armado: no cambiaría nada.
                </p>
              ) : (
                <ul>
                  {proposals.map((proposal, index) => (
                    <motion.li
                      key={proposal.kind}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.18,
                        delay: 0.06 + index * 0.04,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <span className={styles.proposalIcon} aria-hidden="true">
                        <Icon name={PROPOSAL_ICON[proposal.kind]} size={14} />
                      </span>
                      <div>
                        <p>
                          {proposal.kind === "add" ? (
                            <strong>{proposal.activity.name}. </strong>
                          ) : proposal.kind === "remove" ? (
                            <strong>
                              {stops.find(
                                (stop) =>
                                  stop.activity.id === proposal.activityId,
                              )?.activity.name ?? "Una parada"}
                              .{" "}
                            </strong>
                          ) : null}
                          {localizeCatalogText(proposal.reason)}
                        </p>
                        <p className={styles.effect}>
                          {describeEffect(proposal).join(" · ") ||
                            "Sin cambios en tiempo ni costo"}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => onApplyProposal(proposal)}
                      >
                        {PROPOSAL_ACTION[proposal.kind]}
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {stops.length === 0 ? (
        <div className={styles.empty}>
          <ol className={styles.ghost} aria-hidden="true">
            <li className={styles.ghostFirst}>
              <span className={styles.ghostNode}>
                <Icon name="plus" size={14} />
              </span>
              <span className={styles.ghostBar} />
            </li>
            <li>
              <span className={styles.ghostNode} />
              <span className={styles.ghostBar} />
            </li>
            <li>
              <span className={styles.ghostNode} />
              <span className={styles.ghostBar} />
            </li>
          </ol>
          <motion.div
            key={building ? "build" : "draft"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={styles.emptyCopy}
          >
            {building ? (
              <>
                <strong>Tu recorrido empieza acá</strong>
                <p>
                  Sumá una actividad y la primera parada aparece en la línea.
                </p>
                <button
                  type="button"
                  className={styles.exploreLink}
                  onClick={onExplore}
                >
                  Explorar actividades
                  <Icon name="arrow-right" size={14} aria-hidden="true" />
                </button>
              </>
            ) : (
              <strong>Acá va a tomar forma</strong>
            )}
          </motion.div>
        </div>
      ) : (
        <RouteTimeline
          stops={stops}
          legs={legs}
          highlightedActivityId={building ? highlightedActivityId : null}
          editable={building}
          disabled={isSaving}
          onRemove={handleRemove}
          onMove={onMove}
          onSetOrder={onSetOrder}
          linkedActivityId={focusedActivityId}
          onPoint={onPoint}
        />
      )}

      {building && insights.length > 0 ? (
        <ul className={styles.insights} aria-label="Observaciones del recorrido">
          {insights.map((insight) => (
            <li key={insight.id}>
              <Icon name="sparkles" size={14} aria-hidden="true" />
              <span>
                {insight.text}
                {insight.action ? (
                  <button
                    type="button"
                    className={styles.insightAction}
                    disabled={isSaving}
                    onClick={() => applyInsight(insight)}
                  >
                    {insight.action.label}
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <AnimatePresence initial={false}>
        {stage === "plan" ? null : (
          <motion.footer key="footer" {...FADE} className={styles.footer}>
            {reviewing && save.error ? (
              <div className={styles.saveError} role="alert">
                <Icon name="triangle-alert" size={16} aria-hidden="true" />
                {save.error}
              </div>
            ) : null}
            <div className={styles.footerRow}>
              <p className={styles.total}>
                <span>Total</span>
                <strong>{stops.length > 0 ? formatArs(totalCost) : "—"}</strong>
                {stops.length > 0 ? (
                  <small>{formatArs(costPerPerson)} por persona</small>
                ) : null}
              </p>
              <AnimatePresence initial={false} mode="popLayout">
                {reviewing ? (
                  <motion.button
                    key="save"
                    {...FADE}
                    type="button"
                    className={styles.cta}
                    onClick={handleSave}
                    disabled={isSaving || !save.canSave}
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
                        {save.label}
                      </>
                    )}
                  </motion.button>
                ) : (
                  <motion.button
                    key="review"
                    {...FADE}
                    type="button"
                    className={`${styles.cta} ${health.exceedsDay ? styles.caution : ""}`}
                    onClick={onReview}
                    disabled={isSaving}
                    aria-describedby={
                      health.exceedsDay ? "route-health" : undefined
                    }
                  >
                    {health.exceedsDay ? (
                      <>
                        <Icon
                          name="triangle-alert"
                          size={16}
                          aria-hidden="true"
                        />
                        Revisar igual
                      </>
                    ) : (
                      <>
                        Revisar plan
                        <Icon name="arrow-right" size={16} aria-hidden="true" />
                      </>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </aside>
  );
}
