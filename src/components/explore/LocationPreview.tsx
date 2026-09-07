"use client";

import { useMemo, useRef } from "react";

import { Icon } from "@/components/ui";
import { useGoogleMap } from "@/lib/maps/useGoogleMap";
import { googleMapsUrl } from "@/lib/utils";

import styles from "./explore.module.css";

export interface LocationPreviewProps {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  title: string;
}

type MapStatus = "loading" | "ready" | "unavailable";

/**
 * A small embedded Google Map centered on one location, with a marker and
 * a "Ver en Google Maps" link (CU14). Falls back to a decorative grid (the
 * placeholder ActivityDetail.jsx always uses) when there are no
 * coordinates to center on, or when the map fails to load — e.g. no
 * `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` configured — so a missing key never
 * shows a blank box.
 */
export function LocationPreview({
  latitude,
  longitude,
  address,
  title,
}: LocationPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasCoordinates = latitude != null && longitude != null;

  const options = useMemo<google.maps.MapOptions | null>(() => {
    if (latitude == null || longitude == null) return null;
    // Same plain options as the full CU16 map view — every default
    // control (zoom, map/satellite, street view) visible, not a
    // stripped-down embed.
    return { center: { lat: latitude, lng: longitude }, zoom: 15 };
  }, [latitude, longitude]);

  const { status: mapStatus } = useGoogleMap(containerRef, options, (map) => {
    if (options == null) return;
    new google.maps.Marker({ position: options.center, map, title });
  });

  const status: MapStatus = !hasCoordinates
    ? "unavailable"
    : mapStatus === "error"
      ? "unavailable"
      : mapStatus;

  return (
    <div className={styles.mapPreview}>
      {/* Always mounted, even before the map is ready: `google.maps.Map`
          needs a real DOM node to attach to, and this div only existing
          once `status === "ready"` was the actual bug — the map could
          never finish initializing because its own container never
          existed yet, so status never left "loading". */}
      <div ref={containerRef} className={styles.mapPreviewCanvas} />

      {status === "loading" ? (
        <div className={styles.mapPreviewLoading}>
          <span className={styles.mapPreviewDot} />
          <span className={styles.mapPreviewDot} />
          <span className={styles.mapPreviewDot} />
        </div>
      ) : null}

      {status === "unavailable" ? (
        <>
          <svg className={styles.mapPreviewGrid} aria-hidden="true">
            {Array.from({ length: 9 }, (_, index) => (
              <line
                key={`h${index}`}
                x1="0"
                y1={`${index * 11}%`}
                x2="100%"
                y2={`${index * 11}%`}
              />
            ))}
            {Array.from({ length: 12 }, (_, index) => (
              <line
                key={`v${index}`}
                x1={`${index * 9}%`}
                y1="0"
                x2={`${index * 9}%`}
                y2="100%"
              />
            ))}
          </svg>

          <div className={styles.mapPreviewPin}>
            <Icon name="map-pin" size={30} />
            {address ? (
              <span className={styles.mapPreviewAddress}>{address}</span>
            ) : null}
          </div>
        </>
      ) : null}

      {address ? (
        <a
          href={googleMapsUrl(latitude, longitude, address)}
          target="_blank"
          rel="noreferrer"
          className={styles.mapPreviewLink}
        >
          <Icon name="external-link" size={14} aria-hidden="true" />
          Ver en Google Maps
        </a>
      ) : null}
    </div>
  );
}
