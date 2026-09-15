"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import Link from "next/link";

import { useGoogleMap } from "@/lib/maps/useGoogleMap";
import { BRANDED_MAP_STYLE } from "@/lib/maps/brandedMapStyle";
import type { ResultsMapPlanPin } from "@/lib/maps/buildPlanPins";
import { useReducedMotion } from "@/hooks";

import styles from "./results-layout.module.css";

// Mendoza, the product's default location (see skills/06-design-system,
// and MapView.tsx's own DEFAULT_CENTER for the CU16 map).
const DEFAULT_CENTER = { lat: -32.8895, lng: -68.8458 };
const DEFAULT_ZOOM = 12;
const PIN_SIZE = 30;
const PIN_SIZE_ACTIVE = 38;
const PIN_ASPECT = 42 / 32;

const MAP_OPTIONS: google.maps.MapOptions = {
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  styles: BRANDED_MAP_STYLE,
  disableDefaultUI: true,
  zoomControl: true,
  // "cooperative" (not "greedy"): this map sits inside a page column, not a
  // full-screen surface — a two-finger/ctrl+scroll requirement keeps normal
  // page scrolling from getting trapped under the cursor.
  gestureHandling: "cooperative",
};

function pinIcon(color: string, label: string, active: boolean): google.maps.Icon {
  const size = active ? PIN_SIZE_ACTIVE : PIN_SIZE;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">`,
    `<path d="M16 0C7.163 0 0 7.163 0 16c0 11.5 16 26 16 26s16-14.5 16-26C32 7.163 24.837 0 16 0z" fill="${color}"/>`,
    `<circle cx="16" cy="16" r="10.5" fill="#FFFCF8"/>`,
    `<text x="16" y="20.5" font-size="12" font-family="system-ui,sans-serif" font-weight="700" text-anchor="middle" fill="${color}">${label}</text>`,
    `</svg>`,
  ].join("");

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size * PIN_ASPECT),
    anchor: new google.maps.Point(size / 2, size * PIN_ASPECT),
  };
}

export interface ResultsMapHandle {
  /** Pans/fits the camera to a plan's stops — an explicit action, never called on hover. */
  panToPlan: (planId: number) => void;
}

export interface ResultsMapProps {
  plans: ResultsMapPlanPin[];
  activePlanId: number | null;
  onPinHover: (planId: number | null) => void;
  onPinClick: (planId: number) => void;
  /** Mobile: false while the "Lista" panel is showing. Always true on desktop. */
  visible?: boolean;
  className?: string;
  ref?: Ref<ResultsMapHandle>;
}

/**
 * The branded results map (CU17): a Marker per stop (numbered, colored by
 * plan) and a Polyline connecting each plan's stops in order, so the
 * "recorrido" reads visually instead of as isolated dots. Hovering a card
 * (via `activePlanId`) highlights that plan's pins without moving the
 * camera — panning on every hover reads as jittery, not premium; only an
 * explicit click/"Ver recorrido" (via the `panToPlan` handle) pans.
 */
export function ResultsMap({
  plans,
  activePlanId,
  onPinHover,
  onPinClick,
  visible = true,
  className,
  ref,
}: ResultsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const onPinHoverRef = useRef(onPinHover);
  const onPinClickRef = useRef(onPinClick);
  const markersRef = useRef(
    new Map<number, { marker: google.maps.Marker; color: string; order: number }[]>(),
  );
  const polylinesRef = useRef(new Map<number, google.maps.Polyline>());
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    onPinHoverRef.current = onPinHover;
    onPinClickRef.current = onPinClick;
  });

  const { status, errorMessage } = useGoogleMap(containerRef, MAP_OPTIONS, (map) => {
    mapRef.current = map;
    const bounds = new google.maps.LatLngBounds();
    let stopCount = 0;

    for (const plan of plans) {
      const planMarkers: { marker: google.maps.Marker; color: string; order: number }[] = [];

      plan.stops.forEach((stop, index) => {
        const position = { lat: stop.lat, lng: stop.lng };
        bounds.extend(position);
        stopCount += 1;

        const marker = new google.maps.Marker({
          position,
          map,
          title: stop.name,
          icon: pinIcon(plan.color, String(index + 1), false),
          zIndex: 1,
        });
        marker.addListener("mouseover", () => onPinHoverRef.current(plan.planId));
        marker.addListener("mouseout", () => onPinHoverRef.current(null));
        marker.addListener("click", () => onPinClickRef.current(plan.planId));

        planMarkers.push({ marker, color: plan.color, order: index + 1 });
      });

      markersRef.current.set(plan.planId, planMarkers);

      if (plan.stops.length > 1) {
        const polyline = new google.maps.Polyline({
          path: plan.stops.map((stop) => ({ lat: stop.lat, lng: stop.lng })),
          map,
          strokeColor: plan.color,
          strokeOpacity: 0.45,
          strokeWeight: 3,
        });
        polylinesRef.current.set(plan.planId, polyline);
      }
    }

    // Nothing to frame — every visible plan lacks coordinates. Leave the
    // default Mendoza center/zoom instead of calling fitBounds on an empty
    // LatLngBounds, which throws.
    if (stopCount > 0) {
      map.fitBounds(bounds, 48);
    }

    return () => {
      markersRef.current.forEach((planMarkers) => {
        planMarkers.forEach(({ marker }) => marker.setMap(null));
      });
      markersRef.current.clear();
      polylinesRef.current.forEach((polyline) => polyline.setMap(null));
      polylinesRef.current.clear();
      mapRef.current = null;
    };
  });

  // Restyles already-created markers/polylines when the active plan
  // changes — no camera movement here, see the component doc comment.
  useEffect(() => {
    markersRef.current.forEach((planMarkers, planId) => {
      const active = activePlanId === planId;
      const dimmed = activePlanId !== null && !active;
      planMarkers.forEach(({ marker, color, order }) => {
        marker.setIcon(pinIcon(color, String(order), active));
        marker.setOpacity(dimmed ? 0.45 : 1);
        marker.setZIndex(active ? 10 : 1);
      });
    });
    polylinesRef.current.forEach((polyline, planId) => {
      const active = activePlanId === planId;
      const dimmed = activePlanId !== null && !active;
      polyline.setOptions({
        strokeOpacity: dimmed ? 0.15 : active ? 0.85 : 0.45,
        strokeWeight: active ? 4 : 3,
      });
    });
  }, [activePlanId]);

  // A map that was `display:none` computed 0×0 — resize + refit once it
  // becomes visible again (mobile toggle). The instance stays mounted the
  // whole time; recreating it on every tap would drop zoom/pan state and be
  // slow.
  const stopsSignature = plans.map((plan) => plan.stops.length).join(",");
  useEffect(() => {
    if (!visible || !mapRef.current) return;
    const map = mapRef.current;
    google.maps.event.trigger(map, "resize");

    const bounds = new google.maps.LatLngBounds();
    let stopCount = 0;
    plans.forEach((plan) =>
      plan.stops.forEach((stop) => {
        bounds.extend({ lat: stop.lat, lng: stop.lng });
        stopCount += 1;
      }),
    );
    if (stopCount > 0) map.fitBounds(bounds, 48);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refit on visibility flipping true or the stop count changing, not on every `plans` identity change.
  }, [visible, stopsSignature]);

  useImperativeHandle(
    ref,
    () => ({
      panToPlan(planId: number) {
        const map = mapRef.current;
        const planMarkers = markersRef.current.get(planId);
        if (!map || !planMarkers || planMarkers.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        planMarkers.forEach(({ marker }) => {
          const position = marker.getPosition();
          if (position) bounds.extend(position);
        });

        if (!reducedMotion) map.panTo(bounds.getCenter());
        map.fitBounds(bounds, 64);
      },
    }),
    [reducedMotion],
  );

  if (status === "error") {
    return (
      <div className={[styles.mapError, className].filter(Boolean).join(" ")} role="alert">
        <p className="sp-body">{errorMessage}</p>
        <p className="sp-small">
          Mientras tanto, podés ver el detalle de cada plan desde la lista, o{" "}
          <Link href="/explore/map">explorar el mapa general</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className={[styles.mapCanvasWrapper, className].filter(Boolean).join(" ")}>
      <div ref={containerRef} className={styles.mapCanvas} />
    </div>
  );
}
