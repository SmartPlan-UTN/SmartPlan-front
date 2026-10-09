"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { renderStopMarker } from "@/components/maps/markers";
import { Icon } from "@/components/ui";
import { COMPOSER_MAP_STYLE } from "@/lib/maps/brandedMapStyle";
import {
  createHtmlMarkerLayer,
  type HtmlMarkerLayer,
} from "@/lib/maps/htmlMarkerLayer";
import { useGoogleMap } from "@/lib/maps/useGoogleMap";

import type { Coords } from "./routeDistance";
import { useMediaQuery } from "./useMediaQuery";
import styles from "./ReviewMap.module.css";

const EMBER = "#E85D20"; // --ember
const SINGLE_POINT_ZOOM = 15;

export interface ReviewMapStop {
  activityId: number;
  number: number;
  name: string;
  coords: Coords;
}

interface ReviewMapProps {
  stops: ReviewMapStop[];
  /** The stop pointed at in the route: its marker answers. */
  focusedActivityId: number | null;
  /** A marker was pressed (its stop is picked), or the map (none is). */
  onSelectStop: (activityId: number | null) => void;
  onPoint: (activityId: number | null) => void;
  /** The map could not load: the page closes up without it. */
  onUnavailable: () => void;
}

/**
 * The finished plan where it happens: its stops, numbered as in the route,
 * joined in order by a dashed straight line (never a street route). It is a
 * picture first: on touch screens it takes no gestures, so the page scrolls
 * through it; with a mouse it can be dragged, never wheel-zoomed.
 */
export function ReviewMap({
  stops,
  focusedActivityId,
  onSelectStop,
  onPoint,
  onUnavailable,
}: ReviewMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const coarse = useMediaQuery("(pointer: coarse)");
  const first = stops[0]?.coords;
  const [options] = useState<google.maps.MapOptions>(() => ({
    center: first
      ? { lat: first.latitude, lng: first.longitude }
      : { lat: -32.8895, lng: -68.8458 },
    zoom: 13,
    minZoom: 4,
    maxZoom: 18,
    styles: COMPOSER_MAP_STYLE,
    backgroundColor: "#EEE7DB",
    disableDefaultUI: true,
    clickableIcons: false,
    keyboardShortcuts: false,
  }));
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const onReady = useCallback((instance: google.maps.Map) => {
    setMap(instance);
    return () => setMap(null);
  }, []);
  const { status } = useGoogleMap(containerRef, options, onReady);

  useEffect(() => {
    if (status === "error") onUnavailable();
  }, [status, onUnavailable]);

  useEffect(() => {
    map?.setOptions(
      coarse
        ? { gestureHandling: "none" }
        : { gestureHandling: "greedy", scrollwheel: false },
    );
  }, [map, coarse]);

  const handlers = useRef({ onSelectStop, onPoint });
  useEffect(() => {
    handlers.current = { onSelectStop, onPoint };
  });

  const layerRef = useRef<HtmlMarkerLayer | null>(null);
  const lineRef = useRef<google.maps.Polyline | null>(null);
  useEffect(() => {
    if (!map) return;
    const idOf = (key: string | null) =>
      key && key.startsWith("s") ? Number(key.slice(1)) : null;
    layerRef.current = createHtmlMarkerLayer(map, {
      onActivate: (key) => {
        const id = idOf(key);
        if (id !== null) handlers.current.onSelectStop(id);
      },
      onHover: (key) => handlers.current.onPoint(idOf(key)),
    });
    lineRef.current = new google.maps.Polyline({
      map,
      clickable: false,
      strokeOpacity: 0,
      zIndex: 1,
      icons: [
        {
          icon: {
            path: "M 0,-1 0,1",
            strokeColor: EMBER,
            strokeOpacity: 0.85,
            strokeWeight: 2.5,
            scale: 2.5,
          },
          offset: "0",
          repeat: "11px",
        },
      ],
    });
    const clear = map.addListener("click", () =>
      handlers.current.onSelectStop(null),
    );
    return () => {
      clear.remove();
      layerRef.current?.destroy();
      lineRef.current?.setMap(null);
      layerRef.current = null;
      lineRef.current = null;
    };
  }, [map]);

  const frame = useCallback(() => {
    if (!map || stops.length === 0) return;
    if (stops.length === 1) {
      map.setCenter({
        lat: stops[0].coords.latitude,
        lng: stops[0].coords.longitude,
      });
      map.setZoom(SINGLE_POINT_ZOOM);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const stop of stops) {
      bounds.extend({ lat: stop.coords.latitude, lng: stop.coords.longitude });
    }
    const narrow = (containerRef.current?.clientWidth ?? 0) < 520;
    map.fitBounds(bounds, narrow ? 44 : { top: 64, right: 72, bottom: 56, left: 64 });
  }, [map, stops]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.setMarkers(
      stops.map((stop) => ({
        key: `s${stop.activityId}`,
        lat: stop.coords.latitude,
        lng: stop.coords.longitude,
        signature: `${stop.number}|${stop.name}`,
        declutter: true,
        render: (element) =>
          renderStopMarker(element, {
            number: stop.number,
            name: stop.name,
            selected: false,
          }),
      })),
    );
    lineRef.current?.setPath(
      stops.map((stop) => ({
        lat: stop.coords.latitude,
        lng: stop.coords.longitude,
      })),
    );
    frame();
  }, [map, stops, frame]);

  // The plate settles its size after the map is made (fonts, the column's
  // height): frame again whenever it does, until the person moves the map.
  const movedRef = useRef(false);
  useEffect(() => {
    const container = containerRef.current;
    if (!map || !container || typeof ResizeObserver === "undefined") return;
    const moved = map.addListener("dragstart", () => {
      movedRef.current = true;
    });
    let width = container.clientWidth;
    let height = container.clientHeight;
    const observer = new ResizeObserver(() => {
      if (
        container.clientWidth === width &&
        container.clientHeight === height
      ) {
        return;
      }
      width = container.clientWidth;
      height = container.clientHeight;
      if (!movedRef.current) frame();
    });
    observer.observe(container);
    return () => {
      moved.remove();
      observer.disconnect();
    };
  }, [map, frame]);

  useEffect(() => {
    layerRef.current?.setHighlighted(
      focusedActivityId === null ? null : `s${focusedActivityId}`,
    );
  }, [map, stops, focusedActivityId]);

  function zoomBy(delta: number) {
    if (!map) return;
    movedRef.current = true;
    map.setZoom((map.getZoom() ?? 13) + delta);
  }

  return (
    <div
      className={`${styles.root} ${status === "ready" ? styles.ready : ""}`}
      role="region"
      aria-label="Mapa del plan"
    >
      <div ref={containerRef} className={styles.canvas} />
      {status === "ready" ? (
        <div className={styles.controls}>
          {coarse ? null : (
            <>
              <button type="button" aria-label="Acercar" onClick={() => zoomBy(1)}>
                <Icon name="plus" size={16} aria-hidden="true" />
              </button>
              <button type="button" aria-label="Alejar" onClick={() => zoomBy(-1)}>
                <Icon name="minus" size={16} aria-hidden="true" />
              </button>
            </>
          )}
          <button
            type="button"
            aria-label="Encuadrar el plan"
            onClick={() => {
              movedRef.current = false;
              frame();
            }}
          >
            <Icon name="target" size={16} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
