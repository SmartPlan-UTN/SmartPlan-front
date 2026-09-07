import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { PlanRequestAccepted, PlanRequestStatus } from "@/types";

import { usePlanRequestPolling } from "./usePlanRequestPolling";

const createPlanRequest = vi.hoisted(() => vi.fn());
const createSurprisePlanRequest = vi.hoisted(() => vi.fn());
const getPlanRequestStatus = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, createPlanRequest, createSurprisePlanRequest, getPlanRequestStatus };
});

function accepted(overrides: Partial<PlanRequestAccepted> = {}): PlanRequestAccepted {
  return {
    id: 42,
    statusKey: "pending",
    mode: "automatic",
    requestedAt: new Date().toISOString(),
    ...overrides,
  };
}

function status(overrides: Partial<PlanRequestStatus> = {}): PlanRequestStatus {
  return {
    id: 42,
    statusKey: "pending",
    mode: "automatic",
    requestedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("usePlanRequestPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    createPlanRequest.mockReset();
    createSurprisePlanRequest.mockReset();
    getPlanRequestStatus.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts idle", () => {
    const { result } = renderHook(() => usePlanRequestPolling());
    expect(result.current.phase).toBe("idle");
    expect(result.current.planRequestId).toBeNull();
  });

  it("submits, polls, and reaches generated with the returned plans", async () => {
    createPlanRequest.mockResolvedValue(accepted());
    getPlanRequestStatus
      .mockResolvedValueOnce(status({ statusKey: "processing" }))
      .mockResolvedValueOnce(
        status({
          statusKey: "generated",
          plans: [
            {
              id: 1,
              title: "Tarde en bodega",
              description: null,
              estimatedTotalCost: 4200,
              estimatedTotalDuration: 180,
              activityCount: 3,
              averageRating: 4.5,
              distanceKm: 2.5,
              categories: [],
              activityNames: ["Degustación", "Almuerzo", "Paseo"],
              status: { key: "generated", name: "Generated" },
            },
          ],
        }),
      );

    const { result } = renderHook(() => usePlanRequestPolling());

    await act(async () => {
      result.current.submit({ query: "algo romántico" });
    });

    expect(createPlanRequest).toHaveBeenCalledWith({ query: "algo romántico" });
    expect(result.current.planRequestId).toBe(42);

    // `startPolling` polls immediately (not just on the interval), so the
    // first mocked status ("processing") resolves right away.
    await waitFor(() => {
      expect(result.current.phase).toBe("processing");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    await waitFor(() => {
      expect(result.current.phase).toBe("generated");
    });
    expect(result.current.plans).toHaveLength(1);
    expect(result.current.planRequestId).toBe(42);
  });

  it("moves to failed when the backend reports a failed status, without inventing progress steps", async () => {
    createPlanRequest.mockResolvedValue(accepted());
    getPlanRequestStatus.mockResolvedValue(
      status({ statusKey: "failed", failureCode: "GENERATION_UNAVAILABLE" }),
    );

    const { result } = renderHook(() => usePlanRequestPolling());

    await act(async () => {
      result.current.submit({ query: "algo romántico" });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    await waitFor(() => {
      expect(result.current.phase).toBe("failed");
    });
    expect(result.current.failure?.code).toBe("GENERATION_UNAVAILABLE");
  });

  it("surfaces a submit-time error (e.g. 429) as failed without ever polling", async () => {
    createPlanRequest.mockRejectedValue(
      new ApiError({ message: "Too many requests", type: "HTTP", status: 429, code: "TOO_MANY_ACTIVE_REQUESTS" }),
    );

    const { result } = renderHook(() => usePlanRequestPolling());

    await act(async () => {
      result.current.submit({ query: "algo romántico" });
    });

    expect(result.current.phase).toBe("failed");
    expect(result.current.failure?.code).toBe("TOO_MANY_ACTIVE_REQUESTS");
    expect(getPlanRequestStatus).not.toHaveBeenCalled();
  });

  it("on display timeout, keeps the same planRequestId and never issues a new POST; keepWaiting resumes polling the same request", async () => {
    createPlanRequest.mockResolvedValue(accepted());
    getPlanRequestStatus.mockResolvedValue(status({ statusKey: "processing" }));

    const { result } = renderHook(() => usePlanRequestPolling());

    await act(async () => {
      result.current.submit({ query: "algo romántico" });
    });
    const requestId = result.current.planRequestId;
    expect(requestId).toBe(42);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(90000);
    });

    expect(result.current.phase).toBe("timedOut");
    expect(result.current.planRequestId).toBe(requestId);
    expect(createPlanRequest).toHaveBeenCalledTimes(1);

    getPlanRequestStatus.mockResolvedValueOnce(
      status({
        statusKey: "generated",
        plans: [],
      }),
    );

    await act(async () => {
      result.current.keepWaiting();
    });

    expect(createPlanRequest).toHaveBeenCalledTimes(1);
    expect(getPlanRequestStatus).toHaveBeenLastCalledWith(requestId);

    await waitFor(() => {
      expect(result.current.phase).toBe("generated");
    });
  });

  it("discard resets to idle locally without calling the backend", async () => {
    createPlanRequest.mockResolvedValue(accepted());
    getPlanRequestStatus.mockResolvedValue(status({ statusKey: "processing" }));

    const { result } = renderHook(() => usePlanRequestPolling());

    await act(async () => {
      result.current.submit({ query: "algo romántico" });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    act(() => {
      result.current.discard();
    });

    expect(result.current.phase).toBe("idle");
    expect(result.current.planRequestId).toBeNull();
    expect(createPlanRequest).toHaveBeenCalledTimes(1);

    const callsBeforeAdvance = getPlanRequestStatus.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(getPlanRequestStatus.mock.calls.length).toBe(callsBeforeAdvance);
  });

  it("submits a surprise request with coordinates", async () => {
    createSurprisePlanRequest.mockResolvedValue(accepted({ mode: "surprise" }));
    getPlanRequestStatus.mockResolvedValue(status({ statusKey: "pending", mode: "surprise" }));

    const { result } = renderHook(() => usePlanRequestPolling());

    await act(async () => {
      result.current.submitSurprise({ latitude: -32.9, longitude: -68.8 });
    });

    expect(createSurprisePlanRequest).toHaveBeenCalledWith({ latitude: -32.9, longitude: -68.8 });
    expect(result.current.planRequestId).toBe(42);
  });

  it("regenerate creates a brand-new surprise request from the same coordinates", async () => {
    createSurprisePlanRequest.mockResolvedValueOnce(accepted({ id: 42, mode: "surprise" }));
    getPlanRequestStatus.mockResolvedValueOnce(
      status({ statusKey: "generated", mode: "surprise", plans: [] }),
    );

    const { result } = renderHook(() => usePlanRequestPolling());

    await act(async () => {
      result.current.submitSurprise({ latitude: -32.9, longitude: -68.8 });
    });
    await waitFor(() => expect(result.current.phase).toBe("generated"));

    createSurprisePlanRequest.mockResolvedValueOnce(accepted({ id: 43, mode: "surprise" }));
    getPlanRequestStatus.mockResolvedValue(status({ statusKey: "pending", mode: "surprise" }));

    await act(async () => {
      result.current.regenerate();
    });

    await waitFor(() => expect(result.current.planRequestId).toBe(43));
    expect(createSurprisePlanRequest).toHaveBeenCalledTimes(2);
    expect(createSurprisePlanRequest).toHaveBeenLastCalledWith({
      latitude: -32.9,
      longitude: -68.8,
    });
  });

  it("regenerate is a no-op while a generation is in flight and for automatic submissions", async () => {
    createPlanRequest.mockResolvedValue(accepted());
    getPlanRequestStatus.mockResolvedValue(status({ statusKey: "processing" }));

    const { result } = renderHook(() => usePlanRequestPolling());

    await act(async () => {
      result.current.submit({ query: "algo tranquilo" });
    });
    await waitFor(() => expect(result.current.phase).toBe("processing"));

    act(() => {
      result.current.regenerate();
    });

    expect(createSurprisePlanRequest).not.toHaveBeenCalled();
  });
  it("retry issues the same request again after a failure, and keeps the idea for adjusting", async () => {
    createPlanRequest.mockRejectedValueOnce(new ApiError({
        message: "Falló el servicio",
        type: "HTTP",
        status: 502,
        code: "EXTERNAL_SERVICE_ERROR",
      }));
    const { result } = renderHook(() => usePlanRequestPolling());

    act(() => {
      result.current.submit({ query: "una tarde de vinos", context: { partySize: 4 } });
    });

    await waitFor(() => expect(result.current.phase).toBe("failed"));

    // The idea survives the failure — this is what "ajustar" reads back.
    expect(result.current.lastSubmission).toEqual({
      kind: "auto",
      payload: { query: "una tarde de vinos", context: { partySize: 4 } },
    });

    createPlanRequest.mockResolvedValueOnce(accepted());
    getPlanRequestStatus.mockResolvedValue(status({ statusKey: "processing" }));

    act(() => {
      result.current.retry();
    });

    // A real second POST, carrying exactly what was asked for the first time.
    await waitFor(() => expect(result.current.phase).not.toBe("failed"));
    expect(createPlanRequest).toHaveBeenLastCalledWith({
      query: "una tarde de vinos",
      context: { partySize: 4 },
    });
  });

  it("keeps the last idea after discard, so returning to the composer can restore it", async () => {
    createPlanRequest.mockResolvedValueOnce(accepted());
    getPlanRequestStatus.mockResolvedValue(status({ statusKey: "processing" }));
    const { result } = renderHook(() => usePlanRequestPolling());

    act(() => {
      result.current.submit({ query: "algo tranquilo" });
    });
    await waitFor(() => expect(result.current.phase).toBe("processing"));

    act(() => {
      result.current.discard();
    });

    expect(result.current.phase).toBe("idle");
    expect(result.current.lastSubmission?.payload).toEqual({ query: "algo tranquilo" });
  });

});
