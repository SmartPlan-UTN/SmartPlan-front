"use client";

import { useCallback, useMemo, useState } from "react";

import {
  CategoryChips,
  FiltersPanel,
  Pagination,
  type SortOption,
} from "@/components/explore";
import { Button, Icon, LoadingDots } from "@/components/ui";
import { useDebouncedValue, useExplorationFilters, useExplorationSearch } from "@/hooks";
import { searchPlans } from "@/lib/api";
import type { PlanSearchParams, PlanSortField } from "@/types";

import { PlanCard } from "./PlanCard";
import exploreStyles from "../explore/explore.module.css";
// Search field, loading/empty/error states, and "Cargar más" are visually
// identical to ActivitySearch's — shared here on purpose instead of
// duplicating the same CSS a second time.
import activityStyles from "../activity/activity.module.css";

// 12 keeps a page light regardless of viewport: 4x3, 3x4, or 2x6 in the
// responsive grid, never a wall of 20 cards on a narrow screen.
const PAGE_SIZE = 12;
const DEBOUNCE_MS = 400;

// "Distancia" isn't offered: sorting/filtering by distance needs the user's
// coordinates, and nothing in this screen captures geolocation yet — the
// backend rejects a distance sort with no lat/lng (400 INCOMPLETE_LOCATION_FILTER).
const SORT_OPTIONS: SortOption<PlanSortField>[] = [
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
 * Plan search box, filters, sort, and results grid (CU12 · PAN 10/11).
 * Mirrors `ActivitySearch` field for field — see `useExplorationSearch` for
 * the shared fetch/pagination/error orchestration.
 */
export function PlanSearch() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
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
  } = useExplorationFilters<PlanSortField>("relevance");

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

  const params = useMemo<PlanSearchParams>(
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

  const { items, pagination, status, errorMessage, hasResults, page, goToPage, retry } =
    useExplorationSearch(searchPlans, params, PAGE_SIZE);

  const resultsCountLabel =
    pagination != null
      ? pagination.total === 1
        ? "plan encontrado"
        : "planes encontrados"
      : null;
  // Once there's a grid on screen, a refetch (chip, filter, page) dims it
  // in place instead of swapping it for the big loading state — that swap
  // is what caused the flash on every click.
  const isRefetching = status === "loading" && hasResults;

  return (
    <div className={exploreStyles.searchScreen}>
      <div className={activityStyles.searchField}>
        <Icon
          name="search"
          size={18}
          className={activityStyles.searchIcon}
          aria-hidden="true"
        />
        <input
          type="search"
          className={activityStyles.searchInput}
          placeholder="Buscá un plan, tema o experiencia"
          aria-label="Buscar planes"
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
            <p className={`sp-body ${activityStyles.resultsLabel}`}>
              <strong>{pagination.total}</strong> {resultsCountLabel} cerca tuyo
            </p>
          ) : (
            <span />
          )}

          <div className={exploreStyles.toolbarActions}>
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
        <div className={exploreStyles.transitionState}>
          <LoadingDots
            title="Armando tu plan perfecto..."
            label={effectiveQuery.trim() ? `"${effectiveQuery.trim()}"` : "Buscando lo mejor cerca tuyo"}
          />
        </div>
      ) : null}

      {status === "error" && !hasResults ? (
        <div className={activityStyles.stateBlock} role="alert">
          <Icon
            name="triangle-alert"
            size={32}
            className={activityStyles.errorIcon}
          />
          <h2 className="sp-h3">Algo salió mal</h2>
          <p className="sp-body">{errorMessage}</p>
          <Button variant="ghostEmber" onClick={retry}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {status === "idle" && !hasResults ? (
        <div className={activityStyles.stateBlock}>
          <Icon name="inbox" size={32} className={activityStyles.stateIcon} />
          <h2 className="sp-h3">Sin resultados</h2>
          <p className="sp-body">
            No encontramos planes para tu búsqueda. Probá con otras palabras o
            ajustando los filtros.
          </p>
        </div>
      ) : null}

      {hasResults ? (
        <div
          className={`${exploreStyles.resultsFade} ${isRefetching ? exploreStyles.resultsFadeLoading : ""}`}
        >
          <div className={exploreStyles.grid}>
            {items.map((plan) => (
              <PlanCard plan={plan} key={plan.id} />
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
            <p className={`sp-small ${activityStyles.errorIcon}`} role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
