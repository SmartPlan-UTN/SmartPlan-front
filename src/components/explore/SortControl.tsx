"use client";

import { Select } from "@/components/ui";
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

export interface SortControlProps<TSortField extends string> {
  sortBy: TSortField;
  onSortByChange: (value: TSortField) => void;
  sortOptions: SortOption<TSortField>[];
  direction: SortDirection;
  onDirectionChange: (value: SortDirection) => void;
}

/** Result ordering (CU11), in the results toolbar beside the count. */
export function SortControl<TSortField extends string>({
  sortBy,
  onSortByChange,
  sortOptions,
  direction,
  onDirectionChange,
}: SortControlProps<TSortField>) {
  return (
    <div className={styles.sortControl}>
      <span className={styles.sortLabel}>Ordenar por</span>
      <Select
        value={sortBy}
        onChange={onSortByChange}
        options={sortOptions}
        aria-label="Ordenar por"
      />
      <Select
        value={direction}
        onChange={onDirectionChange}
        options={DIRECTION_OPTIONS}
        aria-label="Dirección"
      />
    </div>
  );
}
