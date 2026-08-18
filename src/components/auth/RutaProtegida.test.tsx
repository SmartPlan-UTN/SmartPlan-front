import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_TOKEN_STORAGE_KEY } from "@/lib/api";
import { SesionProvider, borrarToken } from "@/lib/auth";

import { RutaProtegida } from "./RutaProtegida";

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/favoritos",
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

function renderProtegida() {
  return render(
    <SesionProvider>
      <RutaProtegida>
        <p>Tus favoritos</p>
      </RutaProtegida>
    </SesionProvider>,
  );
}

describe("RutaProtegida", () => {
  beforeEach(() => {
    localStorage.clear();
    replace.mockClear();
  });

  it("muestra el contenido cuando hay sesión", () => {
    localStorage.setItem(DEFAULT_TOKEN_STORAGE_KEY, "jwt-de-prueba");

    renderProtegida();

    expect(screen.getByText("Tus favoritos")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("manda al login con el destino guardado cuando no hay sesión", () => {
    renderProtegida();

    expect(screen.queryByText("Tus favoritos")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/login?redirect=%2Ffavoritos");
  });

  it("expulsa al login si la sesión se cae con la pantalla abierta", () => {
    localStorage.setItem(DEFAULT_TOKEN_STORAGE_KEY, "jwt-de-prueba");
    renderProtegida();

    // Es lo que pasa cuando la API responde 401 o cuando se cierra sesión en
    // otra pestaña: el token desaparece con la pantalla ya montada.
    act(() => {
      borrarToken();
    });

    expect(screen.queryByText("Tus favoritos")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/login?redirect=%2Ffavoritos");
  });
});
