"use client";

import Link from "next/link";

import { PLAN_SELECTION } from "@/components/plan/planSelectionContent";
import { Badge, Button, Icon, Stars } from "@/components/ui";
import { outingDetailRoute, planDetailRoute, ROUTES } from "@/lib/routes";
import { formatArs, formatDuration, getPlanZone } from "@/lib/utils";
import type { PlanDetailResult } from "@/types";

import styles from "./plan-result-card.module.css";

export interface PlanResultCardProps {
  plan: PlanDetailResult;
  index: number;
  accentColor: string;
  active: boolean;
  /** The viewer already has an outing to do from this plan. */
  intended: boolean;
  busy: boolean;
  /** Any plan's "Lo voy a hacer" is mid-flight — disables every card's CTA, not just the busy one. */
  selectionWorking: boolean;
  onActivate: (id: number) => void;
  onDeactivate: (id: number) => void;
  onViewRoute: (id: number) => void;
  onIntend: (plan: PlanDetailResult) => void;
  registerRef: (id: number, el: HTMLElement | null) => void;
}

/**
 * A single result — a horizontal row next to the map, not a tile in a grid
 * (CU17). Three distinct, honest actions instead of one ambiguous
 * whole-card link: the title goes to the detail page, "Ver recorrido"
 * highlights and pans the map to this plan, "Lo voy a hacer" (CU22) adds
 * it to Mis salidas once — then the card reads "Agregado a Mis salidas" with
 * a link there, and never offers an undo (#130). Hover/focus on the article itself (not a nested handler)
 * drives the map highlight, so keyboard Tab reaches the same state as a
 * mouse hover — the title link and the two buttons are the real tab stops.
 */
export function PlanResultCard({
  plan,
  index,
  accentColor,
  active,
  intended,
  busy,
  selectionWorking,
  onActivate,
  onDeactivate,
  onViewRoute,
  onIntend,
  registerRef,
}: PlanResultCardProps) {
  const zone = getPlanZone(plan);
  const itinerary = [...plan.details].sort((a, b) => a.order - b.order);
  return (
    <article
      ref={(el) => registerRef(plan.id, el)}
      onMouseEnter={() => onActivate(plan.id)}
      onMouseLeave={() => onDeactivate(plan.id)}
      onFocus={() => onActivate(plan.id)}
      onBlur={() => onDeactivate(plan.id)}
      className={[styles.card, active ? styles.cardActive : "", intended ? styles.cardChosen : ""]
        .filter(Boolean)
        .join(" ")}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className={styles.accentBar} style={{ background: accentColor }} aria-hidden="true" />
      <div className={styles.body}>
        <div className={styles.header}>
          <span className={styles.indexBadge} style={{ background: accentColor }} aria-hidden="true">
            {index + 1}
          </span>
          <h3 className={styles.title}>
            <Link href={planDetailRoute(plan.id)} className={styles.titleLink}>
              {plan.title}
            </Link>
          </h3>
        </div>

        {plan.description ? <p className={styles.description}>{plan.description}</p> : null}

        <div className={styles.summary}>
          <Badge variant="cost">{formatArs(plan.estimatedTotalCost)}</Badge>
          <span className={styles.summaryItem}>
            <Icon name="clock" size={14} aria-hidden="true" />
            {formatDuration(plan.estimatedTotalDuration)}
          </span>
          <span className={styles.summaryItem}>
            <Icon name="route" size={14} aria-hidden="true" />
            {plan.activityCount} {plan.activityCount === 1 ? "parada" : "paradas"}
          </span>
        </div>

        {itinerary.length > 0 ? (
          <ol className={styles.itinerary} aria-label="Itinerario del plan">
            {itinerary.slice(0, 3).map((stop) => (
              <li key={stop.id}>{stop.activity.name}</li>
            ))}
            {itinerary.length > 3 ? <li className={styles.moreStops}>+{itinerary.length - 3} más</li> : null}
          </ol>
        ) : null}

        {zone || plan.averageRating > 0 ? (
          <div className={styles.metaRow}>
            {zone ? (
              <span className={styles.metaItem}>
                <Icon name="map-pin" size={12} aria-hidden="true" />
                {zone}
              </span>
            ) : null}
            {plan.averageRating > 0 ? (
              <span className={styles.metaItem}>
                <Stars rating={plan.averageRating} size={11} />
                {plan.averageRating.toFixed(1)}
              </span>
            ) : null}
          </div>
        ) : null}

        {plan.categories.length > 0 ? (
          <div className={styles.tagRow}>
            {plan.categories.slice(0, 2).map((category) => (
              <Badge variant="tag" key={category.id}>
                {category.name}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className={styles.ctaRow}>
          <Button variant="ghostEmber" size="sm" onClick={() => onViewRoute(plan.id)}>
            <Icon name="map-pin" size={14} aria-hidden="true" />
            Ver recorrido
          </Button>

          {intended ? (
            <span className={styles.chosenGroup}>
              <span className={styles.resultChosen}>
                <Icon name="circle-check" size={15} aria-hidden="true" />
                {PLAN_SELECTION.added}
              </span>
              <Link
                className={styles.resultViewOuting}
                href={
                  plan.activeOutingId != null
                    ? outingDetailRoute(plan.activeOutingId)
                    : ROUTES.outings
                }
              >
                {PLAN_SELECTION.viewOuting}
              </Link>
            </span>
          ) : (
            <Button
              variant="primary"
              size="sm"
              disabled={selectionWorking}
              aria-busy={busy}
              onClick={() => onIntend(plan)}
            >
              {busy ? (
                <>
                  <Icon name="loader-circle" size={14} className={styles.resultSpinner} aria-hidden="true" />
                  {PLAN_SELECTION.intend}
                </>
              ) : (
                PLAN_SELECTION.intend
              )}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
