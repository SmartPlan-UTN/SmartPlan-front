"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

import {
  ExploreLayout,
  FiltersPanel,
  Pagination,
  SortControl,
  type SortOption,
} from "@/components/explore";
import { PlaceCard } from "@/components/explore/PlaceCard";
import { Button, Chip, Icon, LoadingDots } from "@/components/ui";
import { useDebouncedValue, useExplorationFilters, useExplorationSearch } from "@/hooks";
import { listCities, listDepartments, searchExplore } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import type {
  ActivitySortField,
  ExploreItemType,
  ExploreSearchParams,
  LocationOption,
} from "@/types";

import { ActivityCard } from "./ActivityCard";
import styles from "./activity.module.css";
import exploreStyles from "../explore/explore.module.css";

// 12 keeps a page light regardless of viewport: 4x3, 3x4, or 2x6 in the
// responsive grid, never a wall of 20 cards on a narrow screen.
const PAGE_SIZE = 12;
const DEBOUNCE_MS = 400;

// "Distancia" isn't offered: sorting/filtering by distance needs the user's
// coordinates, and nothing in this screen captures geolocation yet — the
// backend rejects a distance sort with no lat/lng (400 INCOMPLETE_LOCATION_FILTER).
const SORT_OPTIONS: SortOption<ActivitySortField>[] = [
  { value: "relevance", label: "Relevancia" },
  { value: "price", label: "Precio" },
  { value: "rating", label: "Rating" },
];

const ITEM_TYPES: Array<{ value: ExploreItemType; label: string }> = [
  { value: "ALL", label: "Todo" },
  { value: "ACTIVITY", label: "Actividades" },
  { value: "PLACE", label: "Lugares" },
];

function toNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Activity search box, filters, sort, and results grid (CU9-CU11 · PAN 11).
 * Debounces the query, renders loading/empty/error states, and paginates
 * page by page (not infinite scroll).
 */
export function ActivitySearch({ head }: { head?: ReactNode }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  // Set by the "Buscar" button or Enter, to search immediately instead of
  // waiting out the debounce. Cleared on the next keystroke so debounce
  // resumes driving the search normally.
  const [manualQuery, setManualQuery] = useState<string | null>(null);
  const effectiveQuery = manualQuery ?? debouncedQuery;

  const {
    categoryIds,
    minPrice,
    maxPrice,
    minRating,
    sortBy,
    direction,
    setMinPrice,
    setMaxPrice,
    setMinRating,
    setSortBy,
    setDirection,
    toggleCategory,
    clear: clearFilters,
  } = useExplorationFilters<ActivitySortField>("relevance");

  // "Provincia"/"Localidad" (CU10): kept outside `useExplorationFilters`
  // since it's shared with `PlanSearch`, which has no location to filter by.
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [cityId, setCityId] = useState<number | null>(null);
  const [departments, setDepartments] = useState<LocationOption[]>([]);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  // Activities are things to do; places (wineries, parks...) without a
  // verified activity yet are discoverable too, but shown as places.
  const [itemType, setItemType] = useState<ExploreItemType>("ALL");
  const [activityType, setActivityType] = useState("");

  useEffect(() => {
    let active = true;
    listCities()
      .then((result) => {
        if (active) setCities(result.data);
      })
      .catch(() => {
        // A failed lookup just leaves the "Provincia" filter without
        // options — the rest of the search still works.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // No fetch for `null`: `handleCityIdChange` already clears `departments`
    // itself the moment "Provincia" changes, so there's nothing to
    // synchronize here — an effect resetting it too would just be a second,
    // redundant `setState` reacting to its own cause.
    if (cityId === null) {
      return;
    }

    const selectedCityId = cityId;
    let active = true;

    async function run() {
      setDepartmentsLoading(true);
      try {
        const result = await listDepartments(selectedCityId);
        if (active) setDepartments(result.data);
      } catch {
        if (active) setDepartments([]);
      } finally {
        if (active) setDepartmentsLoading(false);
      }
    }
    void run();

    return () => {
      active = false;
    };
  }, [cityId]);

  const handleCityIdChange = useCallback((value: number | null) => {
    setCityId(value);
    // A department only makes sense within its own city: switching
    // "Provincia" without resetting it would silently keep filtering by a
    // locality that isn't even offered as an option anymore.
    setDepartmentId(null);
    setDepartments([]);
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setManualQuery(null);
  }, []);

  const searchNow = useCallback(() => {
    setManualQuery(query);
  }, [query]);

  // Same debounce as the search box: typing a price/rating shouldn't fire a
  // request per keystroke.
  const debouncedMinPrice = useDebouncedValue(minPrice, DEBOUNCE_MS);
  const debouncedMaxPrice = useDebouncedValue(maxPrice, DEBOUNCE_MS);
  const debouncedMinRating = useDebouncedValue(minRating, DEBOUNCE_MS);

  const params = useMemo<ExploreSearchParams>(
    () => ({
      search: effectiveQuery.trim() || undefined,
      type: activityType || undefined,
      itemType: itemType === "ALL" ? undefined : itemType,
      categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
      minPrice: toNumber(debouncedMinPrice),
      maxPrice: toNumber(debouncedMaxPrice),
      minRating: toNumber(debouncedMinRating),
      cityId: cityId ?? undefined,
      departmentId: departmentId ?? undefined,
      sortBy,
      direction,
    }),
    [
      itemType,
      activityType,
      effectiveQuery,
      categoryIds,
      debouncedMinPrice,
      debouncedMaxPrice,
      debouncedMinRating,
      cityId,
      departmentId,
      sortBy,
      direction,
    ],
  );

  const mapFiltersQuery = useMemo(() => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set("search", params.search);
    if (params.type) searchParams.set("type", params.type);
    if (params.itemType) searchParams.set("itemType", params.itemType);
    if (params.categoryIds && params.categoryIds.length > 0) {
      searchParams.set("categoryIds", params.categoryIds.join(","));
    }
    if (params.minPrice != null) searchParams.set("minPrice", String(params.minPrice));
    if (params.maxPrice != null) searchParams.set("maxPrice", String(params.maxPrice));
    if (params.minRating != null) searchParams.set("minRating", String(params.minRating));
    if (params.cityId != null) searchParams.set("cityId", String(params.cityId));
    if (params.departmentId != null) {
      searchParams.set("departmentId", String(params.departmentId));
    }
    const query = searchParams.toString();
    return query ? `${ROUTES.exploreMap}?${query}` : ROUTES.exploreMap;
  }, [params]);

  const { items, pagination, status, errorMessage, hasResults, page, goToPage, retry } =
    useExplorationSearch(searchExplore, params, PAGE_SIZE);

  const resultsCountLabel =
    pagination != null
      ? itemType === "ACTIVITY"
        ? pagination.total === 1
          ? "actividad en Mendoza"
          : "actividades en Mendoza"
        : itemType === "PLACE"
          ? pagination.total === 1
            ? "lugar en Mendoza"
            : "lugares en Mendoza"
          : pagination.total === 1
            ? "resultado en Mendoza"
            : "actividades y lugares en Mendoza"
      : null;
  // Once there's a grid on screen, a refetch (chip, filter, page) dims it
  // in place instead of swapping it for the big loading state — that swap
  // is what caused the flash on every click.
  const isRefetching = status === "loading" && hasResults;

  // Shown on the narrow-screen "Filtros" toggle, so a folded sidebar never
  // filters silently.
  const activeFilters =
    categoryIds.length +
    [minPrice, maxPrice, minRating].filter((value) => value.trim() !== "").length +
    (cityId !== null ? 1 : 0) +
    (activityType ? 1 : 0) +
    (departmentId !== null ? 1 : 0);

  return (
    <ExploreLayout
      head={head}
      activeFilters={activeFilters}
      filters={
        <FiltersPanel
          minPrice={minPrice}
          onMinPriceChange={setMinPrice}
          maxPrice={maxPrice}
          onMaxPriceChange={setMaxPrice}
          minRating={minRating}
          onMinRatingChange={setMinRating}
          categoryIds={categoryIds}
          onToggleCategory={toggleCategory}
          activityType={{ value: activityType, onChange: (value) => { setActivityType(value); if (value) setItemType("ACTIVITY"); } }}
          onClear={() => {
            clearFilters();
            setActivityType("");
            handleCityIdChange(null);
          }}
          location={{
            cities,
            cityId,
            onCityIdChange: handleCityIdChange,
            departments,
            departmentId,
            onDepartmentIdChange: setDepartmentId,
            departmentsLoading,
          }}
        />
      }
    >
      <div className={exploreStyles.searchScreen}>
        <div className={exploreStyles.searchRow}>
          <div className={styles.searchField}>
            <Icon
              name="search"
              size={18}
              className={styles.searchIcon}
              aria-hidden="true"
            />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Buscá una actividad, lugar o experiencia"
              aria-label="Buscar actividades y lugares"
              value={query}
              onChange={(event) => {
                handleQueryChange(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  searchNow();
                }
              }}
            />
            <Button variant="primary" size="sm" onClick={searchNow}>
              Buscar
            </Button>
          </div>
          <Link href={mapFiltersQuery} className={exploreStyles.searchMapLink}>
            <Icon name="map" size={16} aria-hidden="true" />
            Ver mapa
          </Link>
        </div>

        <div
          className={exploreStyles.itemTypeRow}
          role="group"
          aria-label="Qué mostrar"
        >
          {ITEM_TYPES.map((option) => (
            <Chip
              key={option.value}
              active={itemType === option.value}
              onClick={() => { setItemType(option.value); if (option.value === "PLACE") setActivityType(""); }}
            >
              {option.label}
            </Chip>
          ))}
        </div>

        <div className={exploreStyles.toolbar}>
          {pagination != null && hasResults ? (
            <p className={`sp-body ${styles.resultsLabel}`}>
              <strong>{pagination.total}</strong> {resultsCountLabel}
            </p>
          ) : (
            <span />
          )}
          <SortControl
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOptions={SORT_OPTIONS}
            direction={direction}
            onDirectionChange={setDirection}
          />
        </div>

        {status === "loading" && !hasResults ? (
          <div className={styles.stateBlock}>
            <LoadingDots label="Buscando lo mejor cerca tuyo..." />
          </div>
        ) : null}

        {status === "error" && !hasResults ? (
          <div className={styles.stateBlock} role="alert">
            <Icon
              name="triangle-alert"
              size={32}
              className={styles.errorIcon}
            />
            <h2 className="sp-h3">Algo salió mal</h2>
            <p className="sp-body">{errorMessage}</p>
            <Button variant="ghostEmber" onClick={retry}>
              Reintentar
            </Button>
          </div>
        ) : null}

        {status === "idle" && !hasResults ? (
          <div className={styles.stateBlock}>
            <Icon name="inbox" size={32} className={styles.stateIcon} />
            <h2 className="sp-h3">Sin resultados</h2>
            <p className="sp-body">
              No encontramos actividades ni lugares para tu búsqueda. Probá
              con otras palabras o ajustando los filtros.
            </p>
          </div>
        ) : null}

        {hasResults ? (
          <div
            className={`${exploreStyles.resultsFade} ${isRefetching ? exploreStyles.resultsFadeLoading : ""}`}
          >
            <div className={exploreStyles.grid}>
              {items.map((item) =>
                item.itemType === "PLACE" ? (
                  <PlaceCard item={item} key={`place-${item.id}`} />
                ) : (
                  <ActivityCard activity={item} key={`activity-${item.id}`} />
                ),
              )}
            </div>

            {pagination ? (
              <Pagination
                page={page}
                totalPages={pagination.totalPages}
                onPageChange={goToPage}
                disabled={isRefetching}
              />
            ) : null}

            {status === "error" ? (
              <p className={`sp-small ${styles.errorIcon}`} role="alert">
                {errorMessage}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </ExploreLayout>
  );
}
