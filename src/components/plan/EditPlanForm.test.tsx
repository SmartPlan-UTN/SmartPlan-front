import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  getOwnPlan,
  updateOwnPlan,
  addPlanActivity,
  removePlanActivity,
} from "@/lib/api";
import type { OwnPlanDetail } from "@/types";

import { EditPlanForm } from "./EditPlanForm";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getOwnPlan: vi.fn(),
    updateOwnPlan: vi.fn(),
    addPlanActivity: vi.fn(),
    removePlanActivity: vi.fn(),
    searchActivities: vi.fn().mockResolvedValue({ data: [] }),
  };
});

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function mockPlan(overrides: Partial<OwnPlanDetail> = {}): OwnPlanDetail {
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
    completedAt: null,
    feedbackState: "not_available",
    feedback: null,
    createdAt: "2026-08-25T12:00:00.000Z",
    updatedAt: "2026-08-25T12:00:00.000Z",
    details: [
      {
        id: 101,
        order: 1,
        estimatedCost: 15000,
        estimatedDuration: 180,
        activity: {
          id: 42,
          name: "Degustación en Bodega",
          description: "Degustación de vinos",
          estimatedCost: 15000,
          estimatedDuration: 180,
          type: "Bodega",
        },
      },
    ],
    ...overrides,
  };
}

describe("EditPlanForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOwnPlan).mockResolvedValue(mockPlan());
  });

  it("loads existing plan values and updates fields on submit (CU25)", async () => {
    vi.mocked(updateOwnPlan).mockResolvedValueOnce({
      ...mockPlan(),
      title: "Domingo en Luján",
      description: "Nueva descripción",
      peopleCount: 4,
    });

    const user = userEvent.setup();
    render(<EditPlanForm planId={12} />);

    const titleInput = await screen.findByLabelText(/Nombre del plan/);
    const descInput = screen.getByLabelText(/Descripción/);
    const peopleInput = screen.getByLabelText(/Cantidad de personas/);

    expect(titleInput).toHaveValue("Domingo de bodegas");
    expect(descInput).toHaveValue("Recorrido por viñedos");
    expect(peopleInput).toHaveValue(2);

    await user.clear(titleInput);
    await user.type(titleInput, "Domingo en Luján");
    await user.clear(descInput);
    await user.type(descInput, "Nueva descripción");
    await user.clear(peopleInput);
    await user.type(peopleInput, "4");

    const submitBtn = screen.getByRole("button", { name: "Guardar cambios" });
    await user.click(submitBtn);

    expect(updateOwnPlan).toHaveBeenCalledWith(12, {
      title: "Domingo en Luján",
      description: "Nueva descripción",
      peopleCount: 4,
    });

    expect(
      await screen.findByText("Plan actualizado correctamente"),
    ).toBeInTheDocument();
  });

  it("warns before discarding changes when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<EditPlanForm planId={12} />);

    const titleInput = await screen.findByLabelText(/Nombre del plan/);
    await user.type(titleInput, " Modificado");

    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    await user.click(cancelBtn);

    expect(screen.getByText("Descartar cambios")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descartar" })).toBeInTheDocument();
  });

  it("adds an activity stop to the plan (CU27)", async () => {
    vi.mocked(addPlanActivity).mockResolvedValueOnce({
      ...mockPlan(),
      details: [
        ...mockPlan().details,
        {
          id: 102,
          order: 2,
          estimatedCost: 8000,
          estimatedDuration: 120,
          activity: {
            id: 99,
            name: "Almuerzo Criollo",
            description: "Almuerzo campestre",
            estimatedCost: 8000,
            estimatedDuration: 120,
            type: "Restaurante",
          },
        },
      ],
    });

    const user = userEvent.setup();
    render(<EditPlanForm planId={12} />);

    await screen.findByText("Degustación en Bodega");
    const searchInput = screen.getByPlaceholderText(/Buscar actividad/);
    await user.type(searchInput, "Criollo");
  });

  it("removes an activity stop from the plan asking confirmation when it leaves the plan empty (CU28)", async () => {
    vi.mocked(removePlanActivity).mockResolvedValueOnce();

    const user = userEvent.setup();
    render(<EditPlanForm planId={12} />);

    const removeBtn = await screen.findByRole("button", {
      name: "Quitar Degustación en Bodega",
    });

    vi.mocked(getOwnPlan).mockResolvedValue(
      mockPlan({ details: [], activityCount: 0 }),
    );
    await user.click(removeBtn);

    // Confirmation dialog opens when plan would become empty
    expect(screen.getByRole("alertdialog", { name: "¿Quitar la última actividad?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sí, quitar actividad" }));

    expect(removePlanActivity).toHaveBeenCalledWith(12, 101);
    await waitFor(() => {
      expect(
        screen.queryByText("Degustación en Bodega"),
      ).not.toBeInTheDocument();
    });
  });

  it("shows cancelled plan state when plan is cancelled", async () => {
    vi.mocked(getOwnPlan).mockResolvedValueOnce(
      mockPlan({ status: { key: "cancelled", name: "Cancelado" } }),
    );

    render(<EditPlanForm planId={12} />);

    expect(
      await screen.findByText("El plan se encuentra cancelado"),
    ).toBeInTheDocument();
  });

  it("shows controlled not found state for a missing plan", async () => {
    vi.mocked(getOwnPlan).mockRejectedValueOnce(
      new ApiError({
        message: "Not found",
        type: "HTTP",
        status: 404,
        code: "PLAN_NOT_FOUND",
      }),
    );

    render(<EditPlanForm planId={999} />);

    expect(
      await screen.findByText("No encontramos este plan"),
    ).toBeInTheDocument();
  });
});
