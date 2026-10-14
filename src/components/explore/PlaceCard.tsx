"use client";

import Link from "next/link";

import { Badge, Icon } from "@/components/ui";
import { PlaceMedia, PlacePriceReference, RatingBadge } from "@/components/media";
import { categoryPresentation } from "@/components/preferences/categoryPresentation";
import { placeKindPresentation } from "@/lib/catalog/taxonomy";
import { placeDetailRoute } from "@/lib/routes";
import type { ExplorePlaceItem } from "@/types";

import styles from "./explore.module.css";

/**
 * A real place SmartPlan has no verified activity for yet. It is shown as
 * what it is (a winery, a park, a café...) with its live, attributed context,
 * and is never presented as something to add to a plan.
 */
export function PlaceCard({ item }: { item: ExplorePlaceItem }) {
  const presentation = placeKindPresentation(item.kind);
  const place = item.place;

  return (
    <article className={styles.card} data-catalog-card>
        <PlaceMedia
          place={place}
          alt={item.name}
          artwork={{
            family: presentation.family,
            icon: presentation.icon,
            label: item.kindLabel,
          }}
        />
      <Link href={placeDetailRoute(item.id)} className={styles.cardContent}>
        <div className={styles.body}>
          <p className={styles.kicker}>
            {[item.kindLabel, place.department].filter(Boolean).join(" · ")}
          </p>
          <h3 className={styles.name}>{item.name}</h3>
          {item.description ? (
            <p className={styles.placeDescription}>{item.description}</p>
          ) : (
            <p className={styles.placeAddress}>
              <Icon name="map-pin" size={12} aria-hidden="true" /> {place.address}
            </p>
          )}

          <div className={styles.metaRow}>
            <RatingBadge externalRating={place.externalRating} />
            {item.distanceKm != null ? (
              <span className={styles.metaItem}>
                <Icon name="map-pin" size={12} />
                {item.distanceKm.toFixed(1)} km
              </span>
            ) : null}
          </div>
          <PlacePriceReference price={place.externalPrice} />

          <div className={styles.tagRow}>
            <Badge variant="tag">Lugar para conocer</Badge>
            {item.categories.slice(0, 1).map((category) => (
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
    </article>
  );
}
