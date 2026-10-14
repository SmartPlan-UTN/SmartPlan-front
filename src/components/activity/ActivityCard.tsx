"use client";

import Link from "next/link";

import { Badge, Icon } from "@/components/ui";
import { PlaceMedia, PlacePriceReference, RatingBadge } from "@/components/media";
import { useFavorites } from "@/context";
import { categoryPresentation } from "@/components/preferences/categoryPresentation";
import { activityDetailRoute } from "@/lib/routes";
import {
  activitySubtypePresentation,
  placeKindPresentation,
  seasonLabel,
} from "@/lib/catalog/taxonomy";
import { formatDuration, formatPrice, isPriceUnknown } from "@/lib/utils";
import type { ActivitySearchResult } from "@/types";

import styles from "./activity.module.css";
// Card shell (`.card`, `.imageWrapper`, `.body`, `.name`, `.metaRow`,
// `.tagRow`, ...) is shared with `PlanCard` — see explore.module.css.
import exploreStyles from "../explore/explore.module.css";

export interface ActivityCardProps {
  activity: Omit<ActivitySearchResult, "averageRating" | "ratingCount"> &
    Partial<Pick<ActivitySearchResult, "averageRating" | "ratingCount">>;
  isSaved?: boolean;
  onSavedChange?: (saved: boolean) => void;
}

export function ActivityCard({
  activity,
  isSaved: controlledSaved,
  onSavedChange,
}: ActivityCardProps) {
  const { isActivitySaved, setActivitySaved, toggleSaveActivity } = useFavorites();
  const saved = controlledSaved ?? isActivitySaved(activity.id);
  const visibleCategories = activity.categories.slice(0, 2);
  const place = activity.place ?? null;
  const subtype = activitySubtypePresentation(activity.type);
  const artwork =
    subtype.family !== "other" ? subtype : placeKindPresentation(place?.kind);
  const unknownPrice = isPriceUnknown(activity);
  const season = activity.inSeason === false ? seasonLabel(activity.availableMonths) : null;

  const handleToggleSave = () => {
    const nextSaved = !saved;
    onSavedChange?.(nextSaved);

    const request =
      controlledSaved === undefined
        ? toggleSaveActivity(activity.id)
        : setActivitySaved(activity.id, nextSaved);

    request.catch(() => {
      onSavedChange?.(saved);
    });
  };

  return (
    // No `aria-label` override: the card's own content (name, description,
    // cost, rating, distance) already gives a screen reader everything a
    // sighted user sees, and an explicit label would hide all of it behind
    // just the activity's name.
    <article className={exploreStyles.card} data-catalog-card>
        <PlaceMedia
          ownImageUrl={activity.imageUrl}
          place={place}
          alt={activity.name}
          artwork={{
            family: artwork.family,
            icon: artwork.icon,
            label: activity.typeLabel ?? place?.kindLabel ?? null,
          }}
        />
      <Link
        href={activityDetailRoute(activity.id)}
        className={exploreStyles.cardContent}
      >
        <div className={exploreStyles.body}>
          {activity.typeLabel || place ? (
            <p className={exploreStyles.kicker}>
              {[activity.typeLabel, place?.department]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          <h3 className={exploreStyles.name}>{activity.name}</h3>
          <p className={styles.description}>{activity.description}</p>

          <div className={exploreStyles.metaRow}>
            <span className={exploreStyles.metaItem}>
              <Icon name="clock" size={12} />
              {formatDuration(activity.estimatedDuration)}
            </span>
            <Badge variant="cost">{formatPrice(activity)}</Badge>
            <RatingBadge
              averageRating={activity.averageRating}
              ratingCount={activity.ratingCount}
              externalRating={place?.externalRating}
            />
            {activity.distanceKm != null ? (
              <span className={exploreStyles.metaItem}>
                <Icon name="map-pin" size={12} />
                {activity.distanceKm.toFixed(1)} km
              </span>
            ) : null}
          </div>
          {unknownPrice ? <PlacePriceReference price={place?.externalPrice} /> : null}
          {season ? (
            <p className={exploreStyles.seasonNote}>
              <Icon name="calendar" size={12} aria-hidden="true" /> Temporada: {season}
            </p>
          ) : null}

          {/* Always rendered, even empty: pinned to the bottom of the card
              (`.body` is a flex column, this has `margin-top: auto`) so tags
              land in the same place across a row regardless of how many a
              card has, instead of trailing right after a shorter/longer
              description. */}
          <div className={exploreStyles.tagRow}>
            {visibleCategories.map((category) => (
              <Badge variant="tag" key={category.id}>
                {
                  categoryPresentation({
                    id: category.id,
                    name: category.name,
                    description: null,
                  }).label
                }
              </Badge>
            ))}
          </div>
        </div>
      </Link>

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
    </article>
  );
}
