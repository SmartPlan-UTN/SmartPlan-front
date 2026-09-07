"use client";

import { useCallback, useRef, useState } from "react";

import { deselectPlan, selectPlan } from "@/lib/api";
import {
  toPlanSelectionError,
  type PlanSelectionError,
} from "@/lib/plans/planSelectionErrors";
import type { PlanSelectionResult } from "@/types";

export type PlanSelectionStatus = "idle" | "working" | "error";

/**
 * Outcome of a `select` / `deselect` call. `null` (not this type) means the
 * call was ignored because another was already in flight.
 */
export type PlanSelectionOutcome =
  | { ok: true; result: PlanSelectionResult }
  | { ok: false; error: PlanSelectionError };

export interface UsePlanSelectionResult {
  status: PlanSelectionStatus;
  error: PlanSelectionError | null;
  /** Mark intent — `generated → selected` (CU22). */
  select: (planId: number) => Promise<PlanSelectionOutcome | null>;
  /** Withdraw intent — `selected → generated` (CU22). Idempotent server-side. */
  deselect: (planId: number) => Promise<PlanSelectionOutcome | null>;
  reset: () => void;
}

/**
 * The plan-intent toggle (CU22), shared by the results rail (PAN 11) and the
 * plan detail (PAN 17). Keeps no plan state of its own — each surface
 * reconciles its own view from the result or a refetch. One in-flight guard
 * covers both directions: it is what the double-click and two-surface cases
 * rely on. No optimistic state — the caller applies the new status only from a
 * successful outcome.
 */
export function usePlanSelection(): UsePlanSelectionResult {
  const [status, setStatus] = useState<PlanSelectionStatus>("idle");
  const [error, setError] = useState<PlanSelectionError | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(
    async (
      mutate: (planId: number) => Promise<PlanSelectionResult>,
      planId: number,
    ): Promise<PlanSelectionOutcome | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setStatus("working");
      setError(null);

      try {
        const result = await mutate(planId);
        setStatus("idle");
        return { ok: true as const, result };
      } catch (err) {
        const selectionError = toPlanSelectionError(err);
        setError(selectionError);
        setStatus("error");
        return { ok: false as const, error: selectionError };
      } finally {
        inFlight.current = false;
      }
    },
    [],
  );

  const select = useCallback(
    (planId: number) => run(selectPlan, planId),
    [run],
  );
  const deselect = useCallback(
    (planId: number) => run(deselectPlan, planId),
    [run],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { status, error, select, deselect, reset };
}
