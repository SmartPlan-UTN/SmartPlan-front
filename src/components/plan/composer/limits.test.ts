import { describe, expect, it } from "vitest";

import {
  DESCRIPTION_MAX,
  PEOPLE_MAX,
  PEOPLE_MIN,
  TITLE_MAX,
  validateDescription,
  validatePeople,
  validatePriceRange,
  validateTitle,
} from "./limits";

describe("composer limits", () => {
  it("states the domain numbers once", () => {
    expect([TITLE_MAX, DESCRIPTION_MAX, PEOPLE_MIN, PEOPLE_MAX]).toEqual([
      150, 2000, 1, 1000,
    ]);
  });

  it("validates people at every boundary", () => {
    expect(validatePeople(0)).not.toBeNull();
    expect(validatePeople(1)).toBeNull();
    expect(validatePeople(1000)).toBeNull();
    expect(validatePeople(1001)).not.toBeNull();
    expect(validatePeople(-3)).not.toBeNull();
  });

  it("rejects people that are not whole numbers", () => {
    expect(validatePeople(Number.NaN)).not.toBeNull();
    expect(validatePeople(2.5)).not.toBeNull();
    expect(validatePeople(Number.POSITIVE_INFINITY)).not.toBeNull();
  });

  it("validates the title at 150 and 151 characters, trimmed", () => {
    expect(validateTitle("a".repeat(150))).toBeNull();
    expect(validateTitle("a".repeat(151))).toMatch(/150/);
    // The backend trims: padding does not count against the limit.
    expect(validateTitle(`  ${"a".repeat(150)}  `)).toBeNull();
  });

  it("requires a title that is not only whitespace", () => {
    expect(validateTitle("")).not.toBeNull();
    expect(validateTitle("   \t ")).not.toBeNull();
  });

  it("validates the description at 2000 and 2001 characters, and allows none", () => {
    expect(validateDescription("")).toBeNull();
    expect(validateDescription("a".repeat(2000))).toBeNull();
    expect(validateDescription("a".repeat(2001))).toMatch(/2\.000/);
  });

  it("only rejects a price range when min is above max", () => {
    expect(validatePriceRange(undefined, undefined)).toBeNull();
    expect(validatePriceRange(100, undefined)).toBeNull();
    expect(validatePriceRange(100, 100)).toBeNull();
    expect(validatePriceRange(100, 50)).not.toBeNull();
  });
});
