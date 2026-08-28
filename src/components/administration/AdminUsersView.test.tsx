import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  changeAdminUserStatus,
  getAdminUserMetrics,
  listAdminUsers,
  updateAdminUser,
} from "@/lib/api";
import type { AdminUser, AdminUsersResult, UserStatusKey } from "@/types";

import { AdminUsersView } from "./AdminUsersView";

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  changeAdminUserStatus: vi.fn(),
  getAdminUserMetrics: vi.fn(),
  listAdminUsers: vi.fn(),
  updateAdminUser: vi.fn(),
}));

function adminUser(status: UserStatusKey = "active"): AdminUser {
  return {
    id: 7,
    name: "Martina",
    lastName: "García",
    email: "martina@example.com",
    role: { key: "user", name: "Usuario" },
    status: {
      key: status,
      name: status === "active" ? "Activo" : status === "suspended" ? "Suspendido" : "Baneado",
    },
    createdAt: "2026-08-20T12:00:00.000Z",
    updatedAt: "2026-08-20T12:00:00.000Z",
  };
}

function usersResult(user = adminUser()): AdminUsersResult {
  return {
    data: [user],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  };
}

describe("AdminUsersView", () => {
  beforeEach(() => {
    vi.mocked(listAdminUsers).mockResolvedValue(usersResult());
    vi.mocked(getAdminUserMetrics).mockResolvedValue({
      totalUsers: 2847,
      activeUsers: 2412,
      newUsersThisWeek: 63,
    });
    vi.mocked(changeAdminUserStatus).mockImplementation(async (_id, status) =>
      adminUser(status),
    );
    vi.mocked(updateAdminUser).mockImplementation(async (_id, input) => {
      const updated = adminUser(input.status);
      return {
        ...updated,
        name: input.name ?? updated.name,
        lastName: input.lastName ?? updated.lastName,
        email: input.email ?? updated.email,
        role: input.role === "admin"
          ? { key: "admin", name: "Administrador" }
          : updated.role,
      };
    });
  });

  it("renders REP-02 metrics and the user table", async () => {
    render(<AdminUsersView />);

    expect(await screen.findByText("Martina García")).toBeInTheDocument();
    expect(screen.getByText("2.847")).toBeInTheDocument();
    expect(screen.getByText("2.412")).toBeInTheDocument();
    expect(screen.getByText("63")).toBeInTheDocument();
    expect(screen.getByText("martina@example.com")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Usuario" })).toBeInTheDocument();
    expect(screen.getByText("Mostrando 1–1 de 1 usuarios")).toBeInTheDocument();
  });

  it("requests the selected status filter from the API", async () => {
    const user = userEvent.setup();
    render(<AdminUsersView />);
    await screen.findByText("Martina García");

    await user.click(screen.getByRole("button", { name: "Filtrar por estado" }));
    await user.click(screen.getByRole("option", { name: "Suspendido" }));

    await waitFor(() => {
      expect(listAdminUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "suspended", page: 1 }),
      );
    });
  });

  it("confirms a suspension and updates the visible status", async () => {
    const user = userEvent.setup();
    render(<AdminUsersView />);
    await screen.findByText("Martina García");

    await user.click(screen.getByRole("button", { name: "Acciones para Martina García" }));
    await user.click(screen.getByRole("menuitem", { name: "Suspender cuenta" }));

    expect(screen.getByRole("alertdialog", { name: "Suspender cuenta" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Suspender" }));

    await waitFor(() => {
      expect(changeAdminUserStatus).toHaveBeenCalledWith(7, "suspended");
    });
    expect(await screen.findByText("Suspendido")).toBeInTheDocument();
  });

  it("sorts through the supported table headings", async () => {
    const user = userEvent.setup();
    render(<AdminUsersView />);
    await screen.findByText("Martina García");

    await user.click(screen.getByRole("button", { name: "Ordenar por Usuario" }));

    await waitFor(() => {
      expect(listAdminUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: "name", direction: "asc", page: 1 }),
      );
    });
  });

  it("sorts the listing by role", async () => {
    const user = userEvent.setup();
    render(<AdminUsersView />);
    await screen.findByText("Martina García");

    await user.click(screen.getByRole("button", { name: "Ordenar por Rol" }));

    await waitFor(() => {
      expect(listAdminUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: "role", direction: "asc", page: 1 }),
      );
    });
  });

  it("opens a read-only user view from the user cell", async () => {
    const user = userEvent.setup();
    render(<AdminUsersView />);
    await screen.findByText("Martina García");

    await user.click(screen.getByRole("button", { name: "Ver detalle de Martina García" }));

    const dialog = screen.getByRole("dialog", { name: "Martina García" });
    expect(within(dialog).getByText("martina@example.com")).toBeInTheDocument();
    expect(within(dialog).getByText("Usuario")).toBeInTheDocument();
    expect(within(dialog).getByText("#7")).toBeInTheDocument();
  });

  it("edits all mutable user fields from the read view actions", async () => {
    const user = userEvent.setup();
    render(<AdminUsersView />);
    await screen.findByText("Martina García");

    await user.click(screen.getByRole("button", { name: "Ver detalle de Martina García" }));
    const dialog = screen.getByRole("dialog", { name: "Martina García" });
    await user.click(within(dialog).getByRole("button", { name: "Acciones" }));
    await user.click(within(dialog).getByRole("menuitem", { name: /Editar usuario/ }));

    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "Marina");
    await user.selectOptions(screen.getByLabelText("Rol"), "admin");
    await user.selectOptions(screen.getByLabelText("Estado"), "suspended");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(updateAdminUser).toHaveBeenCalledWith(7, expect.objectContaining({
        name: "Marina",
        lastName: "García",
        email: "martina@example.com",
        role: "admin",
        status: "suspended",
      }));
    });
    expect(screen.getByRole("dialog", { name: "Marina García" })).toBeInTheDocument();
  });

  it("shows page controls when the backend reports more than one page", async () => {
    vi.mocked(listAdminUsers).mockResolvedValue({
      data: [adminUser()],
      pagination: { page: 1, limit: 20, total: 45, totalPages: 3 },
    });

    render(<AdminUsersView />);

    expect(await screen.findByRole("navigation", { name: "Paginación de resultados" })).toBeInTheDocument();
    expect(screen.getByText("Mostrando 1–1 de 45 usuarios")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página siguiente" })).toBeEnabled();
  });
});
