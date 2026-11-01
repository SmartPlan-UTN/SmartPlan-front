import { describe, expect, it } from "vitest";

import {
  PASSWORD_CHANGED_PARAM,
  REDIRECT_PARAM,
  ROUTES,
  planDetailRoute,
  planDetailOrigin,
  generatedPlansRoute,
  safeDestination,
  isActiveRoute,
  loginRoute,
  passwordChangedLoginRoute,
} from "./routes";

describe("generated history return routes", () => {
  it("preserves the generated tab and its page", () => {
    expect(generatedPlansRoute()).toBe("/plans?tab=generated");
    const history = generatedPlansRoute(3);
    expect(history).toBe("/plans?tab=generated&page=3");
    expect(planDetailOrigin(history)).toBe(history);
    expect(planDetailRoute(10, history)).toBe(
      "/plans/10?from=%2Fplans%3Ftab%3Dgenerated%26page%3D3",
    );
  });
  it.each([
    "/plans?tab=generated&page=0",
    "/plans?tab=generated&page=999999999999999999999",
    "/plans?tab=generated&redirect=https://example.com",
    "/plans?tab=generated#other",
    "/plans?tab=generated\n",
  ])("rejects an invalid history return destination: %s", (value) => {
    expect(planDetailOrigin(value)).toBe(ROUTES.explore);
  });
});

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
    expect(isActiveRoute("/favorites/collections", ROUTES.favorites)).toBe(
      true,
    );
  });

  it("doesn't confuse a route that only shares the prefix", () => {
    expect(isActiveRoute("/favorites-viejos", ROUTES.favorites)).toBe(false);
  });
});

describe("plan detail origin", () => {
  it.each(["/", "/explore", "/plans", "/favorites", "/plan-requests/42"])(
    "returns to %s",
    (origin) => {
      expect(planDetailOrigin(origin)).toBe(origin);
      expect(planDetailRoute(7, origin)).toBe(
        `/plans/7?${new URLSearchParams({ from: origin })}`,
      );
    },
  );

  it.each([
    undefined,
    null,
    "",
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "/admin",
    "/plans/7",
    "/explore/../admin",
    "/explore?redirect=//example.com",
    "/plan-requests/0",
    "/plan-requests/-1",
    "/plan-requests/1.5",
    "/plan-requests/1/",
    "/plan-requests/9007199254740992",
    "/plan-requests/1\n",
    "%2Fexplore",
    ["/", "/favorites"],
  ])("falls back for invalid or duplicate origins: %j", (origin) => {
    expect(planDetailOrigin(origin)).toBe(ROUTES.explore);
  });

  it("keeps canonical links when no valid origin is supplied", () => {
    expect(planDetailRoute(7)).toBe("/plans/7");
    expect(planDetailRoute(7, "//example.com")).toBe("/plans/7");
  });
});
