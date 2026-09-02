"use client";

import { useEffect, useState } from "react";

import { ActivityCard, type ActivityCardProps } from "@/components/activity";
import { Button, Icon, LoadingDots } from "@/components/ui";
import { listFavoriteActivities } from "@/lib/api";
import type { FavoriteActivityResponse, PaginationMetadata } from "@/types";

import styles from "./SavedActivitiesPanel.module.css";

type LoadStatus = "loading" | "idle" | "error";

const ACTIVITIES_PER_PAGE = 12;

/**
 * Maps the favorites API projection to the data available to `ActivityCard`.
 * Rating aggregates are intentionally absent instead of being shown as zero.
 */
function toCardActivity(
  fa: FavoriteActivityResponse,
): ActivityCardProps["activity"] {
  const a = fa.activity;
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    estimatedCost: a.estimatedCost,
    estimatedDuration: a.estimatedDuration,
    type: a.type,
    distanceKm: null,
    categories: [],
  };
}

/**
 * Paginated list of the user's saved activities (CU39 — PAN 12).
 *
 * Integrates with `FavoritesContext` so that clicking the bookmark on any
 * `ActivityCard` removes it from this list immediately without a full page
 * reload (CU41 — optimistic update). If the API call fails the card comes
 * back automatically (rollback handled in `FavoritesContext`).
 */
export function SavedActivitiesPanel() {
  const [items, setItems] = useState<FavoriteActivityResponse[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [reloadSequence, setReloadSequence] = useState(0);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    page: 1,
    limit: ACTIVITIES_PER_PAGE,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    let ignore = false;

    async function load() {
      setStatus("loading");
      try {
        const result = await listFavoriteActivities({
          page,
          limit: ACTIVITIES_PER_PAGE,
        });
        if (ignore) return;
        setItems(result.data);
        setPagination(result.pagination);
        setStatus("idle");
      } catch (_error) {
        if (!ignore) setStatus("error");
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [page, reloadSequence]);

  return (
    <>
      {status === "loading" ? (
        <LoadingDots
          className={styles.loadingRow}
          label="Cargando tus actividades guardadas..."
        />
      ) : null}

      {status === "error" ? (
        <div className={styles.stateBox} role="alert">
          <Icon name="triangle-alert" />
          <p>No pudimos cargar tus actividades guardadas.</p>
          <Button
            variant="ghostLight"
            size="sm"
            onClick={() => setReloadSequence((current) => current + 1)}
          >
            Reintentar
          </Button>
        </div>
      ) : null}

      {status === "idle" && items.length === 0 ? (
        <div className={styles.stateBox}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Icon name="bookmark" size={30} />
          </span>
          <h2 className="sp-h4">Aún no guardaste ninguna actividad</h2>
          <p>
            Tocá el marcador en cualquier tarjeta o detalle de actividad para
            guardarla acá.
          </p>
        </div>
      ) : null}

      {status === "idle" && items.length > 0 ? (
        <>
          <ul className={styles.grid} aria-label="Actividades guardadas">
            {items.map((favorite) => (
              <li key={favorite.id}>
                <ActivityCard
                  activity={toCardActivity(favorite)}
                  isSaved
                  onSavedChange={(saved) => {
                    setItems((current) =>
                      saved
                        ? current.some((item) => item.id === favorite.id)
                          ? current
                          : [...current, favorite]
                        : current.filter((item) => item.id !== favorite.id),
                    );
                  }}
                />
              </li>
            ))}
          </ul>

          {pagination.totalPages > 1 ? (
            <nav
              className={styles.pagination}
              aria-label="Paginación de actividades guardadas"
            >
              <button
                type="button"
                onClick={() => setPage((current) => current - 1)}
                disabled={page <= 1}
                aria-label="Página anterior"
              >
                <Icon name="chevron-left" size={16} />
              </button>
              <span aria-live="polite">
                Página <strong>{page}</strong> de {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={page >= pagination.totalPages}
                aria-label="Página siguiente"
              >
                <Icon name="chevron-right" size={16} />
              </button>
            </nav>
          ) : null}
        </>
      ) : null}
    </>
  );
}
