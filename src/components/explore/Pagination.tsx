"use client";

import { Icon } from "@/components/ui";

import styles from "./explore.module.css";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

/**
 * Page-by-page navigation (CU9/CU12): no design reference draws this — the
 * prototype's Results screen never paginated its hardcoded data — so it
 * follows the rest of the design system's button styling instead.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className={styles.pagination} aria-label="Paginación de resultados">
      <button
        type="button"
        className={styles.pageArrow}
        disabled={disabled || page <= 1}
        onClick={() => {
          onPageChange(page - 1);
        }}
        aria-label="Página anterior"
      >
        <Icon name="chevron-left" size={16} />
      </button>

      <span className={`sp-small ${styles.pageIndicator}`} aria-live="polite">
        Página <strong>{page}</strong> de {totalPages}
      </span>

      <button
        type="button"
        className={styles.pageArrow}
        disabled={disabled || page >= totalPages}
        onClick={() => {
          onPageChange(page + 1);
        }}
        aria-label="Página siguiente"
      >
        <Icon name="chevron-right" size={16} />
      </button>
    </nav>
  );
}
