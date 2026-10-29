import { describe, expect, it } from "vitest";
import { explorationQuery, priceRangeError, readExplorationState } from "./searchState";

describe("exploration URL state", () => {
  it("round trips search text, zero prices, location, categories, sort and page", () => {
    const state = readExplorationState({ search: "vino & cena", categoryIds: "1,2,1", minPrice: "0", maxPrice: "100", minRating: "4.5", cityId: "2", departmentId: "3", sortBy: "rating", direction: "desc", page: "4" });
    expect(readExplorationState(Object.fromEntries(new URLSearchParams(explorationQuery(state))))).toEqual(state);
  });
  it("ignores malformed and unsupported URL fields", () => {
    expect(readExplorationState({ categoryIds: "-1,NaN,2,2,1.5", minPrice: "Infinity", maxPrice: "-5", cityId: "bad", departmentId: "3", sortBy: "distance", direction: "bad", page: "0", minRating: "9" })).toMatchObject({ categoryIds: [2], minPrice: "", maxPrice: "", cityId: null, departmentId: null, sortBy: "relevance", direction: "asc", page: 1, minRating: "" });
  });
});

describe("occasion filters in the URL (#210)", () => {
  it("round trips occasions, at home and free so a shared link keeps them", () => {
    const state = readExplorationState({ occasions: "romantic,quiet", atHome: "true", free: "true" });
    expect(state).toMatchObject({ occasions: ["romantic", "quiet"], atHome: true, free: true });
    expect(readExplorationState(Object.fromEntries(new URLSearchParams(explorationQuery(state))))).toEqual(state);
  });
  it("drops unknown occasions and leaves the flags off by default", () => {
    expect(readExplorationState({ occasions: "cheap,romantic" })).toMatchObject({ occasions: ["romantic"], atHome: false, free: false });
    expect(explorationQuery(readExplorationState({}))).not.toMatch(/occasions|atHome|free/);
  });
});

describe("price ranges", () => {
  it.each([["", ""], ["0", ""], ["", "100"], ["20", "20"], ["10", "20"]])("accepts valid or open ranges %s–%s", (min, max) => {
    expect(priceRangeError(min, max)).toBeNull();
  });
  it.each([["20", "10"], ["-1", "10"], ["0", "Infinity"]])("rejects invalid ranges %s–%s", (min, max) => {
    expect(priceRangeError(min, max)).not.toBeNull();
  });
});
