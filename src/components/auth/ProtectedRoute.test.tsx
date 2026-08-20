import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_TOKEN_STORAGE_KEY } from "@/lib/api";
import { SessionProvider, clearToken } from "@/lib/auth";

import { ProtectedRoute } from "./ProtectedRoute";

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/favorites",
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

function renderProtegida() {
  return render(
    <SessionProvider>
      <ProtectedRoute>
        <p>Tus favorites</p>
      </ProtectedRoute>
    </SessionProvider>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
    replace.mockClear();
  });

  it("muestra el contenido cuando hay sesión", () => {
    localStorage.setItem(DEFAULT_TOKEN_STORAGE_KEY, "jwt-de-prueba");

    renderProtegida();

    expect(screen.getByText("Tus favorites")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("manda al login con el destination guardado cuando no hay sesión", () => {
    renderProtegida();

    expect(screen.queryByText("Tus favorites")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/login?redirect=%2Ffavorites");
  });

  it("expulsa al login si la sesión se cae con la pantalla abierta", () => {
    localStorage.setItem(DEFAULT_TOKEN_STORAGE_KEY, "jwt-de-prueba");
    renderProtegida();

    // Es lo que pasa cuando la API responde 401 o cuando se cierra sesión en
    // otra pestaña: el token desaparece con la pantalla ya montada.
    act(() => {
      clearToken();
    });

    expect(screen.queryByText("Tus favorites")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/login?redirect=%2Ffavorites");
  });
});
