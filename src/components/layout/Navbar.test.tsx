import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_TOKEN_STORAGE_KEY } from "@/lib/api";
import { SessionProvider } from "@/lib/auth";

import { Navbar } from "./Navbar";

const route = vi.hoisted(() => ({ actual: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => route.actual,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

function renderNavbar() {
  return render(
    <SessionProvider>
      <Navbar />
    </SessionProvider>,
  );
}

describe("Navbar", () => {
  beforeEach(() => {
    localStorage.clear();
    route.actual = "/";
  });

  it("offers the four main navigation destinations", () => {
    renderNavbar();

    const nav = screen.getByRole("navigation", {
      name: "Navegación principal",
    });

    expect(
      within(nav).getByRole("link", { name: "Inicio" }),
    ).toHaveAttribute("href", "/");
    expect(
      within(nav).getByRole("link", { name: "Explorar" }),
    ).toHaveAttribute("href", "/explore");
    expect(
      within(nav).getByRole("link", { name: "Favoritos" }),
    ).toHaveAttribute("href", "/favorites");
    expect(
      within(nav).getByRole("link", { name: "Historial" }),
    ).toHaveAttribute("href", "/history");
  });

  it("marks the current route's destination with aria-current", () => {
    route.actual = "/favorites";
    renderNavbar();

    const nav = screen.getByRole("navigation", {
      name: "Navegación principal",
    });

    expect(
      within(nav).getByRole("link", { name: "Favoritos" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(nav).getByRole("link", { name: "Inicio" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("offers login instead of the user menu when there is no session", () => {
    renderNavbar();

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.queryByRole("button", { name: /mi cuenta/i })).toBeNull();
  });

  it("keeps the login link pointing back to the screen the user came from", () => {
    route.actual = "/explore";
    renderNavbar();

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
      "href",
      "/login?redirect=%2Fexplore",
    );
  });

  it("expands the user menu when there is a session", async () => {
    localStorage.setItem(DEFAULT_TOKEN_STORAGE_KEY, "jwt-de-prueba");
    const user = userEvent.setup();
    renderNavbar();

    const trigger = screen.getByRole("button", { name: /mi cuenta/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Mi perfil" })).toHaveAttribute(
      "href",
      "/profile",
    );
    expect(screen.getByRole("link", { name: "Preferencias" })).toHaveAttribute(
      "href",
      "/preferences",
    );
    expect(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    ).toBeInTheDocument();
  });

  it("closes the user menu with Escape", async () => {
    localStorage.setItem(DEFAULT_TOKEN_STORAGE_KEY, "jwt-de-prueba");
    const user = userEvent.setup();
    renderNavbar();

    const trigger = screen.getByRole("button", { name: /mi cuenta/i });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Mi perfil" })).toBeNull();
  });

  it("logging out returns the navbar to the anonymous state", async () => {
    localStorage.setItem(DEFAULT_TOKEN_STORAGE_KEY, "jwt-de-prueba");
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole("button", { name: /mi cuenta/i }));
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(localStorage.getItem(DEFAULT_TOKEN_STORAGE_KEY)).toBeNull();
    expect(
      screen.getByRole("link", { name: "Iniciar sesión" }),
    ).toBeInTheDocument();
  });

  it("expands the collapsible navigation on small viewports", async () => {
    const user = userEvent.setup();
    renderNavbar();

    const button = screen.getByRole("button", { name: "Abrir la navegación" });
    await user.click(button);

    const collapsible = screen.getByRole("navigation", {
      name: "Navegación principal plegable",
    });

    expect(
      within(collapsible).getByRole("link", { name: "Historial" }),
    ).toBeInTheDocument();
    expect(button).toHaveAccessibleName("Cerrar la navegación");
  });
});
