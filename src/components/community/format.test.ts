import { describe, expect, it } from "vitest";

import { storyOrigins } from "./format";

const plan = (id: number) => ({
  id,
  title: `Plan ${id}`,
  creatorUsername: "ana",
});

describe("storyOrigins", () => {
  it("credits the plan an outing was lived from, with no second chip when it is also the inspiration", () => {
    expect(storyOrigins({ plan: plan(43), inspiredBy: plan(43) })).toEqual({
      livedFrom: plan(43),
      inspiredBy: null,
    });
  });

  it("keeps the original when the plan lived from is itself an adaptation of another", () => {
    expect(storyOrigins({ plan: plan(148), inspiredBy: plan(43) })).toEqual({
      livedFrom: plan(148),
      inspiredBy: plan(43),
    });
  });

  it("still credits the original when the plan lived from is no longer public", () => {
    expect(storyOrigins({ plan: null, inspiredBy: plan(43) })).toEqual({
      livedFrom: null,
      inspiredBy: plan(43),
    });
  });

  it("credits nobody for an experience with no public origin", () => {
    expect(storyOrigins({})).toEqual({ livedFrom: null, inspiredBy: null });
  });
});
