import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminShell } from "./AdminShell";

const logout = vi.fn(async () => {});
const replace = vi.fn();

vi.mock("@/lib/auth", () => ({
  useSession: () => ({
    status: "authenticated",
    authenticated: true,
    user: {
      id: 1,
      name: "Ana",
      lastName: "Admin",
      email: "admin@example.com",
      role: { key: "admin" },
      permissions: [],
    },
    logout,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ replace, push: vi.fn() }),
}));

describe("AdminShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("closes the session from the panel after confirming", async () => {
    const user = userEvent.setup();
    render(<AdminShell>contenido</AdminShell>);

    const sidebar = screen.getByRole("complementary");
    expect(within(sidebar).getByRole("link", { name: "Salir del panel" })).toHaveAttribute("href", "/");
    await user.click(within(sidebar).getByRole("button", { name: "Cerrar sesión" }));

    const dialog = screen.getByRole("alertdialog", { name: "Cerrar sesión" });
    expect(logout).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    expect(logout).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("offers Cerrar sesión in the mobile menu too", async () => {
    const user = userEvent.setup();
    render(<AdminShell>contenido</AdminShell>);

    await user.click(screen.getByRole("button", { name: "Abrir menú administrativo" }));
    const header = screen.getByRole("banner");
    await user.click(within(header).getByRole("button", { name: "Cerrar sesión" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(logout).not.toHaveBeenCalled();
  });
});
