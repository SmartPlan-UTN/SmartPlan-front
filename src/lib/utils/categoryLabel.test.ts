import { describe, expect, it } from "vitest";

import { categoryLabel } from "./categoryLabel";

describe("categoryLabel", () => {
  it("translates the seeded English category names", () => {
    expect(categoryLabel("Gastronomy")).toBe("Gastronomía");
    expect(categoryLabel("Live music")).toBe("Música en vivo");
    expect(categoryLabel("Short trips")).toBe("Escapadas");
  });

  it("matches activity types regardless of case and separators", () => {
    expect(categoryLabel("culture")).toBe("Cultura");
    expect(categoryLabel(" short_trips ")).toBe("Escapadas");
  });

  it("returns unknown or already localized names unchanged", () => {
    expect(categoryLabel("Gastronomía")).toBe("Gastronomía");
    expect(categoryLabel("Enología")).toBe("Enología");
  });
});
