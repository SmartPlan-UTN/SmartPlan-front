import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { PlanFeedback } from "@/types";

import { useFeedbackSubmit } from "./useFeedbackSubmit";

const submitFeedback = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  submitFeedback,
}));

const FEEDBACK: PlanFeedback = {
  rating: 4,
  tags: ["would_recommend"],
  comment: null,
  actualCost: null,
  actualDuration: null,
  createdAt: "2026-08-20T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useFeedbackSubmit (CU23)", () => {
  it("returns the created feedback on success", async () => {
    submitFeedback.mockResolvedValue(FEEDBACK);
    const { result } = renderHook(() => useFeedbackSubmit());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.submit(7, { rating: 4 });
    });

    expect(submitFeedback).toHaveBeenCalledWith(7, { rating: 4 });
    expect(outcome).toEqual({ ok: true, feedback: FEEDBACK });
    expect(result.current.status).toBe("idle");
  });

  it("ignores a second call while one is in flight", async () => {
    let release!: (value: PlanFeedback) => void;
    submitFeedback.mockReturnValue(
      new Promise<PlanFeedback>((resolve) => {
        release = resolve;
      })
    );
    const { result } = renderHook(() => useFeedbackSubmit());

    let first!: Promise<unknown>;
    let second: unknown;
    act(() => {
      first = result.current.submit(7, { rating: 4 });
    });
    await act(async () => {
      second = await result.current.submit(7, { rating: 2 });
    });

    expect(second).toBeNull();
    expect(submitFeedback).toHaveBeenCalledTimes(1);

    await act(async () => {
      release(FEEDBACK);
      await first;
    });
  });

  it("maps a duplicate submission to a reconcile error", async () => {
    submitFeedback.mockRejectedValue(
      new ApiError({
        message: "x",
        type: "HTTP",
        status: 409,
        code: "FEEDBACK_ALREADY_SUBMITTED",
      })
    );
    const { result } = renderHook(() => useFeedbackSubmit());

    await act(async () => {
      await result.current.submit(7, { rating: 4 });
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toMatchObject({
      kind: "already-submitted",
      reconcile: true,
    });
  });

  it("maps a network failure to a recoverable error", async () => {
    submitFeedback.mockRejectedValue(
      new ApiError({ message: "x", type: "NETWORK" })
    );
    const { result } = renderHook(() => useFeedbackSubmit());

    await act(async () => {
      await result.current.submit(7, { rating: 4 });
    });

    await waitFor(() =>
      expect(result.current.error).toMatchObject({
        kind: "network",
        recoverable: true,
        reconcile: false,
      })
    );
  });
});
