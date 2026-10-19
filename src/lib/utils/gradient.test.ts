import { describe, expect, it } from "vitest";

import { gradientFor } from "./gradient";

describe("gradientFor", () => {
  it("gives the same item the same tile, through a theme-aware token", () => {
    expect(gradientFor(4)).toBe("var(--tile-4)");
    expect(gradientFor(4)).toBe(gradientFor(4));
  });

  it("cycles through the six tiles", () => {
    expect(gradientFor(0)).toBe("var(--tile-0)");
    expect(gradientFor(6)).toBe("var(--tile-0)");
    expect(gradientFor(11)).toBe("var(--tile-5)");
  });
});
