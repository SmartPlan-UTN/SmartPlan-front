"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button, Icon } from "@/components/ui";
import { useDebouncedValue } from "@/hooks";
import { ApiError, searchActivities } from "@/lib/api";
import type { ActivitySearchResult, PaginationMetadata } from "@/types";

import { ActivityCard } from "./ActivityCard";
import styles from "./activity.module.css";

type Status = "loading" | "loading-more" | "error" | "idle";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 400;
const GENERIC_ERROR = "No pudimos completar la búsqueda. Intentá de nuevo.";

/**
 * Activity search box and results grid (CU9 · PAN 11). Debounces the query,
 * renders loading/empty/error states, and loads further pages on demand.
 */
export function ActivitySearch() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  // Set by the "Buscar" button or Enter, to search immediately instead of
  // waiting out the debounce. Cleared on the next keystroke so debounce
  // resumes driving the search normally.
  const [manualQuery, setManualQuery] = useState<string | null>(null);
  const effectiveQuery = manualQuery ?? debouncedQuery;
  const [items, setItems] = useState<ActivitySearchResult[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(
    null,
  );
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  // Guards against an older, slower request overwriting a newer one's result.
  const requestId = useRef(0);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setManualQuery(null);
  }, []);

  const searchNow = useCallback(() => {
    setManualQuery(query);
  }, [query]);

  useEffect(() => {
    const currentRequestId = ++requestId.current;

    async function run() {
      setStatus("loading");
      setErrorMessage(null);

      try {
        const result = await searchActivities({
          search: effectiveQuery.trim() || undefined,
          page: 1,
          limit: PAGE_SIZE,
        });
        if (currentRequestId !== requestId.current) return;
        setItems(result.data);
        setPagination(result.pagination);
        setStatus("idle");
      } catch (error) {
        if (currentRequestId !== requestId.current) return;
        setItems([]);
        setPagination(null);
        setStatus("error");
        setErrorMessage(error instanceof ApiError ? error.message : GENERIC_ERROR);
      }
    }

    void run();
  }, [effectiveQuery, retryToken]);

  const loadMore = useCallback(() => {
    if (!pagination) return;

    const nextPage = pagination.page + 1;
    const currentRequestId = ++requestId.current;

    async function run() {
      setStatus("loading-more");
      setErrorMessage(null);

      try {
        const result = await searchActivities({
          search: effectiveQuery.trim() || undefined,
          page: nextPage,
          limit: PAGE_SIZE,
        });
        if (currentRequestId !== requestId.current) return;
        setItems((previousItems) => [...previousItems, ...result.data]);
        setPagination(result.pagination);
        setStatus("idle");
      } catch (error) {
        if (currentRequestId !== requestId.current) return;
        setStatus("error");
        setErrorMessage(error instanceof ApiError ? error.message : GENERIC_ERROR);
      }
    }

    void run();
  }, [effectiveQuery, pagination]);

  const retry = useCallback(() => {
    setRetryToken((token) => token + 1);
  }, []);

  const hasMore = pagination != null && pagination.page < pagination.totalPages;
  const hasResults = items.length > 0;
  const resultsCountLabel =
    pagination != null
      ? pagination.total === 1
        ? "actividad encontrada"
        : "actividades encontradas"
      : null;

  return (
    <div>
      <div className={styles.searchField}>
        <Icon
          name="search"
          size={18}
          className={styles.searchIcon}
          aria-hidden="true"
        />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Buscá una actividad, lugar o experiencia"
          aria-label="Buscar actividades"
          value={query}
          onChange={(event) => {
            handleQueryChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              searchNow();
            }
          }}
        />
        <Button variant="primary" size="sm" onClick={searchNow}>
          Buscar
        </Button>
      </div>

      {hasResults && pagination != null ? (
        <p className={`sp-body ${styles.resultsLabel}`}>
          <strong>{pagination.total}</strong> {resultsCountLabel} cerca tuyo
        </p>
      ) : null}

      {status === "loading" ? (
        <div className={styles.stateBlock}>
          <div className={styles.loadingDots}>
            <span className={styles.loadingDot} />
            <span className={styles.loadingDot} />
            <span className={styles.loadingDot} />
          </div>
          <p className="sp-body">Buscando lo mejor cerca tuyo...</p>
        </div>
      ) : null}

      {status === "error" && !hasResults ? (
        <div className={styles.stateBlock} role="alert">
          <Icon
            name="triangle-alert"
            size={32}
            className={styles.errorIcon}
          />
          <h2 className="sp-h3">Algo salió mal</h2>
          <p className="sp-body">{errorMessage}</p>
          <Button variant="ghostEmber" onClick={retry}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {status === "idle" && !hasResults ? (
        <div className={styles.stateBlock}>
          <Icon name="inbox" size={32} className={styles.stateIcon} />
          <h2 className="sp-h3">Sin resultados</h2>
          <p className="sp-body">
            No encontramos actividades para tu búsqueda. Probá con otras
            palabras.
          </p>
        </div>
      ) : null}

      {hasResults ? (
        <>
          <div className={styles.grid}>
            {items.map((activity) => (
              <ActivityCard activity={activity} key={activity.id} />
            ))}
          </div>

          {hasMore ? (
            <div className={styles.loadMoreRow}>
              <Button
                variant="ghostLight"
                onClick={loadMore}
                disabled={status === "loading-more"}
              >
                {status === "loading-more" ? "Cargando..." : "Cargar más"}
              </Button>
            </div>
          ) : null}

          {status === "error" && hasResults ? (
            <p className={`sp-small ${styles.errorIcon}`} role="alert">
              {errorMessage}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
