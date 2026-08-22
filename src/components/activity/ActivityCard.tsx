import Image from "next/image";

import { Badge, Icon, Stars } from "@/components/ui";
import { formatArs } from "@/lib/utils";
import type { ActivitySearchResult } from "@/types";

import styles from "./activity.module.css";

export interface ActivityCardProps {
  activity: ActivitySearchResult;
}

const MOCK_IMAGES = [
  "/mock/coffee-142cbc1f.png",
  "/mock/pizza.png",
  "/mock/wine.png",
  "/mock/MARTINI@1-1920x1080.png",
  "/mock/camera.png",
];

// The catalog has no real photos yet: a deterministic mock keeps the same
// card showing the same placeholder across re-renders and page reloads.
function mockImageFor(activityId: number): string {
  return MOCK_IMAGES[activityId % MOCK_IMAGES.length];
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const visibleCategories = activity.categories.slice(0, 2);

  return (
    <article className={styles.card}>
      <div className={styles.imageWrapper}>
        <Image
          src={mockImageFor(activity.id)}
          alt=""
          fill
          sizes="(min-width: 900px) 33vw, (min-width: 600px) 50vw, 100vw"
          className={styles.image}
        />
      </div>

      <div className={styles.body}>
        <h3 className={`sp-h4 ${styles.name}`}>{activity.name}</h3>
        <p className={`sp-small ${styles.description}`}>
          {activity.description}
        </p>

        <div className={styles.ratingRow}>
          <Stars rating={activity.averageRating} />
          <span className="sp-small">{activity.averageRating.toFixed(1)}</span>
          <span className={`sp-small ${styles.ratingCount}`}>
            ({activity.ratingCount})
          </span>
        </div>

        <div className={styles.metaRow}>
          <Badge variant="cost">{formatArs(activity.estimatedCost)}</Badge>
          {visibleCategories.map((category) => (
            <Badge variant="tag" key={category.id}>
              {category.name}
            </Badge>
          ))}
          {activity.distanceKm != null ? (
            <span className={`sp-small ${styles.distance}`}>
              <Icon name="map-pin" size={14} />
              {activity.distanceKm.toFixed(1)} km
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
