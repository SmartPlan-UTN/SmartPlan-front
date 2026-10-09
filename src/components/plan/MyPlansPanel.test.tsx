import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  cancelOwnPlan,
  listOwnPlans,
  setOwnPlanVisibility,
} from "@/lib/api";
import type { OwnPlanSummary } from "@/types";

import { MyPlansPanel } from "./MyPlansPanel";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    listOwnPlans: vi.fn(),
    cancelOwnPlan: vi.fn(),
    setOwnPlanVisibility: vi.fn(),
  };
});

function mockSummary(overrides: Partial<OwnPlanSummary> = {}): OwnPlanSummary {
  return {
    id: 12,
    title: "Domingo de bodegas",
    description: "Recorrido por viñedos",
    visibility: "private",
    peopleCount: 2,
    estimatedTotalCost: 15000,
    estimatedCostPerPerson: 7500,
    estimatedTotalDuration: 180,
    activityCount: 1,
    status: { key: "confirmed", name: "Confirmado" },
    visibility: "private",
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
    expect(screen.queryByText(/Todavía no creaste/)).not.toBeInTheDocument();
    // The create card stays reachable throughout.
    expect(
      screen.getByRole("link", { name: /^Crear un plan/ }),
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
      name: /^Crear un plan/,
    });
    expect(create).toHaveAttribute("href", "/plans/create");
  });

  it("invites the user to start when there are no plans yet", async () => {
    resolveWith([]);
    render(<MyPlansPanel />);

    expect(
      await screen.findByText(/Todavía no creaste ningún plan/),
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

  it("filters out plans that are already cancelled on load", async () => {
    resolveWith([
      mockSummary({ id: 13, title: "Sigue vivo" }),
      mockSummary({ status: { key: "cancelled", name: "Cancelado" } }),
    ]);
    render(<MyPlansPanel />);

    // Waiting on a plan that *does* survive the filter proves the listing
    // settled: asserting the absence while the panel is still loading
    // passes even with no filter at all.
    expect(await screen.findByText("Sigue vivo")).toBeInTheDocument();
    expect(screen.queryByText("Domingo de bodegas")).not.toBeInTheDocument();
  });

  it("never offers generating a plan: planning an outing is Inicio's job (#130)", async () => {
    render(<MyPlansPanel />);

    await screen.findByText("Domingo de bodegas");
    expect(
      screen.queryByRole("link", { name: /generar plan automático/i }),
    ).not.toBeInTheDocument();
  });

  it("says whether each plan is public or private (#130)", async () => {
    resolveWith([
      mockSummary({ id: 1, title: "Borrador", visibility: "private" }),
      mockSummary({ id: 2, title: "Compartido", visibility: "public" }),
    ]);
    render(<MyPlansPanel />);

    await screen.findByText("Compartido");
    expect(screen.getByText("Privado")).toBeInTheDocument();
    expect(screen.getByText("Público")).toBeInTheDocument();
  });

  it("publishes a plan after confirming, and reflects it (#130)", async () => {
    vi.mocked(setOwnPlanVisibility).mockResolvedValue({
      ...mockSummary({ visibility: "public" }),
      details: [],
    });
    const user = userEvent.setup();
    render(<MyPlansPanel />);

    await user.click(
      await screen.findByRole("button", { name: "Publicar Domingo de bodegas" }),
    );
    await user.click(screen.getByRole("button", { name: "Sí, publicar" }));

    expect(setOwnPlanVisibility).toHaveBeenCalledWith(12, "public");
    expect(await screen.findByText("Público")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hacer privado Domingo de bodegas" }),
    ).toBeInTheDocument();
  });

  it("explains why an empty plan cannot be published (#130)", async () => {
    vi.mocked(setOwnPlanVisibility).mockRejectedValue(
      new ApiError({
        message: "x",
        type: "HTTP",
        status: 409,
        code: "PLAN_EMPTY",
      }),
    );
    const user = userEvent.setup();
    render(<MyPlansPanel />);

    await user.click(
      await screen.findByRole("button", { name: "Publicar Domingo de bodegas" }),
    );
    await user.click(screen.getByRole("button", { name: "Sí, publicar" }));

    expect(
      await screen.findByText(/sumale al menos una actividad/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Privado")).toBeInTheDocument();
  });
});
