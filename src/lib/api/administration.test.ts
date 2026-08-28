import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminUser, AdminUsersResult } from "@/types";

import { apiClient } from "./client";
import { changeAdminUserStatus, getAdminUserMetrics, listAdminUsers } from "./administration";

vi.mock("./client", () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
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
});
