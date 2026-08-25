"use client";

import { useEffect, useState } from "react";

import { Chip } from "@/components/ui";
import { useMarqueeScroll } from "@/hooks";
import { listCategories } from "@/lib/api";
import type { CategoryOption } from "@/types";

import styles from "./explore.module.css";

export interface CategoryChipsProps {
  selectedIds: number[];
  onToggle: (categoryId: number) => void;
}

// The category catalog is near-static and every caller asks for the same
// page (`{ limit: 50 }`), so the first successful fetch is cached for the
// lifetime of the tab/session instead of re-fetched every time this
// component mounts — e.g. switching between the Actividades/Planes tabs in
// `ExploreTabs` unmounts and remounts it. Cleared on failure so a later
// mount can genuinely retry instead of replaying the same rejection.
let categoriesPromise: Promise<CategoryOption[]> | null = null;

function getCategoriesOnce(): Promise<CategoryOption[]> {
  if (!categoriesPromise) {
    categoriesPromise = listCategories({ limit: 50 })
      .then((result) => result.data)
      .catch((error: unknown) => {
        categoriesPromise = null;
        throw error;
      });
  }
  return categoriesPromise;
}

/**
 * Horizontally-scrolling row of category chips (CU10), matching the filter
 * row in SmartPlanSystemDesign/v2/Results.jsx. Loads the active catalog
 * once; toggling a chip is controlled by the parent, which owns the
 * selected-ids filter state.
 *
 * Rendered twice back to back — the second copy hidden from assistive tech
 * and the tab order — only once `useMarqueeScroll` measures that the chips
 * actually overflow the row; a single chip, or a set that already fits,
 * renders once and stays still instead of visibly duplicating for no
 * reason. See that hook for how the loop itself works.
 */
export function CategoryChips({ selectedIds, onToggle }: CategoryChipsProps) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const { ref: marqueeRef, needsLoop } = useMarqueeScroll<HTMLDivElement>();

  useEffect(() => {
    let ignore = false;

    async function run() {
      try {
        const data = await getCategoriesOnce();
        if (!ignore) {
          setCategories(data);
        }
      } catch {
        // The chip row is a filter convenience, not the primary content:
        // if the catalog fails to load, searching still works without it.
      }
    }

    void run();
    return () => {
      ignore = true;
    };
  }, []);

  if (categories.length === 0) {
    return null;
  }

  function renderChip(category: CategoryOption, keySuffix: string, decorative: boolean) {
    return (
      <Chip
        key={`${category.id}${keySuffix}`}
        active={selectedIds.includes(category.id)}
        onClick={() => {
          onToggle(category.id);
        }}
        {...(decorative ? { "aria-hidden": true, tabIndex: -1 } : null)}
      >
        {category.name}
      </Chip>
    );
  }

  return (
    <div className={styles.chipRow} ref={marqueeRef}>
      {categories.map((category) => renderChip(category, "-a", false))}
      {needsLoop ? categories.map((category) => renderChip(category, "-b", true)) : null}
    </div>
  );
}
