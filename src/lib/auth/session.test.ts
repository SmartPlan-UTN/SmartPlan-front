import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_TOKEN_STORAGE_KEY } from "@/lib/api";

import { clearToken, saveToken, readToken, subscribeToSession } from "./session";

describe("session", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("guarda, lee y borra el token", () => {
    expect(readToken()).toBeNull();

    saveToken("jwt-de-prueba");
    expect(localStorage.getItem(DEFAULT_TOKEN_STORAGE_KEY)).toBe("jwt-de-prueba");
    expect(readToken()).toBe("jwt-de-prueba");

    clearToken();
    expect(readToken()).toBeNull();
  });

  it("avisa de los changes de la pestaña actual hasta que se desuscribe", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToSession(onChange);

    saveToken("jwt-de-prueba");
    clearToken();
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    saveToken("otro-jwt");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("avisa cuando otra pestaña cierra la sesión", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToSession(onChange);

    // Es lo que dispara el navegador en las demás pestañas: el token cambia y,
    // con localStorage.clear(), la key viene en null.
    window.dispatchEvent(
      new StorageEvent("storage", { key: DEFAULT_TOKEN_STORAGE_KEY }),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    expect(onChange).toHaveBeenCalledTimes(2);

    // Un cambio de otra key no es asunto de la sesión.
    window.dispatchEvent(new StorageEvent("storage", { key: "otra-cosa" }));
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
  });
});
