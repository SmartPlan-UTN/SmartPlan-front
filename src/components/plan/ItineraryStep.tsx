import Link from "next/link";

import { Badge, Icon, Stars } from "@/components/ui";
import { activityDetailRoute } from "@/lib/routes";
import { formatArs, formatDuration, googleMapsUrl } from "@/lib/utils";
import type { PlanItineraryItem } from "@/types";

import styles from "./plan.module.css";

/**
 * One stop of a plan's timeline itinerary (CU13), shared by the plan detail
 * and an outing's detail (#130).
 */
export function ItineraryStep({
  detail,
  isFirst,
  isLast,
}: {
  detail: PlanItineraryItem;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { activity } = detail;
  const location = activity.locations[0] ?? null;
  const categoryLabel =
    activity.categories.length > 0
      ? activity.categories.map((category) => category.name).join(" · ")
      : null;

  return (
    <div className={styles.stepRow}>
      <div className={styles.stepTimeline}>
        <span
          className={`${styles.stepLine} ${!isFirst ? styles.stepLineVisible : ""}`}
        />
        <span className={styles.stepBadge}>{detail.order}</span>
        <span
          className={`${styles.stepLine} ${!isLast ? styles.stepLineVisible : ""}`}
        />
      </div>

      {/* The whole card is a target — matches PlanDetail.jsx's
          card-wide onClick — via a stretched `Link` overlay instead of a
          click handler on a `<div>`, so it stays keyboard- and
          screen-reader-accessible. "Ver en mapa", a real external link,
          sits above the overlay so it keeps its own click. */}
      <div className={styles.stepCard}>
        <Link
          href={activityDetailRoute(activity.id)}
          className={styles.stepStretchedLink}
          aria-label={`Ver ${activity.name}`}
        />

        <div>
          <div className={styles.stepBadgeRow}>
            {categoryLabel ? <Badge variant="tag">{categoryLabel}</Badge> : null}
            <span className={styles.stepRating}>
              <Stars rating={activity.averageRating} size={11} />
              <span>{activity.averageRating.toFixed(1)}</span>
            </span>
          </div>

          <p className={styles.stepName}>{activity.name}</p>

          <div className={styles.stepMetaRow}>
            {location ? (
              <span className={styles.stepMetaItem}>
                <Icon name="map-pin" size={13} />
                {location.place.address}
              </span>
            ) : null}
            <span className={styles.stepMetaItem}>
              <Icon name="clock" size={13} />
              {formatDuration(detail.estimatedDuration)}
            </span>
          </div>
        </div>

        <div className={styles.stepActions}>
          <p className={styles.stepCost}>{formatArs(detail.estimatedCost)}</p>

          <div className={styles.stepLinks}>
            {location ? (
              <a
                href={googleMapsUrl(
                  location.latitude,
                  location.longitude,
                  location.place.address,
                )}
                target="_blank"
                rel="noreferrer"
                className={styles.stepMapLink}
              >
                <Icon name="map-pin" size={13} aria-hidden="true" />
                Ver en mapa
              </a>
            ) : null}
            <span className={styles.stepDetailHint}>
              Ver detalle
              <Icon name="chevron-right" size={12} aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
