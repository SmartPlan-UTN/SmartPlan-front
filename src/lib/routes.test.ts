import { describe, expect, it } from "vitest";

import {
  PASSWORD_CHANGED_PARAM,
  REDIRECT_PARAM,
  ROUTES,
  safeDestination,
  isActiveRoute,
  loginRoute,
  passwordChangedLoginRoute,
} from "./routes";

describe("safeDestination", () => {
  it("accepts internal routes", () => {
    expect(safeDestination("/favorites")).toBe("/favorites");
  });

  it("rejects external destinations and empty values", () => {
    expect(safeDestination("https://otro-sitio.com")).toBeNull();
    expect(safeDestination("//otro-sitio.com")).toBeNull();
    expect(safeDestination("")).toBeNull();
    expect(safeDestination(null)).toBeNull();
  });
});

describe("loginRoute", () => {
  it("preserves the destination in the redirect parameter", () => {
    expect(loginRoute("/history")).toBe(
      `${ROUTES.login}?${REDIRECT_PARAM}=%2Fhistory`,
    );
  });

  it("returns bare login when the destination doesn't add anything", () => {
    expect(loginRoute("https://otro-sitio.com")).toBe(ROUTES.login);
    expect(loginRoute(ROUTES.login)).toBe(ROUTES.login);
    expect(loginRoute(ROUTES.home)).toBe(ROUTES.login);
    expect(loginRoute()).toBe(ROUTES.login);
  });
});

describe("passwordChangedLoginRoute", () => {
  it("points to login flagged with the password-changed param", () => {
    expect(passwordChangedLoginRoute()).toBe(
      `${ROUTES.login}?${PASSWORD_CHANGED_PARAM}=1`,
    );
  });
});

describe("isActiveRoute", () => {
  it("marks home only at the root", () => {
    expect(isActiveRoute("/", ROUTES.home)).toBe(true);
    expect(isActiveRoute("/explore", ROUTES.home)).toBe(false);
  });

  it("marks the section when the route is nested under it", () => {
    expect(isActiveRoute("/favorites", ROUTES.favorites)).toBe(true);
    expect(isActiveRoute("/favorites/collections", ROUTES.favorites)).toBe(true);
  });

  it("doesn't confuse a route that only shares the prefix", () => {
    expect(isActiveRoute("/favorites-viejos", ROUTES.favorites)).toBe(false);
  });
});
