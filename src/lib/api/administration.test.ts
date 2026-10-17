import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosResponse } from "axios";

import type { AdminActivityInput, AdminUser, AdminUsersResult } from "@/types";

import { apiClient } from "./client";
import {
  changeAdminUserStatus,
  createAdminActivity,
  deleteAdminActivity,
  deleteAdminPlan,
  downloadAdminUsersReport,
  downloadDashboardMetrics,
  getAdminUserMetrics,
  listAdminActivities,
  listAdminPlans,
  listAdminUsers,
  updateAdminActivity,
  updateAdminPlan,
} from "./administration";

vi.mock("./client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  },
}));

describe("dashboard PDF download (CU58)", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["today", "7d", "30d", "month"] as const)(
    "requests an authenticated blob for %s and keeps the server filename",
    async (range) => {
      const blob = new Blob(["%PDF-1.3"], { type: "application/pdf" });
      vi.mocked(apiClient.request).mockResolvedValue({
        data: blob,
        headers: { "content-disposition": 'attachment; filename="report.pdf"' },
      } as AxiosResponse<Blob>);
      await expect(downloadDashboardMetrics(range)).resolves.toEqual({
        blob,
        filename: "report.pdf",
      });
      expect(apiClient.request).toHaveBeenCalledWith({
        method: "GET",
        url: "/admin/metrics/export",
        params: { range, format: "pdf" },
        responseType: "blob",
      });
    },
  );

  it.each([
    [
      "attachment; filename=\"plain.csv\"; filename*=UTF-8''m%C3%A9tricas.csv",
      "métricas.csv",
    ],
    ["attachment; filename=\"plain.csv\"; filename*=UTF-8''%ZZ", "plain.csv"],
    ['attachment; filename="../../report.csv"', "report.csv"],
    ['attachment; filename="C:\\folder\\report.csv"', "report.csv"],
    ["attachment; filename*=UTF-8''bad%00%3Fname.csv", "badname.csv"],
  ])("parses and cleans Content-Disposition: %s", async (header, expected) => {
    vi.mocked(apiClient.request).mockResolvedValue({
      data: new Blob(),
      headers: { "content-disposition": header },
    } as AxiosResponse<Blob>);
    expect((await downloadDashboardMetrics("7d")).filename).toBe(expected);
  });

  it.each([
    undefined,
    "",
    "attachment",
    'attachment; filename=".."',
    "attachment; filename*=UTF-8''%ZZ",
  ])(
    "uses the dated range fallback when the filename is missing or invalid",
    async (header) => {
      vi.mocked(apiClient.request).mockResolvedValue({
        data: new Blob(),
        headers: { "content-disposition": header },
      } as AxiosResponse<Blob>);
      expect((await downloadDashboardMetrics("7d")).filename).toBe(
        `smartplan-metricas-7d-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
    },
  );

  it("propagates request errors without creating a download", async () => {
    vi.mocked(apiClient.request).mockRejectedValue(new Error("unavailable"));
    await expect(downloadDashboardMetrics("7d")).rejects.toThrow("unavailable");
  });
});

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

function result(
  data: AdminUser[],
  total = data.length,
  totalPages = 1,
): AdminUsersResult {
  return {
    data,
    pagination: { page: 1, limit: 100, total, totalPages },
  };
}

describe("administration user API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the documented listing and status endpoints", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(result([]));
    vi.mocked(apiClient.patch).mockResolvedValue(
      user(4, "2026-08-25T10:00:00.000Z"),
    );

    await listAdminUsers({ status: "suspended", page: 2 });
    await changeAdminUserStatus(4, "active");

    expect(apiClient.get).toHaveBeenCalledWith("/admin/users", {
      params: { status: "suspended", page: 2 },
    });
    expect(apiClient.patch).toHaveBeenCalledWith("/admin/users/4/status", {
      status: "active",
    });
  });

  it("reads REP-02 metrics for a range from the backend", async () => {
    const metrics = { totalUsers: 12, activeUsers: 9, newUsers: 2 };
    vi.mocked(apiClient.get).mockResolvedValue(metrics);

    await expect(getAdminUserMetrics("30d")).resolves.toBe(metrics);
    expect(apiClient.get).toHaveBeenCalledWith("/admin/users/metrics", {
      params: { range: "30d" },
    });
  });

  it("downloads the users report with the table filters and server filename", async () => {
    const blob = new Blob(["%PDF-1.3"], { type: "application/pdf" });
    vi.mocked(apiClient.request).mockResolvedValue({
      data: blob,
      headers: { "content-disposition": 'attachment; filename="usuarios.pdf"' },
    } as AxiosResponse<Blob>);
    const query = {
      range: "7d" as const,
      format: "pdf" as const,
      search: "mar",
      status: "active" as const,
    };

    await expect(downloadAdminUsersReport(query)).resolves.toEqual({
      blob,
      filename: "usuarios.pdf",
    });
    expect(apiClient.request).toHaveBeenCalledWith({
      method: "GET",
      url: "/admin/users/export",
      params: query,
      responseType: "blob",
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
    expect(apiClient.patch).toHaveBeenCalledWith("/admin/activities/8", {
      placeIds: [4, 7],
    });
    expect(apiClient.delete).toHaveBeenCalledWith("/admin/activities/8");
  });

  it("uses the CU60 plan management contract", async () => {
    await listAdminPlans({ status: "confirmed", page: 2 });
    await updateAdminPlan(11, {
      title: "Plan actualizado",
      status: "completed",
    });
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
});
