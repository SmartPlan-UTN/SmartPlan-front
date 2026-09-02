import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, createPlanRequest, createSurprisePlanRequest, getPlanRequestStatus } from "@/lib/api";
import type {
  CreatePlanRequestPayload,
  CreateSurprisePlanRequestPayload,
  PlanRequestPlanSummary,
  PlanSelectionResult,
  RequestStatusKey,
} from "@/types";

const POLL_INTERVAL_MS = 2000;
// A frontend-only display timeout: the request keeps existing and keeps
// being processed by the backend regardless of this. Timing out only stops
// this hook's own polling loop and shows a "still waiting" state — it never
// discards `planRequestId` or implies the request itself failed.
const DISPLAY_TIMEOUT_MS = 90000;

const GENERIC_ERROR = "No pudimos generar tu plan. Intentá de nuevo.";

export type PlanRequestPhase =
  | "idle"
  | "submitting"
  | "pending"
  | "processing"
  | "timedOut"
  | "generated"
  | "failed";

export interface PlanRequestFailure {
  code: string | null;
  message: string;
}

/**
 * The last request this hook issued, kept so the UI can offer the two
 * things CU17 asks for after a result or a failure: adjusting the idea
 * instead of retyping it, and retrying the very same request.
 *
 * A surprise request has no query — it is coordinates — which is why the
 * kind is carried alongside the payload rather than inferred.
 */
export type LastSubmission =
  | { kind: "auto"; payload: CreatePlanRequestPayload }
  | { kind: "surprise"; payload: CreateSurprisePlanRequestPayload };

export interface UsePlanRequestPollingResult {
  phase: PlanRequestPhase;
  planRequestId: number | null;
  plans: PlanRequestPlanSummary[] | null;
  failure: PlanRequestFailure | null;
  submit: (payload: CreatePlanRequestPayload) => void;
  submitSurprise: (payload: CreateSurprisePlanRequestPayload) => void;
  /** Resumes polling the same request after a display timeout. Never issues a new POST. */
  keepWaiting: () => void;
  /** Local reset to `idle`. Does not call the backend and does not resubmit. */
  discard: () => void;
  /**
   * Issues the same request again after a failure. This *is* a new POST —
   * a failed request is terminal on the backend, so there is nothing left
   * to resume. Distinct from `keepWaiting`, which never posts.
   */
  retry: () => void;
  /**
   * "Sorprendeme de nuevo" (CU19): creates a brand-new surprise request from
   * the same coordinates, only from an explicit user action on a generated
   * result. A no-op while a generation is in flight (guards double clicks)
   * and for automatic submissions (those adjust the query instead).
   */
  regenerate: () => void;
  /** What was asked for last, so the UI can offer to adjust it. */
  lastSubmission: LastSubmission | null;
  /**
   * Reflects a plan-intent change (CU22) in the in-memory alternatives from the
   * backend result: the target plan takes the returned status, and — only when
   * the result is `selected` — any sibling that was `selected` returns to
   * `generated` (the 0-or-1 rule the backend enforces). A `generated` result
   * (a withdrawn intent) just updates the target. No refetch.
   */
  applySelectionChange: (result: PlanSelectionResult) => void;
  /**
   * Re-reads the plan request from the backend and replaces the alternatives
   * with the authoritative state. Used to reconcile after a selection was
   * rejected because the request had advanced (409).
   */
  refresh: () => void;
}

function toFailure(error: unknown): PlanRequestFailure {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.message || GENERIC_ERROR };
  }
  return { code: null, message: GENERIC_ERROR };
}

function statusKeyToPhase(statusKey: RequestStatusKey): PlanRequestPhase {
  return statusKey;
}

/**
 * Owns the CU17/CU19 plan-request lifecycle: submit (automatic or
 * surprise), then poll `GET /plan-requests/:id` until the backend reports
 * a terminal `statusKey` (`generated` or `failed`). `pending`/`processing`
 * are the only in-flight states the backend reports — this hook never
 * invents finer-grained progress.
 *
 * A display timeout moves the UI to `timedOut` without touching the
 * underlying request: `planRequestId` is retained, polling can resume via
 * `keepWaiting`, and no new request is ever created automatically. Only an
 * explicit `submit`/`submitSurprise` call issues a new `POST`.
 */
export function usePlanRequestPolling(): UsePlanRequestPollingResult {
  const [phase, setPhase] = useState<PlanRequestPhase>("idle");
  const [planRequestId, setPlanRequestId] = useState<number | null>(null);
  const [plans, setPlans] = useState<PlanRequestPlanSummary[] | null>(null);
  const [failure, setFailure] = useState<PlanRequestFailure | null>(null);
  const [lastSubmission, setLastSubmission] = useState<LastSubmission | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRequestId = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const startPolling = useCallback(
    (id: number) => {
      clearTimers();

      timeoutRef.current = setTimeout(() => {
        if (activeRequestId.current !== id) return;
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setPhase("timedOut");
      }, DISPLAY_TIMEOUT_MS);

      const poll = async () => {
        try {
          const status = await getPlanRequestStatus(id);
          if (activeRequestId.current !== id) return;

          if (status.statusKey === "generated") {
            clearTimers();
            setPlans(status.plans ?? []);
            setPhase("generated");
            return;
          }

          if (status.statusKey === "failed") {
            clearTimers();
            setFailure({
              code: status.failureCode ?? null,
              message: GENERIC_ERROR,
            });
            setPhase("failed");
            return;
          }

          setPhase(statusKeyToPhase(status.statusKey));
        } catch (error) {
          if (activeRequestId.current !== id) return;
          clearTimers();
          setFailure(toFailure(error));
          setPhase("failed");
        }
      };

      void poll();
      intervalRef.current = setInterval(() => {
        void poll();
      }, POLL_INTERVAL_MS);
    },
    [clearTimers],
  );

  const beginRequest = useCallback(
    async (accept: () => Promise<{ id: number }>) => {
      setFailure(null);
      setPlans(null);
      setPhase("submitting");

      try {
        const accepted = await accept();
        activeRequestId.current = accepted.id;
        setPlanRequestId(accepted.id);
        setPhase("pending");
        startPolling(accepted.id);
      } catch (error) {
        setFailure(toFailure(error));
        setPhase("failed");
      }
    },
    [startPolling],
  );

  const submit = useCallback(
    (payload: CreatePlanRequestPayload) => {
      setLastSubmission({ kind: "auto", payload });
      void beginRequest(() => createPlanRequest(payload));
    },
    [beginRequest],
  );

  const submitSurprise = useCallback(
    (payload: CreateSurprisePlanRequestPayload) => {
      setLastSubmission({ kind: "surprise", payload });
      void beginRequest(() => createSurprisePlanRequest(payload));
    },
    [beginRequest],
  );

  const retry = useCallback(() => {
    if (!lastSubmission) return;
    if (lastSubmission.kind === "surprise") {
      void beginRequest(() => createSurprisePlanRequest(lastSubmission.payload));
      return;
    }
    void beginRequest(() => createPlanRequest(lastSubmission.payload));
  }, [beginRequest, lastSubmission]);

  const regenerate = useCallback(() => {
    if (!lastSubmission || lastSubmission.kind !== "surprise") return;
    if (phase === "submitting" || phase === "pending" || phase === "processing") {
      return;
    }
    const { payload } = lastSubmission;
    void beginRequest(() => createSurprisePlanRequest(payload));
  }, [beginRequest, lastSubmission, phase]);

  const keepWaiting = useCallback(() => {
    if (planRequestId === null) return;
    setPhase("processing");
    startPolling(planRequestId);
  }, [planRequestId, startPolling]);

  const discard = useCallback(() => {
    clearTimers();
    activeRequestId.current = null;
    setPlanRequestId(null);
    setPlans(null);
    setFailure(null);
    setPhase("idle");
    // `lastSubmission` deliberately survives: going back to the composer
    // is exactly when the previous idea is worth having around.
  }, [clearTimers]);

  const applySelectionChange = useCallback((result: PlanSelectionResult) => {
    setPlans((current) => {
      if (!current) return current;
      return current.map((plan) => {
        if (plan.id === result.id)
          return {
            ...plan,
            status: result.status,
            viewerPlanState: result.viewerPlanState,
          };
        return plan;
      });
    });
  }, []);

  const refresh = useCallback(() => {
    if (planRequestId === null) return;
    void getPlanRequestStatus(planRequestId)
      .then((status) => {
        if (status.statusKey === "generated") setPlans(status.plans ?? []);
      })
      .catch(() => {
        // A failed reconcile leaves the current view untouched; the user can
        // retry the selection, which will surface the error again.
      });
  }, [planRequestId]);

  return {
    phase,
    planRequestId,
    plans,
    failure,
    submit,
    submitSurprise,
    keepWaiting,
    discard,
    retry,
    regenerate,
    lastSubmission,
    applySelectionChange,
    refresh,
  };
}
