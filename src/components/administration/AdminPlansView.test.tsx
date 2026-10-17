import { render, screen, waitFor, within } from "@testing-library/react";
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

function plan(overrides: Partial<AdminPlan> = {}): AdminPlan {
  return {
    id: 12,
    title: "Sábado en Mendoza",
    description: "Un recorrido para dos personas.",
    estimatedTotalCost: 24000,
    estimatedTotalDuration: 240,
    peopleCount: 2,
    activityCount: 3,
    kind: "authored",
    visibility: "private",
    listedInExplore: false,
    exploreHiddenCause: "private",
    owner: { id: 8, name: "Ana", lastName: "Pérez", email: "ana@example.com" },
    status: { key: "confirmed", name: "Confirmado" },
    createdAt: "2026-08-30T10:00:00.000Z",
    updatedAt: "2026-08-30T10:00:00.000Z",
    ...overrides,
  };
}

function result(data: AdminPlan[] = [plan()]): AdminPlansResult {
  return { data, pagination: { page: 1, limit: 20, total: 25, totalPages: 2 } };
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
    expect(screen.getByText("Confirmado", { selector: "td span" })).toBeInTheDocument();
    expect(screen.getByText("Mostrando 1–1 de 25 planes")).toBeInTheDocument();
  });

  it("opens a read-only view from the plan row, not from its actions", async () => {
    const user = userEvent.setup();
    render(<AdminPlansView />);
    await screen.findByText("Sábado en Mendoza");

    await user.click(screen.getByRole("button", { name: "Editar Sábado en Mendoza" }));
    expect(screen.queryByRole("dialog", { name: "Sábado en Mendoza" })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(screen.getByText("ana@example.com"));
    const dialog = screen.getByRole("dialog", { name: "Sábado en Mendoza" });
    expect(within(dialog).getByText("Confirmado")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
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

  it("shows statuses in Spanish and explains why a plan is not in Explorar (#160)", async () => {
    vi.mocked(listAdminPlans).mockResolvedValue(result([
      plan({ status: { key: "completed", name: "Completed" }, kind: "outing", exploreHiddenCause: "outing" }),
      plan({ id: 13, title: "Ruta del vino", status: { key: "completed", name: "Completed" }, visibility: "public", listedInExplore: true, exploreHiddenCause: null }),
    ]));
    render(<AdminPlansView />);

    expect(await screen.findByText("Sábado en Mendoza")).toBeInTheDocument();
    expect(screen.queryByText("Completed")).not.toBeInTheDocument();
    expect(screen.getAllByText("Completado", { selector: "td span" })).toHaveLength(2);
    expect(screen.getByText("Salida")).toBeInTheDocument();
    expect(screen.getByText("No se ve en Explorar. Las salidas son personales.")).toBeInTheDocument();
    expect(screen.getByText("Visible en Explorar")).toBeInTheDocument();
  });

  it("requests the selected origin and visibility filters (#160)", async () => {
    const user = userEvent.setup();
    render(<AdminPlansView />);
    await screen.findByText("Sábado en Mendoza");

    await user.click(screen.getByRole("button", { name: "Filtrar por origen" }));
    await user.click(screen.getByRole("option", { name: "Creado por una persona" }));
    await user.click(screen.getByRole("button", { name: "Filtrar por visibilidad" }));
    await user.click(screen.getByRole("option", { name: "Público" }));

    await waitFor(() => expect(listAdminPlans).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: "authored", visibility: "public", page: 1 }),
    ));
  });

  it("tells the administrator that changing the status does not publish the plan (#160)", async () => {
    const user = userEvent.setup();
    render(<AdminPlansView />);
    await screen.findByText("Sábado en Mendoza");

    await user.click(screen.getByRole("button", { name: "Editar Sábado en Mendoza" }));
    await user.selectOptions(screen.getByLabelText("Estado"), "completed");

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Ya se realizó. No cambia su visibilidad.")).toBeInTheDocument();
    expect(within(dialog).getByText(/No aparece en Explorar\. Su autor no lo publicó\. Cambiar el estado no lo publica/)).toBeInTheDocument();
  });

  it("warns that cancelling a public plan removes it from Explorar (#160)", async () => {
    vi.mocked(listAdminPlans).mockResolvedValue(result([plan({ visibility: "public", listedInExplore: true, exploreHiddenCause: null })]));
    const user = userEvent.setup();
    render(<AdminPlansView />);
    await screen.findByText("Sábado en Mendoza");

    await user.click(screen.getByRole("button", { name: "Editar Sábado en Mendoza" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Este plan aparece en Explorar.")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Estado"), "cancelled");
    expect(within(dialog).getByText("Hoy aparece en Explorar. Si lo guardás como cancelado, deja de mostrarse.")).toBeInTheDocument();
  });

  it("still renders and edits plans from a back without origin data or with an unknown status", async () => {
    const legacy = plan({ status: { key: "archived" as AdminPlan["status"]["key"], name: "Archivado" } });
    delete legacy.kind;
    delete legacy.visibility;
    delete legacy.listedInExplore;
    delete legacy.exploreHiddenCause;
    vi.mocked(listAdminPlans).mockResolvedValue(result([legacy]));
    const user = userEvent.setup();
    render(<AdminPlansView />);

    expect(await screen.findByText("Archivado", { selector: "td span" })).toBeInTheDocument();
    expect(screen.getByText("Sin datos de origen")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Editar Sábado en Mendoza" }));
    expect(screen.getByLabelText("Estado")).toHaveValue("archived");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(updateAdminPlan).toHaveBeenCalledWith(12, expect.objectContaining({ status: "archived" })));
  });
});
