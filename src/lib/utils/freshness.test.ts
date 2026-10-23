import { describe, expect, it } from "vitest";

import { observedWhen } from "./freshness";

const now = new Date("2026-10-18T15:00:00-03:00");

describe("observedWhen", () => {
  it("says hoy only for the same calendar day", () => {
    expect(observedWhen("2026-10-18T01:00:00-03:00", now)).toBe("hoy");
  });
  it("does not call 30 hours ago today", () => {
    expect(observedWhen("2026-10-17T09:00:00-03:00", now)).toBe("ayer");
  });
  it("names the date for older evidence", () => {
    expect(observedWhen("2026-10-10T12:00:00-03:00", now)).toBe("el 10 de octubre");
  });
  it("is silent without a usable date", () => {
    expect(observedWhen(null, now)).toBeNull();
    expect(observedWhen("nope", now)).toBeNull();
  });
});
