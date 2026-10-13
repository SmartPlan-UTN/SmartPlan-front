"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  renderMeMarker,
  renderResultMarker,
  renderStopMarker,
} from "@/components/maps/markers";
import { Icon } from "@/components/ui";
import { COMPOSER_MAP_STYLE } from "@/lib/maps/brandedMapStyle";
import {
  createHtmlMarkerLayer,
  type HtmlMarker,
  type HtmlMarkerLayer,
} from "@/lib/maps/htmlMarkerLayer";
import { useGoogleMap } from "@/lib/maps/useGoogleMap";
import { localizeCatalogText } from "@/lib/utils/catalogLabels";
import type { ActivitySearchParams } from "@/types";

import type { ComposerStop } from "./draft";
import {
  areaFromBounds,
  boundsContain,
  coreBounds,
  movedAway,
  type Bounds,
} from "./mapGeometry";
import { countActivities, withoutStops } from "./mapPoints";
import { subjectFromActivity, type QuickViewSubject } from "./QuickViewBody";
import type { Coords } from "./routeDistance";
import type { AssistantSearchState } from "./useAssistant";
import type { CatalogLocation } from "./useCatalogLocation";
import { useAssistantCandidates, useMapMarkers } from "./useMapMarkers";
import { prefetchActivityDetail, type StopInfo } from "./useStopInfo";
import styles from "./DiscoveryMap.module.css";

// Mendoza, the product's default location (see skills/06-design-system).
const DEFAULT_CENTER = { lat: -32.8895, lng: -68.8458 };
const EMBER = "#E85D20"; // --ember
const MAP_OPTIONS: google.maps.MapOptions = {
  center: DEFAULT_CENTER,
  zoom: 13,
  minZoom: 4,
  maxZoom: 18,
  styles: COMPOSER_MAP_STYLE,
  backgroundColor: "#EEE7DB",
  disableDefaultUI: true,
  clickableIcons: false,
  // "greedy", tested against "cooperative" on a phone and a desktop: in map
  // mode the map fills the screen at the page's end, so there is nothing to
  // scroll under it, and "cooperative" only got in the way (a grey "use two
  // fingers" veil on every one-finger drag; on desktop the wheel scrolled the
  // page and dragged the map out of view). The toolbar, tabs, route panel
  // and bars around the map still scroll the page as usual.
  gestureHandling: "greedy",
};
/** A lone point is framed at street level, not at the map's maximum zoom. */
const SINGLE_POINT_ZOOM = 15;

export interface DiscoveryMapProps {
  /** The same query the list shows. */
  params: ActivitySearchParams;
  /** The list's own gate: a settled search, valid prices, a resolved place. */
  enabled: boolean;
  assistant: AssistantSearchState;
  stops: ComposerStop[];
  stopInfo: Record<number, StopInfo>;
  location: CatalogLocation;
  /** How many activities the list counts for the same query. */
  listTotal: number | null;
  isSaving: boolean;
  /** What is being looked at, shared with the list; null when nothing. */
  inspected: QuickViewSubject | null;
  /** Open (or, for the one already open, close) an activity's Quick View. */
  onInspect: (subject: QuickViewSubject | null) => void;
  /** Close it from inside, handing focus back to what opened it. */
  onCloseInspection: () => void;
  /** The Quick View itself: the same one the list uses. */
  renderQuickView: (subject: QuickViewSubject) => ReactNode;
  /** The activity pointed at anywhere in the composer. */
  focusedActivityId: number | null;
  onPoint: (activityId: number | null) => void;
  onShowList: () => void;
  /** Back from the assistant's answer to the whole catalog. */
  onClearAssistant: () => void;
}

interface PositionedStop {
  stop: ComposerStop;
  number: number;
  coords: Coords | null;
}

/**
 * The discovery map: the catalog query drawn where things are. The route's
 * stops are its numbered, terracotta-joined spine; every other match is a
 * quiet dot that opens a preview. Nothing is ever added without "Sumar".
 * The camera frames each new answer once, then belongs to the person until
 * they ask to frame again; moving it far enough offers "Buscar en esta zona",
 * which narrows the shared search (list included) to that zone.
 */
export function DiscoveryMap({
  params,
  enabled,
  assistant,
  stops,
  stopInfo,
  location,
  listTotal,
  isSaving,
  inspected,
  onInspect,
  onCloseInspection,
  renderQuickView,
  focusedActivityId,
  onPoint,
  onShowList,
  onClearAssistant,
}: DiscoveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const { status, errorMessage } = useGoogleMap(
    containerRef,
    MAP_OPTIONS,
    (instance) => {
      setMap(instance);
      return () => setMap(null);
    },
  );

  const assistantMode =
    assistant.status === "loading" || assistant.status === "ready";
  const assistantResults =
    assistant.status === "ready" ? assistant.response.results : null;
  const catalog = useMapMarkers(map, params, enabled && !assistantMode);
  const answers = useAssistantCandidates(assistantResults);
  const candidates = assistantMode ? answers.candidates : catalog.candidates;

  const positionedStops = useMemo<PositionedStop[]>(
    () =>
      stops.map((stop, index) => ({
        stop,
        number: index + 1,
        coords: stopInfo[stop.activity.id]?.coords ?? null,
      })),
    [stops, stopInfo],
  );
  const stopIds = useMemo(
    () => new Set(stops.map((stop) => stop.activity.id)),
    [stops],
  );
  const results = useMemo(
    () => withoutStops(candidates, stopIds),
    [candidates, stopIds],
  );
  const lastStop = positionedStops.at(-1) ?? null;

  // ── Selection: by activity (any of its places), shown at the clicked
  // place. What is selected is the list's inspection too.
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const inspectedId = inspected?.activityId ?? null;
  const selectedStop =
    inspectedId !== null
      ? (positionedStops.find(
          (entry) => entry.stop.activity.id === inspectedId,
        ) ?? null)
      : null;
  const selectedCandidate =
    inspectedId !== null && !selectedStop
      ? (results.find(
          (candidate) =>
            candidate.key === pickedKey && candidate.activityId === inspectedId,
        ) ??
        results.find((candidate) => candidate.activityId === inspectedId) ??
        null)
      : null;
  const showServerDistance = assistantMode || location.kind !== "area";

  // Marker handlers read the latest state through refs: the layer is
  // created once per map and never rebuilt for a new closure.
  const resultsRef = useRef(results);
  const stopsRef = useRef(positionedStops);
  const onInspectRef = useRef(onInspect);
  const onPointRef = useRef(onPoint);
  const showDistanceRef = useRef(showServerDistance);
  useEffect(() => {
    resultsRef.current = results;
    stopsRef.current = positionedStops;
    onInspectRef.current = onInspect;
    onPointRef.current = onPoint;
    showDistanceRef.current = showServerDistance;
  });

  // A Quick View opened from the keyboard takes focus, so its action is the
  // next key press away instead of a tab through every other marker.
  const [focusCard, setFocusCard] = useState(false);
  const activate = useCallback((key: string, viaKeyboard: boolean) => {
    const stop = stopsRef.current.find(
      (entry) => `s${entry.stop.activity.id}` === key,
    );
    const candidate = resultsRef.current.find((item) => item.key === key);
    let subject: QuickViewSubject | null = null;
    if (stop) {
      subject = subjectFromActivity(stop.stop.activity);
    } else if (candidate) {
      const distance = showDistanceRef.current ? candidate.distanceKm : null;
      subject = candidate.activity
        ? {
            ...subjectFromActivity(candidate.activity, candidate.reason ?? null),
            placeName: candidate.placeName,
            distanceKm: distance,
          }
        : {
            activityId: candidate.activityId,
            summary: null,
            name: candidate.name,
            categoryName: candidate.categories[0]?.name ?? null,
            estimatedCost: candidate.estimatedCost,
            placeName: candidate.placeName,
            distanceKm: distance,
            reason: candidate.reason ?? null,
          };
    }
    if (!subject) return;
    setPickedKey(key);
    setFocusCard(viaKeyboard);
    onInspectRef.current(subject);
  }, []);
  const hover = useCallback((key: string | null) => {
    if (!key) {
      onPointRef.current(null);
      return;
    }
    const stop = stopsRef.current.find(
      (entry) => `s${entry.stop.activity.id}` === key,
    );
    const candidate = resultsRef.current.find((item) => item.key === key);
    const activityId = stop?.stop.activity.id ?? candidate?.activityId;
    if (activityId === undefined) return;
    if (candidate && !candidate.activity) prefetchActivityDetail(activityId);
    onPointRef.current(activityId);
  }, []);

  // ── Map objects: markers, the route, the ghost leg and the zone.
  const layerRef = useRef<HtmlMarkerLayer | null>(null);
  const routeRef = useRef<google.maps.Polyline | null>(null);
  const ghostRef = useRef<google.maps.Polyline | null>(null);
  const zoneRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map) return;
    const layer = createHtmlMarkerLayer(map, {
      onActivate: activate,
      onHover: hover,
    });
    const route = new google.maps.Polyline({
      map,
      clickable: false,
      strokeColor: EMBER,
      strokeOpacity: 0.85,
      strokeWeight: 3,
      zIndex: 2,
    });
    const ghost = new google.maps.Polyline({
      map,
      clickable: false,
      strokeOpacity: 0,
      zIndex: 1,
      icons: [
        {
          icon: {
            path: "M 0,-1 0,1",
            strokeColor: EMBER,
            strokeOpacity: 0.9,
            strokeWeight: 2.5,
            scale: 2.5,
          },
          offset: "0",
          repeat: "11px",
        },
      ],
    });
    const zone = new google.maps.Circle({
      clickable: false,
      strokeColor: EMBER,
      strokeOpacity: 0.5,
      strokeWeight: 1.5,
      fillColor: EMBER,
      fillOpacity: 0.035,
    });
    layerRef.current = layer;
    routeRef.current = route;
    ghostRef.current = ghost;
    zoneRef.current = zone;
    const closeOnMapClick = map.addListener("click", () =>
      onInspectRef.current(null),
    );
    return () => {
      closeOnMapClick.remove();
      layer.destroy();
      route.setMap(null);
      ghost.setMap(null);
      zone.setMap(null);
      layerRef.current = null;
    };
  }, [map, activate, hover]);

  const selectedActivityId = inspectedId;
  const showMe =
    location.kind === "device" &&
    location.status === "ready" &&
    location.anchor !== null;
  const me = showMe ? location.anchor : null;

  // Stops drawn last time: one that was not there just joined the route, and
  // its dot grows into a number (where the person pressed "Sumar").
  const drawnStopsRef = useRef<Set<number> | null>(null);
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const markers: HtmlMarker[] = [];
    if (me) {
      markers.push({
        key: "me",
        lat: me.latitude,
        lng: me.longitude,
        signature: "me",
        interactive: false,
        render: renderMeMarker,
      });
    }
    for (const candidate of results) {
      const selected = candidate.activityId === selectedActivityId;
      markers.push({
        key: candidate.key,
        lat: candidate.latitude,
        lng: candidate.longitude,
        signature: `r|${selected}|${candidate.name}`,
        render: (element) =>
          renderResultMarker(element, {
            name: candidate.name,
            categoryName: candidate.categories[0]?.name ?? null,
            estimatedCost: candidate.estimatedCost,
            selected,
          }),
      });
    }
    const drawn = drawnStopsRef.current;
    for (const entry of positionedStops) {
      if (!entry.coords) continue;
      const id = entry.stop.activity.id;
      const selected = id === selectedActivityId;
      const arrived = drawn !== null && !drawn.has(id);
      markers.push({
        key: `s${id}`,
        lat: entry.coords.latitude,
        lng: entry.coords.longitude,
        signature: `s|${entry.number}|${selected}|${arrived}|${entry.stop.activity.name}`,
        declutter: true,
        render: (element) =>
          renderStopMarker(element, {
            number: entry.number,
            name: entry.stop.activity.name,
            selected,
            arrived,
          }),
      });
    }
    layer.setMarkers(markers);
    drawnStopsRef.current = new Set(
      positionedStops.flatMap((entry) =>
        entry.coords ? [entry.stop.activity.id] : [],
      ),
    );
  }, [map, results, positionedStops, selectedActivityId, me]);

  useEffect(() => {
    routeRef.current?.setPath(
      positionedStops.flatMap((entry) =>
        entry.coords
          ? [{ lat: entry.coords.latitude, lng: entry.coords.longitude }]
          : [],
      ),
    );
  }, [map, positionedStops]);

  // Pointed at elsewhere (a row, a stop in the route): its marker answers.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    if (focusedActivityId === null) {
      layer.setHighlighted(null);
      return;
    }
    layer.setHighlighted(
      stopIds.has(focusedActivityId)
        ? `s${focusedActivityId}`
        : (results.find((candidate) => candidate.activityId === focusedActivityId)
            ?.key ?? null),
    );
  }, [map, focusedActivityId, results, stopIds]);

  const ghostFrom = selectedCandidate ? (lastStop?.coords ?? null) : null;
  useEffect(() => {
    ghostRef.current?.setPath(
      ghostFrom && selectedCandidate
        ? [
            { lat: ghostFrom.latitude, lng: ghostFrom.longitude },
            {
              lat: selectedCandidate.latitude,
              lng: selectedCandidate.longitude,
            },
          ]
        : [],
    );
  }, [map, ghostFrom, selectedCandidate]);

  const zoneLat = location.kind === "area" ? location.anchor?.latitude : null;
  const zoneLng = location.kind === "area" ? location.anchor?.longitude : null;
  const zoneRadiusKm = location.radiusKm;
  useEffect(() => {
    const circle = zoneRef.current;
    if (!circle || !map) return;
    if (zoneLat == null || zoneLng == null) {
      circle.setMap(null);
      return;
    }
    circle.setCenter({ lat: zoneLat, lng: zoneLng });
    circle.setRadius(zoneRadiusKm * 1000);
    circle.setMap(map);
  }, [map, zoneLat, zoneLng, zoneRadiusKm]);

  // ── Camera: frame each new answer once; after that it is the person's.
  const userMovedRef = useRef(false);
  const programmaticRef = useRef(false);
  const referenceRef = useRef<Bounds | null>(null);
  const pendingFitRef = useRef(false);
  const lastFitKeyRef = useRef<string | null>(null);
  const [offerZone, setOfferZone] = useState(false);
  const [view, setView] = useState<Bounds | null>(null);

  const fitPoints = useMemo<Coords[]>(
    () => [
      ...results,
      ...positionedStops.flatMap((entry) =>
        entry.coords ? [entry.coords] : [],
      ),
    ],
    [results, positionedStops],
  );
  const fitPointsRef = useRef(fitPoints);
  useEffect(() => {
    fitPointsRef.current = fitPoints;
  });

  const frame = useCallback(() => {
    const container = containerRef.current;
    if (!map || !container) return;
    // A hidden map measures 0×0 and would frame nothing: do it on return.
    if (container.clientWidth === 0) {
      pendingFitRef.current = true;
      return;
    }
    pendingFitRef.current = false;
    const { bounds } = coreBounds(fitPointsRef.current);
    if (!bounds) return;
    programmaticRef.current = true;
    userMovedRef.current = false;
    const tiny =
      bounds.north - bounds.south < 0.002 && bounds.east - bounds.west < 0.002;
    if (tiny) {
      map.setCenter({ lat: bounds.north, lng: bounds.east });
      map.setZoom(SINGLE_POINT_ZOOM);
    } else {
      const narrow = container.clientWidth < 600;
      map.fitBounds(bounds, {
        top: narrow ? 72 : 64,
        right: narrow ? 28 : 64,
        bottom: narrow ? 40 : 56,
        left: narrow ? 28 : 56,
      });
    }
  }, [map]);

  const zoneMode = location.kind === "area";
  const fitKey = assistantMode
    ? assistantResults && !answers.pending
      ? `ai|${assistantResults.map(({ activity }) => activity.id).join(",")}`
      : null
    : catalog.answeredKey;

  useEffect(() => {
    if (!map || fitKey === null || fitKey === lastFitKeyRef.current) return;
    const first = lastFitKeyRef.current === null;
    lastFitKeyRef.current = fitKey;
    if (!first && !assistantMode) {
      // Inside a zone the person framed the map themselves.
      if (zoneMode) return;
      // Otherwise a new answer is framed unless they have been moving it.
      if (userMovedRef.current) return;
    }
    frame();
  }, [map, fitKey, frame, assistantMode, zoneMode]);

  // Coming back from List or the route tab: finish a framing it missed.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (pendingFitRef.current && container.clientWidth > 0) frame();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [frame]);

  useEffect(() => {
    if (!map) return;
    const listeners = [
      map.addListener("dragstart", () => {
        userMovedRef.current = true;
      }),
      map.addListener("zoom_changed", () => {
        if (!programmaticRef.current) userMovedRef.current = true;
      }),
      map.addListener("idle", () => {
        const view = map.getBounds()?.toJSON();
        if (!view) return;
        if (programmaticRef.current || !referenceRef.current) {
          programmaticRef.current = false;
          referenceRef.current = view;
        }
        setOfferZone(
          userMovedRef.current && movedAway(referenceRef.current, view),
        );
        setView(view);
      }),
    ];
    return () => listeners.forEach((listener) => listener.remove());
  }, [map]);

  const inView = useMemo(
    () => (view ? countInView(fitPoints, view) : null),
    [fitPoints, view],
  );

  function searchHere() {
    const view = map?.getBounds()?.toJSON();
    if (!view) return;
    referenceRef.current = view;
    userMovedRef.current = false;
    setOfferZone(false);
    location.setArea(areaFromBounds(view));
  }

  // The Quick View must never hide the marker it describes (on a phone the
  // sheet covers the lower half): slide the map so the marker sits in the
  // clear space above it. One opened from the list may describe a marker
  // that is off-screen: bring it into view first. Otherwise the camera is
  // left alone.
  const selectedKey = selectedStop
    ? `s${selectedStop.stop.activity.id}`
    : (selectedCandidate?.key ?? null);
  const selectedCoords: Coords | null =
    selectedStop?.coords ?? selectedCandidate ?? null;
  const selectedCoordsRef = useRef(selectedCoords);
  useEffect(() => {
    selectedCoordsRef.current = selectedCoords;
  });
  useEffect(() => {
    if (!map || !selectedKey) return;
    let idle: google.maps.MapsEventListener | null = null;
    const keepClear = () => {
      const root = rootRef.current;
      const card = root?.querySelector("[data-quick-card]");
      const marker = root?.querySelector(
        `[data-marker-key="${CSS.escape(selectedKey)}"]`,
      );
      if (!root || !card || !marker) return;
      const area = root.getBoundingClientRect();
      const sheet = card.getBoundingClientRect();
      const point = marker.getBoundingClientRect();
      const x = point.left + Math.min(point.width, 28) / 2;
      const y = point.top + point.height / 2;
      const covered =
        y > sheet.top - 24 && x > sheet.left - 16 && x < sheet.right + 16;
      if (covered) map.panBy(0, y - (area.top + (sheet.top - area.top) / 2));
    };
    const frameId = requestAnimationFrame(() => {
      const root = rootRef.current;
      const marker = root?.querySelector(
        `[data-marker-key="${CSS.escape(selectedKey)}"]`,
      );
      const target = selectedCoordsRef.current;
      if (root && marker && target) {
        const area = root.getBoundingClientRect();
        const spot = marker.getBoundingClientRect();
        const outside =
          spot.right < area.left ||
          spot.left > area.right ||
          spot.bottom < area.top ||
          spot.top > area.bottom;
        if (outside) {
          idle = google.maps.event.addListenerOnce(map, "idle", keepClear);
          map.panTo({ lat: target.latitude, lng: target.longitude });
          return;
        }
      }
      keepClear();
    });
    return () => {
      cancelAnimationFrame(frameId);
      idle?.remove();
    };
  }, [map, selectedKey]);

  function zoomBy(delta: number) {
    if (!map) return;
    map.setZoom((map.getZoom() ?? 13) + delta);
  }

  // The card: Esc closes it, and one opened from the keyboard takes focus.
  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!inspected) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // A menu, list box or another dialog with focus closes itself first.
      const owner = document.activeElement?.closest(
        '[role="menu"], [role="listbox"], [role="alertdialog"], [role="dialog"]:not([data-quick-card])',
      );
      if (!owner) onCloseInspection();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [inspected, onCloseInspection]);
  useEffect(() => {
    if (!focusCard || inspectedId === null) return;
    cardRef.current
      ?.querySelector<HTMLButtonElement>("footer button:not(:disabled)")
      ?.focus({ preventScroll: true });
  }, [focusCard, inspectedId]);

  // ── Status line: what the map is showing, honestly.
  const loading =
    status === "loading" ||
    (assistantMode
      ? assistant.status === "loading" || answers.pending
      : catalog.status === "loading" && catalog.answeredKey === null);
  // Counted like the list counts: activities (stops included), not markers.
  const total = countActivities(candidates);
  const outOfView =
    inView === null ? 0 : Math.max(fitPoints.length - inView, 0);
  const unlocated =
    !assistantMode && !catalog.truncated && listTotal !== null
      ? Math.max(listTotal - countActivities(candidates), 0)
      : 0;

  if (status === "error") {
    return (
      <div className={styles.failure} role="alert">
        <Icon name="map" size={22} aria-hidden="true" />
        <strong>No pudimos mostrar el mapa</strong>
        <span>{errorMessage}</span>
        <button type="button" onClick={onShowList}>
          Ver como lista
        </button>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={styles.root}
      role="region"
      aria-label="Mapa de actividades"
      data-preview={inspected ? "open" : undefined}
    >
      <div ref={containerRef} className={styles.canvas} />

      <div className={styles.top}>
        <p className={styles.status} role="status" aria-live="polite">
          {loading ? (
            <>
              <Icon
                name="loader-circle"
                size={14}
                className={styles.spin}
                aria-hidden="true"
              />
              {assistant.status === "loading"
                ? "Entendiendo lo que buscás…"
                : assistantMode
                  ? "Ubicando lo que entendí…"
                  : "Buscando en el mapa…"}
            </>
          ) : catalog.status === "error" && !assistantMode ? (
            <>
              No pudimos cargar las actividades del mapa.
              <button type="button" onClick={catalog.retry}>
                Reintentar
              </button>
            </>
          ) : assistant.status === "ready" ? (
            <>
              <Icon
                name="sparkles"
                size={13}
                className={styles.spark}
                aria-hidden="true"
              />
              <span>Entendí</span>
              {assistant.response.interpretation.chips.map((chip) => (
                <b key={chip}>{localizeCatalogText(chip)}</b>
              ))}
              <span>
                · {total} {total === 1 ? "lugar" : "lugares"}
              </span>
              <button type="button" onClick={onClearAssistant}>
                Ver todo
              </button>
            </>
          ) : (
            <>
              <strong>
                {total} {total === 1 ? "actividad" : "actividades"}
              </strong>
              {catalog.truncated && !assistantMode ? (
                <span>Acercá el mapa para ver más</span>
              ) : outOfView > 0 ? (
                <button type="button" onClick={frame}>
                  {outOfView} fuera de vista
                </button>
              ) : unlocated > 0 ? (
                <span>
                  {unlocated} sin ubicación:{" "}
                  <button type="button" onClick={onShowList}>
                    en la lista
                  </button>
                </span>
              ) : null}
            </>
          )}
        </p>

        {offerZone && !assistantMode ? (
          <button
            type="button"
            className={styles.zoneButton}
            onClick={searchHere}
            disabled={isSaving}
          >
            <Icon name="search" size={14} aria-hidden="true" />
            Buscar en esta zona
          </button>
        ) : null}
      </div>

      <div className={styles.controls}>
        <button type="button" aria-label="Acercar" onClick={() => zoomBy(1)}>
          <Icon name="plus" size={16} aria-hidden="true" />
        </button>
        <button type="button" aria-label="Alejar" onClick={() => zoomBy(-1)}>
          <Icon name="minus" size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Encuadrar resultados y recorrido"
          onClick={frame}
          disabled={fitPoints.length === 0}
        >
          <Icon name="target" size={16} aria-hidden="true" />
        </button>
      </div>

      {!loading && fitPoints.length === 0 ? (
        <div className={styles.empty}>
          <strong>
            {assistantMode
              ? "No encontré nada así en el catálogo"
              : "Nada para mostrar en el mapa"}
          </strong>
          <span>Probá con otra búsqueda o quitá algún filtro.</span>
        </div>
      ) : null}

      {inspected ? (
        <section
          key={inspected.activityId}
          ref={cardRef}
          data-quick-card=""
          className={styles.card}
          role="dialog"
          aria-modal="false"
          aria-labelledby={`map-quick-view-${inspected.activityId}`}
        >
          <div className={styles.grip} aria-hidden="true" />
          {renderQuickView(inspected)}
        </section>
      ) : null}
    </div>
  );
}

function countInView(points: readonly Coords[], view: Bounds): number {
  let count = 0;
  for (const point of points) {
    if (
      boundsContain(view, {
        south: point.latitude,
        north: point.latitude,
        west: point.longitude,
        east: point.longitude,
      })
    ) {
      count += 1;
    }
  }
  return count;
}
