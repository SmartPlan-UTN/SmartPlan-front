"use client";

import { useCallback, useMemo, useState } from "react";

import { getMyPlans } from "@/lib/api";
import type { OwnPlanSummary } from "@/types";

import { useExplorationSearch } from "./useExplorationSearch";

export interface UseMyPlansResult {
  plans: OwnPlanSummary[];
  status: "loading" | "error" | "idle";
  errorMessage: string | null;
  hasResults: boolean;
  page: number;
  totalPages: number;
  goToPage: (page: number) => void;
  retry: () => void;
  /**
   * Merge a just-happened change (a submitted feedback) into the plan in
   * place, so the card reflects it without waiting for a refetch. Cleared on
   * the next page load.
   */
  patchPlan: (planId: number, patch: Partial<OwnPlanSummary>) => void;
}

const PAGE_SIZE = 12;

/**
 * The signed-in user's plan history (CU23 · PAN 13). Thin wrapper over
 * `useExplorationSearch` — page-by-page pagination, race-guarded fetches —
 * plus a local patch layer for post-submit reconciliation, mirroring
 * `PlanDetailView`'s `override` idiom.
 */
export function useMyPlans(enabled = true): UseMyPlansResult {
  const { items, pagination, status, errorMessage, page, goToPage, retry } =
    useExplorationSearch<Record<string, never>, OwnPlanSummary>(
      getMyPlans,
      {},
      PAGE_SIZE,
      enabled
    );

  const [patches, setPatches] = useState<Map<number, Partial<OwnPlanSummary>>>(
    () => new Map()
  );
  // A new page (or a refetch) is authoritative — drop stale local patches.
  const [lastPageKey, setLastPageKey] = useState(page);
  if (page !== lastPageKey) {
    setLastPageKey(page);
    if (patches.size > 0) setPatches(new Map());
  }

  const patchPlan = useCallback(
    (planId: number, patch: Partial<OwnPlanSummary>) => {
      setPatches((current) => {
        const next = new Map(current);
        next.set(planId, { ...next.get(planId), ...patch });
        return next;
      });
    },
    []
  );

  const plans = useMemo(
    () =>
      items.map((plan) => {
        const patch = patches.get(plan.id);
        return patch ? { ...plan, ...patch } : plan;
      }),
    [items, patches]
  );

  return {
    plans,
    status,
    errorMessage,
    hasResults: plans.length > 0,
    page,
    totalPages: pagination?.totalPages ?? 1,
    goToPage,
    retry,
    patchPlan,
  };
}
