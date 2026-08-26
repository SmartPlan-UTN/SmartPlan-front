import Link from "next/link";

import { Badge, Button, Icon, Stars } from "@/components/ui";
import { planDetailRoute } from "@/lib/routes";
import { formatArs, formatDuration, gradientFor } from "@/lib/utils";
import type { PlanRequestPlanSummary } from "@/types";

import styles from "./generation.module.css";
import exploreStyles from "../explore/explore.module.css";

export interface PlanResultsProps {
  plans: PlanRequestPlanSummary[];
  /** Back to the composer with the previous idea loaded, ready to edit. */
  onAdjust: () => void;
  onDiscard: () => void;
  /** Hidden when there is nothing to adjust (a surprise plan has no query). */
  canAdjust?: boolean;
}

/**
 * Up to 3 generated plans (CU17, CU19), shown as a continuation of the
 * landing hero rather than as a new screen.
 *
 * CU17 asks for three things to be possible on a result: accept it, adjust
 * it, or discard it. All three are here, and each does only what it says:
 *
 * - **Accept** — "Elegir este plan" is the card itself, and it navigates to
 *   the CU13 detail view. It deliberately does not claim to save or book
 *   anything: persisting a chosen plan is CU22 and has no endpoint yet, so
 *   a button that implied it would be a lie.
 * - **Adjust** — returns to the composer with the previous idea already in
 *   the field, so "casi, pero sin manejar" costs one edit instead of
 *   retyping the sentence.
 * - **Discard** — a local reset to an empty composer. No backend call.
 */
export function PlanResults({
  plans,
  onAdjust,
  onDiscard,
  canAdjust = true,
}: PlanResultsProps) {
  if (plans.length === 0) {
    return (
      <div className={styles.resultsWrapper}>
        <div className={styles.emptyResults}>
          <Icon name="inbox" size={32} />
          <p className="sp-h4">No encontramos un plan para eso</p>
          <p className="sp-body">Probá contarnos tu idea de otra forma.</p>
          <div className={styles.resultsActions}>
            {canAdjust ? (
              <Button variant="ghostEmber" onClick={onAdjust}>
                Ajustar la idea
              </Button>
            ) : null}
            <Button variant="ghostLight" onClick={onDiscard}>
              Empezar de nuevo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.resultsWrapper}>
      <div className={styles.resultsHeader}>
        <h2 className={`sp-h2 ${styles.resultsTitle}`}>Tu plan ya está listo</h2>
        <p className={`sp-body ${styles.resultsSubtitle}`}>
          Elegí la alternativa que más te guste.
        </p>
      </div>

      <div className={styles.resultsGrid}>
        {plans.map((plan, index) => (
          <div
            key={plan.id}
            className={styles.resultCard}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <Link href={planDetailRoute(plan.id)} className={exploreStyles.card}>
              <div
                className={exploreStyles.imageWrapper}
                style={{ background: gradientFor(plan.id) }}
              >
                <Icon name="route" size={40} className={exploreStyles.imagePlaceholder} />
              </div>

              <div className={exploreStyles.body}>
                <h3 className={exploreStyles.name}>{plan.title}</h3>

                <div className={exploreStyles.metaRow}>
                  <span className={exploreStyles.metaItem}>
                    <Icon name="clock" size={12} />
                    {formatDuration(plan.estimatedTotalDuration)}
                  </span>
                  <Badge variant="cost">{formatArs(plan.estimatedTotalCost)}</Badge>
                  <span className={exploreStyles.metaItem}>
                    <Stars rating={plan.averageRating} size={11} />
                    {plan.averageRating.toFixed(1)}
                  </span>
                  {plan.distanceKm != null ? (
                    <span className={exploreStyles.metaItem}>
                      <Icon name="map-pin" size={12} />
                      {plan.distanceKm.toFixed(1)} km
                    </span>
                  ) : null}
                </div>

                <div className={exploreStyles.tagRow}>
                  {plan.categories.slice(0, 2).map((category) => (
                    <Badge variant="tag" key={category.id}>
                      {category.name}
                    </Badge>
                  ))}
                </div>

                {/* Part of the card's own link, not a nested control: an
                    interactive element inside an anchor is invalid and
                    breaks keyboard navigation. */}
                <span className={styles.resultChoose}>
                  Elegir este plan
                  <Icon name="arrow-right" size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div className={styles.resultsFooter}>
        {canAdjust ? (
          <Button variant="ghostEmber" onClick={onAdjust}>
            <Icon name="pencil" size={15} aria-hidden="true" />
            Ajustar la búsqueda
          </Button>
        ) : null}
        <Button variant="ghostLight" onClick={onDiscard}>
          Descartar
        </Button>
      </div>
    </div>
  );
}
