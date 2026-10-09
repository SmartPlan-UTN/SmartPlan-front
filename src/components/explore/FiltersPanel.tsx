"use client";

import { useEffect, useId, useState } from "react";

import { Select } from "@/components/ui";
import type { CategoryOption, LocationOption } from "@/types";

import { getCategoriesOnce } from "./categoryCatalog";
import styles from "./explore.module.css";

const ANY_LOCATION = "";

/** Categories shown before "Ver todas": enough to scan, short enough not
 * to push the other sections out of view. */
const VISIBLE_CATEGORIES = 6;

const RATING_OPTIONS = [
  { value: "", label: "Cualquiera" },
  { value: "3", label: "3 ★ o más" },
  { value: "4", label: "4 ★ o más" },
  { value: "4.5", label: "4,5 ★ o más" },
];

/**
 * "Provincia"/"Localidad" cascading filter (CU10). Only activities have a
 * location to filter by — `PlanSearch` doesn't pass this prop, and the
 * section doesn't render without it.
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

export interface FiltersPanelProps {
  minPrice: string;
  onMinPriceChange: (value: string) => void;
  maxPrice: string;
  onMaxPriceChange: (value: string) => void;
  minRating: string;
  onMinRatingChange: (value: string) => void;
  categoryIds: number[];
  onToggleCategory: (categoryId: number) => void;
  onClear: () => void;
  location?: LocationFilterProps;
}

/**
 * The Explorar sidebar (CU10): every filter in view at once, one section
 * each — location, price range, minimum rating, categories. Sorting (CU11)
 * is not here: it orders the results rather than narrowing them, so it sits
 * in the results toolbar (`SortControl`).
 */
export function FiltersPanel({
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  minRating,
  onMinRatingChange,
  categoryIds,
  onToggleCategory,
  onClear,
  location,
}: FiltersPanelProps) {
  const ratingName = useId();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    let ignore = false;
    getCategoriesOnce()
      .then((data) => {
        if (!ignore) setCategories(data);
      })
      .catch(() => {
        // Categories are one filter among several: if the catalog fails to
        // load, the section just doesn't render and the rest still works.
      });
    return () => {
      ignore = true;
    };
  }, []);

  const visibleCategories = showAllCategories
    ? categories
    : categories.slice(0, VISIBLE_CATEGORIES);

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHead}>
        <h2 className={styles.sidebarTitle}>Filtros</h2>
        <button type="button" className={styles.sidebarLink} onClick={onClear}>
          Limpiar
        </button>
      </div>

      {location ? (
        <section className={styles.filterSection} aria-labelledby={`${ratingName}-location`}>
          <h3 id={`${ratingName}-location`} className={styles.filterHeading}>
            Ubicación
          </h3>
          <Select
            value={location.cityId === null ? ANY_LOCATION : String(location.cityId)}
            onChange={(value) => {
              location.onCityIdChange(value === ANY_LOCATION ? null : Number(value));
            }}
            options={[
              { value: ANY_LOCATION, label: "Cualquier provincia" },
              ...location.cities.map((city) => ({
                value: String(city.id),
                label: city.name,
              })),
            ]}
            aria-label="Provincia"
          />
          <Select
            value={
              location.departmentId === null ? ANY_LOCATION : String(location.departmentId)
            }
            onChange={(value) => {
              location.onDepartmentIdChange(value === ANY_LOCATION ? null : Number(value));
            }}
            options={[
              {
                value: ANY_LOCATION,
                label:
                  location.cityId === null
                    ? "Elegí una provincia"
                    : location.departmentsLoading
                      ? "Cargando..."
                      : "Cualquier localidad",
              },
              ...location.departments.map((department) => ({
                value: String(department.id),
                label: department.name,
              })),
            ]}
            aria-label="Localidad"
          />
        </section>
      ) : null}

      <section className={styles.filterSection} aria-labelledby={`${ratingName}-price`}>
        <h3 id={`${ratingName}-price`} className={styles.filterHeading}>
          Precio
        </h3>
        <div className={styles.priceRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Mínimo</span>
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
            <span className={styles.fieldLabel}>Máximo</span>
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
        </div>
      </section>

      <div className={styles.filterSection}>
        <fieldset className={styles.fieldset}>
          <legend className={styles.filterHeading}>Rating mínimo</legend>
          {RATING_OPTIONS.map((option) => (
            <label key={option.value || "any"} className={styles.option}>
              <input
                type="radio"
                name={ratingName}
                className={styles.radio}
                checked={minRating === option.value}
                onChange={() => {
                  onMinRatingChange(option.value);
                }}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      </div>

      {categories.length > 0 ? (
        <div className={styles.filterSection}>
          <fieldset className={styles.fieldset}>
            <legend className={styles.filterHeading}>Categorías</legend>
            {visibleCategories.map((category) => (
              <label key={category.id} className={styles.option}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={categoryIds.includes(category.id)}
                  onChange={() => {
                    onToggleCategory(category.id);
                  }}
                />
                {category.name}
              </label>
            ))}
            {categories.length > VISIBLE_CATEGORIES ? (
              <button
                type="button"
                className={styles.sidebarLink}
                aria-expanded={showAllCategories}
                onClick={() => {
                  setShowAllCategories((open) => !open);
                }}
              >
                {showAllCategories ? "Ver menos" : `Ver todas (${categories.length})`}
              </button>
            ) : null}
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
