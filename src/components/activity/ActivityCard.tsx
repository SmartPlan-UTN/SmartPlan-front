import { Badge, Icon, Stars } from "@/components/ui";
import { formatArs, formatDuration } from "@/lib/utils";
import type { ActivitySearchResult } from "@/types";

import styles from "./activity.module.css";

export interface ActivityCardProps {
  activity: ActivitySearchResult;
}

// Warm pastel gradients, ported verbatim from the IMG_GRADS palette in
// SmartPlanSystemDesign/v2/Results.jsx. The catalog has no real photos yet:
// a deterministic pick keeps the same card showing the same tile across
// re-renders and page reloads. No emoji on top (brand voice forbids them);
// a muted icon stands in for "no photo yet" instead.
const IMAGE_GRADIENTS = [
  "linear-gradient(155deg, #F2D9C8, #EDE0D0)",
  "linear-gradient(155deg, #C8D8F2, #D8E4F0)",
  "linear-gradient(155deg, #D0C8F2, #DDD8F0)",
  "linear-gradient(155deg, #C8E8D4, #D4EDE0)",
  "linear-gradient(155deg, #F2C8D8, #F0D4E0)",
  "linear-gradient(155deg, #F2ECC8, #EFEAD0)",
];

function gradientFor(activityId: number): string {
  return IMAGE_GRADIENTS[activityId % IMAGE_GRADIENTS.length];
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const visibleCategories = activity.categories.slice(0, 2);

  return (
    <article className={styles.card}>
      <div
        className={styles.imageWrapper}
        style={{ background: gradientFor(activity.id) }}
      >
        <Icon name="image" size={40} className={styles.imagePlaceholder} />
      </div>

      <div className={styles.body}>
        <h3 className={styles.name}>{activity.name}</h3>
        <p className={styles.description}>{activity.description}</p>

        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <Icon name="clock" size={12} />
            {formatDuration(activity.estimatedDuration)}
          </span>
          <Badge variant="cost">{formatArs(activity.estimatedCost)}</Badge>
          <span className={styles.metaItem}>
            <Stars rating={activity.averageRating} size={11} />
            {activity.averageRating.toFixed(1)}
          </span>
          {activity.distanceKm != null ? (
            <span className={styles.metaItem}>
              <Icon name="map-pin" size={12} />
              {activity.distanceKm.toFixed(1)} km
            </span>
          ) : null}
        </div>

        {visibleCategories.length > 0 ? (
          <div className={styles.tagRow}>
            {visibleCategories.map((category) => (
              <Badge variant="tag" key={category.id}>
                {category.name}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
