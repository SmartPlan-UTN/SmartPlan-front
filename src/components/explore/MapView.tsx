"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { activityDetailRoute } from "@/lib/routes";
import { getActivityMapMarkers } from "@/lib/api";
import { formatArs } from "@/lib/utils";
import { useGoogleMap } from "@/lib/maps/useGoogleMap";
import type { ActivityMapMarker, ActivitySearchParams } from "@/types";

import styles from "./explore.module.css";

// Mendoza, the product's default location (see skills/06-design-system).
const DEFAULT_CENTER = { lat: -32.8895, lng: -68.8458 };
const DEFAULT_ZOOM = 12;
const MAP_OPTIONS: google.maps.MapOptions = {
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
};

function buildMarkerInfoContent(markerData: ActivityMapMarker): HTMLElement {
  const container = document.createElement("div");
  container.style.maxWidth = "220px";
  container.style.fontFamily = "inherit";

  const title = document.createElement("strong");
  title.textContent = markerData.name;

  const place = document.createElement("p");
  place.textContent = markerData.placeName;
  place.style.margin = "4px 0";

  const meta = document.createElement("p");
  meta.textContent = `${formatArs(markerData.estimatedCost)} · ${markerData.averageRating.toFixed(1)}★`;
  meta.style.margin = "0 0 4px";

  const link = document.createElement("a");
  link.href = activityDetailRoute(markerData.activityId);
  link.textContent = "Ver actividad";

  container.append(title, place, meta, link);
  return container;
}

/** Reads the same filters `ActivitySearch` sends over as `?search=&categoryIds=&...` so the map shows the same subset the user was just browsing, instead of silently ignoring them. */
function readFiltersFromSearchParams(
  searchParams: URLSearchParams,
): Partial<ActivitySearchParams> {
  const search = searchParams.get("search") ?? undefined;
  const categoryIdsRaw = searchParams.get("categoryIds");
  const categoryIds = categoryIdsRaw
    ? categoryIdsRaw
        .split(",")
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id))
    : undefined;
  const minPriceRaw = searchParams.get("minPrice");
  const maxPriceRaw = searchParams.get("maxPrice");
  const minRatingRaw = searchParams.get("minRating");
  const cityIdRaw = searchParams.get("cityId");
  const departmentIdRaw = searchParams.get("departmentId");
  const cityId = cityIdRaw ? Number(cityIdRaw) : undefined;
  const departmentId = departmentIdRaw ? Number(departmentIdRaw) : undefined;

  return {
    search,
    categoryIds: categoryIds && categoryIds.length > 0 ? categoryIds : undefined,
    minPrice: minPriceRaw ? Number(minPriceRaw) : undefined,
    maxPrice: maxPriceRaw ? Number(maxPriceRaw) : undefined,
    minRating: minRatingRaw ? Number(minRatingRaw) : undefined,
    cityId: cityId != null && Number.isInteger(cityId) && cityId > 0 ? cityId : undefined,
    departmentId:
      departmentId != null && Number.isInteger(departmentId) && departmentId > 0
        ? departmentId
        : undefined,
  };
}

/**
 * Activities on a map (CU16 · PAN 08). There's no design for this screen —
 * `skills/06-design-system/SKILL.md` lists PAN 08 among the screens the
 * prototype never designed — so this follows the rest of the design
 * system's tokens instead of copying a mockup that doesn't exist.
 *
 * Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Without a real key from a
 * project with the Maps JavaScript API enabled, this shows an error state
 * instead of a blank map.
 */
export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const filters = readFiltersFromSearchParams(searchParams);
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `filters` is a fresh object every render; only its serialized contents matter here.
  }, [JSON.stringify(filters)]);

  const { status, errorMessage } = useGoogleMap(containerRef, MAP_OPTIONS, (map) => {
    const markersRef = { current: [] as google.maps.Marker[] };
    const infoWindow = new google.maps.InfoWindow();
    const requestIdRef = { current: 0 };
    let cancelled = false;

    async function fetchMarkersForCurrentBounds() {
      const bounds = map.getBounds();
      if (!bounds) return;

      const currentRequestId = ++requestIdRef.current;
      const { north, south, east, west } = bounds.toJSON();

      try {
        const result = await getActivityMapMarkers({
          north,
          south,
          east,
          west,
          limit: 100,
          ...filtersRef.current,
        });
        if (cancelled || currentRequestId !== requestIdRef.current) return;

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = result.data.map((markerData) => {
          const marker = new google.maps.Marker({
            position: { lat: markerData.latitude, lng: markerData.longitude },
            map,
            title: markerData.name,
          });

          marker.addListener("click", () => {
            // Built with DOM APIs, not an HTML string: `InfoWindow.setContent`
            // parses a string as markup, and activity/place names come from
            // the catalog (CU53 lets admins edit them), not from something
            // guaranteed to be free of `<`/`>`.
            infoWindow.setContent(buildMarkerInfoContent(markerData));
            infoWindow.open({ map, anchor: marker });
          });

          return marker;
        });
      } catch {
        // A failed marker refresh (e.g. a network blip while panning)
        // isn't worth tearing down an already-rendered map for.
      }
    }

    const idleListener = map.addListener("idle", () => {
      void fetchMarkersForCurrentBounds();
    });

    return () => {
      cancelled = true;
      idleListener.remove();
      markersRef.current.forEach((marker) => marker.setMap(null));
      infoWindow.close();
    };
  });

  if (status === "error") {
    return (
      <div className={styles.mapError} role="alert">
        <p className="sp-body">{errorMessage}</p>
        <p className="sp-small">
          Mientras tanto, podés seguir buscando desde{" "}
          <Link href="/explore">la lista de actividades</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.mapWrapper}>
      <div ref={containerRef} className={styles.mapCanvas} />
    </div>
  );
}
