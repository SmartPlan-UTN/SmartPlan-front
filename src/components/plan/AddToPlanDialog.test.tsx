import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addPlanActivity,
  listOwnPlans,
} from "@/lib/api";
import type { OwnPlanSummary } from "@/types";

import { AddToPlanDialog } from "./AddToPlanDialog";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    listOwnPlans: vi.fn(),
    addPlanActivity: vi.fn(),
  };
});

function mockPlanSummary(
  overrides: Partial<OwnPlanSummary> = {},
): OwnPlanSummary {
  return {
    id: 10,
    title: "Fin de semana en Mendoza",
    description: "Visita a bodegas",
    visibility: "private",
    peopleCount: 2,
    estimatedTotalCost: 20000,
    estimatedCostPerPerson: 10000,
    estimatedTotalDuration: 240,
    activityCount: 2,
    status: { key: "confirmed", name: "Confirmado" },
    visibility: "private",
    createdAt: "2026-08-25T12:00:00.000Z",
    updatedAt: "2026-08-25T12:00:00.000Z",
    ...overrides,
  };
}

describe("AddToPlanDialog (CU27)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    push.mockReset();
    vi.mocked(listOwnPlans).mockResolvedValue({
      data: [mockPlanSummary()],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
  });

  it("lists active plans and adds the activity to the chosen plan", async () => {
    vi.mocked(addPlanActivity).mockResolvedValue({} as never);
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <AddToPlanDialog
        activityId={42}
        activityName="Degustación de vinos"
        onClose={onClose}
      />,
    );

    expect(
      await screen.findByText("Fin de semana en Mendoza"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Fin de semana en Mendoza/ }));
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    await waitFor(() => {
      expect(addPlanActivity).toHaveBeenCalledWith(10, 42);
    });
    expect(
      screen.getByText("Agregamos la actividad a “Fin de semana en Mendoza”."),
    ).toBeInTheDocument();
  });

  it("opens the shared composer with the activity preselected for a new plan", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <AddToPlanDialog
        activityId={42}
        activityName="Degustación de vinos"
        onClose={onClose}
      />,
    );

    await user.click(await screen.findByRole("button", { name: /Crear un plan nuevo con esta actividad/ }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith("/plans/create?activityId=42&source=activity");
    expect(addPlanActivity).not.toHaveBeenCalled();
  });
});
