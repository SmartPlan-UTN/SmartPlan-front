"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { OCCASION_KEYS } from "@/types";

import { getExploreMapMarkers } from "@/lib/api";
import { DEFAULT_MAP_CENTER } from "@/lib/maps/defaultCenter";
import { markerIconUrl, markerPresentation } from "@/lib/maps/markerIcon";
import { useGoogleMap } from "@/lib/maps/useGoogleMap";
import type { ExploreSearchParams, ExploreMapMarker } from "@/types";

import { MapMarkerCard } from "./MapMarkerCard";
import styles from "./explore.module.css";

const DEFAULT_ZOOM = 12;
const MAP_OPTIONS: google.maps.MapOptions = {
  center: DEFAULT_MAP_CENTER,
  zoom: DEFAULT_ZOOM,
  // Google's own businesses and stops would compete with SmartPlan's
  // markers; park and plaza areas stay as context.
  styles: [
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  ],
};

/** Names would pile up over downtown when zoomed out; show them from here on. */
const LABEL_MIN_ZOOM = 14;
const LABEL_MAX_LENGTH = 26;

function markerLabelText(name: string): string {
  return name.length > LABEL_MAX_LENGTH
    ? `${name.slice(0, LABEL_MAX_LENGTH - 1).trimEnd()}…`
    : name;
}

function markerLabel(
  markerData: ExploreMapMarker,
  zoom: number | undefined,
): google.maps.MarkerLabel | null {
  if (zoom === undefined || zoom < LABEL_MIN_ZOOM) return null;
  return {
    text: markerLabelText(markerData.name),
    className: styles.markerLabel,
    color: "#2a1d14",
    fontSize: "12px",
    fontWeight: "600",
  };
}

/** A round badge with the activity's icon (food, park, museum…). */
function markerIcon(markerData: ExploreMapMarker): google.maps.Icon {
  return {
    url: markerIconUrl(markerPresentation(markerData), {
      muted: markerData.itemType === "PLACE",
    }),
    scaledSize: new google.maps.Size(36, 36),
    anchor: new google.maps.Point(18, 18),
    labelOrigin: new google.maps.Point(18, 46),
  };
}

/** A marker with real coordinates that is not the virtual Hogar (#210). */
export function isMappableMarker(marker: ExploreMapMarker): boolean {
  return (
    Number.isFinite(marker.latitude) &&
    Number.isFinite(marker.longitude) &&
    marker.place?.kind !== "home" &&
    !("kind" in marker && marker.kind === "home")
  );
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
  const occasions = (searchParams.get("occasions") ?? "")
    .split(",")
    .filter((key) => (OCCASION_KEYS as readonly string[]).includes(key));
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
    occasions: occasions.length > 0 ? occasions : undefined,
    atHome: searchParams.get("atHome") === "true" || undefined,
    free: searchParams.get("free") === "true" || undefined,
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
  const [markerMessage, setMarkerMessage] = useState<string | null>(null);
  // The info window's content is a node Google owns; React renders the card
  // into it through a portal, so it keeps the app's router and contexts.
  const [infoHost, setInfoHost] = useState<HTMLElement | null>(null);
  const [selected, setSelected] = useState<ExploreMapMarker | null>(null);
  const searchParams = useSearchParams();
  const filters = readFiltersFromSearchParams(searchParams);
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `filters` is a fresh object every render; only its serialized contents matter here.
  }, [JSON.stringify(filters)]);

  const { status, errorMessage } = useGoogleMap(containerRef, MAP_OPTIONS, (map) => {
    const markersRef = {
      current: [] as Array<{ marker: google.maps.Marker; data: ExploreMapMarker }>,
    };
    const infoContent = document.createElement("div");
    const infoWindow = new google.maps.InfoWindow({
      content: infoContent,
      maxWidth: 280,
    });
    const closeListener = infoWindow.addListener("closeclick", () =>
      setSelected(null),
    );
    setInfoHost(infoContent);
    const requestIdRef = { current: 0 };
    let cancelled = false;
    let markerSignature = "";
    let fitFilteredResults = Object.values(filtersRef.current).some(
      (value) => value !== undefined,
    );

    async function fetchMarkersForCurrentBounds() {
      const bounds = map.getBounds();
      if (!bounds) return;

      const currentRequestId = ++requestIdRef.current;
      // Start a filtered search across the catalog, then frame its actual
      // points. A downtown viewport excludes Maipú and Valle de Uco.
      const shouldFit = fitFilteredResults;
      const { north, south, east, west } = shouldFit
        ? { north: 90, south: -90, east: 180, west: -180 }
        : bounds.toJSON();

      try {
        const result = await getExploreMapMarkers({
          north,
          south,
          east,
          west,
          limit: 100,
          ...filtersRef.current,
        });
        if (cancelled || currentRequestId !== requestIdRef.current) return;
        fitFilteredResults = false;
        // The Hogar is "wherever you are": never a pin, even if one slipped in.
        result.data = result.data.filter(isMappableMarker);
        setMarkerMessage(
          result.data.length === 0
            ? "No hay resultados en esta zona. Mové el mapa o volvé a la lista."
            : null,
        );

        const nextSignature = JSON.stringify(result.data);
        if (nextSignature === markerSignature) return;
        markerSignature = nextSignature;
        markersRef.current.forEach(({ marker }) => marker.setMap(null));
        const zoom = map.getZoom();
        markersRef.current = result.data.map((markerData) => {
          const marker = new google.maps.Marker({
            position: { lat: markerData.latitude, lng: markerData.longitude },
            map,
            title: markerData.name,
            icon: markerIcon(markerData),
            label: markerLabel(markerData, zoom),
            zIndex: markerData.itemType === "PLACE" ? 1 : 2,
          });

          marker.addListener("click", () => {
            setSelected(markerData);
            infoWindow.open({ map, anchor: marker });
          });

          return { marker, data: markerData };
        });
        if (shouldFit && result.data.length > 0) {
          const resultBounds = new google.maps.LatLngBounds();
          result.data.forEach((point) =>
            resultBounds.extend({ lat: point.latitude, lng: point.longitude }),
          );
          map.fitBounds(resultBounds, 48);
        }
      } catch {
        if (!cancelled && currentRequestId === requestIdRef.current) {
          setMarkerMessage("No pudimos actualizar los resultados. Mové el mapa para reintentar o volvé a la lista.");
        }
      }
    }

    const idleListener = map.addListener("idle", () => {
      void fetchMarkersForCurrentBounds();
    });
    const zoomListener = map.addListener("zoom_changed", () => {
      const zoom = map.getZoom();
      markersRef.current.forEach(({ marker, data }) =>
        marker.setLabel(markerLabel(data, zoom)),
      );
    });

    return () => {
      cancelled = true;
      idleListener.remove();
      zoomListener.remove();
      closeListener.remove();
      markersRef.current.forEach(({ marker }) => marker.setMap(null));
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
      {status === "loading" && <p role="status">Cargando el mapa…</p>}
      {markerMessage && <p role="status">{markerMessage}</p>}
      <div ref={containerRef} className={styles.mapCanvas} />
      {infoHost && selected
        ? createPortal(<MapMarkerCard key={selected.id} marker={selected} />, infoHost)
        : null}
    </div>
  );
}
