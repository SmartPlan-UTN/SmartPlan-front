import Link from "next/link";

import { Badge, Icon, Stars } from "@/components/ui";
import { planDetailRoute } from "@/lib/routes";
import { formatArs, formatDuration, gradientFor } from "@/lib/utils";
import type { PlanSearchResult } from "@/types";

import styles from "./plan.module.css";
// Card shell (`.card`, `.imageWrapper`, `.body`, `.name`, `.metaRow`,
// `.tagRow`, ...) is shared with `ActivityCard` — see explore.module.css.
import exploreStyles from "../explore/explore.module.css";

export interface PlanCardProps {
  plan: PlanSearchResult;
}

export function PlanCard({ plan }: PlanCardProps) {
  const visibleCategories = plan.categories.slice(0, 2);
  const routeSummary = plan.activityNames.join(" → ");

  return (
    // No `aria-label` override: the card's own content already gives a
    // screen reader everything a sighted user sees.
    <Link href={planDetailRoute(plan.id)} className={exploreStyles.card}>
      <div
        className={exploreStyles.imageWrapper}
        style={{ background: gradientFor(plan.id) }}
      >
        <Icon name="route" size={40} className={exploreStyles.imagePlaceholder} />
      </div>

      <div className={exploreStyles.body}>
        <h3 className={exploreStyles.name}>{plan.title}</h3>
        {/* One line, ellipsized — matches Results.jsx's uppercase chain
            caption ("BODEGA → ALMUERZO → DEGUSTACIÓN"). A long itinerary
            just shows as much as fits instead of wrapping the card taller
            than its neighbors. */}
        <p className={styles.chain} title={routeSummary}>
          {routeSummary}
        </p>

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

        {/* Always rendered: pinned to the bottom via `.tagRow`'s
            margin-top: auto, so tags land in the same place across a row
            regardless of how many a card has. */}
        <div className={exploreStyles.tagRow}>
          {visibleCategories.map((category) => (
            <Badge variant="tag" key={category.id}>
              {category.name}
            </Badge>
          ))}
        </div>

        {/* Decorative — the click affordance is the card-wide `Link` this
            sits inside, not this span (a real `<button>` can't nest inside
            an `<a>`), same reasoning as `PlanDetailView`'s `.stepDetailHint`.
            Matches `Results.jsx`'s `ResultCard` "Ver plan completo" CTA. */}
        <span className={styles.viewPlanButton}>Ver plan completo</span>
      </div>
    </Link>
  );
}
