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

  it("deletes a plan and removes it from the list view (CU26)", async () => {
    vi.mocked(cancelOwnPlan).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<MyPlansPanel />);

    await user.click(
      await screen.findByRole("button", { name: "Eliminar Domingo de bodegas" }),
    );
    await user.click(screen.getByRole("button", { name: "Sí, eliminar plan" }));

    await waitFor(() => {
      expect(cancelOwnPlan).toHaveBeenCalledWith(12);
    });
    // The deleted plan disappears from the list
    expect(screen.queryByText("Domingo de bodegas")).not.toBeInTheDocument();
  });

  it("keeps the dialog open and reports the message when deletion fails", async () => {
    vi.mocked(cancelOwnPlan).mockRejectedValue(
      new ApiError({ message: "El plan ya fue eliminado", type: "HTTP", status: 409 }),
    );
    const user = userEvent.setup();
    render(<MyPlansPanel />);

    await user.click(
      await screen.findByRole("button", { name: "Eliminar Domingo de bodegas" }),
    );
    await user.click(screen.getByRole("button", { name: "Sí, eliminar plan" }));

    expect(await screen.findByText("El plan ya fue eliminado")).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("filters out plans that are already cancelled or deleted on load", async () => {
    resolveWith([
      mockSummary({ status: { key: "cancelled", name: "Cancelado" } }),
    ]);
    render(<MyPlansPanel />);

    expect(screen.queryByText("Domingo de bodegas")).not.toBeInTheDocument();
  });

  it("shows under construction modal when automatic plan button card is clicked (CU31)", async () => {
    const user = userEvent.setup();
    render(<MyPlansPanel />);

    await user.click(screen.getByRole("button", { name: /Generar plan automático/i }));

    expect(screen.getByRole("alertdialog", { name: "Módulo en construcción" })).toBeInTheDocument();
    expect(
      screen.getByText(/generación automática de itinerarios/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Entendido, crear manualmente" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
