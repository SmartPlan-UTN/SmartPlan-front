"use client";

import { Button, Select } from "@/components/ui";
import type { LocationOption, SortDirection } from "@/types";

import styles from "./explore.module.css";

const DIRECTION_OPTIONS = [
  { value: "asc" as const, label: "Ascendente" },
  { value: "desc" as const, label: "Descendente" },
];

const ANY_LOCATION = "";

export interface SortOption<TSortField extends string> {
  value: TSortField;
  label: string;
}

/**
 * "Provincia"/"Localidad" cascading filter (CU10). Only activities have a
 * location to filter by — `PlanSearch` doesn't pass this prop, and the
 * fields don't render without it.
 */
export interface LocationFilterProps {
  cities: LocationOption[];
  cityId: number | null;
  onCityIdChange: (value: number | null) => void;
  departments: LocationOption[];
  departmentId: number | null;
  onDepartmentIdChange: (value: number | null) => void;
  departmentsLoading?: boolean;
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
  location?: LocationFilterProps;
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
  location,
}: FiltersPanelProps<TSortField>) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelGrid}>
        {location ? (
          <>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Provincia</span>
              <Select
                value={location.cityId === null ? ANY_LOCATION : String(location.cityId)}
                onChange={(value) => {
                  location.onCityIdChange(value === ANY_LOCATION ? null : Number(value));
                }}
                options={[
                  { value: ANY_LOCATION, label: "Cualquiera" },
                  ...location.cities.map((city) => ({
                    value: String(city.id),
                    label: city.name,
                  })),
                ]}
                aria-label="Provincia"
              />
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Localidad</span>
              <Select
                value={
                  location.departmentId === null
                    ? ANY_LOCATION
                    : String(location.departmentId)
                }
                onChange={(value) => {
                  location.onDepartmentIdChange(
                    value === ANY_LOCATION ? null : Number(value),
                  );
                }}
                options={[
                  {
                    value: ANY_LOCATION,
                    label:
                      location.cityId === null
                        ? "Elegí provincia"
                        : location.departmentsLoading
                          ? "Cargando..."
                          : "Cualquiera",
                  },
                  ...location.departments.map((department) => ({
                    value: String(department.id),
                    label: department.name,
                  })),
                ]}
                aria-label="Localidad"
              />
            </div>
          </>
        ) : null}
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
