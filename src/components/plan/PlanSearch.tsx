"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

// How long the "Armando tu plan perfecto..." transition stays up, at
// minimum, once it starts — see the doc comment on `showTransition` below.
const TRANSITION_MIN_MS = 3000;

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

  // A real fetch can resolve in well under a second — too fast for
  // "Armando tu plan perfecto..." to read as anything happening at all.
  // `holdingTransition` keeps the transition up for `TRANSITION_MIN_MS`
  // once it starts, regardless of how quickly the real request finishes,
  // so it reads as the plan actually being put together rather than a
  // flash. It never *extends* a slow request — a fetch that takes longer
  // than the minimum just keeps the transition up on its own, the same
  // way `status === "loading"` already would.
  const firstLoadInFlight = status === "loading" && !hasResults;
  // Seeded from `firstLoadInFlight`: `useExplorationSearch` starts
  // `status` at `"loading"`, so the very first render already needs the
  // hold armed — the render-time edge detection below only ever fires on
  // a *change*, which the initial mount isn't.
  const [holdingTransition, setHoldingTransition] = useState(firstLoadInFlight);

  // Adjusting state during render (not inside an effect, and via `useState`
  // rather than a ref — this codebase's lint config disallows reading a
  // ref during render) so the hold starts the instant `firstLoadInFlight`
  // turns true, not one render later. This is React's own documented
  // pattern for reacting to a value's edge without an extra
  // effect-triggered render pass; the guard means it only ever fires once
  // per actual transition. `react-hooks/set-state-in-effect` disallows the
  // analogous synchronous `setState` inside `useEffect`, which is exactly
  // why this isn't in one.
  const [prevFirstLoadInFlight, setPrevFirstLoadInFlight] = useState(firstLoadInFlight);
  if (firstLoadInFlight !== prevFirstLoadInFlight) {
    setPrevFirstLoadInFlight(firstLoadInFlight);
    if (firstLoadInFlight) {
      setHoldingTransition(true);
    }
  }

  // The timer itself is a real external-system side effect, so it belongs
  // in an effect — the eventual `setHoldingTransition(false)` still only
  // ever runs inside the timeout callback, not synchronously in the
  // effect body (same shape as `useDebouncedValue`).
  useEffect(() => {
    if (!holdingTransition) return;
    const timer = setTimeout(() => {
      setHoldingTransition(false);
    }, TRANSITION_MIN_MS);
    return () => clearTimeout(timer);
  }, [holdingTransition]);

  const showTransition = firstLoadInFlight || holdingTransition;

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

      {pagination != null && !showTransition ? (
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

      {showTransition ? (
        <div className={exploreStyles.transitionState}>
          <LoadingDots
            title="Armando tu plan perfecto..."
            label={effectiveQuery.trim() ? `"${effectiveQuery.trim()}"` : "Buscando lo mejor cerca tuyo"}
          />
        </div>
      ) : null}

      {status === "error" && !hasResults && !showTransition ? (
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

      {status === "idle" && !hasResults && !showTransition ? (
        <div className={activityStyles.stateBlock}>
          <Icon name="inbox" size={32} className={activityStyles.stateIcon} />
          <h2 className="sp-h3">Sin resultados</h2>
          <p className="sp-body">
            No encontramos planes para tu búsqueda. Probá con otras palabras o
            ajustando los filtros.
          </p>
        </div>
      ) : null}

      {hasResults && !showTransition ? (
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
