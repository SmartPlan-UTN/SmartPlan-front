import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessionProvider } from "@/lib/auth";
import { logout, refreshSession } from "@/lib/auth/api";

import { Navbar } from "./Navbar";

vi.mock("@/lib/auth/api", () => ({
  refreshSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

const route = vi.hoisted(() => ({ actual: "/" }));
const replace = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => route.actual,
  useRouter: () => ({ replace, push, refresh: vi.fn() }),
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
    replace.mockClear();
    push.mockClear();

    // The Explorar transition mounts its own `MoodBackground` — jsdom has
    // neither of these APIs, and it degrades gracefully without them (no
    // canvas context either, same as any environment with no 2D canvas
    // support), so a bare stub is enough; nothing here asserts on the
    // waves actually drawing.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    class MockResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("asks for confirmation before logging out, calls DELETE /sessions, and redirects to login on confirm", async () => {
    mockAuthenticatedStartup();
    vi.mocked(logout).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderNavbar();

    await user.click(await screen.findByRole("button", { name: /mi cuenta/i }));
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    // Doesn't log out on the first click: a confirmation dialog opens first.
    expect(
      screen.getByRole("alertdialog", { name: "Cerrar sesión" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).toBeNull();
    expect(logout).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(
      await screen.findByRole("link", { name: "Iniciar sesión" }),
    ).toBeInTheDocument();
    expect(logout).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("still clears the local session and redirects when DELETE /sessions fails", async () => {
    mockAuthenticatedStartup();
    vi.mocked(logout).mockRejectedValueOnce(new Error("network error"));
    const user = userEvent.setup();
    renderNavbar();

    await user.click(await screen.findByRole("button", { name: /mi cuenta/i }));
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(
      await screen.findByRole("link", { name: "Iniciar sesión" }),
    ).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("keeps the session open when the logout confirmation is cancelled", async () => {
    mockAuthenticatedStartup();
    const user = userEvent.setup();
    renderNavbar();

    await user.click(await screen.findByRole("button", { name: /mi cuenta/i }));
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(
      screen.queryByRole("alertdialog", { name: "Cerrar sesión" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).toBeNull();
  });

  it("shows the Explorar transition when navigating there from elsewhere, then reveals it", async () => {
    mockAnonymousStartup();
    renderNavbar();

    const nav = await screen.findByRole("navigation", {
      name: "Navegación principal",
    });

    // Fake timers only from here on: `findByRole` above polls with a real
    // timer under the hood, and switching earlier just hangs it.
    vi.useFakeTimers();
    fireEvent.click(within(nav).getByRole("link", { name: "Explorar" }));

    expect(screen.getByText("Armando tu plan perfecto...")).toBeInTheDocument();
    expect(push).toHaveBeenCalledWith("/explore");

    await act(async () => {
      vi.advanceTimersByTime(899);
    });
    expect(screen.getByText("Armando tu plan perfecto...")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText("Armando tu plan perfecto...")).not.toBeInTheDocument();
  });

  it("doesn't show the transition for a modified click (opening Explorar in a new tab)", async () => {
    mockAnonymousStartup();
    renderNavbar();

    const nav = await screen.findByRole("navigation", {
      name: "Navegación principal",
    });
    fireEvent.click(within(nav).getByRole("link", { name: "Explorar" }), {
      metaKey: true,
    });

    expect(screen.queryByText("Armando tu plan perfecto...")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("doesn't show the transition when already on Explorar", async () => {
    route.actual = "/explore";
    mockAnonymousStartup();
    renderNavbar();

    const nav = await screen.findByRole("navigation", {
      name: "Navegación principal",
    });
    fireEvent.click(within(nav).getByRole("link", { name: "Explorar" }));

    expect(screen.queryByText("Armando tu plan perfecto...")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("resets the full transition duration when entering Explorar again", async () => {
    mockAnonymousStartup();
    const view = renderNavbar();

    const nav = await screen.findByRole("navigation", {
      name: "Navegación principal",
    });
    vi.useFakeTimers();
    fireEvent.click(within(nav).getByRole("link", { name: "Explorar" }));

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    route.actual = "/favorites";
    view.rerender(
      <SessionProvider>
        <Navbar />
      </SessionProvider>,
    );
    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegación principal" })).getByRole("link", { name: "Explorar" }));

    await act(async () => {
      vi.advanceTimersByTime(899);
    });
    expect(screen.getByText("Armando tu plan perfecto...")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText("Armando tu plan perfecto...")).not.toBeInTheDocument();
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
