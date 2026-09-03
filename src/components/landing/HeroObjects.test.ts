import { describe, expect, it } from "vitest";

import { HERO_OBJECTS } from "./HeroObjects";

/** The only image files the hero scene is allowed to reach for. */
const ALLOWED = new Set([
  "map",
  "polaroid",
  "ticket",
  "camera",
  "wine",
  "coffee",
  "headphones",
  "compass",
  "notebook",
  "gorrito",
  "popcorn",
  "copa",
  "lentes",
  "pencil",
]);

const PLANES = ["fore", "mid", "back"] as const;

describe("hero object choreography", () => {
  it("keeps IDs unique and every asset expected", () => {
    expect(new Set(HERO_OBJECTS.map((o) => o.id)).size).toBe(HERO_OBJECTS.length);

    for (const object of HERO_OBJECTS) {
      expect(object.src.startsWith("/landing/hero/")).toBe(true);
      const name = object.src.replace("/landing/hero/", "").replace(/\.\w+$/, "");
      expect(ALLOWED.has(name)).toBe(true);
    }
  });

  it("keeps intrinsic sizes, timings and exit vectors valid", () => {
    for (const object of HERO_OBJECTS) {
      expect(object.width).toBeGreaterThan(0);
      expect(object.height).toBeGreaterThan(0);
      expect(object.sizes).toMatch(/vw|px/);
      expect(PLANES).toContain(object.plane);

      expect(object.enterDelay).toBeGreaterThanOrEqual(0);
      expect(object.enterDur).toBeGreaterThan(0);
      expect(object.enterDelay + object.enterDur).toBeLessThanOrEqual(0.85);

      expect(object.exit.start).toBeGreaterThanOrEqual(0);
      expect(object.exit.start).toBeLessThan(1);
      expect(object.exit.rate).toBeGreaterThan(1);

      if (object.opacity !== undefined) {
        expect(object.opacity).toBeGreaterThan(0);
        expect(object.opacity).toBeLessThanOrEqual(1);
      }
    }
  });

  it("builds a real depth composition, not one flat plane", () => {
    for (const plane of PLANES) {
      expect(HERO_OBJECTS.some((o) => o.plane === plane)).toBe(true);
    }
    // Background pieces sit back — never at full presence.
    for (const object of HERO_OBJECTS.filter((o) => o.plane === "back")) {
      expect(object.opacity ?? 1).toBeLessThanOrEqual(0.5);
    }
    // Foreground leaves first and fastest.
    for (const object of HERO_OBJECTS.filter((o) => o.plane === "fore")) {
      expect(object.exit.rate).toBeGreaterThanOrEqual(1.8);
    }
  });

  it("loads exactly one object with priority (LCP budget)", () => {
    expect(HERO_OBJECTS.filter((o) => o.priority).map((o) => o.id)).toEqual([
      "polaroid",
    ]);
  });
});
