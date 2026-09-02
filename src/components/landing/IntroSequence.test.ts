import { describe, expect, it } from "vitest";

import { getIntroPhases } from "./IntroSequence";

/**
 * These are the hero's own curve, and the section below no longer hangs
 * off it — so they exist to catch an accidental change to the hero's
 * feel, not to describe a hand-off.
 */
describe("intro sequence phases", () => {
  it("maps the shared clock to the documented boundaries", () => {
    expect(getIntroPhases(0.02).objects).toBe(0);
    expect(getIntroPhases(0.52).objects).toBe(1);
    expect(getIntroPhases(0.05).hero).toBe(0);
    expect(getIntroPhases(0.3).hero).toBe(1);
  });

  it("clears the headline while the objects are still leaving", () => {
    const mid = getIntroPhases(0.4);
    expect(mid.hero).toBe(1);
    expect(mid.objects).toBeGreaterThan(0);
    expect(mid.objects).toBeLessThan(1);
  });

  it("clamps outside its range", () => {
    expect(getIntroPhases(-2).raw).toBe(0);
    expect(getIntroPhases(9).raw).toBe(1);
    expect(getIntroPhases(9).hero).toBe(1);
  });
});
