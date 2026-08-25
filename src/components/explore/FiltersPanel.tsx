"use client";

import { Button, Select } from "@/components/ui";
import type { SortDirection } from "@/types";

import styles from "./explore.module.css";

const DIRECTION_OPTIONS = [
  { value: "asc" as const, label: "Ascendente" },
  { value: "desc" as const, label: "Descendente" },
];

export interface SortOption<TSortField extends string> {
  value: TSortField;
  label: string;
}

export interface FiltersPanelProps<TSortField extends string> {
  minPrice: string;
  onMinPriceChange: (value: string) => void;
  maxPrice: string;
  onMaxPriceChange: (value: string) => void;
  minRating: string;
  onMinRatingChange: (value: string) => void;
  sortBy: TSortField;
  onSortByChange: (value: TSortField) => void;
  sortOptions: SortOption<TSortField>[];
  direction: SortDirection;
  onDirectionChange: (value: SortDirection) => void;
  onClear: () => void;
}

/**
 * Advanced filters (CU10: price range, minimum rating) and sort (CU11),
 * opened from the "Filtros" toolbar button. SmartPlanSystemDesign's
 * Results.jsx has the button but never designed the panel it opens — this
 * layout follows the rest of the design system (card surface, `--r-card`,
 * the same field styles as everywhere else) instead of copying a mockup
 * that doesn't exist.
 */
export function FiltersPanel<TSortField extends string>({
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  minRating,
  onMinRatingChange,
  sortBy,
  onSortByChange,
  sortOptions,
  direction,
  onDirectionChange,
  onClear,
}: FiltersPanelProps<TSortField>) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Precio mínimo</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="$0"
            className={styles.input}
            value={minPrice}
            onChange={(event) => {
              onMinPriceChange(event.target.value);
            }}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Precio máximo</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Sin límite"
            className={styles.input}
            value={maxPrice}
            onChange={(event) => {
              onMaxPriceChange(event.target.value);
            }}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Rating mínimo</span>
          <input
            type="number"
            inputMode="decimal"
            min={1}
            max={5}
            step={0.5}
            placeholder="Cualquiera"
            className={styles.input}
            value={minRating}
            onChange={(event) => {
              onMinRatingChange(event.target.value);
            }}
          />
        </label>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Ordenar por</span>
          <Select
            value={sortBy}
            onChange={onSortByChange}
            options={sortOptions}
            aria-label="Ordenar por"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Dirección</span>
          <Select
            value={direction}
            onChange={onDirectionChange}
            options={DIRECTION_OPTIONS}
            aria-label="Dirección"
          />
        </div>
      </div>

      <div className={styles.panelActions}>
        <Button variant="ghostLight" size="sm" onClick={onClear}>
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}
