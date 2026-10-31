"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Select } from "@/components/ui";
import type { CategoryOption, LocationOption } from "@/types";

import { priceRangeError } from "./searchState";
import { getCategoriesOnce } from "./categoryCatalog";
import { categoryPresentation } from "@/components/preferences/categoryPresentation";
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/catalog/taxonomy";
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
  departmentsError?: boolean;
  onRetryDepartments?: () => void;
}

type DepartmentFilterStatus = "needsCity" | "loading" | "error" | "empty" | "ready";

/** Why "Localidad" can't be used yet, told apart from its options. */
const DEPARTMENT_HINTS: Record<DepartmentFilterStatus, string> = {
  needsCity: "Elegí primero una provincia para ver sus localidades.",
  loading: "Cargando localidades...",
  error: "",
  empty: "No hay localidades disponibles en esta provincia.",
  ready: "",
};

function departmentFilterStatus(location: LocationFilterProps): DepartmentFilterStatus {
  if (location.cityId === null) return "needsCity";
  if (location.departmentsLoading) return "loading";
  if (location.departmentsError) return "error";
  if (location.departments.length === 0) return "empty";
  return "ready";
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
  activityType?: { value: string; onChange: (value: string) => void };
  /** "En casa" goes with the location and "Gratis" with the price (#210). */
  atHomeFree?: AtHomeFreeFilterProps;
}

export interface AtHomeFreeFilterProps {
  atHome: boolean;
  onAtHomeChange: (value: boolean) => void;
  free: boolean;
  onFreeChange: (value: boolean) => void;
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
  activityType,
  atHomeFree,
}: FiltersPanelProps) {
  const ratingName = useId();
  const rangeError = priceRangeError(minPrice, maxPrice);
  const priceErrorId = `${ratingName}-price-error`;
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

  const departmentStatus = location ? departmentFilterStatus(location) : "ready";
  const departmentHintId = `${ratingName}-department-hint`;
  const departmentHint = DEPARTMENT_HINTS[departmentStatus];
  const departmentFieldRef = useRef<HTMLDivElement>(null);
  const departmentHintRef = useRef<HTMLParagraphElement>(null);
  const retryDepartmentsRef = useRef<HTMLButtonElement>(null);
  const retryFocusPending = useRef(false);

  // After "Reintentar", hand the focus on to what's usable next: the
  // localities once they load, or the button again if it failed. An empty
  // province leaves it on the hint that says so.
  useEffect(() => {
    if (!retryFocusPending.current || departmentStatus === "loading") return;
    retryFocusPending.current = false;
    if (departmentStatus === "ready") {
      departmentFieldRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    } else if (departmentStatus === "error") {
      retryDepartmentsRef.current?.focus();
    }
  }, [departmentStatus]);

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
          {atHomeFree ? (
            <label className={styles.option}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={atHomeFree.atHome}
                onChange={() => atHomeFree.onAtHomeChange(!atHomeFree.atHome)}
              />
              En casa
            </label>
          ) : null}
          <div className={styles.field}>
            <span id={`${ratingName}-city`} className={styles.fieldLabel}>
              Provincia
            </span>
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
              aria-labelledby={`${ratingName}-city`}
            />
          </div>
          <div ref={departmentFieldRef} className={styles.field}>
            <span id={`${ratingName}-department`} className={styles.fieldLabel}>
              Localidad
            </span>
            <Select
              value={
                location.departmentId === null ? ANY_LOCATION : String(location.departmentId)
              }
              onChange={(value) => {
                location.onDepartmentIdChange(value === ANY_LOCATION ? null : Number(value));
              }}
              // Always "Cualquier localidad": the placeholder used to read
              // "Elegí una provincia", which made this look like a second
              // province picker (#181). Why it's disabled goes in the hint.
              options={[
                { value: ANY_LOCATION, label: "Cualquier localidad" },
                ...location.departments.map((department) => ({
                  value: String(department.id),
                  label: department.name,
                })),
              ]}
              disabled={departmentStatus !== "ready"}
              aria-labelledby={`${ratingName}-department`}
              aria-describedby={departmentStatus === "ready" ? undefined : departmentHintId}
            />
            {/* One `<p>` for every status, so it's the same node from the
                error through the retry: focus parked on it isn't lost. */}
            <p
              ref={departmentHintRef}
              id={departmentHintId}
              tabIndex={-1}
              {...(departmentStatus === "error"
                ? { role: "alert" }
                : { "aria-live": "polite" as const })}
              className={departmentStatus === "error" ? styles.filterError : styles.filterHint}
            >
              {departmentStatus === "error" ? (
                <>
                  No pudimos cargar las localidades.{" "}
                  <button
                    ref={retryDepartmentsRef}
                    type="button"
                    className={styles.sidebarLink}
                    onClick={() => {
                      // The button unmounts while the retry loads: keep the
                      // keyboard focus on the hint instead of the page body.
                      departmentHintRef.current?.focus();
                      retryFocusPending.current = true;
                      location.onRetryDepartments?.();
                    }}
                  >
                    Reintentar
                  </button>
                </>
              ) : (
                departmentHint
              )}
            </p>
          </div>
        </section>
      ) : null}

      {activityType ? (
        <section className={styles.filterSection} aria-labelledby={`${ratingName}-type`}>
          <h3 id={`${ratingName}-type`} className={styles.filterHeading}>Tipo de actividad</h3>
          <Select aria-label="Tipo de actividad" value={activityType.value} onChange={activityType.onChange} options={ACTIVITY_TYPE_OPTIONS} />
        </section>
      ) : null}

      <section className={styles.filterSection} aria-labelledby={`${ratingName}-price`}>
        <h3 id={`${ratingName}-price`} className={styles.filterHeading}>
          Precio
        </h3>
        {atHomeFree ? (
          <label className={styles.option}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={atHomeFree.free}
              onChange={() => atHomeFree.onFreeChange(!atHomeFree.free)}
            />
            Gratis
          </label>
        ) : null}
        <div className={styles.priceRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Mínimo</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              aria-invalid={rangeError !== null}
              aria-describedby={rangeError ? priceErrorId : undefined}
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
              aria-invalid={rangeError !== null}
              aria-describedby={rangeError ? priceErrorId : undefined}
              placeholder="Sin límite"
              className={styles.input}
              value={maxPrice}
              onChange={(event) => {
                onMaxPriceChange(event.target.value);
              }}
            />
          </label>
        </div>
        {rangeError ? (
          <p id={priceErrorId} role="alert" className={styles.filterError}>
            {rangeError}
          </p>
        ) : null}
        {atHomeFree?.free ? (
          <p className={styles.fieldLabel}>Solo lo que tiene precio gratis confirmado.</p>
        ) : null}
        {minPrice.trim() !== "" || maxPrice.trim() !== "" ? (
          <p className={styles.fieldLabel}>Las actividades sin precio confirmado no aparecen al filtrar por precio.</p>
        ) : null}
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
                {categoryPresentation(category).label}
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
