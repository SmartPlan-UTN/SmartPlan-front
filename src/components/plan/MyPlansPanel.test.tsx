import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, cancelOwnPlan, listOwnPlans } from "@/lib/api";
import type { OwnPlanSummary } from "@/types";

import { MyPlansPanel } from "./MyPlansPanel";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, listOwnPlans: vi.fn(), cancelOwnPlan: vi.fn() };
});

function mockSummary(overrides: Partial<OwnPlanSummary> = {}): OwnPlanSummary {
  return {
    id: 12,
    title: "Domingo de bodegas",
    description: "Recorrido por viñedos",
    peopleCount: 2,
    estimatedTotalCost: 15000,
    estimatedCostPerPerson: 7500,
    estimatedTotalDuration: 180,
    activityCount: 1,
    status: { key: "confirmed", name: "Confirmado" },
    createdAt: "2026-08-25T12:00:00.000Z",
    updatedAt: "2026-08-25T12:00:00.000Z",
    ...overrides,
  };
}

function resolveWith(plans: OwnPlanSummary[]) {
  vi.mocked(listOwnPlans).mockResolvedValue({
    data: plans,
    pagination: { page: 1, limit: 100, total: plans.length, totalPages: 1 },
  });
}

describe("MyPlansPanel (CU29)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveWith([mockSummary()]);
  });

  it("shows the waiting animation while the listing is in flight", async () => {
    // A listing that never settles, so the loading state stays observable.
    vi.mocked(listOwnPlans).mockReturnValue(new Promise(() => {}));
    render(<MyPlansPanel />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando tus planes");
    // The empty state belongs to a finished, empty listing — not to one
    // that hasn't answered yet.
    expect(screen.queryByText(/Todavía no armaste/)).not.toBeInTheDocument();
    // The create card stays reachable throughout.
    expect(
      screen.getByRole("link", { name: /Crear un plan nuevo/ }),
    ).toBeInTheDocument();
  });

  it("lists the user's plans with their totals", async () => {
    render(<MyPlansPanel />);

    expect(await screen.findByText("Domingo de bodegas")).toBeInTheDocument();
    expect(screen.getByText("Recorrido por viñedos")).toBeInTheDocument();
    expect(screen.getByText("1 actividad")).toBeInTheDocument();
    expect(screen.getByText("2 personas")).toBeInTheDocument();
  });

  it("always offers the create-plan entry point", async () => {
    resolveWith([]);
    render(<MyPlansPanel />);

    const create = await screen.findByRole("link", {
      name: /Crear un plan nuevo/,
    });
    expect(create).toHaveAttribute("href", "/plans/create");
  });

  it("invites the user to start when there are no plans yet", async () => {
    resolveWith([]);
    render(<MyPlansPanel />);

    expect(
      await screen.findByText(/Todavía no armaste ningún plan/),
    ).toBeInTheDocument();
  });

  it("offers a retry when the listing fails", async () => {
    vi.mocked(listOwnPlans).mockRejectedValueOnce(
      new ApiError({ message: "boom", type: "NETWORK" }),
    );
    render(<MyPlansPanel />);

    expect(await screen.findByText("No pudimos cargar tus planes.")).toBeInTheDocument();

    resolveWith([mockSummary()]);
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Domingo de bodegas")).toBeInTheDocument();
  });

  it("cancels a plan and keeps it listed as read-only history (CU26)", async () => {
    vi.mocked(cancelOwnPlan).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<MyPlansPanel />);

    await user.click(
      await screen.findByRole("button", { name: "Cancelar Domingo de bodegas" }),
    );
    await user.click(screen.getByRole("button", { name: "Sí, cancelar plan" }));

    await waitFor(() => {
      expect(cancelOwnPlan).toHaveBeenCalledWith(12);
    });
    expect(await screen.findByText("Cancelado")).toBeInTheDocument();
    // Still on the list, but with no way to edit or cancel it again.
    expect(screen.getByText("Domingo de bodegas")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancelar Domingo de bodegas" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the dialog open and reports the message when cancelling fails", async () => {
    vi.mocked(cancelOwnPlan).mockRejectedValue(
      new ApiError({ message: "El plan ya fue cancelado", type: "HTTP", status: 409 }),
    );
    const user = userEvent.setup();
    render(<MyPlansPanel />);

    await user.click(
      await screen.findByRole("button", { name: "Cancelar Domingo de bodegas" }),
    );
    await user.click(screen.getByRole("button", { name: "Sí, cancelar plan" }));

    expect(await screen.findByText("El plan ya fue cancelado")).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("hides edit and cancel on a plan that is already cancelled", async () => {
    resolveWith([
      mockSummary({ status: { key: "cancelled", name: "Cancelado" } }),
    ]);
    render(<MyPlansPanel />);

    expect(await screen.findByText("Cancelado")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Editar Domingo de bodegas" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancelar Domingo de bodegas" }),
    ).not.toBeInTheDocument();
  });
});
