"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import { PlaceMedia } from "@/components/media";
import { placePriceReferenceText } from "@/components/media/PlacePriceReference";
import { ratingAccessibleText } from "@/components/media/RatingBadge";
import {
  activitySubtypePresentation,
  placeKindPresentation,
} from "@/lib/catalog/taxonomy";
import { activityDetailRoute, placeDetailRoute } from "@/lib/routes";
import { formatPrice, isPriceUnknown } from "@/lib/utils";
import type { ExploreMapMarker } from "@/types";

import styles from "./explore.module.css";

/** Rating line shared with the cards: SmartPlan, else attributed Google. */
function ratingLine(marker: ExploreMapMarker): string {
  const text = ratingAccessibleText({
    averageRating: marker.itemType === "ACTIVITY" ? marker.averageRating : null,
    ratingCount: marker.itemType === "ACTIVITY" ? (marker.ratingCount ?? 0) : 0,
    externalRating: marker.place?.externalRating ?? null,
  });
  return text === "Sin reseñas" ? text : `★ ${text}`;
}

function priceLine(marker: ExploreMapMarker): string | null {
  if (marker.itemType === "ACTIVITY" && !isPriceUnknown(marker)) {
    return formatPrice(marker);
  }
  const reference = placePriceReferenceText(marker.place?.externalPrice);
  return reference ? `Ref. Google Maps: ${reference}` : null;
}

/**
 * What opens when a map marker is clicked: the photo (same sources and
 * credits as the Explore cards), the essentials, and the whole card leads
 * to the activity or place.
 */
export function MapMarkerCard({ marker }: { marker: ExploreMapMarker }) {
  const router = useRouter();
  const isActivity = marker.itemType === "ACTIVITY";
  const href = isActivity
    ? activityDetailRoute(marker.activityId)
    : placeDetailRoute(marker.placeId);
  const kicker = isActivity
    ? [marker.typeLabel, marker.placeName].filter(Boolean).join(" · ")
    : [marker.kindLabel, marker.place?.department].filter(Boolean).join(" · ");
  const artwork = isActivity
    ? activitySubtypePresentation(marker.type).icon !== "map-pin"
      ? activitySubtypePresentation(marker.type)
      : placeKindPresentation(marker.place?.kind)
    : placeKindPresentation(marker.kind);

  // The photo's credit links must keep working; anywhere else on the photo
  // opens the detail, like the text below it.
  function openFromMedia(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("a")) return;
    router.push(href);
  }

  return (
    <article className={styles.mapCard}>
      <div className={styles.mapCardMedia} onClick={openFromMedia}>
        <PlaceMedia
          place={marker.place}
          alt={marker.name}
          artwork={{
            family: artwork.family,
            icon: artwork.icon,
            label: isActivity ? (marker.typeLabel ?? null) : marker.kindLabel,
          }}
          screen="explore-map"
        />
      </div>
      <Link href={href} className={styles.mapCardBody}>
        {kicker ? <span className={styles.mapCardKicker}>{kicker}</span> : null}
        <strong className={styles.mapCardTitle}>{marker.name}</strong>
        <span className={styles.mapCardMeta}>
          {[priceLine(marker), ratingLine(marker)].filter(Boolean).join(" · ")}
        </span>
        <span className={styles.mapCardAction}>
          {isActivity ? "Ver actividad" : "Ver lugar"} →
        </span>
      </Link>
    </article>
  );
}
