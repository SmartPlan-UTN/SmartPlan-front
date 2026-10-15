"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getActivity } from "@/lib/api";
import type { ActivitySearchResult } from "@/types";

export interface Coords {
  latitude: number;
  longitude: number;
}

export type NearbyStatus =
  "off" | "locating" | "ready" | "denied" | "unavailable" | "no-coordinates";

/** A zone the person drew by moving the map: "Buscar en esta zona". */
export interface CatalogArea {
  center: Coords;
  radiusKm: number;
}

export interface CatalogLocation {
  /** The user asked for nearby results. */
  active: boolean;
  status: NearbyStatus;
  /** What the results are near: the device, the last stop or a map zone. */
  kind: "device" | "route" | "area";
  /** Coordinates the catalog is searched around, once resolved. */
  anchor: Coords | null;
  /** How far from the anchor results may be, in km. */
  radiusKm: number;
  /** Name of the stop the results are measured from; null for the device. */
  anchorName: string | null;
  /** Whether the anchor is the last stop (true) or the device (false). */
  followsRoute: boolean;
  toggle: () => void;
  turnOff: () => void;
  /** Search inside a map zone instead (replaces "nearby"). */
  setArea: (area: CatalogArea) => void;
}

/** Radius of the "nearby" search, in km. */
export const NEARBY_RADIUS_KM = 25;

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 60_000,
};

function readDevicePosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      reject,
      GEOLOCATION_OPTIONS,
    );
  });
}

/**
 * Nearby discovery for the manual composer. Never reads the device position
 * on its own: it only happens inside `toggle()`, an explicit click.
 *
 * Once the route has a stop, "nearby" means near the last stop, using that
 * activity's first meeting point with coordinates (`GET /activities/:id`;
 * search results carry no coordinates). Until then it means near the device.
 * The anchor only ever feeds the catalog search: it never adds or reorders
 * stops. A zone chosen on the map ("Buscar en esta zona") is the third kind
 * of anchor: its centre and the radius that reaches the view's corners.
 */
export function useCatalogLocation(
  lastStop: ActivitySearchResult | null,
): CatalogLocation {
  const [active, setActive] = useState(false);
  const [area, setAreaState] = useState<CatalogArea | null>(null);
  const [device, setDevice] = useState<Coords | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<
    "idle" | "locating" | "denied" | "unavailable"
  >("idle");
  const [routeAnchors, setRouteAnchors] = useState<
    Record<number, Coords | null>
  >({});
  const anchorsRef = useRef<Record<number, Coords | null>>({});
  const lastStopId = lastStop?.id ?? null;

  // Without stops or a device position there is nothing to be near to, and
  // asking for the position again would need a fresh click.
  const activeNow =
    active &&
    (lastStopId !== null || device !== null || deviceStatus === "locating");

  useEffect(() => {
    anchorsRef.current = routeAnchors;
  });

  // Resolve the last stop's coordinates only while nearby is on.
  useEffect(() => {
    if (!activeNow || lastStopId === null) return;
    if (lastStopId in anchorsRef.current) return;

    let cancelled = false;
    getActivity(lastStopId)
      .then((detail) => {
        let anchor: Coords | null = null;
        for (const { latitude, longitude } of detail.locations) {
          if (latitude !== null && longitude !== null) {
            anchor = { latitude, longitude };
            break;
          }
        }
        if (!cancelled) {
          setRouteAnchors((current) => ({ ...current, [lastStopId]: anchor }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRouteAnchors((current) => ({ ...current, [lastStopId]: null }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeNow, lastStopId]);

  const requestDevice = useCallback(() => {
    setDeviceStatus("locating");
    readDevicePosition().then(
      (coords) => {
        setDevice(coords);
        setDeviceStatus("idle");
      },
      (error: unknown) => {
        const denied =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code: number }).code === 1;
        setDeviceStatus(denied ? "denied" : "unavailable");
        setActive(false);
      },
    );
  }, []);

  const toggle = useCallback(() => {
    // The zone is the active context: its chip turns it off.
    if (area) {
      setAreaState(null);
      return;
    }
    if (activeNow) {
      setActive(false);
      return;
    }
    setActive(true);
    if (lastStopId === null && device === null) requestDevice();
    // A route lookup that found nothing (or failed) is retried on a new toggle.
    if (lastStopId !== null && anchorsRef.current[lastStopId] === null) {
      setRouteAnchors((current) => {
        const next = { ...current };
        delete next[lastStopId];
        return next;
      });
    }
  }, [activeNow, area, device, lastStopId, requestDevice]);

  const turnOff = useCallback(() => {
    setActive(false);
    setAreaState(null);
  }, []);

  // A zone replaces "nearby"; asking for nearby again replaces the zone.
  const setArea = useCallback((next: CatalogArea) => {
    setActive(false);
    setAreaState(next);
  }, []);

  return useMemo<CatalogLocation>(() => {
    const common = { toggle, turnOff, setArea, radiusKm: NEARBY_RADIUS_KM };
    if (area) {
      return {
        ...common,
        active: true,
        status: "ready",
        kind: "area",
        anchor: area.center,
        radiusKm: area.radiusKm,
        anchorName: null,
        followsRoute: false,
      };
    }
    if (!activeNow) {
      const status: NearbyStatus =
        lastStopId === null &&
        (deviceStatus === "denied" || deviceStatus === "unavailable")
          ? deviceStatus
          : "off";
      return {
        ...common,
        active: false,
        status,
        kind: lastStopId !== null ? "route" : "device",
        anchor: null,
        anchorName: lastStop?.name ?? null,
        followsRoute: lastStopId !== null,
      };
    }

    if (lastStopId !== null && lastStop) {
      if (!(lastStopId in routeAnchors)) {
        return {
          ...common,
          active: true,
          status: "locating",
          kind: "route",
          anchor: null,
          anchorName: lastStop.name,
          followsRoute: true,
        };
      }
      const anchor = routeAnchors[lastStopId];
      return {
        ...common,
        active: true,
        status: anchor ? "ready" : "no-coordinates",
        kind: "route",
        anchor,
        anchorName: lastStop.name,
        followsRoute: true,
      };
    }

    return {
      ...common,
      active: true,
      status: device ? "ready" : "locating",
      kind: "device",
      anchor: device,
      anchorName: null,
      followsRoute: false,
    };
  }, [
    activeNow,
    area,
    device,
    deviceStatus,
    lastStop,
    lastStopId,
    routeAnchors,
    setArea,
    toggle,
    turnOff,
  ]);
}
