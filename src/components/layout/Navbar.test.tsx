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

  it("ofrece los cuatro destinations de la navegación principal", () => {
    renderNavbar();

    const navegacion = screen.getByRole("navigation", {
      name: "Navegación principal",
    });

    expect(
      within(navegacion).getByRole("link", { name: "Inicio" }),
    ).toHaveAttribute("href", "/");
    expect(
      within(navegacion).getByRole("link", { name: "Explorar" }),
    ).toHaveAttribute("href", "/explore");
    expect(
      within(navegacion).getByRole("link", { name: "Favorites" }),
    ).toHaveAttribute("href", "/favorites");
    expect(
      within(navegacion).getByRole("link", { name: "Historial" }),
    ).toHaveAttribute("href", "/history");
  });

  it("marca con aria-current el destination de la route actual", () => {
    route.actual = "/favorites";
    renderNavbar();

    const navegacion = screen.getByRole("navigation", {
      name: "Navegación principal",
    });

    expect(
      within(navegacion).getByRole("link", { name: "Favorites" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(navegacion).getByRole("link", { name: "Inicio" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("sin sesión ofrece iniciar sesión en place del menú de user", () => {
    renderNavbar();

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.queryByRole("button", { name: /mi cuenta/i })).toBeNull();
  });

  it("el link de login conserva la pantalla desde la que se entra", () => {
    route.actual = "/explore";
    renderNavbar();

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
      "href",
      "/login?redirect=%2Fexplore",
    );
  });

  it("con sesión despliega el menú de user", async () => {
    localStorage.setItem(DEFAULT_TOKEN_STORAGE_KEY, "jwt-de-prueba");
    const user = userEvent.setup();
    renderNavbar();

    const disparador = screen.getByRole("button", { name: /mi cuenta/i });
    expect(disparador).toHaveAttribute("aria-expanded", "false");

    await user.click(disparador);

    expect(disparador).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Mi profile" })).toHaveAttribute(
      "href",
      "/profile",
    );
    expect(screen.getByRole("link", { name: "Preferences" })).toHaveAttribute(
      "href",
      "/preferences",
    );
    expect(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    ).toBeInTheDocument();
  });

  it("cierra el menú de user con Escape", async () => {
    localStorage.setItem(DEFAULT_TOKEN_STORAGE_KEY, "jwt-de-prueba");
    const user = userEvent.setup();
    renderNavbar();

    const disparador = screen.getByRole("button", { name: /mi cuenta/i });
    await user.click(disparador);
    await user.keyboard("{Escape}");

    expect(disparador).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Mi profile" })).toBeNull();
  });

  it("cerrar sesión devuelve la navbar al status anónimo", async () => {
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

  it("despliega la navegación plegable en viewport chico", async () => {
    const user = userEvent.setup();
    renderNavbar();

    const boton = screen.getByRole("button", { name: "Abrir la navegación" });
    await user.click(boton);

    const plegable = screen.getByRole("navigation", {
      name: "Navegación principal plegable",
    });

    expect(
      within(plegable).getByRole("link", { name: "Historial" }),
    ).toBeInTheDocument();
    expect(boton).toHaveAccessibleName("Cerrar la navegación");
  });
});
