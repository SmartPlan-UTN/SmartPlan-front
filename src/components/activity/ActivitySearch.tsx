"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";

import {
  CategoryChips,
  FiltersPanel,
  Pagination,
  type SortOption,
} from "@/components/explore";
import { Button, Icon } from "@/components/ui";
import { useDebouncedValue, useExplorationFilters, useExplorationSearch } from "@/hooks";
import { searchActivities } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import type { ActivitySearchParams, ActivitySortField } from "@/types";

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
export function ActivitySearch() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  // Set by the "Buscar" button or Enter, to search immediately instead of
  // waiting out the debounce. Cleared on the next keystroke so debounce
  // resumes driving the search normally.
  const [manualQuery, setManualQuery] = useState<string | null>(null);
  const effectiveQuery = manualQuery ?? debouncedQuery;

  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const params = useMemo<ActivitySearchParams>(
    () => ({
      search: effectiveQuery.trim() || undefined,
      categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
      minPrice: toNumber(debouncedMinPrice),
      maxPrice: toNumber(debouncedMaxPrice),
      minRating: toNumber(debouncedMinRating),
      sortBy,
      direction,
    }),
    [
      effectiveQuery,
      categoryIds,
      debouncedMinPrice,
      debouncedMaxPrice,
      debouncedMinRating,
      sortBy,
      direction,
    ],
  );

  const mapFiltersQuery = useMemo(() => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set("search", params.search);
    if (params.categoryIds && params.categoryIds.length > 0) {
      searchParams.set("categoryIds", params.categoryIds.join(","));
    }
    if (params.minPrice != null) searchParams.set("minPrice", String(params.minPrice));
    if (params.maxPrice != null) searchParams.set("maxPrice", String(params.maxPrice));
    if (params.minRating != null) searchParams.set("minRating", String(params.minRating));
    const query = searchParams.toString();
    return query ? `${ROUTES.exploreMap}?${query}` : ROUTES.exploreMap;
  }, [params]);

  const { items, pagination, status, errorMessage, hasResults, page, goToPage, retry } =
    useExplorationSearch(searchActivities, params, PAGE_SIZE);

  const resultsCountLabel =
    pagination != null
      ? pagination.total === 1
        ? "actividad encontrada"
        : "actividades encontradas"
      : null;
  // Once there's a grid on screen, a refetch (chip, filter, page) dims it
  // in place instead of swapping it for the big loading state — that swap
  // is what caused the flash on every click.
  const isRefetching = status === "loading" && hasResults;

  return (
    <div className={exploreStyles.searchScreen}>
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
          aria-label="Buscar actividades"
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

      <CategoryChips selectedIds={categoryIds} onToggle={toggleCategory} />

      {pagination != null ? (
        <div className={exploreStyles.toolbar}>
          {hasResults ? (
            <p className={`sp-body ${styles.resultsLabel}`}>
              <strong>{pagination.total}</strong> {resultsCountLabel} cerca tuyo
            </p>
          ) : (
            <span />
          )}

          <div className={exploreStyles.toolbarActions}>
            <Link href={mapFiltersQuery} className={exploreStyles.toolbarLink}>
              <Icon name="map" size={14} aria-hidden="true" />
              Ver mapa
            </Link>
            <Button
              variant="ghostLight"
              size="sm"
              aria-expanded={filtersOpen}
              onClick={() => {
                setFiltersOpen((open) => !open);
              }}
            >
              <Icon name="sliders-horizontal" size={14} aria-hidden="true" />
              Filtros
            </Button>
          </div>
        </div>
      ) : null}

      {filtersOpen ? (
        <FiltersPanel
          minPrice={minPrice}
          onMinPriceChange={setMinPrice}
          maxPrice={maxPrice}
          onMaxPriceChange={setMaxPrice}
          minRating={minRating}
          onMinRatingChange={setMinRating}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOptions={SORT_OPTIONS}
          direction={direction}
          onDirectionChange={setDirection}
          onClear={clearFilters}
        />
      ) : null}

      {status === "loading" && !hasResults ? (
        <div className={styles.stateBlock}>
          <div className={styles.loadingDots}>
            <span className={styles.loadingDot} />
            <span className={styles.loadingDot} />
            <span className={styles.loadingDot} />
          </div>
          <p className="sp-body">Buscando lo mejor cerca tuyo...</p>
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
            No encontramos actividades para tu búsqueda. Probá con otras
            palabras o ajustando los filtros.
          </p>
        </div>
      ) : null}

      {hasResults ? (
        <div
          className={`${exploreStyles.resultsFade} ${isRefetching ? exploreStyles.resultsFadeLoading : ""}`}
        >
          <div className={exploreStyles.grid}>
            {items.map((activity) => (
              <ActivityCard activity={activity} key={activity.id} />
            ))}
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
  );
}
