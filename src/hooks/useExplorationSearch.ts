import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import type { PaginatedResult, PaginationMetadata } from "@/types";

export type ExplorationStatus = "loading" | "error" | "idle";

const GENERIC_ERROR = "No pudimos completar la búsqueda. Intentá de nuevo.";

export interface UseExplorationSearchResult<TResult> {
  items: TResult[];
  pagination: PaginationMetadata | null;
  status: ExplorationStatus;
  errorMessage: string | null;
  hasResults: boolean;
  page: number;
  goToPage: (page: number) => void;
  retry: () => void;
}

/**
 * Fetch orchestration shared by every exploration screen (CU9, CU12):
 * `params` drives fetches whenever it changes or `goToPage` is called
 * (real pagination, page by page — not infinite scroll), and every request
 * is guarded against an older, slower one overwriting a newer result.
 *
 * The caller owns search text, filters, and sort — `params` should already
 * reflect their current values. This hook only reacts to `params` changing
 * (compared by value, via `JSON.stringify`, since the shape varies by
 * caller) and owns page tracking, in-flight status, and error handling.
 *
 * `fetcher` and `params` are read through refs so the fetch effect can
 * depend on the serialized `params` alone instead of re-running whenever
 * the caller passes a new function/object identity.
 */
export function useExplorationSearch<TParams extends object, TResult>(
  fetcher: (
    params: TParams & { page: number; limit: number },
  ) => Promise<PaginatedResult<TResult>>,
  params: TParams,
  pageSize = 20,
  enabled = true,
): UseExplorationSearchResult<TResult> {
  const [items, setItems] = useState<TResult[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(
    null,
  );
  const [status, setStatus] = useState<ExplorationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [page, setPage] = useState(1);
  const requestId = useRef(0);
  const fetcherRef = useRef(fetcher);
  const paramsRef = useRef(params);
  const paramsKey = JSON.stringify(params);

  // New search text, filters, or sort: back to page 1. Adjusted during
  // render, same as Navbar's `menuRoute` — an effect here would fetch page
  // 1 with the *old* params first, then immediately refetch with the new
  // ones once the reset commits.
  const [previousParamsKey, setPreviousParamsKey] = useState(paramsKey);
  if (paramsKey !== previousParamsKey) {
    setPreviousParamsKey(paramsKey);
    if (page !== 1) {
      setPage(1);
    }
  }

  // Refs can't be written during render (see the `react-hooks/refs` rule);
  // this keeps them current right after every commit instead.
  useEffect(() => {
    fetcherRef.current = fetcher;
    paramsRef.current = params;
  });

  useEffect(() => {
    if (!enabled) return;

    const currentRequestId = ++requestId.current;

    async function run() {
      setStatus("loading");
      setErrorMessage(null);

      try {
        const result = await fetcherRef.current({
          ...paramsRef.current,
          page,
          limit: pageSize,
        });
        if (currentRequestId !== requestId.current) return;
        setItems(result.data);
        setPagination(result.pagination);
        setStatus("idle");
      } catch (error) {
        if (currentRequestId !== requestId.current) return;
        // Deliberately doesn't clear `items`/`pagination`: a failed refetch
        // (page change, new filter) shouldn't wipe a grid that was already
        // showing valid results — only the very first load has nothing to
        // preserve, and it already starts from the empty state.
        setStatus("error");
        setErrorMessage(
          error instanceof ApiError ? error.message : GENERIC_ERROR,
        );
      }
    }

    void run();
  }, [paramsKey, pageSize, retryToken, page, enabled]);

  const goToPage = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  const retry = useCallback(() => {
    setRetryToken((token) => token + 1);
  }, []);

  const hasResults = items.length > 0;

  return {
    items,
    pagination,
    status,
    errorMessage,
    hasResults,
    page,
    goToPage,
    retry,
  };
}
