"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { renderResultMarker, renderStopMarker } from "@/components/maps/markers";
import { COMPOSER_MAP_STYLE } from "@/lib/maps/brandedMapStyle";
import {
  createHtmlMarkerLayer,
  type HtmlMarker,
  type HtmlMarkerLayer,
} from "@/lib/maps/htmlMarkerLayer";
import { useGoogleMap } from "@/lib/maps/useGoogleMap";

import { distanceKm, type Coords } from "./routeDistance";
import styles from "./PlaceMiniMap.module.css";

const EMBER = "#E85D20"; // --ember
/** Past this, framing the place with the last stop shows neither well. */
const LEG_FRAME_LIMIT_KM = 25;

export interface MiniMapStop {
  activityId: number;
  number: number;
  coords: Coords;
}

interface PlaceMiniMapProps {
  place: Coords;
  name: string;
  /** Its number when the activity already is a stop. */
  stopNumber: number | null;
  /** The route's located stops, as quiet context. */
  stops: MiniMapStop[];
  /** Where a straight leg to this place would start (the last stop). */
  from: Coords | null;
}

/**
 * Where an activity is, at a glance: the place, the route's stops around it
 * and, when it is not a stop yet, the straight leg it would add from the
 * last one. Purely visual (the caption beside it says the same in words),
 * so it takes no gestures and no focus.
 */
export function PlaceMiniMap({
  place,
  name,
  stopNumber,
  stops,
  from,
}: PlaceMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const options = useMemo<google.maps.MapOptions>(
    () => ({
      center: { lat: place.latitude, lng: place.longitude },
      zoom: 15,
      styles: COMPOSER_MAP_STYLE,
      backgroundColor: "#EEE7DB",
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: "none",
      keyboardShortcuts: false,
    }),
    [place.latitude, place.longitude],
  );
  const onReady = useCallback((instance: google.maps.Map) => {
    setMap(instance);
    return () => setMap(null);
  }, []);
  const { status } = useGoogleMap(containerRef, options, onReady);

  const layerRef = useRef<HtmlMarkerLayer | null>(null);
  const legRef = useRef<google.maps.Polyline | null>(null);
  useEffect(() => {
    if (!map) return;
    layerRef.current = createHtmlMarkerLayer(map, { onActivate: () => undefined });
    legRef.current = new google.maps.Polyline({
      map,
      clickable: false,
      strokeOpacity: 0,
      icons: [
        {
          icon: {
            path: "M 0,-1 0,1",
            strokeColor: EMBER,
            strokeOpacity: 0.9,
            strokeWeight: 2,
            scale: 2,
          },
          offset: "0",
          repeat: "9px",
        },
      ],
    });
    return () => {
      layerRef.current?.destroy();
      legRef.current?.setMap(null);
      layerRef.current = null;
      legRef.current = null;
    };
  }, [map]);

  const showLeg =
    stopNumber === null &&
    from !== null &&
    distanceKm(from, place) <= LEG_FRAME_LIMIT_KM;

  useEffect(() => {
    const layer = layerRef.current;
    if (!map || !layer) return;
    const markers: HtmlMarker[] = stops
      .filter((stop) => stop.number !== stopNumber)
      .map((stop) => ({
        key: `s${stop.activityId}`,
        lat: stop.coords.latitude,
        lng: stop.coords.longitude,
        signature: `s|${stop.number}`,
        interactive: false,
        render: (element) => {
          renderStopMarker(element, {
            number: stop.number,
            name: "",
            selected: false,
            mini: true,
          });
          element.removeAttribute("aria-label");
        },
      }));
    markers.push({
      key: "place",
      lat: place.latitude,
      lng: place.longitude,
      signature: `p|${stopNumber}`,
      interactive: false,
      render: (element) => {
        if (stopNumber !== null) {
          renderStopMarker(element, { number: stopNumber, name, selected: true });
        } else {
          renderResultMarker(element, {
            name,
            categoryName: null,
            estimatedCost: 0,
            selected: true,
            mini: true,
          });
        }
        element.removeAttribute("aria-label");
      },
    });
    layer.setMarkers(markers);

    legRef.current?.setPath(
      showLeg && from
        ? [
            { lat: from.latitude, lng: from.longitude },
            { lat: place.latitude, lng: place.longitude },
          ]
        : [],
    );

    // Frame the place with the leg it would add; otherwise the place alone,
    // at street level.
    if (showLeg && from) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: from.latitude, lng: from.longitude });
      bounds.extend({ lat: place.latitude, lng: place.longitude });
      map.fitBounds(bounds, { top: 22, right: 28, bottom: 18, left: 28 });
      if ((map.getZoom() ?? 15) > 16) map.setZoom(16);
    } else {
      map.setCenter({ lat: place.latitude, lng: place.longitude });
      map.setZoom(15);
    }
  }, [map, stops, place, name, stopNumber, from, showLeg]);

  return (
    <div
      className={`${styles.frame} ${status === "ready" ? styles.ready : ""}`}
      aria-hidden="true"
      inert
    >
      <div ref={containerRef} className={styles.canvas} />
    </div>
  );
}
