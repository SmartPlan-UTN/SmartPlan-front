import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanRecommendationsResponse } from "@/types";

import { resetRecommendationsCache, useRecommendations } from "./useRecommendations";

const getRecommendations = vi.hoisted(() => vi.fn());
const useSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getRecommendations,
}));

vi.mock("@/lib/auth", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/auth")>()),
  useSession,
}));

function response(
  overrides: Partial<PlanRecommendationsResponse> = {},
): PlanRecommendationsResponse {
  return {
    data: [],
    pagination: { page: 1, limit: 9, total: 0, totalPages: 0 },
    meta: { personalized: false, locationUsed: false },
    ...overrides,
  };
}

const recommendation = (id: number) => ({
  reason: "popular" as const,
  canSelect: false,
  plan: {
    id,
    title: `Plan ${id}`,
    description: null,
    estimatedTotalCost: 1000,
    estimatedTotalDuration: 60,
    activityCount: 1,
    averageRating: 0,
    distanceKm: null,
    imageUrl: null,
    categories: [],
    activityNames: ["Actividad"],
    status: { key: "completed" as const, name: "Completed" },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  resetRecommendationsCache();
  useSession.mockReturnValue({ status: "authenticated" });
  getRecommendations.mockResolvedValue(response());
  // No Permissions API → the hook must not attempt geolocation.
  vi.stubGlobal("navigator", {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useRecommendations", () => {
  it("does not fetch for an anonymous session", async () => {
    useSession.mockReturnValue({ status: "anonymous" });
    const { result } = renderHook(() => useRecommendations());

    expect(result.current.status).toBe("loading");
    await Promise.resolve();
    expect(getRecommendations).not.toHaveBeenCalled();
  });

  it("resolves to 'ready' with the returned items when authenticated", async () => {
    getRecommendations.mockResolvedValue(
      response({
        data: [recommendation(1), recommendation(2)],
        meta: { personalized: true, locationUsed: false },
      }),
    );

    const { result } = renderHook(() => useRecommendations());

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.items.map((item) => item.plan.id)).toEqual([1, 2]);
    expect(result.current.meta?.personalized).toBe(true);
  });

  it("resolves to 'empty' when the backend returns no plans", async () => {
    const { result } = renderHook(() => useRecommendations());
    await waitFor(() => expect(result.current.status).toBe("empty"));
  });

  it("resolves to 'error' when the request fails, without throwing", async () => {
    getRecommendations.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useRecommendations());
    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("does not send coordinates when geolocation was never granted", async () => {
    const { result } = renderHook(() => useRecommendations());
    await waitFor(() => expect(getRecommendations).toHaveBeenCalled());
    expect(getRecommendations).toHaveBeenCalledWith({ limit: 9 });
    expect(result.current).toBeDefined();
  });

  it("serves a second mount from cache without a new request", async () => {
    const first = renderHook(() => useRecommendations());
    await waitFor(() => expect(first.result.current.status).toBe("empty"));
    expect(getRecommendations).toHaveBeenCalledTimes(1);

    first.unmount();
    const second = renderHook(() => useRecommendations());
    await waitFor(() => expect(second.result.current.status).toBe("empty"));
    expect(getRecommendations).toHaveBeenCalledTimes(1);
  });
});
