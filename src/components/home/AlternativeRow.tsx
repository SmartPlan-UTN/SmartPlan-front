"use client";

import Link from "next/link";

import { PLAN_SELECTION } from "@/components/plan/planSelectionContent";
import { Icon } from "@/components/ui";
import {
  anchorOf,
  compactHours,
  planHeadline,
} from "@/lib/plans/story";
import { outingDetailRoute, planDetailRoute, ROUTES } from "@/lib/routes";
import { planMoneyLine, planPerPersonLine } from "@/lib/plans/planMoney";
import { formatDuration } from "@/lib/utils";
import type { PlanDetailResult } from "@/types";

import { PlaceVisual } from "./PlaceVisual";
import styles from "./alternative-row.module.css";

const ROLE_LABEL: Record<NonNullable<PlanDetailResult["insight"]>["role"], string> = {
  BEST: "Otra gran opción",
  ALTERNATIVE: "Otra muy buena opción",
  DIFFERENT: "Algo distinto",
  VALUE: "Mejor precio",
};

export interface AlternativeRowProps {
  plan: PlanDetailResult;
  returnTo?: string;
  index: number;
  accentColor: string;
  active: boolean;
  intended: boolean;
  busy: boolean;
  selectionWorking: boolean;
  onActivate: (id: number) => void;
  onDeactivate: (id: number) => void;
  onViewRoute: (id: number) => void;
  onIntend: (plan: PlanDetailResult) => void;
  registerRef: (id: number, el: HTMLElement | null) => void;
}

/** "otro tipo de lugar · menos traslado" → "Otro tipo de lugar · menos traslado". */
function sentence(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * A runner-up, compact on purpose: a small picture, what it is and how it
 * differs from the recommendation. It never repeats the full story.
 */
export function AlternativeRow({
  plan,
  returnTo,
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
}: AlternativeRowProps) {
  const insight = plan.insight ?? null;
  const anchor = anchorOf(plan);
  const place = anchor?.place ?? null;
  const headline = planHeadline(plan);
  const hours = compactHours(anchor?.insight?.hours ?? null);
  const money = planMoneyLine(plan);
  const perPerson = planPerPersonLine(plan);
  const googlePlaceId = place?.googlePlaceId ?? null;
  const facts = [
    `${plan.activityCount} ${plan.activityCount === 1 ? "actividad" : "actividades"}`,
    plan.estimatedTotalDuration > 0 ? formatDuration(plan.estimatedTotalDuration) : null,
    hours,
    money.value,
  ].filter(
    (fact): fact is string => Boolean(fact),
  );
  return (
    <article
      ref={(el) => registerRef(plan.id, el)}
      onMouseEnter={() => onActivate(plan.id)}
      onMouseLeave={() => onDeactivate(plan.id)}
      onFocus={() => onActivate(plan.id)}
      onBlur={() => onDeactivate(plan.id)}
      className={[styles.row, active ? styles.rowActive : ""].filter(Boolean).join(" ")}
      style={{
        ["--accent" as string]: accentColor,
        animationDelay: `${260 + index * 90}ms`,
      }}
      aria-labelledby={`alt-${plan.id}`}
    >
      <div className={styles.thumb}>
        <PlaceVisual
          name={place?.name ?? headline}
          kind={place?.kind ?? null}
          kindLabel={place?.kindLabel ?? null}
          googlePlaceId={googlePlaceId}
          size="thumb"
        />
      </div>
      <div className={styles.body}>
        <p className={styles.role}>
          <span className={styles.roleDot} aria-hidden="true" />
          {insight ? ROLE_LABEL[insight.role] : "Otra opción"}
        </p>
        <h3 id={`alt-${plan.id}`} className={styles.name}>
          <Link href={planDetailRoute(plan.id, returnTo)}>{headline}</Link>
        </h3>
        {insight?.tagline ? (
          <p className={styles.tagline}>{insight.tagline}</p>
        ) : null}
        {insight?.difference ? (
          <p className={styles.difference}>{sentence(insight.difference)}</p>
        ) : null}
        {facts.length ? (
          <p className={styles.facts}>
            <span>{facts.join(" · ")}</span>
            {perPerson ? <small>{perPerson}</small> : null}
          </p>
        ) : null}
        <div className={styles.actions}>
          {intended ? (
            <Link
              className={styles.chosen}
              href={
                plan.activeOutingId != null
                  ? outingDetailRoute(plan.activeOutingId)
                  : ROUTES.outings
              }
            >
              <Icon name="circle-check" size={14} aria-hidden="true" />
              {PLAN_SELECTION.added}
            </Link>
          ) : (
            <button
              type="button"
              className={styles.choose}
              disabled={selectionWorking}
              aria-busy={busy}
              onClick={() => onIntend(plan)}
            >
              {PLAN_SELECTION.intend}
            </button>
          )}
          <button
            type="button"
            className={styles.map}
            onClick={() => onViewRoute(plan.id)}
          >
            <Icon name="map-pin" size={14} aria-hidden="true" />
            Ver en el mapa
          </button>
        </div>
      </div>
    </article>
  );
}
