"use client";

import { useCallback, useMemo, useState } from "react";

import { listOutings } from "@/lib/api";
import type { OutingStatus, OutingSummary } from "@/types";

import { useExplorationSearch } from "./useExplorationSearch";

export interface UseOutingsResult {
  outings: OutingSummary[];
  status: "loading" | "error" | "idle";
  errorMessage: string | null;
  hasResults: boolean;
  page: number;
  totalPages: number;
  goToPage: (page: number) => void;
  retry: () => void;
  /**
   * Merge a just-happened change (submitted feedback) into an outing in
   * place, so its card reflects it without waiting for a refetch. Cleared on
   * the next page load.
   */
  patchOuting: (outingId: number, patch: Partial<OutingSummary>) => void;
}

const PAGE_SIZE = 12;

/**
 * One tab of "Mis salidas" (#130): the outings to do or the ones done.
 * Thin wrapper over `useExplorationSearch` — page-by-page pagination,
 * race-guarded fetches — plus a local patch layer for post-submit
 * reconciliation. Moving an outing between tabs is a refetch of both, via
 * `retry`, never a local guess.
 */
export function useOutings(status: OutingStatus): UseOutingsResult {
  const params = useMemo(() => ({ status }), [status]);
  const {
    items,
    pagination,
    status: loadStatus,
    errorMessage,
    page,
    goToPage,
    retry,
  } = useExplorationSearch<{ status: OutingStatus }, OutingSummary>(
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
    goToPage,
    retry,
    patchOuting,
  };
}
