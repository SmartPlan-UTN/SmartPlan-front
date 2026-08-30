import type { MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";

import { Badge, Icon, Stars } from "@/components/ui";
import { RECOMMENDATIONS } from "@/components/landing/landingContent";
import { planDetailRoute } from "@/lib/routes";
import { formatArs, formatDuration, gradientFor } from "@/lib/utils";
import type { PlanRecommendation } from "@/types";

import styles from "./recommendation-card.module.css";

export interface RecommendationCardProps {
  recommendation: PlanRecommendation;
  /**
   * Discreet "no me interesa" (CU21). When given, a small button sits over the
   * media; activating it never navigates. Omitted → no button.
   */
  onDismiss?: (planId: number, title: string) => void;
}

/**
 * A discovery card for the Home's recommendations rail (CU20).
 *
 * Not the exploration `PlanCard`: this one breathes more, leads with the
 * itinerary, and carries a single soft "why" chip. One primary action — open
 * the plan (CU13). Selecting/saving is CU22/CU43 and lives on the detail
 * screen, so there is no button here.
 *
 * Image strategy is progressive: `plan.imageUrl` when the backend ever
 * provides one, otherwise an editorial fallback (a deterministic gradient
 * plus the activity sequence as the graphic). No stock photos, nothing that
 * pretends to be the real place.
 */
export function RecommendationCard({
  recommendation,
  onDismiss,
}: RecommendationCardProps) {
  const { plan, reason } = recommendation;
  const sequence = plan.activityNames.join(" → ");

  const handleDismiss = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onDismiss?.(plan.id, plan.title);
  };

  return (
    <li className={styles.card} data-card>
      <Link href={planDetailRoute(plan.id)} className={styles.link}>
        <CardMedia
          imageUrl={plan.imageUrl}
          planId={plan.id}
          sequence={sequence}
        />

        <span className={styles.reason}>{RECOMMENDATIONS.reasonChip[reason]}</span>

        <div className={styles.body}>
          <h3 className={styles.title}>{plan.title}</h3>
          {plan.description ? (
            <p className={styles.description}>{plan.description}</p>
          ) : null}

          <div className={styles.meta}>
            <span className={styles.metaItem}>
              <Icon name="clock" size={12} aria-hidden="true" />
              {formatDuration(plan.estimatedTotalDuration)}
            </span>
            <Badge variant="cost">{formatArs(plan.estimatedTotalCost)}</Badge>
            {plan.averageRating > 0 ? (
              <span className={styles.metaItem}>
                <Stars rating={plan.averageRating} size={11} />
                {plan.averageRating.toFixed(1)}
              </span>
            ) : null}
            {plan.distanceKm != null ? (
              <span className={styles.metaItem}>
                <Icon name="map-pin" size={12} aria-hidden="true" />
                {plan.distanceKm.toFixed(1)} km
              </span>
            ) : null}
          </div>

          <div className={styles.tags}>
            {plan.categories.slice(0, 2).map((category) => (
              <Badge variant="tag" key={category.id}>
                {category.name}
              </Badge>
            ))}
          </div>
        </div>
      </Link>

      {onDismiss ? (
        <div className={styles.dismissWrap}>
          <button
            type="button"
            className={styles.dismiss}
            onClick={handleDismiss}
            aria-label={`${RECOMMENDATIONS.dismiss.action}: ${plan.title}`}
          >
            <Icon name="x" size={15} aria-hidden="true" />
          </button>
          <span className={styles.dismissLabel} aria-hidden="true">
            {RECOMMENDATIONS.dismiss.action}
          </span>
        </div>
      ) : null}
    </li>
  );
}

function CardMedia({
  imageUrl,
  planId,
  sequence,
}: {
  imageUrl: string | null;
  planId: number;
  sequence: string;
}) {
  if (imageUrl) {
    return (
      <div className={styles.media}>
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(max-width: 760px) 82vw, 320px"
          className={styles.mediaPhoto}
          loading="lazy"
        />
        <span className={styles.sheen} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className={styles.media}
      style={{ background: gradientFor(planId) }}
    >
      {sequence ? (
        <p className={styles.mediaSequence}>
          <Icon name="route" size={14} aria-hidden="true" />
          <span className={styles.mediaSequenceText}>{sequence}</span>
        </p>
      ) : null}
      <span className={styles.sheen} aria-hidden="true" />
    </div>
  );
}
