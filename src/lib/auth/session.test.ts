import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_TOKEN_STORAGE_KEY } from "@/lib/api";

import { clearToken, saveToken, readToken, subscribeToSession } from "./session";

describe("session", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("saves, reads, and clears the token", () => {
    expect(readToken()).toBeNull();

    saveToken("jwt-de-prueba");
    expect(localStorage.getItem(DEFAULT_TOKEN_STORAGE_KEY)).toBe("jwt-de-prueba");
    expect(readToken()).toBe("jwt-de-prueba");

    clearToken();
    expect(readToken()).toBeNull();
  });

  it("notifies changes in the current tab until unsubscribed", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToSession(onChange);

    saveToken("jwt-de-prueba");
    clearToken();
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    saveToken("otro-jwt");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("notifies when another tab closes the session", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToSession(onChange);

    // This is what the browser fires in the other tabs: the token changes and,
    // with localStorage.clear(), the key comes through as null.
    window.dispatchEvent(
      new StorageEvent("storage", { key: DEFAULT_TOKEN_STORAGE_KEY }),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    expect(onChange).toHaveBeenCalledTimes(2);

    // A change to another key is none of the session's business.
    window.dispatchEvent(new StorageEvent("storage", { key: "otra-cosa" }));
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
  });
});
