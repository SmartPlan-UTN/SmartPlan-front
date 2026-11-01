import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanRequestSummary } from "@/types";

import { useRecentPlanRequests } from "./useRecentPlanRequests";

const listPlanRequests = vi.hoisted(() => vi.fn());
const useSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  listPlanRequests,
}));

vi.mock("@/lib/auth", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/auth")>()),
  useSession,
}));

function summary(id: number, over: Partial<PlanRequestSummary> = {}): PlanRequestSummary {
  return {
    id,
    statusKey: "generated",
    mode: "automatic",
    requestedAt: "2026-10-15T12:00:00.000Z",
    query: `búsqueda ${id}`,
    planCount: 3,
    planTitles: [],
    ...over,
  };
}

function page(data: PlanRequestSummary[]) {
  return { data, pagination: { page: 1, limit: 5, total: data.length, totalPages: 1 } };
}

describe("useRecentPlanRequests", () => {
  beforeEach(() => {
    listPlanRequests.mockReset();
    useSession.mockReturnValue({ authenticated: true, user: { id: 7 } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays idle and never calls the API without a session", () => {
    useSession.mockReturnValue({ authenticated: false, user: null });

    const { result } = renderHook(() => useRecentPlanRequests());

    expect(result.current.status).toBe("idle");
    expect(listPlanRequests).not.toHaveBeenCalled();
  });

  it("loads the latest five searches", async () => {
    listPlanRequests.mockResolvedValue(page([summary(2), summary(1)]));

    const { result } = renderHook(() => useRecentPlanRequests());

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(listPlanRequests).toHaveBeenCalledWith({ limit: 5 });
    expect(result.current.requests.map(({ id }) => id)).toEqual([2, 1]);
  });

  it("reports empty when there is nothing to reopen", async () => {
    listPlanRequests.mockResolvedValue(page([]));

    const { result } = renderHook(() => useRecentPlanRequests());

    await waitFor(() => expect(result.current.status).toBe("empty"));
  });

  it("never shows the previous user's searches after switching accounts", async () => {
    listPlanRequests.mockResolvedValueOnce(page([summary(1)]));
    let resolveNext!: (value: ReturnType<typeof page>) => void;
    listPlanRequests.mockReturnValueOnce(new Promise((resolve) => (resolveNext = resolve)));

    const { result, rerender } = renderHook(() => useRecentPlanRequests());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    useSession.mockReturnValue({ authenticated: false, user: null });
    rerender();
    expect(result.current).toMatchObject({ status: "idle", requests: [] });

    useSession.mockReturnValue({ authenticated: true, user: { id: 8 } });
    rerender();
    expect(result.current).toMatchObject({ status: "loading", requests: [] });

    await act(async () => resolveNext(page([summary(2)])));
    expect(result.current.requests.map(({ id }) => id)).toEqual([2]);
  });

  it("reports an error and retries", async () => {
    listPlanRequests.mockRejectedValueOnce(new Error("offline"));
    listPlanRequests.mockResolvedValueOnce(page([summary(1)]));

    const { result } = renderHook(() => useRecentPlanRequests());

    await waitFor(() => expect(result.current.status).toBe("error"));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("ready"));
  });

  it("refreshes while a search is still generating, and only then", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    listPlanRequests.mockResolvedValueOnce(
      page([summary(1, { statusKey: "processing", planCount: 0 })]),
    );
    listPlanRequests.mockResolvedValueOnce(page([summary(1)]));

    const { result } = renderHook(() => useRecentPlanRequests());

    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    await waitFor(() => expect(result.current.requests[0].statusKey).toBe("generated"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(listPlanRequests).toHaveBeenCalledTimes(2);
  });
});
