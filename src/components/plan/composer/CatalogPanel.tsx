"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import dynamic from "next/dynamic";

import { AnimatePresence } from "motion/react";

import { Button, Chip, Icon, Select, type SelectOption } from "@/components/ui";
import type { UseExplorationSearchResult } from "@/hooks";
import { listCategories } from "@/lib/api";
import { loadGoogleMaps } from "@/lib/maps/loadGoogleMaps";
import type {
  ActivitySearchParams,
  ActivitySearchResult,
  CategoryOption,
} from "@/types";

import type { ComposerStop } from "./draft";
import {
  QuickViewBody,
  subjectFromActivity,
  type QuickViewRoute,
  type QuickViewSubject,
} from "./QuickViewBody";
import { QuickViewSheet } from "./QuickViewSheet";
import { ResultRow } from "./ResultRow";
import { SuggestionCard } from "./SuggestionCard";
import {
  looksLikeRequest,
  type AssistantSearchState,
  type RouteAssistance,
} from "./useAssistant";
import type { CatalogLocation } from "./useCatalogLocation";
import { PHONE_QUERY, useMediaQuery } from "./useMediaQuery";
import type { StopInfo } from "./useStopInfo";
import styles from "./CatalogPanel.module.css";

import { categoryLabel, localizeCatalogText } from "@/lib/utils/catalogLabels";
type ActivitySortBy = NonNullable<ActivitySearchParams["sortBy"]>;

const MAX_SUGGESTIONS_SHOWN = 4;
const EXAMPLE_REQUEST = "algo para comer, barato y tranquilo";

export type DiscoveryView = "list" | "map";

/** What the map needs beyond what the list already has. */
export interface CatalogMapInput {
  params: ActivitySearchParams;
  enabled: boolean;
  stops: ComposerStop[];
  stopInfo: Record<number, StopInfo>;
}

// The map (and Google's script) only load once someone asks for it.
const loadDiscoveryMap = () =>
  import("./DiscoveryMap").then((module) => module.DiscoveryMap);
const DiscoveryMap = dynamic(loadDiscoveryMap, {
  ssr: false,
  loading: () => <div className={styles.mapPending} aria-hidden="true" />,
});

/** Warm both on intent (hover or focus on "Mapa"), so the switch feels instant. */
function prefetchMap() {
  void loadDiscoveryMap();
  loadGoogleMaps().catch(() => undefined);
}

/** The assistant as the catalog sees it: what it was asked, what it answered. */
export interface CatalogAssistant {
  search: AssistantSearchState;
  /** The sentence the assistant is currently answering; null when not asked. */
  askedQuery: string | null;
  assistance: RouteAssistance;
  /** Suggestions are for a pristine catalog: no search, filters or location. */
  showAssistance: boolean;
  onAsk: (query: string) => void;
  onClear: () => void;
}

interface CatalogPanelProps {
  catalog: UseExplorationSearchResult<ActivitySearchResult>;
  /** Route position (1-based) of every activity that is a stop. */
  stopNumbers: ReadonlyMap<number, number>;
  search: string;
  categoryIds: number[];
  minPrice: string;
  maxPrice: string;
  priceRangeError: string | null;
  sortBy: ActivitySortBy;
  defaultSort: ActivitySortBy;
  location: CatalogLocation;
  assistant: CatalogAssistant;
  isSearchTermTooShort: boolean;
  isSearchSettling: boolean;
  prefillLoading: boolean;
  prefillError: string | null;
  isSaving: boolean;
  visibleOnMobile: boolean;
  view: DiscoveryView;
  map: CatalogMapInput;
  onViewChange: (view: DiscoveryView) => void;
  onSearchChange: (value: string) => void;
  onToggleCategory: (categoryId: number) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onSortChange: (value: ActivitySortBy) => void;
  onAdd: (activity: ActivitySearchResult) => void;
  onRemove: (activityId: number) => void;
  /** The activity being pointed at anywhere in the composer. */
  focusedActivityId: number | null;
  onPoint: (activityId: number | null) => void;
}

const BASE_SORT_OPTIONS = [
  { value: "relevance", label: "Relevancia" },
  { value: "price", label: "Precio" },
  { value: "rating", label: "Valoración" },
] satisfies SelectOption<ActivitySortBy>[];

export function CatalogPanel({
  catalog,
  stopNumbers,
  search,
  categoryIds,
  minPrice,
  maxPrice,
  priceRangeError,
  sortBy,
  defaultSort,
  location,
  assistant,
  isSearchTermTooShort,
  isSearchSettling,
  prefillLoading,
  prefillError,
  isSaving,
  visibleOnMobile,
  view,
  map,
  onViewChange,
  onSearchChange,
  onToggleCategory,
  onMinPriceChange,
  onMaxPriceChange,
  onSortChange,
  onAdd,
  onRemove,
  focusedActivityId,
  onPoint,
}: CatalogPanelProps) {
  const resultsRef = useRef<HTMLDivElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const chipsRef = useRef<HTMLDivElement>(null);
  // The shortcut row is one tab stop; arrow keys move within it.
  const [chipStop, setChipStop] = useState(0);
  // The shortcuts never show half a chip: as many whole categories as fit
  // the row, then "+N", which opens the rest in a panel below it.
  const chipMeasureRef = useRef<HTMLDivElement>(null);
  const [fittingCategories, setFittingCategories] = useState<number | null>(
    null,
  );
  const [chipsExpanded, setChipsExpanded] = useState(false);
  const mapMode = view === "map";
  const phone = useMediaQuery(PHONE_QUERY);
  // One inspection for both views: what is open in the list is the marker
  // selected on the map, and the other way round.
  const [inspected, setInspected] = useState<QuickViewSubject | null>(null);
  const inspectTriggerRef = useRef<HTMLElement | null>(null);
  const inspect = useCallback((subject: QuickViewSubject | null) => {
    if (subject && document.activeElement instanceof HTMLElement) {
      inspectTriggerRef.current = document.activeElement;
    }
    setInspected((current) =>
      subject && current?.activityId === subject.activityId ? null : subject,
    );
  }, []);
  const inspectRow = useCallback(
    (activity: ActivitySearchResult) => {
      const reason =
        assistant.search.status === "ready"
          ? (assistant.search.response.results.find(
              (result) => result.activity.id === activity.id,
            )?.reason ?? null)
          : null;
      inspect(subjectFromActivity(activity, reason));
    },
    [inspect, assistant.search],
  );
  const closeInspection = useCallback(() => {
    setInspected(null);
    const trigger = inspectTriggerRef.current;
    requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
  }, []);
  // A new question (or another page of answers) is a new set of results:
  // what was open belongs to the old one. Only what the person asked counts:
  // "Cerca de {última parada}" moves with the route, so adding from the
  // Quick View itself must not close it.
  const answerKey = JSON.stringify([
    search.trim(),
    categoryIds,
    minPrice.trim(),
    maxPrice.trim(),
    assistant.askedQuery,
    catalog.page,
  ]);
  const [inspectedFor, setInspectedFor] = useState(answerKey);
  if (inspectedFor !== answerKey) {
    setInspectedFor(answerKey);
    if (inspected) setInspected(null);
  }
  // On a phone the list's Quick View is a modal sheet: coming back from the
  // map must not open one by itself for what was selected there.
  const [inspectedView, setInspectedView] = useState(view);
  if (inspectedView !== view) {
    setInspectedView(view);
    if (phone && inspected) setInspected(null);
  }
  const quickRoute = useMemo<QuickViewRoute>(() => {
    const stops = map.stops.flatMap((stop, index) => {
      const coords = map.stopInfo[stop.activity.id]?.coords;
      return coords
        ? [{ activityId: stop.activity.id, number: index + 1, coords }]
        : [];
    });
    const lastStop = map.stops.at(-1);
    const lastCoords = lastStop
      ? map.stopInfo[lastStop.activity.id]?.coords
      : null;
    return {
      stops,
      last:
        lastStop && lastCoords
          ? { name: lastStop.activity.name, coords: lastCoords }
          : null,
    };
  }, [map.stops, map.stopInfo]);
  const quickView = (subject: QuickViewSubject, withClose: boolean) => (
    <QuickViewBody
      subject={subject}
      stopNumber={stopNumbers.get(subject.activityId) ?? null}
      route={quickRoute}
      showMiniMap
      inline={!withClose}
      titleId={`quick-view-title-${subject.activityId}`}
      disabled={isSaving}
      onClose={withClose ? closeInspection : undefined}
      onAdd={onAdd}
      onRemove={onRemove}
    />
  );
  // In the list, wider than a phone, the Quick View opens inside its row
  // (never while the list is hidden behind the map, which has its own card).
  const inlineId =
    !phone && !mapMode && inspected ? inspected.activityId : null;
  // Once opened, the map stays mounted (hidden behind the list) so its
  // camera, markers and selection are still there when it comes back.
  const [mapOpened, setMapOpened] = useState(mapMode);
  if (mapMode && !mapOpened) setMapOpened(true);

  useEffect(() => {
    let ignore = false;
    // The chips are a shortcut: if the catalog of categories fails to load,
    // searching still works without them.
    listCategories({ limit: 50 })
      .then((result) => {
        if (!ignore) setCategories(result.data);
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, []);

  const activeFilterCount =
    (minPrice.trim() ? 1 : 0) +
    (maxPrice.trim() ? 1 : 0) +
    (sortBy !== defaultSort ? 1 : 0);
  // Distance from a zone's centre means nothing to the person: no "Cercanía".
  const measuresDistance =
    location.status === "ready" && location.kind !== "area";
  const sortOptions = useMemo<SelectOption<ActivitySortBy>[]>(
    () =>
      measuresDistance
        ? [...BASE_SORT_OPTIONS, { value: "distance", label: "Cercanía" }]
        : BASE_SORT_OPTIONS,
    [measuresDistance],
  );

  const { search: ai, assistance } = assistant;
  const aiAnswering = ai.status === "loading" || ai.status === "ready";
  const canAsk =
    looksLikeRequest(search) && search.trim() !== assistant.askedQuery;

  const resultTotal = catalog.pagination?.total ?? catalog.items.length;
  const isLoading = catalog.status === "loading" || isSearchSettling;
  const showSkeleton = isLoading && !catalog.hasResults;
  const nearbyReady = location.active && location.status === "ready";
  const nearbyLabel =
    location.kind === "area"
      ? "En esta zona"
      : location.followsRoute && location.anchorName
        ? `Cerca de ${location.anchorName}`
        : "Cerca mío";
  const nearbyMessage = describeNearbyProblem(location);
  const visibleSuggestions =
    assistant.showAssistance && !aiAnswering
      ? assistance.items.slice(0, MAX_SUGGESTIONS_SHOWN)
      : [];
  // While the first ideas are on their way, their row is already there (as
  // placeholders), so the catalog below does not jump down when they land.
  const suggestionsPending =
    assistant.showAssistance &&
    !aiAnswering &&
    visibleSuggestions.length === 0 &&
    assistance.status === "loading";
  const gapCategory = assistance.gap
    ? categories.find(
        (category) => category.name === assistance.gap?.categoryName,
      )
    : undefined;
  const showGap =
    assistant.showAssistance &&
    !aiAnswering &&
    assistance.gap &&
    gapCategory &&
    !categoryIds.includes(gapCategory.id);

  // What the assistant understood: above its list, or above the map.
  const understood = aiAnswering ? (
    <div className={styles.understood}>
      <p>
        <Icon name="sparkles" size={14} aria-hidden="true" />
        {ai.status === "loading" ? (
          "Entendiendo lo que buscás…"
        ) : (
          <>
            <span>Entendí</span>
            {ai.response.interpretation.chips.map((chip) => (
              <b key={chip}>{localizeCatalogText(chip)}</b>
            ))}
          </>
        )}
      </p>
      <button type="button" onClick={assistant.onClear}>
        Ver todo el catálogo
      </button>
    </div>
  ) : null;

  // Widths come from an invisible copy of every chip, so the count never
  // depends on what is currently shown; the row's width does the rest.
  useLayoutEffect(() => {
    const row = chipsRef.current;
    const measure = chipMeasureRef.current;
    if (!row || !measure) return;
    const compute = () => {
      const widths = [...measure.children].map(
        (child) => (child as HTMLElement).offsetWidth,
      );
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const [near = 0, ...rest] = widths;
      const more = rest.pop() ?? 0;
      const available = row.clientWidth;
      const all = rest.reduce((sum, width) => sum + gap + width, near);
      if (all <= available) {
        setFittingCategories(rest.length);
        return;
      }
      let used = near + gap + more;
      let count = 0;
      for (const width of rest) {
        if (used + gap + width > available) break;
        used += gap + width;
        count += 1;
      }
      setFittingCategories(count);
    };
    compute();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(compute);
    observer.observe(row);
    void document.fonts?.ready.then(compute);
    return () => observer.disconnect();
  }, [categories, nearbyLabel, location.kind]);

  const shownCategories =
    fittingCategories === null
      ? categories
      : categories.slice(0, fittingCategories);
  const hiddenCategories = categories.slice(shownCategories.length);
  const foldable =
    fittingCategories !== null && fittingCategories < categories.length;
  const hiddenActive = hiddenCategories.some((category) =>
    categoryIds.includes(category.id),
  );

  function handleChipKeys(event: KeyboardEvent<HTMLDivElement>) {
    const chips = [
      ...(chipsRef.current?.querySelectorAll<HTMLButtonElement>("button") ??
        []),
    ];
    const current = chips.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    const last = chips.length - 1;
    const target =
      event.key === "ArrowRight"
        ? Math.min(current + 1, last)
        : event.key === "ArrowLeft"
          ? Math.max(current - 1, 0)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : -1;
    if (target < 0) return;
    event.preventDefault();
    chips[target]?.focus();
  }

  function changePage(page: number) {
    catalog.goToPage(page);
    // Land on the first row of the new page, not wherever the old one ended.
    resultsRef.current?.scrollIntoView?.({ block: "start" });
  }

  return (
    <>
    <div
      id="composer-panel-catalog"
      role="tabpanel"
      tabIndex={0}
      aria-labelledby="composer-tab-catalog"
      className={`${styles.panel} ${visibleOnMobile ? styles.visibleOnMobile : ""} ${mapMode ? styles.mapMode : ""}`}
    >
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Icon name="search" size={20} aria-hidden="true" />
          <label className={styles.srOnly} htmlFor="composer-search">
            Buscar actividades
          </label>
          <input
            id="composer-search"
            type="search"
            placeholder="Buscá, o contá qué te gustaría hacer…"
            value={search}
            enterKeyHint="search"
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canAsk) {
                event.preventDefault();
                assistant.onAsk(search.trim());
              }
            }}
            disabled={isSaving}
          />
          {search && !canAsk && !(isLoading || ai.status === "loading") ? (
            <button
              type="button"
              className={styles.clear}
              aria-label="Borrar la búsqueda"
              onClick={() => onSearchChange("")}
              disabled={isSaving}
            >
              <Icon name="x" size={16} aria-hidden="true" />
            </button>
          ) : null}
          {isLoading || ai.status === "loading" ? (
            <>
              <Icon
                name="loader-circle"
                size={17}
                className={styles.spin}
                aria-hidden="true"
              />
              <span className={styles.srOnly} role="status">
                Buscando actividades
              </span>
            </>
          ) : null}
          {canAsk ? (
            <button
              type="button"
              className={styles.ask}
              onClick={() => assistant.onAsk(search.trim())}
              disabled={isSaving}
            >
              <Icon name="sparkles" size={15} aria-hidden="true" />
              Entender
            </button>
          ) : null}
        </div>

        <div
          className={styles.viewToggle}
          role="group"
          aria-label="Ver resultados como"
        >
          <button
            type="button"
            aria-pressed={!mapMode}
            onClick={() => onViewChange("list")}
          >
            <Icon name="list" size={15} aria-hidden="true" />
            <span className={styles.viewLabel}>Lista</span>
          </button>
          <button
            type="button"
            aria-pressed={mapMode}
            onClick={() => onViewChange("map")}
            onPointerEnter={prefetchMap}
            onFocus={prefetchMap}
          >
            <Icon name="map" size={15} aria-hidden="true" />
            <span className={styles.viewLabel}>Mapa</span>
          </button>
        </div>

        {!search && !assistant.askedQuery && !mapMode ? (
          <p className={styles.hint}>
            Probá con una frase:{" "}
            <button
              type="button"
              onClick={() => {
                onSearchChange(EXAMPLE_REQUEST);
                assistant.onAsk(EXAMPLE_REQUEST);
              }}
              disabled={isSaving}
            >
              «{EXAMPLE_REQUEST}»
            </button>
          </p>
        ) : null}

        <div className={styles.shortcuts} inert={isSaving}>
          <div
            ref={chipsRef}
            className={styles.chips}
            role="group"
            aria-label="Atajos de búsqueda"
            onKeyDown={handleChipKeys}
          >
            <Chip
              active={location.active}
              onClick={location.toggle}
              className={styles.nearChip}
              title={nearbyLabel}
              tabIndex={chipStop === 0 ? 0 : -1}
              onFocus={() => setChipStop(0)}
            >
              <Icon
                name={location.kind === "area" ? "map" : "locate-fixed"}
                size={14}
                aria-hidden="true"
              />
              <span>{nearbyLabel}</span>
              {location.kind === "area" ? (
                <Icon name="x" size={13} aria-label="Quitar la zona" />
              ) : null}
            </Chip>
            {shownCategories.map((category, index) => (
              <Chip
                key={category.id}
                active={categoryIds.includes(category.id)}
                onClick={() => onToggleCategory(category.id)}
                tabIndex={chipStop === index + 1 ? 0 : -1}
                onFocus={() => setChipStop(index + 1)}
              >
                {categoryLabel(category.name)}
              </Chip>
            ))}
            {foldable ? (
              <Chip
                active={hiddenActive}
                aria-pressed={undefined}
                aria-expanded={chipsExpanded}
                aria-controls="composer-more-categories"
                aria-label={
                  chipsExpanded
                    ? "Mostrar menos categorías"
                    : `Mostrar ${hiddenCategories.length} categorías más`
                }
                className={styles.moreChip}
                onClick={() => setChipsExpanded((open) => !open)}
                tabIndex={chipStop === shownCategories.length + 1 ? 0 : -1}
                onFocus={() => setChipStop(shownCategories.length + 1)}
              >
                {chipsExpanded ? "Menos" : `+${hiddenCategories.length}`}
              </Chip>
            ) : null}
          </div>
          <div
            ref={chipMeasureRef}
            className={styles.chipMeasure}
            aria-hidden="true"
            inert
          >
            <Chip className={styles.nearChip} tabIndex={-1}>
              <Icon name="locate-fixed" size={14} />
              <span>{nearbyLabel}</span>
              {location.kind === "area" ? <Icon name="x" size={13} /> : null}
            </Chip>
            {categories.map((category) => (
              <Chip key={category.id} tabIndex={-1}>
                {categoryLabel(category.name)}
              </Chip>
            ))}
            <Chip className={styles.moreChip} tabIndex={-1}>
              +{categories.length}
            </Chip>
          </div>
          <button
            type="button"
            className={styles.filtersButton}
            aria-expanded={filtersOpen}
            aria-controls="composer-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <Icon name="sliders-horizontal" size={15} aria-hidden="true" />
            <span className={styles.viewLabel}>Filtros</span>
            {activeFilterCount > 0 ? (
              <span
                className={styles.filterCount}
                aria-label={`${activeFilterCount} filtros activos`}
              >
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {foldable && chipsExpanded ? (
        <div
          id="composer-more-categories"
          className={styles.moreCategories}
          role="group"
          aria-label="Más categorías"
          inert={isSaving}
        >
          {hiddenCategories.map((category) => (
            <Chip
              key={category.id}
              active={categoryIds.includes(category.id)}
              onClick={() => onToggleCategory(category.id)}
            >
              {categoryLabel(category.name)}
            </Chip>
          ))}
        </div>
      ) : null}

      {filtersOpen ? (
        <div
          id="composer-filters"
          className={styles.filters}
          role="group"
          aria-label="Filtros de actividades"
        >
          <label>
            <span>Precio desde</span>
            <input
              inputMode="numeric"
              placeholder="$ mín."
              value={minPrice}
              onChange={(event) => onMinPriceChange(event.target.value)}
              disabled={isSaving}
            />
          </label>
          <label>
            <span>Hasta</span>
            <input
              inputMode="numeric"
              placeholder="$ máx."
              value={maxPrice}
              onChange={(event) => onMaxPriceChange(event.target.value)}
              disabled={isSaving}
            />
          </label>
          <label className={styles.sortField}>
            <span>Ordenar</span>
            <Select
              value={sortBy}
              options={sortOptions}
              aria-label="Ordenar actividades"
              onChange={onSortChange}
              disabled={isSaving}
            />
          </label>
          {priceRangeError ? (
            <p className={styles.filterError} role="alert">
              {priceRangeError}
            </p>
          ) : null}
          {activeFilterCount > 0 ? (
            <button
              type="button"
              className={styles.clearFilters}
              onClick={() => {
                onMinPriceChange("");
                onMaxPriceChange("");
                onSortChange(defaultSort);
              }}
            >
              Limpiar
            </button>
          ) : null}
        </div>
      ) : null}

      {nearbyMessage ? (
        <p className={styles.notice} role="status">
          {nearbyMessage}
        </p>
      ) : null}
      {catalog.errorMessage && !aiAnswering ? (
        <div className={styles.error} role="alert">
          <p>{catalog.errorMessage}</p>
          <Button variant="ghostLight" size="sm" onClick={catalog.retry}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {prefillError ? (
        <p className={styles.error} role="alert">
          {prefillError}
        </p>
      ) : null}
      {prefillLoading ? (
        <p className={styles.notice} role="status">
          Cargando la actividad elegida…
        </p>
      ) : null}

      {ai.status === "unavailable" ? (
        <p className={styles.notice} role="status">
          No pude interpretar esa frase ahora. Te muestro el catálogo para que
          sigas armando tu recorrido.
        </p>
      ) : null}

      {mapOpened ? (
        <div
          className={`${styles.mapArea} ${map.stops.length > 0 ? styles.withRouteBar : ""}`}
          hidden={!mapMode}
        >
          <DiscoveryMap
            params={map.params}
            enabled={map.enabled}
            assistant={ai}
            stops={map.stops}
            stopInfo={map.stopInfo}
            location={location}
            listTotal={isLoading ? null : (catalog.pagination?.total ?? null)}
            isSaving={isSaving}
            inspected={mapMode ? inspected : null}
            onInspect={inspect}
            onCloseInspection={closeInspection}
            renderQuickView={(subject) => (
              <QuickViewBody
                subject={subject}
                stopNumber={stopNumbers.get(subject.activityId) ?? null}
                route={quickRoute}
                showMiniMap={false}
                titleId={`map-quick-view-${subject.activityId}`}
                disabled={isSaving}
                onClose={closeInspection}
                onAdd={onAdd}
                onRemove={onRemove}
              />
            )}
            focusedActivityId={focusedActivityId}
            onPoint={onPoint}
            onShowList={() => onViewChange("list")}
            onClearAssistant={assistant.onClear}
          />
        </div>
      ) : null}

      {/* The list stays mounted while the map shows: its page and scroll
          are where they were when the person comes back. */}
      <div className={styles.listArea} hidden={mapMode}>
        {aiAnswering ? (
          <section className={styles.group} aria-label="Resultados entendidos">
            {understood}

            {ai.status === "loading" ? (
              <ul className={styles.skeleton} aria-hidden="true">
                {Array.from({ length: 4 }, (_, index) => (
                  <li key={index} />
                ))}
              </ul>
            ) : ai.response.results.length === 0 ? (
              <div className={styles.empty} role="status">
                <Icon name="search" size={22} aria-hidden="true" />
                <strong>No encontré nada así en el catálogo</strong>
                <span>Probá con otras palabras o mirá todo el catálogo.</span>
              </div>
            ) : (
              <ul className={styles.list}>
                {ai.response.results.map(({ activity, reason }) => (
                  <ResultRow
                    key={activity.id}
                    activity={activity}
                    reason={reason}
                    stopNumber={stopNumbers.get(activity.id) ?? null}
                    disabled={isSaving}
                    showDistance={ai.response.interpretation.nearName !== null}
                    expanded={inlineId === activity.id}
                    onInspect={inspectRow}
                    onAdd={onAdd}
                    onRemove={onRemove}
                    onPoint={onPoint}
                  >
                    {inlineId === activity.id && inspected
                      ? quickView(inspected, false)
                      : null}
                  </ResultRow>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <>
            {showGap && assistance.gap ? (
              <aside
                className={styles.gap}
                aria-label="Algo que le falta al recorrido"
              >
                <Icon name="sparkles" size={16} aria-hidden="true" />
                <p>{localizeCatalogText(assistance.gap.message)}</p>
                <button
                  type="button"
                  onClick={() =>
                    gapCategory && onToggleCategory(gapCategory.id)
                  }
                >
                  Ver {categoryLabel(assistance.gap.categoryName)}
                </button>
              </aside>
            ) : null}

            {suggestionsPending ? (
              <section
                className={`${styles.group} ${styles.railGroup}`}
                aria-hidden="true"
              >
                <p className={styles.groupTitle}>
                  <Icon name="sparkles" size={14} />
                  {stopNumbers.size > 0
                    ? "Para completar tu recorrido"
                    : "Ideas para tu plan"}
                </p>
                <ul className={`${styles.rail} ${styles.railPending}`}>
                  {Array.from({ length: MAX_SUGGESTIONS_SHOWN }, (_, index) => (
                    <li key={index} />
                  ))}
                </ul>
              </section>
            ) : visibleSuggestions.length > 0 ? (
              <section
                className={`${styles.group} ${styles.railGroup}`}
                aria-labelledby="composer-suggestions-title"
              >
                <h4
                  id="composer-suggestions-title"
                  className={styles.groupTitle}
                >
                  <Icon name="sparkles" size={14} aria-hidden="true" />
                  {stopNumbers.size > 0
                    ? "Para completar tu recorrido"
                    : "Ideas para tu plan"}
                </h4>
                <ul className={styles.rail}>
                  {visibleSuggestions.map(({ activity, reason }, index) => (
                    <SuggestionCard
                      key={activity.id}
                      index={index}
                      activity={activity}
                      reason={reason}
                      stopNumber={stopNumbers.get(activity.id) ?? null}
                      disabled={isSaving}
                      onAdd={onAdd}
                      onRemove={onRemove}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            <section
              className={styles.group}
              aria-label="Resultados del catálogo"
            >
              <div ref={resultsRef} className={styles.groupHead}>
                <h4 className={styles.groupTitle}>
                  {visibleSuggestions.length > 0
                    ? "Todas las actividades"
                    : "Actividades"}
                </h4>
                <span className={styles.total} aria-live="polite">
                  {isSearchTermTooShort || isSearchSettling
                    ? "Buscando"
                    : `${resultTotal} ${resultTotal === 1 ? "actividad" : "actividades"}`}
                </span>
              </div>
              {nearbyReady ? (
                <p className={styles.scope}>
                  {location.kind === "area"
                    ? "En la zona que elegiste en el mapa"
                    : `A menos de ${location.radiusKm} km de ${
                        location.followsRoute && location.anchorName
                          ? location.anchorName
                          : "tu ubicación"
                      }`}
                </p>
              ) : null}

              {isSearchTermTooShort ? (
                <div className={styles.empty} role="status">
                  <Icon name="search" size={22} aria-hidden="true" />
                  <strong>La búsqueda empieza con dos letras</strong>
                  <span>Escribí un poco más para encontrar actividades.</span>
                </div>
              ) : null}
              {!isSearchTermTooShort &&
              !isLoading &&
              !catalog.hasResults &&
              catalog.status === "idle" ? (
                <div className={styles.empty}>
                  <Icon name="search" size={22} aria-hidden="true" />
                  <strong>No encontramos actividades con esos criterios</strong>
                  <span>Probá con otra búsqueda o quitá algún filtro.</span>
                </div>
              ) : null}

              {showSkeleton ? (
                <ul className={styles.skeleton} aria-hidden="true">
                  {Array.from({ length: 5 }, (_, index) => (
                    <li key={index} />
                  ))}
                </ul>
              ) : null}

              {!isSearchTermTooShort && catalog.hasResults ? (
                <ul className={styles.list} aria-busy={isLoading}>
                  {catalog.items.map((activity) => (
                    <ResultRow
                      key={activity.id}
                      activity={activity}
                      stopNumber={stopNumbers.get(activity.id) ?? null}
                      disabled={isSaving}
                      showDistance={measuresDistance && location.active}
                      expanded={inlineId === activity.id}
                      onInspect={inspectRow}
                      onAdd={onAdd}
                      onRemove={onRemove}
                      onPoint={onPoint}
                    >
                      {inlineId === activity.id && inspected
                        ? quickView(inspected, false)
                        : null}
                    </ResultRow>
                  ))}
                </ul>
              ) : null}

              {!isSearchTermTooShort &&
              catalog.pagination &&
              catalog.pagination.totalPages > 1 ? (
                <nav
                  className={styles.pagination}
                  aria-label="Páginas de actividades"
                >
                  <Button
                    variant="ghostLight"
                    size="sm"
                    disabled={catalog.page <= 1 || isLoading || isSaving}
                    onClick={() => changePage(catalog.page - 1)}
                  >
                    Anterior
                  </Button>
                  <span>
                    Página <strong>{catalog.page}</strong> de{" "}
                    {catalog.pagination.totalPages}
                  </span>
                  <Button
                    variant="ghostLight"
                    size="sm"
                    disabled={
                      catalog.page >= catalog.pagination.totalPages ||
                      isLoading ||
                      isSaving
                    }
                    onClick={() => changePage(catalog.page + 1)}
                  >
                    Siguiente
                  </Button>
                </nav>
              ) : null}
            </section>
          </>
        )}
      </div>
    </div>
    <AnimatePresence>
      {phone && !mapMode && inspected ? (
        <QuickViewSheet
          key={inspected.activityId}
          titleId={`quick-view-title-${inspected.activityId}`}
          onClose={closeInspection}
        >
          {quickView(inspected, true)}
        </QuickViewSheet>
      ) : null}
    </AnimatePresence>
    </>
  );
}

function describeNearbyProblem(location: CatalogLocation): string | null {
  switch (location.status) {
    case "locating":
      return location.active ? "Buscando tu ubicación…" : null;
    case "denied":
      return "No pudimos usar tu ubicación. Revisá el permiso del navegador y probá de nuevo.";
    case "unavailable":
      return "Tu dispositivo no pudo darnos la ubicación en este momento.";
    case "no-coordinates":
      return `No tenemos la ubicación de ${location.anchorName ?? "esa actividad"} para buscar cerca.`;
    default:
      return null;
  }
}
