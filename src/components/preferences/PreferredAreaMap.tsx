"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui";
import { BRANDED_MAP_STYLE } from "@/lib/maps/brandedMapStyle";
import { useGoogleMap } from "@/lib/maps/useGoogleMap";
import type { PreferredArea } from "@/types";

import styles from "./preferences.module.css";

/** Mendoza's city centre: where the map opens when nothing is chosen yet. */
const MENDOZA = { lat: -32.8895, lng: -68.8458 };
const OVERVIEW_ZOOM = 11;
const AREA_ZOOM = 14;
const LABEL_MAX_LENGTH = 160;

const GEOCODE_ERROR =
  "No pudimos reconocer ese punto. Probá tocando otra parte del mapa.";

/** Address components that name an area, most specific first. */
const AREA_TYPES = [
  "neighborhood",
  "sublocality",
  "locality",
  "administrative_area_level_2",
  "administrative_area_level_1",
];

/**
 * "Barrio, Ciudad" from a reverse-geocoding result: an area name, not a
 * street address, since the preference is a zone to start from.
 */
export function areaLabel(result: google.maps.GeocoderResult): string {
  const names: string[] = [];
  for (const type of AREA_TYPES) {
    const component = result.address_components.find((part) =>
      part.types.includes(type),
    );
    if (component && !names.includes(component.long_name)) {
      names.push(component.long_name);
    }
    if (names.length === 2) break;
  }
  const label = names.length > 0 ? names.join(", ") : result.formatted_address;
  return label.slice(0, LABEL_MAX_LENGTH);
}

export interface MapPick {
  area: PreferredArea;
  address: string;
}

interface PreferredAreaMapProps {
  area: PreferredArea | null;
  disabled?: boolean;
  onPick: (pick: MapPick) => void;
  onPickError: (message: string) => void;
}

/**
 * PAN 15 preferred area, picked on a map: tapping the map or dragging the
 * pin reverse-geocodes that point into the same `{ label, placeId,
 * latitude, longitude }` the text search resolves to. The stored point is
 * where the user tapped; the geocoder only supplies its name and place id.
 *
 * Optional by design: without a Maps key or connection the field still
 * works through the text search, so a failure here only shows a note.
 */
export function PreferredAreaMap({
  area,
  disabled = false,
  onPick,
  onPickError,
}: PreferredAreaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [locating, setLocating] = useState(false);

  // Built once: `useGoogleMap` re-creates the map whenever the centre
  // changes, and following the chosen area is done by panning instead.
  const [options] = useState<google.maps.MapOptions>(() => ({
    center: area ? { lat: area.latitude, lng: area.longitude } : MENDOZA,
    zoom: area ? AREA_ZOOM : OVERVIEW_ZOOM,
    styles: BRANDED_MAP_STYLE,
    disableDefaultUI: true,
    zoomControl: true,
    clickableIcons: false,
    gestureHandling: "cooperative",
  }));

  // Listeners are attached once; they read the latest props through refs.
  const latest = useRef({ disabled, onPick, onPickError });
  useEffect(() => {
    latest.current = { disabled, onPick, onPickError };
  });

  const pickAt = useCallback(async (position: google.maps.LatLng) => {
    if (latest.current.disabled) return;
    markerRef.current?.setPosition(position);
    markerRef.current?.setVisible(true);
    setLocating(true);
    try {
      const { results } = await new google.maps.Geocoder().geocode({
        location: position,
        language: "es",
      });
      const result = results[0];
      if (!result) throw new Error("No geocoding result");
      latest.current.onPick({
        area: {
          label: areaLabel(result),
          placeId: result.place_id,
          latitude: position.lat(),
          longitude: position.lng(),
        },
        address: result.formatted_address,
      });
    } catch {
      latest.current.onPickError(GEOCODE_ERROR);
    } finally {
      setLocating(false);
    }
  }, []);

  const onReady = useCallback(
    (instance: google.maps.Map) => {
      const marker = new google.maps.Marker({
        map: instance,
        position: options.center,
        visible: area !== null,
        draggable: true,
        title: "Zona preferida",
      });
      markerRef.current = marker;
      const click = instance.addListener(
        "click",
        (event: google.maps.MapMouseEvent) => {
          if (event.latLng) void pickAt(event.latLng);
        },
      );
      const drag = marker.addListener(
        "dragend",
        (event: google.maps.MapMouseEvent) => {
          if (event.latLng) void pickAt(event.latLng);
        },
      );
      setMap(instance);
      return () => {
        click.remove();
        drag.remove();
        marker.setMap(null);
        markerRef.current = null;
        setMap(null);
      };
    },
    // The map is created once with the initial options; see `options`.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `area` is only the initial marker state here; later changes go through the effect below.
    [options, pickAt],
  );

  const { status } = useGoogleMap(containerRef, options, onReady);

  // Follow the area when it comes from the text search or is cleared.
  const areaKey = area ? `${area.latitude},${area.longitude}` : null;
  useEffect(() => {
    const marker = markerRef.current;
    if (!map || !marker) return;
    if (!area) {
      marker.setVisible(false);
      return;
    }
    const position = { lat: area.latitude, lng: area.longitude };
    marker.setPosition(position);
    marker.setVisible(true);
    map.panTo(position);
    if ((map.getZoom() ?? 0) < AREA_ZOOM) map.setZoom(AREA_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by coordinates, not by object identity.
  }, [map, areaKey]);

  useEffect(() => {
    markerRef.current?.setDraggable(!disabled);
  }, [disabled, map]);

  if (status === "error") {
    return (
      <p className={styles.areaMapUnavailable}>
        <Icon name="map" size={16} />
        El mapa no está disponible ahora. Podés buscar tu zona por nombre.
      </p>
    );
  }

  return (
    <div className={styles.areaMap}>
      <div ref={containerRef} className={styles.areaMapCanvas} />
      {status === "loading" ? (
        <span className={styles.areaMapLoading} role="status">
          Cargando el mapa…
        </span>
      ) : (
        <span className={styles.areaMapHint} aria-live="polite">
          {locating ? (
            <>
              <Icon
                name="loader-circle"
                size={14}
                className={styles.saveSpinner}
              />
              Buscando la zona…
            </>
          ) : (
            <>
              <Icon name="target" size={14} />
              {area
                ? "Arrastrá el pin o tocá el mapa para cambiarla"
                : "Tocá el mapa para elegir tu zona"}
            </>
          )}
        </span>
      )}
    </div>
  );
}
