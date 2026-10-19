import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/lib/theme";

import { AdminShell } from "./AdminShell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

vi.mock("@/lib/auth", () => ({
  useSession: () => ({
    status: "authenticated",
    authenticated: true,
    user: {
      id: 1,
      name: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      role: { key: "admin", name: "Administrador" },
      permissions: [],
    },
  }),
}));

describe("AdminShell", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("offers the dark-mode moon in the panel's top bar on desktop and mobile", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <AdminShell>
          <p>Contenido</p>
        </AdminShell>
      </ThemeProvider>,
    );

    // One in the desktop bar, one in the mobile header; CSS shows one.
    const moons = screen.getAllByRole("button", { name: "Modo oscuro" });
    expect(moons).toHaveLength(2);

    await user.click(moons[0]);

    expect(document.documentElement.dataset.theme).toBe("dark");
    for (const moon of moons) {
      expect(moon).toHaveAttribute("aria-pressed", "true");
    }
  });
});
