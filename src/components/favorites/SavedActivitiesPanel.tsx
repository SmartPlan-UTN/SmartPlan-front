"use client";

import { useEffect, useState } from "react";

import { ActivityCard } from "@/components/activity";
import { Button, Icon, LoadingDots } from "@/components/ui";
import { listFavoriteActivities } from "@/lib/api";
import type { ActivitySearchResult, FavoriteActivity, PaginationMetadata } from "@/types";

import styles from "./SavedActivitiesPanel.module.css";

type LoadStatus = "loading" | "idle" | "error";

const ACTIVITIES_PER_PAGE = 12;

/**
 * Maps a `FavoriteActivity` (with its embedded `activity`) to the
 * `ActivitySearchResult` shape expected by `ActivityCard`.
 *
 * The backend's `GET /favorite-activities` response embeds the full
 * `Activity` entity but does not compute aggregates such as `averageRating`,
 * `ratingCount`, `distanceKm`, or `categories`. These are set to safe
 * defaults so `ActivityCard` renders correctly without throwing (CU39).
 */
function toSearchResult(fa: FavoriteActivity): ActivitySearchResult | null {
  if (!fa.activity) return null;
  const a = fa.activity;
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    estimatedCost: a.estimatedCost,
    estimatedDuration: a.estimatedDuration,
    type: (a as unknown as { type?: string }).type ?? null,
    averageRating: 0,
    ratingCount: 0,
    distanceKm: null,
    categories: [],
  };
}

/**
 * Paginated list of the user's saved activities (CU39 — PAN 12).
 *
 * Displays loading, empty, and error states, and renders each saved
 * activity as an `ActivityCard` (which already has the CU15 bookmark
 * toggle built in).
 */
export function SavedActivitiesPanel() {
  const [items, setItems] = useState<FavoriteActivity[]>([]);
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

  const cards = items
    .map(toSearchResult)
    .filter((r): r is ActivitySearchResult => r !== null);

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

      {status === "idle" && cards.length === 0 ? (
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

      {status === "idle" && cards.length > 0 ? (
        <>
          <ul className={styles.grid} aria-label="Actividades guardadas">
            {cards.map((activity) => (
              <li key={activity.id}>
                <ActivityCard activity={activity} />
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
