import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useScrollLock } from "./useScrollLock";

describe("useScrollLock", () => {
  afterEach(() => {
    document.documentElement.style.overflow = "";
  });

  it("locks page scrolling while mounted and restores it on unmount", () => {
    const { unmount } = renderHook(() => useScrollLock());
    expect(document.documentElement.style.overflow).toBe("hidden");

    unmount();
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("keeps the page locked until the outermost lock is released", () => {
    const outer = renderHook(() => useScrollLock());
    const inner = renderHook(() => useScrollLock());

    inner.unmount();
    expect(document.documentElement.style.overflow).toBe("hidden");

    outer.unmount();
    expect(document.documentElement.style.overflow).toBe("");
  });
});
