"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

import { Badge, Icon, Stars } from "@/components/ui";
import { useFavorites } from "@/context";
import { activityDetailRoute } from "@/lib/routes";
import { formatArs, formatDuration, gradientFor } from "@/lib/utils";
import type { ActivitySearchResult } from "@/types";

import styles from "./activity.module.css";
// Card shell (`.card`, `.imageWrapper`, `.body`, `.name`, `.metaRow`,
// `.tagRow`, ...) is shared with `PlanCard` — see explore.module.css.
import exploreStyles from "../explore/explore.module.css";

export interface ActivityCardProps {
  activity: ActivitySearchResult;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const { isActivitySaved, toggleSaveActivity } = useFavorites();
  const saved = isActivitySaved(activity.id);
  const visibleCategories = activity.categories.slice(0, 2);

  const handleToggleSave = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSaveActivity(activity.id).catch(() => {
      // Optimistic rollback handled in FavoritesContext
    });
  };

  return (
    // No `aria-label` override: the card's own content (name, description,
    // cost, rating, distance) already gives a screen reader everything a
    // sighted user sees, and an explicit label would hide all of it behind
    // just the activity's name.
    <Link href={activityDetailRoute(activity.id)} className={exploreStyles.card}>
      <div
        className={exploreStyles.imageWrapper}
        style={{ background: gradientFor(activity.id) }}
      >
        <Icon name="route" size={40} className={exploreStyles.imagePlaceholder} />
        <button
          type="button"
          className={styles.cardBookmark}
          aria-pressed={saved}
          aria-label={saved ? "Quitar de guardados" : "Guardar actividad"}
          onClick={handleToggleSave}
        >
          <Icon
            name="bookmark"
            size={16}
            className={saved ? styles.cardBookmarkSaved : undefined}
          />
        </button>
      </div>

      <div className={exploreStyles.body}>
        <h3 className={exploreStyles.name}>{activity.name}</h3>
        <p className={styles.description}>{activity.description}</p>

        <div className={exploreStyles.metaRow}>
          <span className={exploreStyles.metaItem}>
            <Icon name="clock" size={12} />
            {formatDuration(activity.estimatedDuration)}
          </span>
          <Badge variant="cost">{formatArs(activity.estimatedCost)}</Badge>
          <span className={exploreStyles.metaItem}>
            <Stars rating={activity.averageRating} size={11} />
            {activity.averageRating.toFixed(1)}
          </span>
          {activity.distanceKm != null ? (
            <span className={exploreStyles.metaItem}>
              <Icon name="map-pin" size={12} />
              {activity.distanceKm.toFixed(1)} km
            </span>
          ) : null}
        </div>

        {/* Always rendered, even empty: pinned to the bottom of the card
            (`.body` is a flex column, this has `margin-top: auto`) so tags
            land in the same place across a row regardless of how many a
            card has, instead of trailing right after a shorter/longer
            description. */}
        <div className={exploreStyles.tagRow}>
          {visibleCategories.map((category) => (
            <Badge variant="tag" key={category.id}>
              {category.name}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}
