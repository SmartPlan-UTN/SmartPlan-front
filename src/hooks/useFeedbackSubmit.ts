"use client";

import { useCallback, useRef, useState } from "react";

import { submitFeedback } from "@/lib/api";
import {
  toFeedbackError,
  type FeedbackError,
} from "@/lib/plans/feedbackErrors";
import type { CreateFeedbackPayload, PlanFeedback } from "@/types";

export type FeedbackSubmitStatus = "idle" | "working" | "error";

/**
 * Outcome of a `submit` call. `null` (not this type) means the call was
 * ignored because another was already in flight.
 */
export type FeedbackSubmitOutcome =
  | { ok: true; feedback: PlanFeedback }
  | { ok: false; error: FeedbackError };

export interface UseFeedbackSubmitResult {
  status: FeedbackSubmitStatus;
  error: FeedbackError | null;
  /** Record feedback for a completed plan (CU23). */
  submit: (
    planId: number,
    payload: CreateFeedbackPayload
  ) => Promise<FeedbackSubmitOutcome | null>;
  reset: () => void;
}

/**
 * The CU23 feedback mutation, shared by the history card and the plan detail.
 * Keeps no feedback state of its own — each surface reconciles its own view
 * from the returned feedback or a refetch. One in-flight guard blocks the
 * double submit; no optimistic state.
 */
export function useFeedbackSubmit(): UseFeedbackSubmitResult {
  const [status, setStatus] = useState<FeedbackSubmitStatus>("idle");
  const [error, setError] = useState<FeedbackError | null>(null);
  const inFlight = useRef(false);

  const submit = useCallback(
    async (
      planId: number,
      payload: CreateFeedbackPayload
    ): Promise<FeedbackSubmitOutcome | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setStatus("working");
      setError(null);

      try {
        const feedback = await submitFeedback(planId, payload);
        setStatus("idle");
        return { ok: true as const, feedback };
      } catch (err) {
        const feedbackError = toFeedbackError(err);
        setError(feedbackError);
        setStatus("error");
        return { ok: false as const, error: feedbackError };
      } finally {
        inFlight.current = false;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { status, error, submit, reset };
}
