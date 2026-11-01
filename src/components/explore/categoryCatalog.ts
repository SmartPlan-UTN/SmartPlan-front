import { listCategories } from "@/lib/api";
import type { CategoryOption } from "@/types";

// The category catalog is near-static and every caller asks for the same
// page (`{ limit: 50 }`), so the first successful fetch is cached for the
// lifetime of the tab/session instead of re-fetched every time a consumer
// mounts — e.g. switching between the Actividades/Planes tabs in
// `ExploreTabs` unmounts and remounts it. Cleared on failure so a later
// mount can genuinely retry instead of replaying the same rejection.
let categoriesPromise: Promise<CategoryOption[]> | null = null;

export function getCategoriesOnce(): Promise<CategoryOption[]> {
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
