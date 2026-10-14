"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { activityDetailRoute, placeDetailRoute } from "@/lib/routes";
import { getExploreMapMarkers } from "@/lib/api";
import { formatPrice, isPriceUnknown } from "@/lib/utils";
import { useGoogleMap } from "@/lib/maps/useGoogleMap";
import { placePriceReferenceText } from "@/components/media/PlacePriceReference";
import { ratingAccessibleText } from "@/components/media/RatingBadge";
import type { ExploreSearchParams, ExploreMapMarker } from "@/types";

import styles from "./explore.module.css";

// Mendoza, the product's default location (see skills/06-design-system).
const DEFAULT_CENTER = { lat: -32.8895, lng: -68.8458 };
const DEFAULT_ZOOM = 12;
const MAP_OPTIONS: google.maps.MapOptions = {
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
};

/** Rating line shared with the cards: SmartPlan, else attributed Google. */
function ratingLine(markerData: ExploreMapMarker): string | null {
  const text = ratingAccessibleText({
    averageRating:
      markerData.itemType === "ACTIVITY" ? markerData.averageRating : null,
    ratingCount:
      markerData.itemType === "ACTIVITY" ? (markerData.ratingCount ?? 0) : 0,
    externalRating: markerData.place?.externalRating ?? null,
  });
  return text === "Sin reseñas" ? text : `★ ${text}`;
}

function buildMarkerInfoContent(markerData: ExploreMapMarker): HTMLElement {
  const container = document.createElement("div");
  container.style.maxWidth = "240px";
  container.style.fontFamily = "inherit";

  const kicker = document.createElement("p");
  kicker.textContent =
    markerData.itemType === "ACTIVITY"
      ? [markerData.typeLabel, markerData.placeName].filter(Boolean).join(" · ")
      : [markerData.kindLabel, markerData.place?.department]
          .filter(Boolean)
          .join(" · ");
  kicker.style.margin = "0 0 2px";
  kicker.style.fontSize = "12px";
  kicker.style.opacity = "0.75";

  const title = document.createElement("strong");
  title.textContent = markerData.name;

  const meta = document.createElement("p");
  meta.style.margin = "4px 0";
  const priceText =
    markerData.itemType === "ACTIVITY" && !isPriceUnknown(markerData)
      ? formatPrice(markerData)
      : (() => {
          const reference = placePriceReferenceText(
            markerData.place?.externalPrice,
          );
          return reference ? `Ref. Google Maps: ${reference}` : null;
        })();
  meta.textContent = [priceText, ratingLine(markerData)]
    .filter(Boolean)
    .join(" · ");

  const link = document.createElement("a");
  if (markerData.itemType === "ACTIVITY") {
    link.href = activityDetailRoute(markerData.activityId);
    link.textContent = "Ver actividad";
  } else {
    link.href = placeDetailRoute(markerData.placeId);
    link.textContent = "Ver lugar";
  }

  container.append(kicker, title, meta, link);
  return container;
}

/** Places without a verified activity get a smaller, quieter marker. */
function placeMarkerIcon(): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 6,
    fillColor: "#8a3b12",
    fillOpacity: 0.85,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
}

/** Reads the same filters `ActivitySearch` sends over as `?search=&categoryIds=&...` so the map shows the same subset the user was just browsing, instead of silently ignoring them. */
function readFiltersFromSearchParams(
  searchParams: URLSearchParams,
): Partial<ExploreSearchParams> {
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
    type: searchParams.get("type") || undefined,
    itemType: searchParams.get("itemType") === "ACTIVITY" ? "ACTIVITY" : searchParams.get("itemType") === "PLACE" ? "PLACE" : undefined,
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
        const result = await getExploreMapMarkers({
          north,
          south,
          east,
          west,
          limit: 300,
          ...filtersRef.current,
        });
        if (cancelled || currentRequestId !== requestIdRef.current) return;

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = result.data.map((markerData) => {
          const marker = new google.maps.Marker({
            position: { lat: markerData.latitude, lng: markerData.longitude },
            map,
            title: markerData.name,
            ...(markerData.itemType === "PLACE"
              ? { icon: placeMarkerIcon(), zIndex: 1 }
              : { zIndex: 2 }),
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
          <Link href="/explore">la lista de actividades y lugares</Link>.
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
