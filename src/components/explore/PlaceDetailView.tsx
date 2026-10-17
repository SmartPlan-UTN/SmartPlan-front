"use client";

import { useRef } from "react";
import Link from "next/link";

import { GooglePlaceContext, PlaceMedia, RatingBadge } from "@/components/media";
import { Badge, FloatingBackLink, Icon, LoadingDots } from "@/components/ui";
import { useDetailFetch } from "@/hooks";
import { getPlaceDetail } from "@/lib/api";
import { placeKindPresentation } from "@/lib/catalog/taxonomy";
import { activityDetailRoute, ROUTES } from "@/lib/routes";
import { formatDuration, formatPrice } from "@/lib/utils";
import type { PlaceDetailResult } from "@/types";

import { LocationPreview } from "./LocationPreview";
import activityStyles from "../activity/activity.module.css";
import styles from "./explore.module.css";

const GENERIC_ERROR = "No pudimos cargar el lugar. Intentá de nuevo.";

/** A Google Maps link built from the identity link SmartPlan may keep. */
function googleMapsUrl(name: string, googlePlaceId: string): string {
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", name);
  url.searchParams.set("query_place_id", googlePlaceId);
  return url.toString();
}

/**
 * A place's page: what it is, where it is, its live attributed context, and
 * the real activities SmartPlan knows happen there. A place without verified
 * activities says so plainly instead of inventing one.
 */
export function PlaceDetailView({ placeId }: { placeId: number }) {
  const { data: place, status, errorMessage } = useDetailFetch<PlaceDetailResult>(
    getPlaceDetail,
    placeId,
    GENERIC_ERROR,
  );
  const heroRef = useRef<HTMLDivElement>(null);

  if (status === "loading") {
    return (
      <div className={activityStyles.stateBlock}>
        <LoadingDots label="Cargando el lugar..." />
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className={activityStyles.stateBlock}>
        <Icon name="inbox" size={32} className={activityStyles.stateIcon} />
        <h1 className="sp-h3">No encontramos este lugar</h1>
        <Link href={ROUTES.explore} className={activityStyles.backLink}>
          <Icon name="arrow-left" size={14} aria-hidden="true" />
          Volver a explorar
        </Link>
      </div>
    );
  }

  if (status === "error" || place == null) {
    return (
      <div className={activityStyles.stateBlock} role="alert">
        <Icon name="triangle-alert" size={32} className={activityStyles.errorIcon} />
        <h1 className="sp-h3">Algo salió mal</h1>
        <p className="sp-body">{errorMessage}</p>
      </div>
    );
  }

  const summary = place.summary;
  const presentation = placeKindPresentation(place.kind);

  return (
    <div className={styles.placeDetail}>
      <FloatingBackLink href={ROUTES.explore} label="Volver" heroRef={heroRef} />

      <div ref={heroRef}>
        <PlaceMedia
          variant="hero"
          place={summary}
          alt={`Foto de ${place.name}`}
          artwork={{
            family: presentation.family,
            icon: presentation.icon,
            label: place.kindLabel,
          }}
        />
      </div>

      <div className={activityStyles.titleBlock}>
        <div className={activityStyles.badgeRow}>
          {place.kindLabel ? <Badge variant="tag">{place.kindLabel}</Badge> : null}
          <RatingBadge externalRating={summary?.externalRating} size={12} />
        </div>
        <h1 className={activityStyles.title}>{place.name}</h1>
        <p className={activityStyles.placeLine}>
          {[place.address, place.department.name].filter(Boolean).join(" · ")}
        </p>
        <GooglePlaceContext rating={null} price={summary?.externalPrice} />
        {summary?.googlePlaceId ? (
          <p className={styles.placeMapsLink}>
            <a
              href={googleMapsUrl(place.name, summary.googlePlaceId)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="external-link" size={13} aria-hidden="true" /> Ver en Google
              Maps (horarios, cómo llegar)
            </a>
          </p>
        ) : null}
      </div>

      {place.description ? (
        <div className={activityStyles.section}>
          <p className={activityStyles.sectionLabel}>sobre el lugar</p>
          <p className="sp-body">{place.description}</p>
        </div>
      ) : null}

      <div className={activityStyles.section}>
        <p className={activityStyles.sectionLabel}>qué hacer acá</p>
        {place.activities.length > 0 ? (
          <ul className={styles.placeActivities}>
            {place.activities.map((activity) => (
              <li key={activity.id}>
                <Link href={activityDetailRoute(activity.id)}>
                  <strong>{activity.name}</strong>
                  <span>
                    {[
                      activity.typeLabel,
                      formatDuration(activity.estimatedDuration),
                      formatPrice({ estimatedCost: null, price: activity.price }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.placeNoActivities}>
            Todavía no tenemos una actividad verificada en este lugar (por
            ejemplo, una visita o degustación con horario y precio). Podés
            conocerlo igual: confirmá horarios y reservas con el lugar.
          </p>
        )}
      </div>

      {summary && summary.latitude !== null && summary.longitude !== null ? (
        <div className={activityStyles.section}>
          <p className={activityStyles.sectionLabel}>ubicación</p>
          <LocationPreview
            latitude={summary.latitude}
            longitude={summary.longitude}
            address={place.address}
            title={place.name}
          />
        </div>
      ) : null}
    </div>
  );
}
