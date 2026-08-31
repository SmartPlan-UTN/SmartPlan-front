"use client";

import { useEffect, useMemo, useState } from "react";

import { PlanCard } from "@/components/plan";
import { Button, Icon, LoadingDots } from "@/components/ui";
import { useFavorites } from "@/context";
import { listFavoritePlans } from "@/lib/api";
import type { FavoritePlan, PaginationMetadata, PlanSearchResult } from "@/types";

import styles from "./SavedPlansPanel.module.css";

type LoadStatus = "loading" | "idle" | "error";

const PLANS_PER_PAGE = 12;

/**
 * Maps a `FavoritePlan` (with its embedded `plan`) to the `PlanSearchResult`
 * shape expected by `PlanCard`.
 *
 * Aggregates such as categories and activity names are set to safe defaults
 * so `PlanCard` renders cleanly without throwing (CU40).
 */
function toPlanSearchResult(fp: FavoritePlan): PlanSearchResult | null {
  if (!fp.plan) return null;
  const p = fp.plan;
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? null,
    estimatedTotalCost: p.estimatedTotalCost ?? 0,
    estimatedTotalDuration: p.estimatedTotalDuration ?? 0,
    activityCount:
      (p as unknown as { activityCount?: number }).activityCount ??
      (p.details?.length ?? 0),
    averageRating: 0,
    distanceKm: null,
    categories: [],
    activityNames: [],
    status: p.status ?? { key: "confirmed", name: "Confirmada" },
  };
}

/**
 * Paginated list of the user's saved plans (CU40 — PAN 12).
 *
 * Integrates with `FavoritesContext` so that clicking the bookmark on any
 * `PlanCard` removes it from this list immediately without a full page
 * reload (CU42 — optimistic update). If the API call fails the card comes
 * back automatically (rollback handled in `FavoritesContext`).
 */
export function SavedPlansPanel() {
  const { savedPlanIds } = useFavorites();
  const [items, setItems] = useState<FavoritePlan[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [reloadSequence, setReloadSequence] = useState(0);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    page: 1,
    limit: PLANS_PER_PAGE,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    let ignore = false;

    async function load() {
      setStatus("loading");
      try {
        const result = await listFavoritePlans({
          page,
          limit: PLANS_PER_PAGE,
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

  /**
   * Filter the fetched items through the context's live set of saved IDs.
   *
   * Because `FavoritesContext.toggleSavePlan` performs an optimistic update,
   * unsaving a plan from this panel causes it to disappear from the list
   * instantly without a network round-trip or page reload (CU42).
   */
  const cards = useMemo(
    () =>
      items
        .filter((fp) => savedPlanIds.has(fp.idPlan))
        .map(toPlanSearchResult)
        .filter((r): r is PlanSearchResult => r !== null),
    [items, savedPlanIds],
  );

  return (
    <>
      {status === "loading" ? (
        <LoadingDots
          className={styles.loadingRow}
          label="Cargando tus planes guardados..."
        />
      ) : null}

      {status === "error" ? (
        <div className={styles.stateBox} role="alert">
          <Icon name="triangle-alert" />
          <p>No pudimos cargar tus planes guardados.</p>
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
          <h2 className="sp-h4">Aún no guardaste ningún plan</h2>
          <p>
            Tocá el marcador en cualquier tarjeta o detalle de plan para
            guardarlo acá.
          </p>
        </div>
      ) : null}

      {status === "idle" && cards.length > 0 ? (
        <>
          <ul className={styles.grid} aria-label="Planes guardados">
            {cards.map((plan) => (
              <li key={plan.id}>
                <PlanCard plan={plan} />
              </li>
            ))}
          </ul>

          {pagination.totalPages > 1 ? (
            <nav
              className={styles.pagination}
              aria-label="Paginación de planes guardados"
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
