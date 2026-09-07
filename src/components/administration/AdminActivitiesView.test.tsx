import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAdminActivity,
  deleteAdminActivity,
  listAdminActivities,
  listCategories,
  listPlaces,
  updateAdminActivity,
} from "@/lib/api";
import type { AdminActivity, AdminActivitiesResult, PlaceOption } from "@/types";

import { AdminActivitiesView } from "./AdminActivitiesView";

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  createAdminActivity: vi.fn(),
  deleteAdminActivity: vi.fn(),
  listAdminActivities: vi.fn(),
  listCategories: vi.fn(),
  listPlaces: vi.fn(),
  updateAdminActivity: vi.fn(),
}));

const places: PlaceOption[] = [
  {
    id: 3,
    name: "Parque Central",
    description: null,
    address: "Av. Mitre 100, Mendoza",
    department: { id: 1, name: "Capital", city: { id: 1, name: "Mendoza", country: { id: 1, name: "Argentina" } } },
  },
  {
    id: 4,
    name: "Museo del Área Fundacional",
    description: null,
    address: "Beltrán 1250, Mendoza",
    department: { id: 1, name: "Capital", city: { id: 1, name: "Mendoza", country: { id: 1, name: "Argentina" } } },
  },
];

function activity(): AdminActivity {
  return {
    id: 9,
    name: "Paseo cultural",
    description: "Recorrido por el centro.",
    estimatedCost: 1500,
    estimatedDuration: 120,
    type: "cultural",
    categories: [{ id: 2, name: "Cultura & Arte" }],
    places: [{ id: 3, name: "Parque Central", address: "Av. Mitre 100, Mendoza" }],
    createdAt: "2026-08-30T10:00:00.000Z",
    updatedAt: "2026-08-30T10:00:00.000Z",
  };
}

function result(): AdminActivitiesResult {
  return { data: [activity()], pagination: { page: 1, limit: 20, total: 41, totalPages: 3 } };
}

describe("AdminActivitiesView", () => {
  beforeEach(() => {
    vi.mocked(listAdminActivities).mockResolvedValue(result());
    vi.mocked(listCategories).mockResolvedValue({
      data: [{ id: 2, name: "Cultura & Arte", description: null }],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    vi.mocked(listPlaces).mockResolvedValue({
      data: places,
      pagination: { page: 1, limit: 100, total: 2, totalPages: 1 },
    });
    vi.mocked(createAdminActivity).mockResolvedValue(activity());
    vi.mocked(updateAdminActivity).mockResolvedValue(activity());
    vi.mocked(deleteAdminActivity).mockResolvedValue();
  });

  it("renders the paginated activity catalog and its Maps place", async () => {
    render(<AdminActivitiesView />);

    expect(await screen.findByText("Paseo cultural")).toBeInTheDocument();
    expect(screen.getByText("Cultura & Arte")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Parque Central/ })).toHaveAttribute(
      "href",
      expect.stringContaining("google.com/maps"),
    );
    expect(screen.getByText("Mostrando 1–1 de 41 actividades")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página siguiente" })).toBeEnabled();
  });

  it("creates an activity without a physical location", async () => {
    const user = userEvent.setup();
    render(<AdminActivitiesView />);
    await screen.findByText("Paseo cultural");

    await user.click(screen.getByRole("button", { name: /Nueva actividad/ }));
    await user.type(screen.getByLabelText("Nombre"), "Juegos de mesa en casa");
    await user.type(screen.getByLabelText("Descripción"), "Una tarde de juegos para compartir.");
    await user.type(screen.getByLabelText("Costo estimado"), "0");
    await user.type(screen.getByLabelText("Duración en minutos"), "90");
    await user.click(screen.getByRole("button", { name: "Guardar actividad" }));

    await waitFor(() => expect(createAdminActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Juegos de mesa en casa",
        estimatedCost: 0,
        estimatedDuration: 90,
        placeIds: [],
      }),
    ));
  });

  it("keeps the current place and can associate another one while editing", async () => {
    const user = userEvent.setup();
    render(<AdminActivitiesView />);
    await screen.findByText("Paseo cultural");

    await user.click(screen.getByRole("button", { name: "Editar Paseo cultural" }));
    await user.click(screen.getByLabelText(/Museo del Área Fundacional/));
    await user.click(screen.getByRole("button", { name: "Guardar actividad" }));

    await waitFor(() => expect(updateAdminActivity).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ placeIds: [3, 4] }),
    ));
  });

  it("confirms deletion before removing an activity", async () => {
    const user = userEvent.setup();
    render(<AdminActivitiesView />);
    await screen.findByText("Paseo cultural");

    await user.click(screen.getByRole("button", { name: "Eliminar Paseo cultural" }));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(deleteAdminActivity).toHaveBeenCalledWith(9));
  });
});
