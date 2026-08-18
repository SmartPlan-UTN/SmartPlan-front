import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_TOKEN_STORAGE_KEY } from "@/lib/api";

import { borrarToken, guardarToken, leerToken, suscribirSesion } from "./sesion";

describe("sesion", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("guarda, lee y borra el token", () => {
    expect(leerToken()).toBeNull();

    guardarToken("jwt-de-prueba");
    expect(localStorage.getItem(DEFAULT_TOKEN_STORAGE_KEY)).toBe("jwt-de-prueba");
    expect(leerToken()).toBe("jwt-de-prueba");

    borrarToken();
    expect(leerToken()).toBeNull();
  });

  it("avisa de los cambios de la pestaña actual hasta que se desuscribe", () => {
    const alCambiar = vi.fn();
    const desuscribir = suscribirSesion(alCambiar);

    guardarToken("jwt-de-prueba");
    borrarToken();
    expect(alCambiar).toHaveBeenCalledTimes(2);

    desuscribir();
    guardarToken("otro-jwt");
    expect(alCambiar).toHaveBeenCalledTimes(2);
  });

  it("avisa cuando otra pestaña cierra la sesión", () => {
    const alCambiar = vi.fn();
    const desuscribir = suscribirSesion(alCambiar);

    // Es lo que dispara el navegador en las demás pestañas: el token cambia y,
    // con localStorage.clear(), la clave viene en null.
    window.dispatchEvent(
      new StorageEvent("storage", { key: DEFAULT_TOKEN_STORAGE_KEY }),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    expect(alCambiar).toHaveBeenCalledTimes(2);

    // Un cambio de otra clave no es asunto de la sesión.
    window.dispatchEvent(new StorageEvent("storage", { key: "otra-cosa" }));
    expect(alCambiar).toHaveBeenCalledTimes(2);

    desuscribir();
  });
});
