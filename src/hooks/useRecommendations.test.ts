import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { PlanRecommendationsResponse } from "@/types";

import {
  resetRecommendationsCache,
  useRecommendations,
  type RecommendationSlot,
} from "./useRecommendations";

const getRecommendations = vi.hoisted(() => vi.fn());
const dismissRecommendation = vi.hoisted(() => vi.fn());
const undoDismissRecommendation = vi.hoisted(() => vi.fn());
const useSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getRecommendations,
  dismissRecommendation,
  undoDismissRecommendation,
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
    meta: { personalized: false, locationUsed: false, adjustedFromFeedback: false },
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

const cardIds = (slots: RecommendationSlot[]) =>
  slots
    .filter((slot): slot is Extract<RecommendationSlot, { type: "card" }> =>
      slot.type === "card",
    )
    .map((slot) => slot.recommendation.plan.id);

beforeEach(() => {
  vi.clearAllMocks();
  resetRecommendationsCache();
  useSession.mockReturnValue({ status: "authenticated" });
  getRecommendations.mockResolvedValue(response());
  dismissRecommendation.mockResolvedValue(undefined);
  undoDismissRecommendation.mockResolvedValue(undefined);
  // No Permissions API → the hook must not attempt geolocation.
  vi.stubGlobal("navigator", {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
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
        meta: { personalized: true, locationUsed: false, adjustedFromFeedback: false },
      }),
    );

    const { result } = renderHook(() => useRecommendations());

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(cardIds(result.current.slots)).toEqual([1, 2]);
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

  it("retry() drops the cache and fetches again", async () => {
    getRecommendations.mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => useRecommendations());
    await waitFor(() => expect(result.current.status).toBe("error"));

    getRecommendations.mockResolvedValueOnce(
      response({ data: [recommendation(1)] }),
    );
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(getRecommendations).toHaveBeenCalledTimes(2);
  });

  describe("CU21 — dismiss / undo", () => {
    beforeEach(() => {
      getRecommendations.mockResolvedValue(
        response({ data: [recommendation(1), recommendation(2), recommendation(3)] }),
      );
    });

    it("removes a card, calls the API, and shows a 'Deshacer' slot", async () => {
      const { result } = renderHook(() => useRecommendations());
      await waitFor(() => expect(result.current.status).toBe("ready"));

      act(() => result.current.dismiss(2, "Plan 2"));

      expect(cardIds(result.current.slots)).toEqual([1, 3]);
      expect(
        result.current.slots.some(
          (slot) =>
            slot.type === "dismissed" &&
            slot.planId === 2 &&
            slot.phase === "shown",
        ),
      ).toBe(true);
      expect(dismissRecommendation).toHaveBeenCalledWith(2);
    });

    it("collapses, then removes, the slot after the undo window", async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useRecommendations());
      await vi.waitFor(() => expect(result.current.status).toBe("ready"));

      act(() => result.current.dismiss(2, "Plan 2"));

      act(() => {
        vi.advanceTimersByTime(4600);
      });
      expect(
        result.current.slots.some(
          (slot) => slot.type === "dismissed" && slot.phase === "collapsing",
        ),
      ).toBe(true);

      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(cardIds(result.current.slots)).toEqual([1, 3]);
      expect(result.current.slots).toHaveLength(2);
    });

    it("restores the card and calls the undo API within the window", async () => {
      const { result } = renderHook(() => useRecommendations());
      await waitFor(() => expect(result.current.status).toBe("ready"));

      act(() => result.current.dismiss(2, "Plan 2"));
      act(() => result.current.undo(2));

      expect(cardIds(result.current.slots)).toEqual([1, 2, 3]);
      expect(undoDismissRecommendation).toHaveBeenCalledWith(2);
    });

    it("puts the card back when the dismiss request fails to reach the server", async () => {
      dismissRecommendation.mockRejectedValue(new Error("network"));
      const { result } = renderHook(() => useRecommendations());
      await waitFor(() => expect(result.current.status).toBe("ready"));

      await act(async () => {
        result.current.dismiss(2, "Plan 2");
      });

      await waitFor(() => expect(cardIds(result.current.slots)).toEqual([1, 2, 3]));
    });

    it("keeps the card hidden when the server rejected it as already gone", async () => {
      dismissRecommendation.mockRejectedValue(
        new ApiError({ message: "gone", type: "HTTP", status: 404 }),
      );
      const { result } = renderHook(() => useRecommendations());
      await waitFor(() => expect(result.current.status).toBe("ready"));

      await act(async () => {
        result.current.dismiss(2, "Plan 2");
      });

      expect(cardIds(result.current.slots)).not.toContain(2);
    });
  });
});
