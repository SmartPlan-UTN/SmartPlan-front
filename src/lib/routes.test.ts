import { describe, expect, it } from "vitest";

import { REDIRECT_PARAM, ROUTES, safeDestination, isActiveRoute, loginRoute } from "./routes";

describe("safeDestination", () => {
  it("acepta rutas internas", () => {
    expect(safeDestination("/favorites")).toBe("/favorites");
  });

  it("rechaza destinations externos y valores vacíos", () => {
    expect(safeDestination("https://otro-sitio.com")).toBeNull();
    expect(safeDestination("//otro-sitio.com")).toBeNull();
    expect(safeDestination("")).toBeNull();
    expect(safeDestination(null)).toBeNull();
  });
});

describe("loginRoute", () => {
  it("conserva el destination en el parámetro redirect", () => {
    expect(loginRoute("/history")).toBe(
      `${ROUTES.login}?${REDIRECT_PARAM}=%2Fhistory`,
    );
  });

  it("devuelve el login pelado cuando el destination no aporta nada", () => {
    expect(loginRoute("https://otro-sitio.com")).toBe(ROUTES.login);
    expect(loginRoute(ROUTES.login)).toBe(ROUTES.login);
    expect(loginRoute(ROUTES.home)).toBe(ROUTES.login);
    expect(loginRoute()).toBe(ROUTES.login);
  });
});

describe("isActiveRoute", () => {
  it("marca home solo en la raíz", () => {
    expect(isActiveRoute("/", ROUTES.home)).toBe(true);
    expect(isActiveRoute("/explore", ROUTES.home)).toBe(false);
  });

  it("marca la sección cuando la route cuelga de ella", () => {
    expect(isActiveRoute("/favorites", ROUTES.favorites)).toBe(true);
    expect(isActiveRoute("/favorites/collections", ROUTES.favorites)).toBe(true);
  });

  it("no confunde una route que solo comparte el prefix", () => {
    expect(isActiveRoute("/favorites-viejos", ROUTES.favorites)).toBe(false);
  });
});
