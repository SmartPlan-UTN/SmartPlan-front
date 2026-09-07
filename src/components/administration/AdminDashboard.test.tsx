import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, getDashboardMetrics } from "@/lib/api";
import type { DashboardMetrics } from "@/types";

import { AdminDashboard } from "./AdminDashboard";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getDashboardMetrics: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({
  useSession: () => ({
    status: "authenticated",
    authenticated: true,
    user: { id: 1, name: "Ramiro", lastName: "Admin", email: "a@a.com", role: { key: "admin", name: "Admin" }, permissions: [] },
  }),
}));

function metrics(overrides: Partial<DashboardMetrics> = {}): DashboardMetrics {
  return {
    range: { key: "30d", from: "2026-07-26T00:00:00.000Z", to: "2026-08-25T00:00:00.000Z" },
    kpis: {
      totalUsers: 2847,
      activePlans: 58,
      catalogActivities: 124,
      pendingRatings: 4,
    },
    acceptanceRate: 73,
    averageRating: 4.8,
    retentionRate: 65,
    distributions: {
      moods: [
        { key: "relax", name: "Relax", count: 32, percentage: 32 },
        { key: "festive", name: "Festiva", count: 26, percentage: 26 },
      ],
      groupSizes: [
        { key: "couple", name: "En pareja", count: 44, percentage: 44 },
        { key: "small-group", name: "Grupo chico", count: 38, percentage: 38 },
        { key: "large-group", name: "Grupo grande", count: 18, percentage: 18 },
      ],
    },
    popularActivities: [
      { id: 3, name: "Ruta del vino, Luján de Cuyo", planCount: 127 },
    ],
    recentActivity: [
      {
        id: 1,
        action: "update",
        affectedEntity: "plan",
        affectedEntityId: 45,
        label: "Ruta del vino en Luján de Cuyo",
        createdAt: new Date().toISOString(),
      },
    ],
    ...overrides,
  };
}

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the KPIs, distributions, and recent activity once metrics load", async () => {
    vi.mocked(getDashboardMetrics).mockResolvedValue(metrics());

    render(<AdminDashboard />);

    expect(await screen.findByText("2.847")).toBeInTheDocument();
    expect(screen.getByText("Total de Usuarios")).toBeInTheDocument();
    expect(screen.getByText("73%")).toBeInTheDocument();
    expect(screen.getByText("4.8 / 5")).toBeInTheDocument();
    expect(screen.getByText("Requiere atención")).toBeInTheDocument();
    expect(screen.getByText("Ruta del vino, Luján de Cuyo")).toBeInTheDocument();
    expect(screen.getByText("Ruta del vino en Luján de Cuyo")).toBeInTheDocument();
    expect(screen.getByText("Plan actualizado")).toBeInTheDocument();
    expect(screen.getByText(/Buenas|Buenos/)).toHaveTextContent("Ramiro");
  });

  it("refetches metrics when the date range changes", async () => {
    const user = userEvent.setup();
    vi.mocked(getDashboardMetrics).mockResolvedValue(metrics());

    render(<AdminDashboard />);
    await screen.findByText("2.847");

    await user.click(screen.getByRole("button", { name: "Hoy" }));

    await waitFor(() => {
      expect(getDashboardMetrics).toHaveBeenLastCalledWith("today");
    });
  });

  it("shows an empty state when there is no distribution data yet", async () => {
    vi.mocked(getDashboardMetrics).mockResolvedValue(
      metrics({ distributions: { moods: [], groupSizes: [] }, popularActivities: [], recentActivity: [] }),
    );

    render(<AdminDashboard />);

    expect(await screen.findAllByText(/Sin /)).not.toHaveLength(0);
  });

  it("shows an error state with a retry action when the request fails", async () => {
    vi.mocked(getDashboardMetrics).mockRejectedValue(
      new ApiError({ message: "boom", type: "UNKNOWN" }),
    );

    render(<AdminDashboard />);

    expect(
      await screen.findByText("No pudimos cargar las métricas del panel."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
