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
  removeFavoriteActivity,
  saveFavoriteActivity,
} from "@/lib/api";
import { useSession } from "@/lib/auth";
import { loginRoute } from "@/lib/routes";

export interface FavoritesContextValue {
  savedActivityIds: Set<number>;
  isActivitySaved: (idActivity: number) => boolean;
  toggleSaveActivity: (idActivity: number) => Promise<boolean>;
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    let cancelled = false;

    listFavoriteActivities({ limit: 100 })
      .then((res) => {
        if (!cancelled && res?.data) {
          const ids = new Set(res.data.map((fav) => fav.idActivity));
          setSavedActivityIds(ids);
        }
      })
      .catch(() => {
        // Soft fail on initial list load error
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      setSavedActivityIds(new Set());
    };
  }, [authenticated]);

  const isActivitySaved = useCallback(
    (idActivity: number) => savedActivityIds.has(idActivity),
    [savedActivityIds],
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

  const value = useMemo(
    () => ({
      savedActivityIds,
      isActivitySaved,
      toggleSaveActivity,
      loading,
    }),
    [savedActivityIds, isActivitySaved, toggleSaveActivity, loading],
  );

  return <FavoritesContext value={value}>{children}</FavoritesContext>;
}

const defaultFavoritesContext: FavoritesContextValue = {
  savedActivityIds: new Set(),
  isActivitySaved: () => false,
  toggleSaveActivity: async () => false,
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
