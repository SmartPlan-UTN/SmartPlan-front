import { beforeEach, describe, expect, it } from "vitest";

import {
  carryRequestContext,
  loadRequestContext,
  saveRequestContext,
} from "./requestContext";

beforeEach(() => window.sessionStorage.clear());

describe("request context", () => {
  it("keeps only what the person chose, per request", () => {
    saveRequestContext(5, { query: "cena", context: { partySize: 4, timeOfDay: "night" } });
    expect(loadRequestContext(5)?.context).toEqual({ partySize: 4, timeOfDay: "night" });
    expect(loadRequestContext(6)).toBeNull();
  });

  it("is inherited by a refinement without touching the original", () => {
    saveRequestContext(5, { query: "cena", context: { budget: 50000 } });
    carryRequestContext(5, 9);
    expect(loadRequestContext(9)?.context).toEqual({ budget: 50000 });
    expect(loadRequestContext(5)?.context).toEqual({ budget: 50000 });
  });

  it("ignores corrupt storage", () => {
    window.sessionStorage.setItem("smartplan:request-context:7", "{nope");
    expect(loadRequestContext(7)).toBeNull();
  });
});
