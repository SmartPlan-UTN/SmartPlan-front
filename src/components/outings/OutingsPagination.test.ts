import { describe, expect, it } from "vitest";

import { pageSlots } from "./OutingsPagination";

describe("pageSlots", () => {
  it("lists every page when they fit", () => {
    expect(pageSlots(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps the ends and the current page's neighbours, gapping the rest", () => {
    expect(pageSlots(1, 10)).toEqual([1, 2, 3, 4, 5, "gap-end", 10]);
    expect(pageSlots(5, 10)).toEqual([1, "gap-start", 4, 5, 6, "gap-end", 10]);
    expect(pageSlots(10, 10)).toEqual([1, "gap-start", 6, 7, 8, 9, 10]);
  });
});
