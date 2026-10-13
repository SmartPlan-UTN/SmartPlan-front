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
    resolvedContext: {
      budget: null,
      partySize: null,
      departmentName: null,
      categories: [],
    },
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

  it("resumes an existing ID and exposes backend-confirmed stage and ETA", async () => {
    getPlanRequestStatus.mockResolvedValue(status({
      id: 91,
      statusKey: "processing",
      query: "una cena cerca del centro",
      progressStage: "composing",
      progressStageAt: "2026-09-15T12:00:00.000Z",
      estimatedRemainingSeconds: 37,
    }));

    const { result } = renderHook(() => usePlanRequestPolling(91));

    await waitFor(() => expect(result.current.phase).toBe("processing"));
    expect(getPlanRequestStatus).toHaveBeenCalledWith(91);
    expect(result.current.planRequestId).toBe(91);
    expect(result.current.query).toBe("una cena cerca del centro");
    expect(result.current.progressStage).toBe("composing");
    expect(result.current.progressStageAt).toBe("2026-09-15T12:00:00.000Z");
    expect(result.current.estimatedRemainingSeconds).toBe(37);
  });

  it("keeps the submitted query when an older status response omits it", async () => {
    createPlanRequest.mockResolvedValue(accepted());
    getPlanRequestStatus.mockResolvedValue(status({ statusKey: "processing" }));
    const { result } = renderHook(() => usePlanRequestPolling());

    act(() => result.current.submit({ query: "coffee downtown" }));

    await waitFor(() => expect(result.current.phase).toBe("processing"));
    expect(result.current.query).toBe("coffee downtown");
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
              viewerPlanState: "selectable",
              activeOutingId: null,
              kind: "generated",
              visibility: "private",
              ownedByViewer: true,
              details: [],
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

  it("keeps polling beyond 90 seconds and receives the result without a new POST or user intervention", async () => {
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

    expect(result.current.phase).toBe("processing");
    expect(result.current.planRequestId).toBe(requestId);
    expect(createPlanRequest).toHaveBeenCalledTimes(1);

    getPlanRequestStatus.mockResolvedValueOnce(
      status({
        statusKey: "generated",
        plans: [],
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
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

describe("generation polling races", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    createPlanRequest.mockReset();
    createSurprisePlanRequest.mockReset();
    getPlanRequestStatus.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it.each(["auto", "surprise"])("dismisses a delayed %s submission without resending and accepts its result", async (kind) => {
    let resolve!: (value: PlanRequestAccepted) => void;
    const post = kind === "auto" ? createPlanRequest : createSurprisePlanRequest;
    post.mockReturnValue(new Promise<PlanRequestAccepted>(r => { resolve = r; }));
    const requestedAt = new Date().toISOString();
    getPlanRequestStatus.mockResolvedValue(status({ requestedAt, statusKey: "processing" }));
    const { result } = renderHook(() => usePlanRequestPolling());
    act(() => {
      if (kind === "auto") result.current.submit({ query: "coffee" });
      else result.current.submitSurprise({ latitude: -32.9, longitude: -68.8 });
    });
    await act(async () => vi.advanceTimersByTimeAsync(15000));
    expect(result.current.phase).toBe("submissionDelayed");
    expect(result.current.planRequestId).toBeNull();
    act(() => result.current.regenerate());
    act(() => result.current.keepWaiting());
    expect(result.current.phase).toBe("submitting");
    expect(post).toHaveBeenCalledTimes(1);
    expect(getPlanRequestStatus).not.toHaveBeenCalled();
    await act(async () => resolve(accepted({ requestedAt })));
    await act(async () => vi.advanceTimersByTimeAsync(2500));
    expect(result.current.phase).toBe("processing");
    getPlanRequestStatus.mockResolvedValue(status({ statusKey: "generated", plans: [] }));
    await act(async () => vi.advanceTimersByTimeAsync(2500));
    expect(result.current.phase).toBe("generated");
    expect(post).toHaveBeenCalledTimes(1);
    expect(getPlanRequestStatus).toHaveBeenLastCalledWith(42);
  });

  it("ignores a delayed acceptance after discarding the submission", async () => {
    let resolve!: (value: PlanRequestAccepted) => void;
    createPlanRequest.mockReturnValue(new Promise<PlanRequestAccepted>(r => { resolve = r; }));
    const { result } = renderHook(() => usePlanRequestPolling());
    act(() => result.current.submit({ query: "coffee" }));
    await act(async () => vi.advanceTimersByTimeAsync(15000));
    act(() => result.current.discard());
    await act(async () => resolve(accepted()));
    expect(result.current.phase).toBe("idle");
    expect(result.current.planRequestId).toBeNull();
    expect(getPlanRequestStatus).not.toHaveBeenCalled();
  });

  it("keeps polling without a delay notice and accepts a terminal result without a click", async () => {
    createPlanRequest.mockResolvedValue(accepted());
    getPlanRequestStatus.mockResolvedValue(status());
    const { result } = renderHook(() => usePlanRequestPolling());
    await act(async () => result.current.submit({ query: "coffee" }));
    await act(async () => vi.advanceTimersByTimeAsync(15000));
    expect(result.current.phase).toBe("pending");
    getPlanRequestStatus.mockResolvedValue(status({ statusKey: "failed", failureCode: "GENERATION_TIMEOUT" }));
    await act(async () => vi.advanceTimersByTimeAsync(2500));
    expect(result.current.failure?.code).toBe("GENERATION_TIMEOUT");
    expect(result.current.phase).toBe("failed");
    expect(createPlanRequest).toHaveBeenCalledTimes(1);
  });

  it("ignores an accepted POST after leaving the screen", async () => {
    let resolve!: (value: PlanRequestAccepted) => void;
    createPlanRequest.mockReturnValue(new Promise<PlanRequestAccepted>(r => { resolve = r; }));
    const { result } = renderHook(() => usePlanRequestPolling());
    act(() => result.current.submit({ query: "coffee" }));
    act(() => result.current.discard());
    await act(async () => resolve(accepted()));
    expect(result.current.phase).toBe("idle");
    expect(getPlanRequestStatus).not.toHaveBeenCalled();
  });

  it.each([408, 429, 503])("keeps the request alive after a transient HTTP %i", async (httpStatus) => {
    getPlanRequestStatus.mockRejectedValueOnce(new ApiError({ message: "Temporary", type: "HTTP", status: httpStatus }));
    getPlanRequestStatus.mockResolvedValue(status({ statusKey: "processing" }));
    const { result } = renderHook(() => usePlanRequestPolling(42));
    await act(async () => {});
    expect(result.current.failure).toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(3500));
    expect(result.current.phase).toBe("processing");
    expect(result.current.failure).toBeNull();
    expect(createPlanRequest).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(11500));
    expect(result.current.phase).toBe("processing");
  });

  it("recovers a connection before the delay threshold without showing a delay notice", async () => {
    getPlanRequestStatus.mockRejectedValueOnce(new Error("offline"));
    getPlanRequestStatus.mockResolvedValue(status({ statusKey: "pending" }));
    const { result } = renderHook(() => usePlanRequestPolling(42));
    await act(async () => {});
    expect(result.current.phase).toBe("pending");
    await act(async () => vi.advanceTimersByTimeAsync(3500));
    expect(result.current.phase).toBe("pending");
    expect(result.current.failure).toBeNull();
  });

  it("reports a lost connection without declaring the server request failed", async () => {
    createPlanRequest.mockResolvedValue(accepted());
    getPlanRequestStatus.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => usePlanRequestPolling());
    await act(async () => result.current.submit({ query: "coffee" }));
    expect(result.current.phase).toBe("pending");
    expect(result.current.failure).toBeNull();
    getPlanRequestStatus.mockResolvedValue(status({ statusKey: "generated", plans: [] }));
    await act(async () => vi.advanceTimersByTimeAsync(3500));
    expect(result.current.phase).toBe("generated");
    expect(createPlanRequest).toHaveBeenCalledTimes(1);
  });
});
