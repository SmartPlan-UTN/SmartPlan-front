"use client";

import { useCallback, useMemo, useState } from "react";

import { listOutings } from "@/lib/api";
import type { ListOutingsParams, OutingFilters, OutingStatus, OutingSummary } from "@/types";

import { useExplorationSearch } from "./useExplorationSearch";

export interface UseOutingsResult {
  outings: OutingSummary[];
  status: "loading" | "error" | "idle";
  errorMessage: string | null;
  hasResults: boolean;
  page: number;
  totalPages: number;
  /** Outings in this tab across every page. */
  total: number;
  pageSize: number;
  goToPage: (page: number) => void;
  retry: () => void;
  /**
   * Merge a just-happened change (submitted feedback) into an outing in
   * place, so its card reflects it without waiting for a refetch. Cleared on
   * the next page load.
   */
  patchOuting: (outingId: number, patch: Partial<OutingSummary>) => void;
}

// Two columns of three rows on desktop: a page fits on screen without
// scrolling through a wall of cards.
const PAGE_SIZE = 6;

/**
 * One tab of "Mis salidas" (#130): the outings to do or the ones done.
 * Thin wrapper over `useExplorationSearch` — page-by-page pagination,
 * race-guarded fetches — plus a local patch layer for post-submit
 * reconciliation. Moving an outing between tabs is a refetch of both, via
 * `retry`, never a local guess.
 */
export function useOutings(
  status: OutingStatus,
  filters: OutingFilters = {},
): UseOutingsResult {
  const { search, from, to, sort, rated } = filters;
  // Only what is set travels, so the request (and the page reset that a new
  // params key triggers) changes only when a filter really does.
  const params = useMemo(() => {
    const next: Omit<ListOutingsParams, "page" | "limit"> = { status };
    if (search?.trim()) next.search = search.trim();
    if (from) next.from = from;
    if (to) next.to = to;
    if (sort && sort !== "recent") next.sort = sort;
    // Feedback exists only once done.
    if (status === "completed" && rated !== undefined) next.rated = rated;
    return next;
  }, [status, search, from, to, sort, rated]);
  const {
    items,
    pagination,
    status: loadStatus,
    errorMessage,
    page,
    goToPage,
    retry,
  } = useExplorationSearch<Omit<ListOutingsParams, "page" | "limit">, OutingSummary>(
    listOutings,
    params,
    PAGE_SIZE,
  );

  const [patches, setPatches] = useState<
    Map<number, Partial<OutingSummary>>
  >(() => new Map());
  // A new page (or tab) is authoritative — drop stale local patches.
  const pageKey = `${status}:${page}`;
  const [lastPageKey, setLastPageKey] = useState(pageKey);
  if (pageKey !== lastPageKey) {
    setLastPageKey(pageKey);
    if (patches.size > 0) setPatches(new Map());
  }

  const patchOuting = useCallback(
    (outingId: number, patch: Partial<OutingSummary>) => {
      setPatches((current) => {
        const next = new Map(current);
        next.set(outingId, { ...next.get(outingId), ...patch });
        return next;
      });
    },
    [],
  );

  const outings = useMemo(
    () =>
      items.map((outing) => {
        const patch = patches.get(outing.id);
        return patch ? { ...outing, ...patch } : outing;
      }),
    [items, patches],
  );

  return {
    outings,
    status: loadStatus,
    errorMessage,
    hasResults: outings.length > 0,
    page,
    totalPages: pagination?.totalPages ?? 1,
    total: pagination?.total ?? outings.length,
    pageSize: PAGE_SIZE,
    goToPage,
    retry,
    patchOuting,
  };
}
