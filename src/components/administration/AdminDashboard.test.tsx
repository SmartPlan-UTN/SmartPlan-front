import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  downloadDashboardMetrics,
  getDashboardMetrics,
} from "@/lib/api";
import type { DashboardMetrics } from "@/types";

import { AdminDashboard } from "./AdminDashboard";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getDashboardMetrics: vi.fn(),
    downloadDashboardMetrics: vi.fn(),
  };
});

const authState = vi.hoisted(() => ({ permissions: ["metric.view"] }));
vi.mock("@/lib/auth", () => ({
  useSession: () => ({
    status: "authenticated",
    authenticated: true,
    user: {
      id: 1,
      name: "Ramiro",
      lastName: "Admin",
      email: "a@a.com",
      role: { key: "admin", name: "Admin" },
      permissions: authState.permissions,
    },
  }),
}));

function metrics(overrides: Partial<DashboardMetrics> = {}): DashboardMetrics {
  return {
    range: {
      key: "30d",
      from: "2026-07-26T00:00:00.000Z",
      to: "2026-08-25T00:00:00.000Z",
    },
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
    authState.permissions = ["metric.view"];
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL = vi.fn(() => "blob:report");
        static revokeObjectURL = vi.fn();
      },
    );
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.mocked(downloadDashboardMetrics).mockResolvedValue({
      blob: new Blob(["report"]),
      filename: "server-report.csv",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it.each([
    ["Hoy", "today"],
    ["7 días", "7d"],
    ["30 días", "30d"],
    ["Este mes", "month"],
  ])(
    "downloads the selected %s range and cleans browser resources (CU58)",
    async (label, range) => {
      const user = userEvent.setup();
      vi.mocked(getDashboardMetrics).mockResolvedValue(metrics());
      const saved: Array<{ filename: string; href: string }> = [];
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
        function (this: HTMLAnchorElement) {
          saved.push({ filename: this.download, href: this.href });
        },
      );
      render(<AdminDashboard />);
      await screen.findByText("2.847");
      await user.click(screen.getByRole("button", { name: label }));
      await user.click(
        screen.getByRole("button", { name: "Descargar reporte" }),
      );
      expect(downloadDashboardMetrics).toHaveBeenCalledWith(range);
      expect(saved).toEqual([
        { filename: "server-report.csv", href: "blob:report" },
      ]);
      expect(document.querySelector("a[download]")).toBeNull();
      await waitFor(() =>
        expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:report"),
      );
    },
  );

  it("hides download without metric.view (CU58)", async () => {
    authState.permissions = [];
    vi.mocked(getDashboardMetrics).mockResolvedValue(metrics());
    render(<AdminDashboard />);
    await screen.findByText("2.847");
    expect(
      screen.queryByRole("button", { name: "Descargar reporte" }),
    ).not.toBeInTheDocument();
    expect(downloadDashboardMetrics).not.toHaveBeenCalled();
  });

  it("blocks duplicate downloads and captures the range while allowing changes (CU58)", async () => {
    const user = userEvent.setup();
    vi.mocked(getDashboardMetrics).mockResolvedValue(metrics());
    let finish!: (file: { blob: Blob; filename: string }) => void;
    vi.mocked(downloadDashboardMetrics).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(<AdminDashboard />);
    await screen.findByText("2.847");
    await user.click(screen.getByRole("button", { name: "7 días" }));
    await user.dblClick(
      screen.getByRole("button", { name: "Descargar reporte" }),
    );
    const busy = screen.getByRole("button", { name: "Descargando…" });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    await user.click(busy);
    await user.click(screen.getByRole("button", { name: "Hoy" }));
    expect(downloadDashboardMetrics).toHaveBeenCalledTimes(1);
    expect(downloadDashboardMetrics).toHaveBeenCalledWith("7d");
    await act(async () => {
      finish({ blob: new Blob(), filename: "seven-days.csv" });
    });
    expect(
      screen.getByRole("button", { name: "Descargar reporte" }),
    ).toBeEnabled();
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalled());
  });

  it("announces errors, supports dismissing them, and allows a successful retry (CU58)", async () => {
    const user = userEvent.setup();
    vi.mocked(getDashboardMetrics).mockResolvedValue(metrics());
    vi.mocked(downloadDashboardMetrics).mockRejectedValueOnce(
      new Error("unavailable"),
    );
    render(<AdminDashboard />);
    await screen.findByText("2.847");
    await user.click(screen.getByRole("button", { name: "Descargar reporte" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos generar el reporte. Probá de nuevo.",
    );
    expect(
      screen.getByRole("button", { name: "Descargar reporte" }),
    ).toBeEnabled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Descargar reporte" }));
    expect(downloadDashboardMetrics).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalled());
  });

  it("dismisses the download error after six seconds (CU58)", async () => {
    vi.useFakeTimers();
    vi.mocked(getDashboardMetrics).mockResolvedValue(metrics());
    vi.mocked(downloadDashboardMetrics).mockRejectedValueOnce(
      new Error("unavailable"),
    );

    render(<AdminDashboard />);
    await act(async () => {});
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Descargar reporte" }),
      );
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5999);
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the KPIs, distributions, and recent activity once metrics load", async () => {
    vi.mocked(getDashboardMetrics).mockResolvedValue(metrics());

    render(<AdminDashboard />);

    expect(await screen.findByText("2.847")).toBeInTheDocument();
    expect(screen.getByText("Total de Usuarios")).toBeInTheDocument();
    expect(screen.getByText("73%")).toBeInTheDocument();
    expect(screen.getByText("4.8 / 5")).toBeInTheDocument();
    expect(screen.getByText("Requiere atención")).toBeInTheDocument();
    expect(
      screen.getByText("Ruta del vino, Luján de Cuyo"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ruta del vino en Luján de Cuyo"),
    ).toBeInTheDocument();
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
      metrics({
        distributions: { moods: [], groupSizes: [] },
        popularActivities: [],
        recentActivity: [],
      }),
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
    expect(
      screen.getByRole("button", { name: "Reintentar" }),
    ).toBeInTheDocument();
  });
});
