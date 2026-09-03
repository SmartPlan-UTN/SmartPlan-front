import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminActivityInput, AdminUser, AdminUsersResult } from "@/types";

import { apiClient } from "./client";
import {
  changeAdminUserStatus,
  createAdminActivity,
  deleteAdminActivity,
  deleteAdminPlan,
  getAdminRatingCounts,
  getAdminUserMetrics,
  listAdminActivities,
  listAdminPlans,
  listAdminRatings,
  listAdminUsers,
  moderateAdminRating,
  updateAdminActivity,
  updateAdminPlan,
} from "./administration";

vi.mock("./client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

function user(id: number, createdAt: string): AdminUser {
  return {
    id,
    name: `User ${id}`,
    lastName: "Test",
    email: `user${id}@example.com`,
    role: { key: "user", name: "Usuario" },
    status: { key: "active", name: "Activo" },
    createdAt,
    updatedAt: createdAt,
  };
}

function result(data: AdminUser[], total = data.length, totalPages = 1): AdminUsersResult {
  return {
    data,
    pagination: { page: 1, limit: 100, total, totalPages },
  };
}

describe("administration user API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the documented listing and status endpoints", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(result([]));
    vi.mocked(apiClient.patch).mockResolvedValue(user(4, "2026-08-25T10:00:00.000Z"));

    await listAdminUsers({ status: "suspended", page: 2 });
    await changeAdminUserStatus(4, "active");

    expect(apiClient.get).toHaveBeenCalledWith("/admin/users", {
      params: { status: "suspended", page: 2 },
    });
    expect(apiClient.patch).toHaveBeenCalledWith("/admin/users/4/status", {
      status: "active",
    });
  });

  it("counts active accounts and registrations from the last seven days", async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce(result([], 12))
      .mockResolvedValueOnce(result([], 9))
      .mockResolvedValueOnce(
        result([
          user(1, "2026-08-24T10:00:00.000Z"),
          user(2, "2026-08-18T10:00:00.000Z"),
          user(3, "2026-08-17T23:59:59.000Z"),
        ], 12),
      );

    await expect(getAdminUserMetrics(new Date("2026-08-25T00:00:00.000Z"))).resolves.toEqual({
      totalUsers: 12,
      activeUsers: 9,
      newUsersThisWeek: 2,
    });
  });

  it("uses the CU53 activity management contract", async () => {
    const input: AdminActivityInput = {
      name: "Tarde de juegos",
      description: "Actividad sin ubicación física obligatoria.",
      estimatedCost: 0,
      estimatedDuration: 90,
      type: null,
      categoryIds: [2],
      placeIds: [],
    };

    await listAdminActivities({ categoryId: 2, type: "recreational", page: 3 });
    await createAdminActivity(input);
    await updateAdminActivity(8, { placeIds: [4, 7] });
    await deleteAdminActivity(8);

    expect(apiClient.get).toHaveBeenCalledWith("/admin/activities", {
      params: { categoryId: 2, type: "recreational", page: 3 },
    });
    expect(apiClient.post).toHaveBeenCalledWith("/admin/activities", input);
    expect(apiClient.patch).toHaveBeenCalledWith("/admin/activities/8", { placeIds: [4, 7] });
    expect(apiClient.delete).toHaveBeenCalledWith("/admin/activities/8");
  });

  it("uses the CU60 plan management contract", async () => {
    await listAdminPlans({ status: "confirmed", page: 2 });
    await updateAdminPlan(11, { title: "Plan actualizado", status: "completed" });
    await deleteAdminPlan(11);

    expect(apiClient.get).toHaveBeenCalledWith("/admin/plans", {
      params: { status: "confirmed", page: 2 },
    });
    expect(apiClient.patch).toHaveBeenCalledWith("/admin/plans/11", {
      title: "Plan actualizado",
      status: "completed",
    });
    expect(apiClient.delete).toHaveBeenCalledWith("/admin/plans/11");
  });

  it("uses the CU55 rating moderation contract", async () => {
    await listAdminRatings({ status: "pending", page: 2, limit: 20 });
    await moderateAdminRating(31, { status: "approved" });
    await moderateAdminRating(32, { status: "rejected", reason: "Lenguaje ofensivo." });

    expect(apiClient.get).toHaveBeenCalledWith("/admin/ratings", {
      params: { status: "pending", page: 2, limit: 20 },
    });
    expect(apiClient.patch).toHaveBeenCalledWith("/admin/ratings/31/moderation", {
      status: "approved",
    });
    expect(apiClient.patch).toHaveBeenCalledWith("/admin/ratings/32/moderation", {
      status: "rejected",
      reason: "Lenguaje ofensivo.",
    });
  });

  it("counts ratings per moderation state from the listing totals", async () => {
    const totals: Record<string, number> = { pending: 7, approved: 40, rejected: 3 };
    vi.mocked(apiClient.get).mockImplementation((_url, config) => {
      const status = (config?.params as { status: string }).status;
      return Promise.resolve({
        data: [],
        pagination: { page: 1, limit: 1, total: totals[status], totalPages: 1 },
      });
    });

    await expect(getAdminRatingCounts()).resolves.toEqual({
      pending: 7,
      approved: 40,
      rejected: 3,
    });
    // Only the totals are wanted, so each state is asked for a single row.
    expect(apiClient.get).toHaveBeenCalledTimes(3);
    expect(apiClient.get).toHaveBeenCalledWith("/admin/ratings", {
      params: { status: "rejected", page: 1, limit: 1 },
    });
  });
});
