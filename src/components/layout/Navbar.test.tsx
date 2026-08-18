import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_TOKEN_STORAGE_KEY } from "@/lib/api";
import { SesionProvider } from "@/lib/auth";

import { Navbar } from "./Navbar";

const ruta = vi.hoisted(() => ({ actual: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => ruta.actual,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

function renderNavbar() {
  return render(
    <SesionProvider>
      <Navbar />
    </SesionProvider>,
  );
}

describe("Navbar", () => {
  beforeEach(() => {
    localStorage.clear();
    ruta.actual = "/";
  });

  it("ofrece los cuatro destinos de la navegación principal", () => {
    renderNavbar();

    const navegacion = screen.getByRole("navigation", {
      name: "Navegación principal",
    });

    expect(
      within(navegacion).getByRole("link", { name: "Inicio" }),
    ).toHaveAttribute("href", "/");
    expect(
      within(navegacion).getByRole("link", { name: "Explorar" }),
    ).toHaveAttribute("href", "/explorar");
    expect(
      within(navegacion).getByRole("link", { name: "Favoritos" }),
    ).toHaveAttribute("href", "/favoritos");
    expect(
      within(navegacion).getByRole("link", { name: "Historial" }),
    ).toHaveAttribute("href", "/historial");
  });

  it("marca con aria-current el destino de la ruta actual", () => {
    ruta.actual = "/favoritos";
    renderNavbar();

    const navegacion = screen.getByRole("navigation", {
      name: "Navegación principal",
    });

    expect(
      within(navegacion).getByRole("link", { name: "Favoritos" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(navegacion).getByRole("link", { name: "Inicio" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("sin sesión ofrece iniciar sesión en lugar del menú de usuario", () => {
    renderNavbar();

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.queryByRole("button", { name: /mi cuenta/i })).toBeNull();
  });

  it("el enlace de login conserva la pantalla desde la que se entra", () => {
    ruta.actual = "/explorar";
    renderNavbar();

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
      "href",
      "/login?redirect=%2Fexplorar",
    );
  });

  it("con sesión despliega el menú de usuario", async () => {
    localStorage.setItem(DEFAULT_TOKEN_STORAGE_KEY, "jwt-de-prueba");
    const user = userEvent.setup();
    renderNavbar();

    const disparador = screen.getByRole("button", { name: /mi cuenta/i });
    expect(disparador).toHaveAttribute("aria-expanded", "false");

    await user.click(disparador);

    expect(disparador).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Mi perfil" })).toHaveAttribute(
      "href",
      "/perfil",
    );
    expect(screen.getByRole("link", { name: "Preferencias" })).toHaveAttribute(
      "href",
      "/preferencias",
    );
    expect(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    ).toBeInTheDocument();
  });

  it("cierra el menú de usuario con Escape", async () => {
    localStorage.setItem(DEFAULT_TOKEN_STORAGE_KEY, "jwt-de-prueba");
    const user = userEvent.setup();
    renderNavbar();

    const disparador = screen.getByRole("button", { name: /mi cuenta/i });
    await user.click(disparador);
    await user.keyboard("{Escape}");

    expect(disparador).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Mi perfil" })).toBeNull();
  });

  it("cerrar sesión devuelve la barra al estado anónimo", async () => {
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
