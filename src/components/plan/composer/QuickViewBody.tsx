"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

import {
  PlaceCloseButton,
  PlaceDetailLink,
  PlaceLeg,
  PlaceReason,
} from "@/components/activity/inspect/PlaceParts";
import { AuthenticatedImage } from "@/components/media";
import { Icon } from "@/components/ui";
import { formatArs, formatDuration } from "@/lib/utils";
import { categoryLabel } from "@/lib/utils/catalogLabels";
import type { ActivityDetailResult, ActivitySearchResult } from "@/types";

import { summaryFromDetail } from "./mapPoints";
import type { MiniMapStop } from "./PlaceMiniMap";
import { distanceKm, formatLeg, type Coords } from "./routeDistance";
import { useActivityDetail } from "./useStopInfo";
import styles from "./QuickViewBody.module.css";

const PlaceMiniMap = dynamic(
  () => import("./PlaceMiniMap").then((module) => module.PlaceMiniMap),
  { ssr: false, loading: () => <div className={styles.mapPending} /> },
);

/** What is known about the activity before its detail arrives. */
export interface QuickViewSubject {
  activityId: number;
  /** The catalog's summary, when the list or the assistant carried it. */
  summary: ActivitySearchResult | null;
  name: string;
  categoryName: string | null;
  estimatedCost: number;
  /** A map marker knows its place before the detail does. */
  placeName: string | null;
  /** Measured by the server from the search's location. */
  distanceKm: number | null;
  /** Why the assistant picked it, in its words. */
  reason: string | null;
}

/** What the Quick View needs to start with, from a catalog summary. */
export function subjectFromActivity(
  activity: ActivitySearchResult,
  reason: string | null = null,
): QuickViewSubject {
  return {
    activityId: activity.id,
    summary: activity,
    name: activity.name,
    categoryName: activity.categories[0]?.name ?? null,
    estimatedCost: activity.estimatedCost,
    placeName: null,
    distanceKm: activity.distanceKm,
    reason,
  };
}

export interface QuickViewRoute {
  /** The route's located stops, numbered like the route. */
  stops: MiniMapStop[];
  /** The last stop, where a new one would follow from. */
  last: { name: string; coords: Coords } | null;
}

interface QuickViewBodyProps {
  subject: QuickViewSubject;
  stopNumber: number | null;
  route: QuickViewRoute;
  /** In the list: a small map of where it is. The map card needs none. */
  showMiniMap: boolean;
  /**
   * Opened inside its own catalog row, which already shows the name and the
   * facts: only what the row does not say is repeated here.
   */
  inline?: boolean;
  titleId: string;
  disabled: boolean;
  /** Shown by containers that need their own close (map card, sheet). */
  onClose?: () => void;
  onAdd: (activity: ActivitySearchResult) => void;
  onRemove: (activityId: number) => void;
}

/**
 * Whether the activity's own page shows something this preview leaves out.
 * The page (ActivityDetailView) is its photo gallery, its ratings, every
 * meeting point and the whole description; each counts only with content.
 */
export function detailPageExtras(
  detail: ActivityDetailResult | null | undefined,
  { descriptionClamped, thumbnailShown }: {
    descriptionClamped: boolean;
    thumbnailShown: boolean;
  },
): boolean {
  if (!detail) return false;
  const photos = detail.images?.length ?? 0;
  return (
    photos > (thumbnailShown ? 1 : 0) ||
    detail.ratingCount > 0 ||
    detail.locations.length > 1 ||
    descriptionClamped
  );
}

/**
 * A glance at an activity, the same wherever it opens (a row, a marker, a
 * phone's sheet): what it is, where it is, and the one decision it asks for.
 * Real catalog data only; distances are straight lines computed here.
 */
export function QuickViewBody({
  subject,
  stopNumber,
  route,
  showMiniMap,
  inline = false,
  titleId,
  disabled,
  onClose,
  onAdd,
  onRemove,
}: QuickViewBodyProps) {
  const detail = useActivityDetail(subject.activityId);
  // The catalog's own detail wins once it is here: a stop of a plan being
  // edited carries a trimmed summary (no categories, no ratings).
  const facts = detail
    ? summaryFromDetail(detail, subject.distanceKm ?? null)
    : subject.summary;
  const added = stopNumber !== null;

  const location =
    detail?.locations.find((item) => item.latitude !== null) ??
    detail?.locations[0] ??
    null;
  const latitude = location?.latitude ?? null;
  const longitude = location?.longitude ?? null;
  const place = useMemo<Coords | null>(
    () =>
      latitude !== null && longitude !== null ? { latitude, longitude } : null,
    [latitude, longitude],
  );
  const placeName = location?.place.name || subject.placeName;
  const address =
    location?.place.address && location.place.address !== placeName
      ? location.place.address
      : null;

  const image = facts?.imageUrl ?? detail?.images?.[0]?.url ?? null;
  const description = (detail?.description ?? facts?.description ?? "").trim();
  const categoryName = facts?.categories[0]?.name ?? subject.categoryName;
  const rating =
    facts && facts.ratingCount > 0 ? facts.averageRating : null;

  const leg =
    !added && place && route.last
      ? {
          label: formatLeg(distanceKm(route.last.coords, place)),
          from: route.last.name,
        }
      : null;

  // "Ver ficha completa" depends on whether the description really was cut.
  const [clamped, setClamped] = useState(false);
  const measureDescription = (element: HTMLParagraphElement | null) => {
    if (!element) return;
    const cut = element.scrollHeight > element.clientHeight + 1;
    if (cut !== clamped) setClamped(cut);
  };
  const showDetailLink = detailPageExtras(detail, {
    descriptionClamped: clamped,
    thumbnailShown: image !== null,
  });

  const source: ActivitySearchResult | null = facts
    ? { ...facts, distanceKm: subject.distanceKm ?? facts.distanceKm }
    : null;

  return (
    <div className={styles.body}>
      {inline ? (
        rating !== null && facts ? (
          <p className={styles.facts}>
            <span className={styles.rating}>
              <Icon name="star" size={12} aria-hidden="true" />
              {rating.toLocaleString("es-AR", { maximumFractionDigits: 1 })}{" "}
              <span className={styles.pending}>
                ({facts.ratingCount.toLocaleString("es-AR")}{" "}
                {facts.ratingCount === 1 ? "valoración" : "valoraciones"})
              </span>
            </span>
          </p>
        ) : null
      ) : (
        <header className={styles.head}>
          {image ? (
            <span className={styles.thumb}>
              <AuthenticatedImage url={image} alt="" width={112} height={112} />
            </span>
          ) : null}
          <div className={styles.titleBlock}>
            <h3 id={titleId} className={styles.title}>
              {subject.name}
            </h3>
            <p className={styles.facts}>
              {categoryName ? <span>{categoryLabel(categoryName)}</span> : null}
              <span className={facts ? undefined : styles.pending}>
                {facts ? formatDuration(facts.estimatedDuration) : "—"}
              </span>
              <span>{formatArs(facts?.estimatedCost ?? subject.estimatedCost)}</span>
              {rating !== null ? (
                <span className={styles.rating}>
                  <Icon name="star" size={12} aria-hidden="true" />
                  {rating.toLocaleString("es-AR", { maximumFractionDigits: 1 })}
                </span>
              ) : null}
            </p>
          </div>
          {onClose ? (
            <PlaceCloseButton label="Cerrar detalles" onClose={onClose} />
          ) : null}
        </header>
      )}

      <PlaceReason reason={subject.reason} />

      {description ? (
        <p ref={measureDescription} className={styles.description}>
          {description}
        </p>
      ) : detail === undefined ? (
        <p className={styles.loading} aria-hidden="true">
          <span />
          <span />
        </p>
      ) : null}

      {placeName ? (
        <p className={styles.where}>
          <Icon name="map-pin" size={14} aria-hidden="true" />
          <strong>{placeName}</strong>
          {address ? <span>{address}</span> : null}
        </p>
      ) : null}

      {showMiniMap && place ? (
        <figure className={styles.mapFigure}>
          <PlaceMiniMap
            place={place}
            name={subject.name}
            stopNumber={stopNumber}
            stops={route.stops}
            from={route.last?.coords ?? null}
          />
          {leg ? (
            <figcaption>
              <PlaceLeg>
                {leg.label} en línea recta desde {leg.from}
              </PlaceLeg>
            </figcaption>
          ) : null}
        </figure>
      ) : leg ? (
        <PlaceLeg>
          {leg.label} en línea recta desde {leg.from}
        </PlaceLeg>
      ) : null}

      {detail === null ? (
        <p className={styles.note} role="status">
          No pudimos cargar más datos de esta actividad.
        </p>
      ) : null}

      <footer className={styles.actions}>
        {added ? (
          <>
            <p className={styles.inRoute}>
              <Icon name="check" size={15} aria-hidden="true" />
              Parada {stopNumber} en tu recorrido
            </p>
            <button
              type="button"
              className={styles.remove}
              aria-label={`Quitar ${subject.name} del recorrido`}
              disabled={disabled}
              onClick={() => onRemove(subject.activityId)}
            >
              Quitar
            </button>
          </>
        ) : (
          <button
            type="button"
            className={styles.add}
            disabled={disabled || source === null}
            onClick={() => {
              if (source) onAdd(source);
            }}
          >
            <Icon name="plus" size={16} aria-hidden="true" />
            Sumar al recorrido
          </button>
        )}
        {showDetailLink ? (
          <PlaceDetailLink
            activityId={subject.activityId}
            label="Ver ficha completa"
          />
        ) : null}
      </footer>
    </div>
  );
}
