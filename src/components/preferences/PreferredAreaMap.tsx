"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button, Icon } from "@/components/ui";
import { BRANDED_MAP_STYLE } from "@/lib/maps/brandedMapStyle";
import { DEFAULT_MAP_CENTER } from "@/lib/maps/defaultCenter";
import {
  createHtmlMarkerLayer,
  type HtmlMarkerLayer,
} from "@/lib/maps/htmlMarkerLayer";
import { useGoogleMap } from "@/lib/maps/useGoogleMap";
import { readDeviceCoordinates } from "@/lib/location/deviceCoordinates";
import type { PreferredArea } from "@/types";

import styles from "./preferences.module.css";

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

/**
 * The result that names the zone around the point. Reverse geocoding lists
 * the street address first; storing its place id next to a "Barrio, Ciudad"
 * label would make them describe different places.
 */
export function areaResult(
  results: google.maps.GeocoderResult[],
): google.maps.GeocoderResult | undefined {
  return (
    results.find((result) =>
      result.types.some((type) => AREA_TYPES.includes(type)),
    ) ?? results[0]
  );
}

/**
 * The chosen point, drawn with the product's HTML markers
 * (`lib/maps/htmlMarkerLayer`): the classic `google.maps.Marker` is
 * deprecated, and `AdvancedMarkerElement` would need a cloud map id that
 * turns off the branded map style. It only marks the point; tapping the
 * map moves it.
 */
function showPin(
  layer: HtmlMarkerLayer | null,
  position: google.maps.LatLngLiteral | null,
) {
  layer?.setMarkers(
    position
      ? [
          {
            key: "preferred-area",
            lat: position.lat,
            lng: position.lng,
            signature: "pin",
            interactive: false,
            render: (element) => {
              element.className = styles.areaPin;
              element.setAttribute("aria-hidden", "true");
            },
          },
        ]
      : [],
  );
}

export interface MapPick {
  area: PreferredArea;
  address: string;
}

interface PreferredAreaMapProps {
  area: PreferredArea | null;
  selectionKey?: string;
  disabled?: boolean;
  onPick: (pick: MapPick) => void;
  onPickError: (message: string) => void;
  /** True from a tap until its geocoding settles. */
  onLocatingChange: (locating: boolean) => void;
}

/**
 * PAN 15 preferred area, picked on a map: tapping the map reverse-geocodes
 * that point into the same `{ label, placeId, latitude, longitude }` the
 * text search resolves to. The stored point is
 * where the user tapped; the geocoder only supplies its name and place id.
 *
 * Optional by design: without a Maps key or connection the field still
 * works through the text search, so a failure here only shows a note.
 */
export function PreferredAreaMap({
  area,
  selectionKey,
  disabled = false,
  onPick,
  onPickError,
  onLocatingChange,
}: PreferredAreaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const layerRef = useRef<HtmlMarkerLayer | null>(null);
  const [locating, setLocating] = useState(false);

  // Built once: `useGoogleMap` re-creates the map whenever the centre
  // changes, and following the chosen area is done by panning instead.
  const [options] = useState<google.maps.MapOptions>(() => ({
    center: area
      ? { lat: area.latitude, lng: area.longitude }
      : DEFAULT_MAP_CENTER,
    zoom: area ? AREA_ZOOM : OVERVIEW_ZOOM,
    styles: BRANDED_MAP_STYLE,
    disableDefaultUI: true,
    zoomControl: true,
    clickableIcons: false,
    gestureHandling: "cooperative",
  }));

  // Listeners are attached once; they read the latest props through refs.
  const areaKey = area ? `${area.latitude},${area.longitude}` : null;
  const latest = useRef({
    area,
    areaKey,
    selectionKey: selectionKey ?? areaKey,
    disabled,
    onPick,
    onPickError,
    onLocatingChange,
  });
  useEffect(() => {
    latest.current = {
      area,
      areaKey,
      selectionKey: selectionKey ?? areaKey,
      disabled,
      onPick,
      onPickError,
      onLocatingChange,
    };
  });
  // Each tap supersedes the previous one; only the latest request
  // may apply its result, whatever order the geocoder answers in.
  const requestRef = useRef(0);

  /** Puts the pin back on the stored area (or hides it) after a failed pick. */
  const restoreMarker = useCallback(() => {
    const current = latest.current.area;
    showPin(
      layerRef.current,
      current ? { lat: current.latitude, lng: current.longitude } : null,
    );
  }, []);

  const pickAt = useCallback(async (position: google.maps.LatLng) => {
    if (latest.current.disabled) {
      restoreMarker();
      return;
    }
    const request = ++requestRef.current;
    const startedFor = latest.current.selectionKey;
    showPin(layerRef.current, { lat: position.lat(), lng: position.lng() });
    setLocating(true);
    latest.current.onLocatingChange(true);
    try {
      const { results } = await new google.maps.Geocoder().geocode({
        location: position,
        language: "es",
      });
      if (request !== requestRef.current) return;
      // The area was removed or replaced by the text search meanwhile:
      // that newer choice wins, and the marker already follows it.
      if (latest.current.selectionKey !== startedFor) return;
      if (latest.current.disabled) {
        restoreMarker();
        return;
      }
      const result = areaResult(results);
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
      if (request !== requestRef.current) return;
      if (latest.current.selectionKey !== startedFor) return;
      restoreMarker();
      latest.current.onPickError(GEOCODE_ERROR);
    } finally {
      if (request === requestRef.current) {
        setLocating(false);
        latest.current.onLocatingChange(false);
      }
    }
  }, [restoreMarker]);

  const onReady = useCallback(
    (instance: google.maps.Map) => {
      const layer = createHtmlMarkerLayer(instance, {
        onActivate: () => undefined,
      });
      layerRef.current = layer;
      if (area) showPin(layer, { lat: area.latitude, lng: area.longitude });
      const click = instance.addListener(
        "click",
        (event: google.maps.MapMouseEvent) => {
          if (event.latLng) void pickAt(event.latLng);
        },
      );
      setMap(instance);
      return () => {
        click.remove();
        layer.destroy();
        layerRef.current = null;
        setMap(null);
      };
    },
    // The map is created once with the initial options; see `options`.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `area` is only the initial pin here; later changes go through the effect below.
    [pickAt],
  );

  const { status } = useGoogleMap(containerRef, options, onReady);

  // Follow the area when it comes from the text search or is cleared.
  useEffect(() => {
    const layer = layerRef.current;
    if (!map || !layer) return;
    if (!area) {
      showPin(layer, null);
      return;
    }
    const position = { lat: area.latitude, lng: area.longitude };
    showPin(layer, position);
    map.panTo(position);
    if ((map.getZoom() ?? 0) < AREA_ZOOM) map.setZoom(AREA_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by coordinates, not by object identity.
  }, [map, areaKey]);

  async function locateDevice() {
    if (disabled || locating || status !== "ready") return;
    const request = ++requestRef.current;
    const startedFor = latest.current.selectionKey;
    setLocating(true);
    latest.current.onLocatingChange(true);
    try {
      const coordinates = await readDeviceCoordinates();
      if (request !== requestRef.current || latest.current.disabled || latest.current.selectionKey !== startedFor) return;
      const position = new google.maps.LatLng(coordinates.latitude, coordinates.longitude);
      map?.panTo(position);
      map?.setZoom(AREA_ZOOM);
      await pickAt(position);
    } catch (error) {
      if (request !== requestRef.current) return;
      const denied = typeof error === "object" && error !== null && "code" in error && error.code === 1;
      latest.current.onPickError(denied
        ? "No tenemos permiso para usar tu ubicación. Habilitalo en el navegador o elegí la zona en el mapa."
        : "No pudimos obtener tu ubicación. Intentá de nuevo o elegí la zona en el mapa.");
    } finally {
      // pickAt owns the next request after coordinates have been obtained.
      if (request === requestRef.current) {
        setLocating(false);
        latest.current.onLocatingChange(false);
      }
    }
  }

  useEffect(() => () => {
    requestRef.current += 1;
    latest.current.onLocatingChange(false);
  }, []);

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
      <Button type="button" variant="ghostLight" size="sm" className={styles.areaLocateButton}
        disabled={disabled || locating || status !== "ready"} onClick={() => void locateDevice()}>
        <Icon name={locating ? "loader-circle" : "locate-fixed"} size={16} aria-hidden="true" />
        {locating ? "Ubicando…" : "Usar mi ubicación"}
      </Button>
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
                ? "Tocá otra parte del mapa para cambiarla"
                : "Tocá el mapa para elegir tu zona"}
            </>
          )}
        </span>
      )}
    </div>
  );
}
