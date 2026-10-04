import { describe, expect, it } from "vitest";

import { DAY_MINUTES, getDurationHealth, LONG_PLAN_MINUTES } from "./planDuration";

describe("getDurationHealth", () => {
  it("is normal up to the long threshold, inclusive", () => {
    for (const minutes of [0, 20, 240, LONG_PLAN_MINUTES]) {
      expect(getDurationHealth(minutes)).toMatchObject({
        level: "normal",
        exceedsDay: false,
        title: null,
        message: null,
      });
    }
  });

  it("is long between the threshold and a full day, 24 h included", () => {
    const health = getDurationHealth(9 * 60 + 30);
    expect(health).toMatchObject({ level: "long", exceedsDay: false });
    expect(health.message).toContain("9h 30m");
    expect(getDurationHealth(LONG_PLAN_MINUTES + 1).level).toBe("long");
    expect(getDurationHealth(DAY_MINUTES)).toMatchObject({
      level: "long",
      exceedsDay: false,
    });
  });

  it("flags a route longer than a day one minute past 24 h, without forbidding it", () => {
    const health = getDurationHealth(DAY_MINUTES + 1);
    expect(health).toMatchObject({ level: "beyondDay", exceedsDay: true });
    // Guidance only: it must read as advice for a one-day outing, not as a
    // rule, because trips of several days are legitimate.
    expect(health.message).toMatch(/viaje de varios días/);
    expect(health).not.toHaveProperty("blocking");
  });

  it("states the total for the 27 h 30 m route", () => {
    const health = getDurationHealth(27 * 60 + 30);
    expect(health.message).toContain("27h 30m");
  });

  it("depends on total duration, not on the number of stops", () => {
    expect(getDurationHealth(8 * 20)).toEqual(getDurationHealth(160));
    expect(getDurationHealth(3 * 360).level).toBe("long");
    expect(getDurationHealth(5 * 360).level).toBe("beyondDay");
  });
});
