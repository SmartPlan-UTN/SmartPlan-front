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
export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const { plan, reason } = recommendation;
  const sequence = plan.activityNames.join(" → ");

  return (
    <li className={styles.card}>
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
      </div>
    );
  }

  return (
    <div
      className={styles.media}
      style={{ background: gradientFor(planId) }}
    >
      <Icon
        name="route"
        size={28}
        className={styles.mediaGlyph}
        aria-hidden="true"
      />
      {sequence ? <p className={styles.mediaSequence}>{sequence}</p> : null}
    </div>
  );
}
