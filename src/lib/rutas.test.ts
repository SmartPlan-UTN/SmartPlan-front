import { describe, expect, it } from "vitest";

import { PARAM_REDIRECT, RUTAS, destinoSeguro, rutaActiva, rutaLogin } from "./rutas";

describe("destinoSeguro", () => {
  it("acepta rutas internas", () => {
    expect(destinoSeguro("/favoritos")).toBe("/favoritos");
  });

  it("rechaza destinos externos y valores vacíos", () => {
    expect(destinoSeguro("https://otro-sitio.com")).toBeNull();
    expect(destinoSeguro("//otro-sitio.com")).toBeNull();
    expect(destinoSeguro("")).toBeNull();
    expect(destinoSeguro(null)).toBeNull();
  });
});

describe("rutaLogin", () => {
  it("conserva el destino en el parámetro redirect", () => {
    expect(rutaLogin("/historial")).toBe(
      `${RUTAS.login}?${PARAM_REDIRECT}=%2Fhistorial`,
    );
  });

  it("devuelve el login pelado cuando el destino no aporta nada", () => {
    expect(rutaLogin("https://otro-sitio.com")).toBe(RUTAS.login);
    expect(rutaLogin(RUTAS.login)).toBe(RUTAS.login);
    expect(rutaLogin(RUTAS.inicio)).toBe(RUTAS.login);
    expect(rutaLogin()).toBe(RUTAS.login);
  });
});

describe("rutaActiva", () => {
  it("marca inicio solo en la raíz", () => {
    expect(rutaActiva("/", RUTAS.inicio)).toBe(true);
    expect(rutaActiva("/explorar", RUTAS.inicio)).toBe(false);
  });

  it("marca la sección cuando la ruta cuelga de ella", () => {
    expect(rutaActiva("/favoritos", RUTAS.favoritos)).toBe(true);
    expect(rutaActiva("/favoritos/colecciones", RUTAS.favoritos)).toBe(true);
  });

  it("no confunde una ruta que solo comparte el prefijo", () => {
    expect(rutaActiva("/favoritos-viejos", RUTAS.favoritos)).toBe(false);
  });
});
