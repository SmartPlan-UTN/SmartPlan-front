import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "./client";
import {
  listFavoriteActivities,
  listFavoritePlans,
  removeFavoriteActivity,
  removeFavoritePlan,
  saveFavoriteActivity,
  saveFavoritePlan,
} from "./favorites";

vi.mock("./client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("favorites API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts the activity id to favorite activities (CU15)", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      id: 1,
      idFavoriteList: 10,
      idActivity: 42,
      createdAt: "2026-08-28T00:00:00Z",
      updatedAt: "2026-08-28T00:00:00Z",
    });

    const result = await saveFavoriteActivity(42);

    expect(apiClient.post).toHaveBeenCalledWith("/favorite-activities", {
      idActivity: 42,
    });
    expect(result.idActivity).toBe(42);
  });

  it("deletes favorite activity by activity id (CU41)", async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce(undefined);

    await removeFavoriteActivity(42);

    expect(apiClient.delete).toHaveBeenCalledWith("/favorite-activities/42");
  });

  it("lists saved favorite activities (CU39)", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: [{ id: 1, idFavoriteList: 10, idActivity: 42 }],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    const result = await listFavoriteActivities({ page: 1, limit: 10 });

    expect(apiClient.get).toHaveBeenCalledWith("/favorite-activities", {
      params: { page: 1, limit: 10 },
    });
    expect(result.pagination.total).toBe(1);
  });

  it("posts the plan id to favorite plans (CU43)", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      id: 2,
      idFavoriteList: 10,
      idPlan: 7,
      createdAt: "2026-08-28T00:00:00Z",
      updatedAt: "2026-08-28T00:00:00Z",
    });

    const result = await saveFavoritePlan(7);

    expect(apiClient.post).toHaveBeenCalledWith("/favorite-plans", {
      idPlan: 7,
    });
    expect(result.idPlan).toBe(7);
  });

  it("deletes favorite plan by plan id (CU42)", async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce(undefined);

    await removeFavoritePlan(7);

    expect(apiClient.delete).toHaveBeenCalledWith("/favorite-plans/7");
  });

  it("lists saved favorite plans (CU40)", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: [{ id: 2, idFavoriteList: 10, idPlan: 7 }],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    const result = await listFavoritePlans({ page: 1, limit: 10 });

    expect(apiClient.get).toHaveBeenCalledWith("/favorite-plans", {
      params: { page: 1, limit: 10 },
    });
    expect(result.pagination.total).toBe(1);
  });
});
