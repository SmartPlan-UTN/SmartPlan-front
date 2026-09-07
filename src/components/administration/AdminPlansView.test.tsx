import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteAdminPlan, listAdminPlans, updateAdminPlan } from "@/lib/api";
import type { AdminPlan, AdminPlansResult } from "@/types";

import { AdminPlansView } from "./AdminPlansView";

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  deleteAdminPlan: vi.fn(),
  listAdminPlans: vi.fn(),
  updateAdminPlan: vi.fn(),
}));

function plan(): AdminPlan {
  return {
    id: 12,
    title: "Sábado en Mendoza",
    description: "Un recorrido para dos personas.",
    estimatedTotalCost: 24000,
    estimatedTotalDuration: 240,
    peopleCount: 2,
    activityCount: 3,
    owner: { id: 8, name: "Ana", lastName: "Pérez", email: "ana@example.com" },
    status: { key: "confirmed", name: "Confirmado" },
    createdAt: "2026-08-30T10:00:00.000Z",
    updatedAt: "2026-08-30T10:00:00.000Z",
  };
}

function result(): AdminPlansResult {
  return { data: [plan()], pagination: { page: 1, limit: 20, total: 25, totalPages: 2 } };
}

describe("AdminPlansView", () => {
  beforeEach(() => {
    vi.mocked(listAdminPlans).mockResolvedValue(result());
    vi.mocked(updateAdminPlan).mockResolvedValue(plan());
    vi.mocked(deleteAdminPlan).mockResolvedValue();
  });

  it("renders plans with owner, totals, status, and pagination", async () => {
    render(<AdminPlansView />);

    expect(await screen.findByText("Sábado en Mendoza")).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 1–1 de 25 planes")).toBeInTheDocument();
  });

  it("requests the selected status filter", async () => {
    const user = userEvent.setup();
    render(<AdminPlansView />);
    await screen.findByText("Sábado en Mendoza");

    await user.click(screen.getByRole("button", { name: "Filtrar por estado" }));
    await user.click(screen.getByRole("option", { name: "Completado" }));

    await waitFor(() => expect(listAdminPlans).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "completed", page: 1 }),
    ));
  });

  it("edits all fields supported by the administration contract", async () => {
    const user = userEvent.setup();
    render(<AdminPlansView />);
    await screen.findByText("Sábado en Mendoza");

    await user.click(screen.getByRole("button", { name: "Editar Sábado en Mendoza" }));
    await user.clear(screen.getByLabelText("Título"));
    await user.type(screen.getByLabelText("Título"), "Domingo cultural");
    await user.clear(screen.getByLabelText("Cantidad de personas"));
    await user.type(screen.getByLabelText("Cantidad de personas"), "4");
    await user.selectOptions(screen.getByLabelText("Estado"), "completed");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateAdminPlan).toHaveBeenCalledWith(12, {
      title: "Domingo cultural",
      description: "Un recorrido para dos personas.",
      peopleCount: 4,
      status: "completed",
    }));
  });

  it("confirms deletion before removing a plan", async () => {
    const user = userEvent.setup();
    render(<AdminPlansView />);
    await screen.findByText("Sábado en Mendoza");

    await user.click(screen.getByRole("button", { name: "Eliminar Sábado en Mendoza" }));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(deleteAdminPlan).toHaveBeenCalledWith(12));
  });
});
