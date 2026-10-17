import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  changeAdminUserStatus,
  createAdminUser,
  deleteAdminUser,
  downloadAdminUsersReport,
  getAdminUserMetrics,
  listAdminUsers,
  updateAdminUser,
} from "@/lib/api";
import type { AdminUser, AdminUsersResult, UserStatusKey } from "@/types";

import { AdminUsersView } from "./AdminUsersView";

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  changeAdminUserStatus: vi.fn(),
  createAdminUser: vi.fn(),
  deleteAdminUser: vi.fn(),
  downloadAdminUsersReport: vi.fn(),
  getAdminUserMetrics: vi.fn(),
  listAdminUsers: vi.fn(),
  updateAdminUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useSession: () => ({
    status: "authenticated",
    authenticated: true,
    user: {
      id: 1,
      name: "Admin",
      lastName: "SmartPlan",
      email: "admin@example.com",
      role: { key: "admin", name: "Administrador" },
      permissions: ["user.list", "user.create", "user.update"],
    },
  }),
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
      name: status === "active" ? "Activo" : "Suspendido",
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
      range: { key: "7d", from: "2026-08-13T00:00:00.000Z", to: "2026-08-20T00:00:00.000Z" },
      totalUsers: 2847,
      activeUsers: 2412,
      suspendedUsers: 435,
      administrators: 4,
      newUsers: 63,
      byStatus: [],
      byRole: [],
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
    vi.mocked(deleteAdminUser).mockResolvedValue(undefined);
  });

  it("renders REP-02 metrics and the user table", async () => {
    render(<AdminUsersView />);

    expect(await screen.findByText("Martina García")).toBeInTheDocument();
    expect(screen.getByText("2.847")).toBeInTheDocument();
    expect(screen.getByText("2.412")).toBeInTheDocument();
    expect(screen.getByText("63")).toBeInTheDocument();
    expect(screen.getByText("435")).toBeInTheDocument();
    expect(getAdminUserMetrics).toHaveBeenCalledWith("7d");
    expect(screen.getByText("martina@example.com")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Usuario" })).toBeInTheDocument();
    expect(screen.getByText("Mostrando 1–1 de 1 usuarios")).toBeInTheDocument();
  });

  it("reloads the metrics for the selected range", async () => {
    const user = userEvent.setup();
    render(<AdminUsersView />);
    await screen.findByText("Martina García");

    await user.click(screen.getByRole("button", { name: "30 días" }));

    await waitFor(() => {
      expect(getAdminUserMetrics).toHaveBeenLastCalledWith("30d");
    });
    expect(screen.getByRole("button", { name: "30 días" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Últimos 30 días")).toBeInTheDocument();
  });

  it("downloads the PDF report with the range and the table filters", async () => {
    const createObjectURL = vi.fn(() => "blob:report");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.mocked(downloadAdminUsersReport).mockResolvedValue({
      blob: new Blob(["%PDF"]),
      filename: "usuarios.pdf",
    });
    const user = userEvent.setup();
    render(<AdminUsersView />);
    await screen.findByText("Martina García");

    await user.click(screen.getByRole("button", { name: "Filtrar por estado" }));
    await user.click(screen.getByRole("option", { name: "Activo" }));
    await user.click(screen.getByRole("button", { name: "Descargar reporte" }));

    await waitFor(() => {
      expect(downloadAdminUsersReport).toHaveBeenCalledWith({
        range: "7d",
        format: "pdf",
        search: undefined,
        status: "active",
      });
    });
    expect(click).toHaveBeenCalled();
    click.mockRestore();
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

  it("opens the user view from anywhere in the row, but not from its actions menu", async () => {
    const user = userEvent.setup();
    render(<AdminUsersView />);
    await screen.findByText("Martina García");

    await user.click(screen.getByRole("button", { name: "Acciones para Martina García" }));
    expect(screen.queryByRole("dialog", { name: "Martina García" })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(screen.getByText("martina@example.com", { exact: false }));
    expect(screen.getByRole("dialog", { name: "Martina García" })).toBeInTheDocument();
  });

  it("edits all mutable user fields from the read view actions", async () => {
    const user = userEvent.setup();
    render(<AdminUsersView />);
    await screen.findByText("Martina García");

    await user.click(screen.getByRole("button", { name: "Ver detalle de Martina García" }));
    const dialog = screen.getByRole("dialog", { name: "Martina García" });
    await user.click(within(dialog).getByRole("button", { name: "Editar" }));

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

  it("opens the edit form straight from the row actions menu", async () => {
    const user = userEvent.setup();
    render(<AdminUsersView />);
    await screen.findByText("Martina García");

    await user.click(screen.getByRole("button", { name: "Acciones para Martina García" }));
    await user.click(screen.getByRole("menuitem", { name: "Editar usuario" }));

    const dialog = screen.getByRole("dialog", { name: "Martina García" });
    expect(within(dialog).getByText("Editar usuario")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Nombre")).toHaveValue("Martina");

    await user.clear(within(dialog).getByLabelText("Apellido"));
    await user.type(within(dialog).getByLabelText("Apellido"), "Gómez");
    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(updateAdminUser).toHaveBeenCalledWith(7, expect.objectContaining({
        name: "Martina",
        lastName: "Gómez",
      }));
    });
  });

  it("creates a user from the Nuevo usuario dialog and reloads the list", async () => {
    vi.mocked(createAdminUser).mockResolvedValue({
      ...adminUser(),
      id: 21,
      name: "Lucía",
      lastName: "Pérez",
      email: "lucia@example.com",
    });
    const user = userEvent.setup();
    render(<AdminUsersView />);
    await screen.findByText("Martina García");
    const listCalls = vi.mocked(listAdminUsers).mock.calls.length;

    await user.click(screen.getByRole("button", { name: "Nuevo usuario" }));
    const dialog = screen.getByRole("dialog", { name: "Nuevo usuario" });
    await user.type(within(dialog).getByLabelText("Nombre"), "Lucía");
    await user.type(within(dialog).getByLabelText("Apellido"), "Pérez");
    await user.type(within(dialog).getByLabelText("Correo electrónico"), "lucia@example.com");
    await user.type(within(dialog).getByLabelText("Contraseña inicial"), "Segura123.");
    await user.selectOptions(within(dialog).getByLabelText("Rol"), "admin");
    await user.click(within(dialog).getByRole("button", { name: "Crear usuario" }));

    await waitFor(() => {
      expect(createAdminUser).toHaveBeenCalledWith({
        name: "Lucía",
        lastName: "Pérez",
        email: "lucia@example.com",
        password: "Segura123.",
        role: "admin",
        status: "active",
      });
    });
    expect(screen.queryByRole("dialog", { name: "Nuevo usuario" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(vi.mocked(listAdminUsers).mock.calls.length).toBeGreaterThan(listCalls);
    });
  });

  it("keeps the Nuevo usuario dialog open when the password misses the policy", async () => {
    vi.mocked(createAdminUser).mockClear();
    const user = userEvent.setup();
    render(<AdminUsersView />);
    await screen.findByText("Martina García");

    await user.click(screen.getByRole("button", { name: "Nuevo usuario" }));
    const dialog = screen.getByRole("dialog", { name: "Nuevo usuario" });
    await user.type(within(dialog).getByLabelText("Nombre"), "Lucía");
    await user.type(within(dialog).getByLabelText("Apellido"), "Pérez");
    await user.type(within(dialog).getByLabelText("Correo electrónico"), "lucia@example.com");
    await user.type(within(dialog).getByLabelText("Contraseña inicial"), "corta");
    await user.click(within(dialog).getByRole("button", { name: "Crear usuario" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("al menos 8 caracteres");
    expect(createAdminUser).not.toHaveBeenCalled();
  });

  it("deletes a user after confirming and removes it from the table", async () => {
    const user = userEvent.setup();
    render(<AdminUsersView />);
    await screen.findByText("Martina García");

    await user.click(screen.getByRole("button", { name: "Ver detalle de Martina García" }));
    const dialog = screen.getByRole("dialog", { name: "Martina García" });
    await user.click(within(dialog).getByRole("button", { name: "Eliminar usuario" }));

    expect(
      screen.getByRole("alertdialog", { name: "¿Eliminar a Martina García?" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sí, eliminar usuario" }));

    await waitFor(() => {
      expect(deleteAdminUser).toHaveBeenCalledWith(7);
    });
    expect(screen.queryByRole("dialog", { name: "Martina García" })).not.toBeInTheDocument();
    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
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
