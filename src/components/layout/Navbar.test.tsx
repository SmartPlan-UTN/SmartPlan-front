import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionProvider } from "@/lib/auth";
import { refreshSession } from "@/lib/auth/api";

import { Navbar } from "./Navbar";

vi.mock("@/lib/auth/api", () => ({
  refreshSession: vi.fn(),
  login: vi.fn(),
}));

const route = vi.hoisted(() => ({ actual: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => route.actual,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

/** What `POST /sessions` and `POST /sessions/refresh` return on success. */
const authenticatedResponse = {
  accessToken: "jwt-de-prueba",
  tokenType: "Bearer" as const,
  expiresIn: 900,
  user: {
    id: 1,
    name: "Ana",
    lastName: "Pérez",
    email: "ana@example.com",
    role: { key: "user", name: "User" },
    permissions: [],
  },
};

/** No refresh cookie, or an expired/revoked one: the normal anonymous case. */
function mockAnonymousStartup() {
  vi.mocked(refreshSession).mockRejectedValueOnce(new Error("no session"));
}

function mockAuthenticatedStartup() {
  vi.mocked(refreshSession).mockResolvedValueOnce(authenticatedResponse);
}

function renderNavbar() {
  return render(
    <SessionProvider>
      <Navbar />
    </SessionProvider>,
  );
}

describe("Navbar", () => {
  beforeEach(() => {
    route.actual = "/";
  });

  it("offers the four main navigation destinations", async () => {
    mockAnonymousStartup();
    renderNavbar();

    const nav = await screen.findByRole("navigation", {
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

  it("marks the current route's destination with aria-current", async () => {
    route.actual = "/favorites";
    mockAnonymousStartup();
    renderNavbar();

    const nav = await screen.findByRole("navigation", {
      name: "Navegación principal",
    });

    expect(
      within(nav).getByRole("link", { name: "Favoritos" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(nav).getByRole("link", { name: "Inicio" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("offers login instead of the user menu when there is no session", async () => {
    mockAnonymousStartup();
    renderNavbar();

    expect(
      await screen.findByRole("link", { name: "Iniciar sesión" }),
    ).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: /mi cuenta/i })).toBeNull();
  });

  it("keeps the login link pointing back to the screen the user came from", async () => {
    route.actual = "/explore";
    mockAnonymousStartup();
    renderNavbar();

    expect(
      await screen.findByRole("link", { name: "Iniciar sesión" }),
    ).toHaveAttribute("href", "/login?redirect=%2Fexplore");
  });

  it("expands the user menu when there is a session", async () => {
    mockAuthenticatedStartup();
    const user = userEvent.setup();
    renderNavbar();

    const trigger = await screen.findByRole("button", { name: /mi cuenta/i });
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
    mockAuthenticatedStartup();
    const user = userEvent.setup();
    renderNavbar();

    const trigger = await screen.findByRole("button", { name: /mi cuenta/i });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Mi perfil" })).toBeNull();
  });

  it("logging out returns the navbar to the anonymous state", async () => {
    mockAuthenticatedStartup();
    const user = userEvent.setup();
    renderNavbar();

    await user.click(await screen.findByRole("button", { name: /mi cuenta/i }));
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(
      await screen.findByRole("link", { name: "Iniciar sesión" }),
    ).toBeInTheDocument();
  });

  it("expands the collapsible navigation on small viewports", async () => {
    mockAnonymousStartup();
    const user = userEvent.setup();
    renderNavbar();

    const button = await screen.findByRole("button", {
      name: "Abrir la navegación",
    });
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
