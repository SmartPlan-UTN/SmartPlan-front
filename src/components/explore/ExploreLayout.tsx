"use client";

import { useId, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui";

import styles from "./explore.module.css";

export interface ExploreLayoutProps {
  /** Page title, lead, and tab switch. */
  head?: ReactNode;
  /** The filters sidebar. */
  filters: ReactNode;
  /** How many filters are set, shown on the narrow-screen toggle. */
  activeFilters: number;
  /** Search bar, toolbar, results. */
  children: ReactNode;
}

/**
 * Explorar's layout: the title across the top, the filters in a sidebar on
 * the left and the search and results on the right. On narrow screens the
 * sidebar folds behind a "Filtros" toggle above the results, so the grid
 * isn't pushed a screen down.
 */
export function ExploreLayout({ head, filters, activeFilters, children }: ExploreLayoutProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sidebarId = useId();

  return (
    <div className={styles.layout}>
      {head ? <div className={styles.layoutHead}>{head}</div> : null}
      <div className={styles.layoutBody}>
        <button
          type="button"
          className={styles.filtersToggle}
          aria-expanded={filtersOpen}
          aria-controls={sidebarId}
          onClick={() => {
            setFiltersOpen((open) => !open);
          }}
        >
          <Icon name="sliders-horizontal" size={16} aria-hidden="true" />
          {activeFilters > 0 ? `Filtros (${activeFilters})` : "Filtros"}
          <Icon
            name="chevron-down"
            size={16}
            aria-hidden="true"
            className={filtersOpen ? styles.filtersToggleIconOpen : undefined}
          />
        </button>
        <aside
          id={sidebarId}
          aria-label="Filtros"
          className={`${styles.layoutSidebar} ${filtersOpen ? styles.layoutSidebarOpen : ""}`}
        >
          {filters}
        </aside>
        <div className={styles.layoutMain}>{children}</div>
      </div>
    </div>
  );
}
