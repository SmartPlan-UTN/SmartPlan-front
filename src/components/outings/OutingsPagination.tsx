"use client";

import { Icon } from "@/components/ui";

import { OUTINGS_COPY } from "./outingsContent";
import styles from "./outings.module.css";

export interface OutingsPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

type Slot = number | "gap-start" | "gap-end";

/**
 * Which page numbers to draw: always the first and last, the current one
 * and its neighbours, and a gap where pages are skipped. Never more than
 * seven slots, so it fits on a phone.
 */
export function pageSlots(page: number, totalPages: number): Slot[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const start = Math.max(2, Math.min(page - 1, totalPages - 4));
  const end = Math.min(totalPages - 1, Math.max(page + 1, 5));
  const slots: Slot[] = [1];
  if (start > 2) slots.push("gap-start");
  for (let current = start; current <= end; current += 1) slots.push(current);
  if (end < totalPages - 1) slots.push("gap-end");
  slots.push(totalPages);
  return slots;
}

/** Numbered pagination for "Mis salidas", with the range being shown. */
export function OutingsPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: OutingsPaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className={styles.pagination} aria-label={OUTINGS_COPY.paginationLabel}>
      <p className={styles.pageRange}>{OUTINGS_COPY.pageRange(from, to, total)}</p>

      <div className={styles.pageControls}>
        <button
          type="button"
          className={styles.pageArrow}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <Icon name="chevron-left" size={16} aria-hidden="true" />
        </button>

        <ol className={styles.pageList}>
          {pageSlots(page, totalPages).map((slot) =>
            typeof slot === "number" ? (
              <li key={slot}>
                <button
                  type="button"
                  className={
                    slot === page
                      ? `${styles.pageNumber} ${styles.pageNumberActive}`
                      : styles.pageNumber
                  }
                  onClick={() => onPageChange(slot)}
                  aria-current={slot === page ? "page" : undefined}
                  aria-label={`Página ${slot}`}
                >
                  {slot}
                </button>
              </li>
            ) : (
              <li key={slot} className={styles.pageGap} aria-hidden="true">
                …
              </li>
            ),
          )}
        </ol>

        <button
          type="button"
          className={styles.pageArrow}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Página siguiente"
        >
          <Icon name="chevron-right" size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
