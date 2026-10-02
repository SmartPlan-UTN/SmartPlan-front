"use client";

import { useId, useState } from "react";

import { Icon } from "@/components/ui";
import type { OutingFilters, OutingSort } from "@/types";

import { OUTINGS_COPY } from "./outingsContent";
import styles from "./outings.module.css";

export interface OutingsFiltersProps {
  /** The search box's text, as typed (the view debounces it). */
  searchText: string;
  onSearchTextChange: (text: string) => void;
  filters: OutingFilters;
  onFiltersChange: (filters: OutingFilters) => void;
  /** "Valoradas / Sin valorar" only makes sense for done outings. */
  showRated: boolean;
  onClear: () => void;
}

const SORTS: ReadonlyArray<{ value: OutingSort; label: string }> = [
  { value: "recent", label: OUTINGS_COPY.filters.sort.recent },
  { value: "oldest", label: OUTINGS_COPY.filters.sort.oldest },
  { value: "cost_desc", label: OUTINGS_COPY.filters.sort.costDesc },
  { value: "cost_asc", label: OUTINGS_COPY.filters.sort.costAsc },
];

const RATED: ReadonlyArray<{ value: boolean | undefined; label: string }> = [
  { value: undefined, label: OUTINGS_COPY.filters.rated.all },
  { value: true, label: OUTINGS_COPY.filters.rated.yes },
  { value: false, label: OUTINGS_COPY.filters.rated.no },
];

/** How many filters besides the search box are narrowing the list. */
export function activeFilterCount(filters: OutingFilters, showRated: boolean): number {
  return [
    filters.from,
    filters.to,
    filters.sort && filters.sort !== "recent" ? filters.sort : undefined,
    showRated ? filters.rated : undefined,
  ].filter((value) => value !== undefined && value !== "").length;
}

/**
 * Search, date range, order and (in Realizadas) feedback for "Mis salidas"
 * (#134). On a phone everything but the search folds behind "Filtros".
 */
export function OutingsFilters({
  searchText,
  onSearchTextChange,
  filters,
  onFiltersChange,
  showRated,
  onClear,
}: OutingsFiltersProps) {
  const ids = {
    search: useId(),
    from: useId(),
    to: useId(),
    sort: useId(),
    panel: useId(),
  };
  const [panelOpen, setPanelOpen] = useState(false);
  const count = activeFilterCount(filters, showRated);
  const anyActive = count > 0 || searchText.trim() !== "";

  function update(changes: Partial<OutingFilters>) {
    onFiltersChange({ ...filters, ...changes });
  }

  return (
    <div className={styles.filters} role="search" aria-label={OUTINGS_COPY.filters.label}>
      <div className={styles.filtersTop}>
        <label htmlFor={ids.search} className={styles.searchField}>
          <Icon name="search" size={16} aria-hidden="true" />
          <span className="sp-sr-only">{OUTINGS_COPY.filters.searchLabel}</span>
          <input
            id={ids.search}
            type="search"
            value={searchText}
            placeholder={OUTINGS_COPY.filters.searchPlaceholder}
            maxLength={200}
            onChange={(event) => onSearchTextChange(event.target.value)}
          />
          {searchText ? (
            <button
              type="button"
              className={styles.searchClear}
              onClick={() => onSearchTextChange("")}
              aria-label={OUTINGS_COPY.filters.clearSearch}
            >
              <Icon name="x" size={14} aria-hidden="true" />
            </button>
          ) : null}
        </label>

        <button
          type="button"
          className={styles.filtersToggle}
          aria-expanded={panelOpen}
          aria-controls={ids.panel}
          onClick={() => setPanelOpen((open) => !open)}
        >
          <Icon name="sliders-horizontal" size={16} aria-hidden="true" />
          {OUTINGS_COPY.filters.toggle}
          {count > 0 ? <span className={styles.filtersBadge}>{count}</span> : null}
        </button>
      </div>

      <div
        id={ids.panel}
        className={panelOpen ? `${styles.filtersPanel} ${styles.filtersPanelOpen}` : styles.filtersPanel}
      >
        <div className={styles.field}>
          <label htmlFor={ids.from} className={styles.fieldLabel}>
            {OUTINGS_COPY.filters.from}
          </label>
          <input
            id={ids.from}
            type="date"
            className={styles.fieldControl}
            value={filters.from ?? ""}
            max={filters.to || undefined}
            onChange={(event) => update({ from: event.target.value || undefined })}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={ids.to} className={styles.fieldLabel}>
            {OUTINGS_COPY.filters.to}
          </label>
          <input
            id={ids.to}
            type="date"
            className={styles.fieldControl}
            value={filters.to ?? ""}
            min={filters.from || undefined}
            onChange={(event) => update({ to: event.target.value || undefined })}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={ids.sort} className={styles.fieldLabel}>
            {OUTINGS_COPY.filters.sortLabel}
          </label>
          <select
            id={ids.sort}
            className={styles.fieldControl}
            value={filters.sort ?? "recent"}
            onChange={(event) => update({ sort: event.target.value as OutingSort })}
          >
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </div>

        {showRated ? (
          <div className={styles.field}>
            <span className={styles.fieldLabel} id={`${ids.panel}-rated`}>
              {OUTINGS_COPY.filters.rated.label}
            </span>
            <div className={styles.segmented} role="radiogroup" aria-labelledby={`${ids.panel}-rated`}>
              {RATED.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  role="radio"
                  aria-checked={filters.rated === option.value}
                  className={
                    filters.rated === option.value
                      ? `${styles.segment} ${styles.segmentActive}`
                      : styles.segment
                  }
                  onClick={() => update({ rated: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {anyActive ? (
          <button type="button" className={styles.filtersClear} onClick={onClear}>
            {OUTINGS_COPY.filters.clear}
          </button>
        ) : null}
      </div>
    </div>
  );
}
