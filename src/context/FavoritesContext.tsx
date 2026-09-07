"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  listFavoriteActivities,
  listFavoritePlans,
  removeFavoriteActivity,
  removeFavoritePlan,
  saveFavoriteActivity,
  saveFavoritePlan,
} from "@/lib/api";
import { useSession } from "@/lib/auth";
import { loginRoute } from "@/lib/routes";

export interface FavoritesContextValue {
  savedActivityIds: Set<number>;
  savedPlanIds: Set<number>;
  isActivitySaved: (idActivity: number) => boolean;
  isPlanSaved: (idPlan: number) => boolean;
  setActivitySaved: (idActivity: number, saved: boolean) => Promise<boolean>;
  setPlanSaved: (idPlan: number, saved: boolean) => Promise<boolean>;
  toggleSaveActivity: (idActivity: number) => Promise<boolean>;
  toggleSavePlan: (idPlan: number) => Promise<boolean>;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const FAVORITES_PAGE_SIZE = 100;

async function loadAllActivityIds(): Promise<Set<number>> {
  const ids = new Set<number>();
  let page = 1;
  let totalPages = 1;

  do {
    const result = await listFavoriteActivities({
      page,
      limit: FAVORITES_PAGE_SIZE,
    });
    result.data.forEach((favorite) => ids.add(favorite.idActivity));
    totalPages = result.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);

  return ids;
}

async function loadAllPlanIds(): Promise<Set<number>> {
  const ids = new Set<number>();
  let page = 1;
  let totalPages = 1;

  do {
    const result = await listFavoritePlans({
      page,
      limit: FAVORITES_PAGE_SIZE,
    });
    result.data.forEach((favorite) => ids.add(favorite.idPlan));
    totalPages = result.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);

  return ids;
}

export interface FavoritesProviderProps {
  children: ReactNode;
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [savedActivityIds, setSavedActivityIds] = useState<Set<number>>(
    new Set(),
  );
  const [savedPlanIds, setSavedPlanIds] = useState<Set<number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "anonymous") {
      setSavedActivityIds(new Set());
      setSavedPlanIds(new Set());
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadFavorites() {
      setLoading(true);
      try {
        const [activitiesResult, plansResult] = await Promise.allSettled([
          loadAllActivityIds(),
          loadAllPlanIds(),
        ]);

        if (cancelled) return;

        if (activitiesResult.status === "fulfilled") {
          setSavedActivityIds(activitiesResult.value);
        }

        if (plansResult.status === "fulfilled") {
          setSavedPlanIds(plansResult.value);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [status]);

  const isActivitySaved = useCallback(
    (idActivity: number) => savedActivityIds.has(idActivity),
    [savedActivityIds],
  );

  const isPlanSaved = useCallback(
    (idPlan: number) => savedPlanIds.has(idPlan),
    [savedPlanIds],
  );

  const setActivitySaved = useCallback(
    async (idActivity: number, saved: boolean): Promise<boolean> => {
      if (status === "loading") return false;

      if (status === "anonymous") {
        const redirectUrl = loginRoute(pathname);
        router.push(redirectUrl);
        return false;
      }

      // Optimistic update
      setSavedActivityIds((prev) => {
        const next = new Set(prev);
        if (saved) {
          next.add(idActivity);
        } else {
          next.delete(idActivity);
        }
        return next;
      });

      try {
        if (saved) {
          await saveFavoriteActivity(idActivity);
        } else {
          await removeFavoriteActivity(idActivity);
        }
        return true;
      } catch (err) {
        // Rollback on error
        setSavedActivityIds((prev) => {
          const next = new Set(prev);
          if (saved) {
            next.delete(idActivity);
          } else {
            next.add(idActivity);
          }
          return next;
        });
        throw err;
      }
    },
    [pathname, router, status],
  );

  const toggleSaveActivity = useCallback(
    (idActivity: number) =>
      setActivitySaved(idActivity, !savedActivityIds.has(idActivity)),
    [savedActivityIds, setActivitySaved],
  );

  const setPlanSaved = useCallback(
    async (idPlan: number, saved: boolean): Promise<boolean> => {
      if (status === "loading") return false;

      if (status === "anonymous") {
        const redirectUrl = loginRoute(pathname);
        router.push(redirectUrl);
        return false;
      }

      // Optimistic update
      setSavedPlanIds((prev) => {
        const next = new Set(prev);
        if (saved) {
          next.add(idPlan);
        } else {
          next.delete(idPlan);
        }
        return next;
      });

      try {
        if (saved) {
          await saveFavoritePlan(idPlan);
        } else {
          await removeFavoritePlan(idPlan);
        }
        return true;
      } catch (err) {
        // Rollback on error
        setSavedPlanIds((prev) => {
          const next = new Set(prev);
          if (saved) {
            next.delete(idPlan);
          } else {
            next.add(idPlan);
          }
          return next;
        });
        throw err;
      }
    },
    [pathname, router, status],
  );

  const toggleSavePlan = useCallback(
    (idPlan: number) => setPlanSaved(idPlan, !savedPlanIds.has(idPlan)),
    [savedPlanIds, setPlanSaved],
  );

  const value = useMemo(
    () => ({
      savedActivityIds,
      savedPlanIds,
      isActivitySaved,
      isPlanSaved,
      setActivitySaved,
      setPlanSaved,
      toggleSaveActivity,
      toggleSavePlan,
      loading,
    }),
    [
      savedActivityIds,
      savedPlanIds,
      isActivitySaved,
      isPlanSaved,
      setActivitySaved,
      setPlanSaved,
      toggleSaveActivity,
      toggleSavePlan,
      loading,
    ],
  );

  return <FavoritesContext value={value}>{children}</FavoritesContext>;
}

const defaultFavoritesContext: FavoritesContextValue = {
  savedActivityIds: new Set(),
  savedPlanIds: new Set(),
  isActivitySaved: () => false,
  isPlanSaved: () => false,
  setActivitySaved: async () => false,
  setPlanSaved: async () => false,
  toggleSaveActivity: async () => false,
  toggleSavePlan: async () => false,
  loading: false,
};

/** Hook to access favorites state and methods. */
export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  return context ?? defaultFavoritesContext;
}
