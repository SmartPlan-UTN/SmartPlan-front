"use client";

import { useState, type ReactNode } from "react";

import { Icon } from "@/components/ui";
import { activityDetailRoute } from "@/lib/routes";
import { formatArs, formatDuration } from "@/lib/utils";
import { categoryLabel, localizeCatalogText } from "@/lib/utils/catalogLabels";

import styles from "./place.module.css";

/*
 * The pieces SmartPlan describes a place with, wherever it shows one: the
 * composer's Quick View and the plan map's stop card. Each surface lays them
 * out its own way; the vocabulary stays the same.
 */

/** "a 850 m" / "a 1,2 km": a server-measured distance from a search point. */
export function formatDistanceAway(km: number): string {
  if (km < 1) return `a ${Math.max(Math.round(km * 10) * 100, 100)} m`;
  return `a ${km.toLocaleString("es-AR", { maximumFractionDigits: 1 })} km`;
}

/** Stop number (it is in the route) or category, then the place's name. */
export function PlaceKicker({
  stopNumber,
  categoryName,
  placeName,
}: {
  stopNumber: number | null;
  categoryName: string | null;
  placeName: string | null;
}) {
  return (
    <div className={styles.kicker}>
      {stopNumber !== null ? (
        <span className={styles.stopBadge}>Parada {stopNumber}</span>
      ) : categoryName ? (
        <span className={styles.category}>{categoryLabel(categoryName)}</span>
      ) : null}
      {placeName ? (
        <span className={styles.place}>
          <Icon name="map-pin" size={12} aria-hidden="true" />
          {placeName}
        </span>
      ) : null}
    </div>
  );
}

/** Cost · duration · rating · distance; a duration not known yet reads "—". */
export function PlaceFacts({
  estimatedCost,
  estimatedDuration,
  averageRating,
  ratingCount,
  distanceKm = null,
}: {
  estimatedCost: number;
  estimatedDuration: number | null;
  averageRating: number;
  ratingCount?: number;
  distanceKm?: number | null;
}) {
  return (
    <p className={styles.facts}>
      <span>{formatArs(estimatedCost)}</span>
      <span className={estimatedDuration === null ? styles.pending : ""}>
        {estimatedDuration === null ? "—" : formatDuration(estimatedDuration)}
      </span>
      {averageRating > 0 ? (
        <span className={styles.rating}>
          <Icon name="star" size={12} aria-hidden="true" />
          {averageRating.toLocaleString("es-AR", { maximumFractionDigits: 1 })}
          {ratingCount ? (
            <span className={styles.pending}>
              {" "}
              ({ratingCount.toLocaleString("es-AR")})
            </span>
          ) : null}
        </span>
      ) : null}
      {distanceKm !== null ? <span>{formatDistanceAway(distanceKm)}</span> : null}
    </p>
  );
}

/** Why the assistant picked it, in its words. */
export function PlaceReason({ reason }: { reason: string | null }) {
  if (!reason) return null;
  return (
    <p className={styles.reason}>
      <Icon name="sparkles" size={12} aria-hidden="true" />
      {localizeCatalogText(reason)}
    </p>
  );
}

/** A straight leg to another stop, drawn as the map's dashed stroke. */
export function PlaceLeg({ children }: { children: ReactNode }) {
  return (
    <p className={styles.leg}>
      <span className={styles.legLine} aria-hidden="true" />
      {children}
    </p>
  );
}

/** The activity's own words, clamped to a few lines when long. */
export function PlaceDescription({
  text,
  clampAt = 260,
}: {
  text: string;
  clampAt?: number;
}) {
  const [open, setOpen] = useState(false);
  const trimmed = text.trim();
  if (!trimmed) return null;
  const long = trimmed.length > clampAt;
  return (
    <>
      <p
        className={`${styles.description} ${long && !open ? styles.clamped : ""}`}
      >
        {trimmed}
      </p>
      {long ? (
        <button
          type="button"
          className={styles.readMore}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Leer menos" : "Leer más"}
        </button>
      ) : null}
    </>
  );
}

/** Where it happens: the place and its address, when known. */
export function PlaceWhere({
  placeName,
  address,
}: {
  placeName: string | null;
  address: string | null;
}) {
  if (!placeName && !address) return null;
  return (
    <p className={styles.where}>
      <Icon name="map-pin" size={15} aria-hidden="true" />
      {placeName ? <strong>{placeName}</strong> : null}
      {address && address !== placeName ? <span>{address}</span> : null}
    </p>
  );
}

/** The full page, in another tab: the draft is never left behind. */
export function PlaceDetailLink({
  activityId,
  label = "Ver ficha",
}: {
  activityId: number;
  label?: string;
}) {
  return (
    <a
      className={styles.secondary}
      href={activityDetailRoute(activityId)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
      <Icon name="external-link" size={13} aria-hidden="true" />
      <span className={styles.srOnly}> (se abre en otra pestaña)</span>
    </a>
  );
}

export function PlaceCloseButton({
  label,
  onClose,
}: {
  label: string;
  onClose: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.close}
      aria-label={label}
      onClick={onClose}
    >
      <Icon name="x" size={16} aria-hidden="true" />
    </button>
  );
}
