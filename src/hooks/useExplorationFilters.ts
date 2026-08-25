import { useCallback, useState } from "react";

import type { SortDirection } from "@/types";

export interface UseExplorationFiltersResult<TSortField extends string> {
  categoryIds: number[];
  minPrice: string;
  maxPrice: string;
  minRating: string;
  sortBy: TSortField;
  direction: SortDirection;
  setMinPrice: (value: string) => void;
  setMaxPrice: (value: string) => void;
  setMinRating: (value: string) => void;
  setSortBy: (value: TSortField) => void;
  setDirection: (value: SortDirection) => void;
  toggleCategory: (categoryId: number) => void;
  clear: () => void;
}

/**
 * Category/price/rating/sort filter state shared by every exploration
 * screen (CU10-CU12): `ActivitySearch` and `PlanSearch` both read/reset all
 * six fields together (see `clear`), so they're grouped here instead of six
 * independent `useState` calls duplicated in each component.
 */
export function useExplorationFilters<TSortField extends string>(
  defaultSort: TSortField,
): UseExplorationFiltersResult<TSortField> {
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [sortBy, setSortBy] = useState<TSortField>(defaultSort);
  const [direction, setDirection] = useState<SortDirection>("asc");

  const toggleCategory = useCallback((categoryId: number) => {
    setCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }, []);

  const clear = useCallback(() => {
    setCategoryIds([]);
    setMinPrice("");
    setMaxPrice("");
    setMinRating("");
    setSortBy(defaultSort);
    setDirection("asc");
  }, [defaultSort]);

  return {
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
    clear,
  };
}
