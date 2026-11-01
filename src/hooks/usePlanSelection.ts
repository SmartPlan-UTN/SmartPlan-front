"use client";

import { useCallback, useRef, useState } from "react";

import { createOuting } from "@/lib/api";
import {
  toPlanSelectionError,
  type PlanSelectionError,
} from "@/lib/plans/planSelectionErrors";
import type { OutingCreationResult } from "@/types";

export type PlanSelectionStatus = "idle" | "working" | "error";

/**
 * Outcome of a `choose` call. `null` (not this type) means the call was
 * ignored because another was already in flight.
 */
export type PlanSelectionOutcome =
  | { ok: true; result: OutingCreationResult }
  | { ok: false; error: PlanSelectionError };

export interface UsePlanSelectionResult {
  status: PlanSelectionStatus;
  error: PlanSelectionError | null;
  /**
   * "Lo voy a hacer" (CU22): copies the plan into a new outing of "Mis
   * salidas". One-shot — there is no undo here; an outing is cancelled from
   * Mis salidas. Idempotent server-side, so a retry never duplicates it.
   */
  choose: (planId: number) => Promise<PlanSelectionOutcome | null>;
  reset: () => void;
}

/**
 * "Lo voy a hacer" (CU22, #130), shared by the results rail (PAN 11) and the
 * plan detail (PAN 17). Keeps no plan state of its own — each surface applies
 * the outing it gets back. The in-flight guard is what makes a double click
 * a no-op before the request even leaves; the backend's idempotency covers
 * the rest. No optimistic state — the surface flips only on success.
 */
export function usePlanSelection(): UsePlanSelectionResult {
  const [status, setStatus] = useState<PlanSelectionStatus>("idle");
  const [error, setError] = useState<PlanSelectionError | null>(null);
  const inFlight = useRef(false);

  const choose = useCallback(
    async (planId: number): Promise<PlanSelectionOutcome | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setStatus("working");
      setError(null);

      try {
        const result = await createOuting(planId);
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

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { status, error, choose, reset };
}
