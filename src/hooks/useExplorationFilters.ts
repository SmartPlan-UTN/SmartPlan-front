import { useCallback, useState } from "react";

import type { Occasion, SortDirection } from "@/types";

export interface UseExplorationFiltersResult<TSortField extends string> {
  categoryIds: number[];
  minPrice: string;
  maxPrice: string;
  minRating: string;
  sortBy: TSortField;
  direction: SortDirection;
  occasions: Occasion[];
  atHome: boolean;
  free: boolean;
  toggleOccasion: (occasion: Occasion) => void;
  setAtHome: (value: boolean) => void;
  setFree: (value: boolean) => void;
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
  initial: Partial<Pick<UseExplorationFiltersResult<TSortField>, "categoryIds" | "minPrice" | "maxPrice" | "minRating" | "sortBy" | "direction" | "occasions" | "atHome" | "free">> = {},
): UseExplorationFiltersResult<TSortField> {
  const [categoryIds, setCategoryIds] = useState<number[]>(initial.categoryIds ?? []);
  const [minPrice, setMinPrice] = useState(initial.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice ?? "");
  const [minRating, setMinRating] = useState(initial.minRating ?? "");
  const [sortBy, setSortBy] = useState<TSortField>(initial.sortBy ?? defaultSort);
  const [direction, setDirection] = useState<SortDirection>(initial.direction ?? "asc");
  const [occasions, setOccasions] = useState<Occasion[]>(initial.occasions ?? []);
  const [atHome, setAtHome] = useState(initial.atHome ?? false);
  const [free, setFree] = useState(initial.free ?? false);

  const toggleOccasion = useCallback((occasion: Occasion) => {
    setOccasions((current) =>
      current.includes(occasion)
        ? current.filter((value) => value !== occasion)
        : [...current, occasion],
    );
  }, []);

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
    setOccasions([]);
    setAtHome(false);
    setFree(false);
  }, [defaultSort]);

  return {
    categoryIds,
    minPrice,
    maxPrice,
    minRating,
    sortBy,
    direction,
    occasions,
    atHome,
    free,
    toggleOccasion,
    setAtHome,
    setFree,
    setMinPrice,
    setMaxPrice,
    setMinRating,
    setSortBy,
    setDirection,
    toggleCategory,
    clear,
  };
}
