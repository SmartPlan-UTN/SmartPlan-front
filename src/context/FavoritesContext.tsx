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
  toggleSaveActivity: (idActivity: number) => Promise<boolean>;
  toggleSavePlan: (idPlan: number) => Promise<boolean>;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export interface FavoritesProviderProps {
  children: ReactNode;
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const { authenticated } = useSession();
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
    if (!authenticated) {
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
          listFavoriteActivities({ limit: 100 }),
          listFavoritePlans({ limit: 100 }),
        ]);

        if (cancelled) return;

        if (
          activitiesResult.status === "fulfilled" &&
          activitiesResult.value?.data
        ) {
          const ids = new Set(
            activitiesResult.value.data.map((fav) => fav.idActivity),
          );
          setSavedActivityIds(ids);
        }

        if (plansResult.status === "fulfilled" && plansResult.value?.data) {
          const ids = new Set(plansResult.value.data.map((fav) => fav.idPlan));
          setSavedPlanIds(ids);
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
  }, [authenticated]);

  const isActivitySaved = useCallback(
    (idActivity: number) => savedActivityIds.has(idActivity),
    [savedActivityIds],
  );

  const isPlanSaved = useCallback(
    (idPlan: number) => savedPlanIds.has(idPlan),
    [savedPlanIds],
  );

  const toggleSaveActivity = useCallback(
    async (idActivity: number): Promise<boolean> => {
      if (!authenticated) {
        const redirectUrl = loginRoute(pathname);
        router.push(redirectUrl);
        return false;
      }

      const isSaved = savedActivityIds.has(idActivity);

      // Optimistic update
      setSavedActivityIds((prev) => {
        const next = new Set(prev);
        if (isSaved) {
          next.delete(idActivity);
        } else {
          next.add(idActivity);
        }
        return next;
      });

      try {
        if (isSaved) {
          await removeFavoriteActivity(idActivity);
        } else {
          await saveFavoriteActivity(idActivity);
        }
        return true;
      } catch (err) {
        // Rollback on error
        setSavedActivityIds((prev) => {
          const next = new Set(prev);
          if (isSaved) {
            next.add(idActivity);
          } else {
            next.delete(idActivity);
          }
          return next;
        });
        throw err;
      }
    },
    [authenticated, pathname, router, savedActivityIds],
  );

  const toggleSavePlan = useCallback(
    async (idPlan: number): Promise<boolean> => {
      if (!authenticated) {
        const redirectUrl = loginRoute(pathname);
        router.push(redirectUrl);
        return false;
      }

      const isSaved = savedPlanIds.has(idPlan);

      // Optimistic update
      setSavedPlanIds((prev) => {
        const next = new Set(prev);
        if (isSaved) {
          next.delete(idPlan);
        } else {
          next.add(idPlan);
        }
        return next;
      });

      try {
        if (isSaved) {
          await removeFavoritePlan(idPlan);
        } else {
          await saveFavoritePlan(idPlan);
        }
        return true;
      } catch (err) {
        // Rollback on error
        setSavedPlanIds((prev) => {
          const next = new Set(prev);
          if (isSaved) {
            next.add(idPlan);
          } else {
            next.delete(idPlan);
          }
          return next;
        });
        throw err;
      }
    },
    [authenticated, pathname, router, savedPlanIds],
  );

  const value = useMemo(
    () => ({
      savedActivityIds,
      savedPlanIds,
      isActivitySaved,
      isPlanSaved,
      toggleSaveActivity,
      toggleSavePlan,
      loading,
    }),
    [
      savedActivityIds,
      savedPlanIds,
      isActivitySaved,
      isPlanSaved,
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
  toggleSaveActivity: async () => false,
  toggleSavePlan: async () => false,
  loading: false,
};

/**
 * Hook to access favorites state and methods.
 * Falls back to safe default state when used outside FavoritesProvider.
 */
export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  return context ?? defaultFavoritesContext;
}
