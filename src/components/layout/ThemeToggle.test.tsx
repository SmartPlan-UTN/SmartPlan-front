import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/lib/theme";

import { ThemeToggle } from "./ThemeToggle";

const session = vi.hoisted(() => ({
  current: { status: "anonymous", user: null } as {
    status: "loading" | "authenticated" | "anonymous";
    user: { id: number } | null;
  },
}));

vi.mock("@/lib/auth", () => ({
  useSession: () => ({
    status: session.current.status,
    user: session.current.user,
    authenticated: session.current.status === "authenticated",
  }),
}));

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    session.current = { status: "anonymous", user: null };
  });

  it("isn't offered without a session", () => {
    renderToggle();

    expect(screen.queryByRole("button", { name: "Modo oscuro" })).toBeNull();
  });

  it("isn't offered while the session is still loading", () => {
    session.current = { status: "loading", user: null };

    renderToggle();

    expect(screen.queryByRole("button", { name: "Modo oscuro" })).toBeNull();
  });

  it("switches the whole page between light and dark", async () => {
    const user = userEvent.setup();
    session.current = { status: "authenticated", user: { id: 7 } };
    renderToggle();

    const toggle = screen.getByRole("button", { name: "Modo oscuro" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveAttribute("title", "Activar modo oscuro");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveAttribute("title", "Desactivar modo oscuro");
    expect(document.documentElement.dataset.theme).toBe("dark");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("starts pressed for an account that chose dark before", () => {
    localStorage.setItem("smartplan:theme:7", "dark");
    session.current = { status: "authenticated", user: { id: 7 } };

    renderToggle();

    expect(screen.getByRole("button", { name: "Modo oscuro" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
