import { renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useCommunityReturnPath } from "./useCommunityReturnPath";

afterEach(() => sessionStorage.clear());

it.each(["recent", "popular", "highest_rated", "most_reviewed"])("keeps %s ordering when returning to discovery", (sort) => {
  sessionStorage.setItem("smartplan:community-position", JSON.stringify({ q: "Mendoza", type: "plans", sort, page: 3, scroll: 1200 }));
  const { result } = renderHook(useCommunityReturnPath);
  expect(result.current).toBe(`/community?q=Mendoza&type=plans&sort=${sort}`);
});

it("ignores an unsupported stored ordering", () => {
  sessionStorage.setItem("smartplan:community-position", JSON.stringify({ type: "plans", sort: "unknown" }));
  const { result } = renderHook(useCommunityReturnPath);
  expect(result.current).toBe("/community?type=plans");
});
