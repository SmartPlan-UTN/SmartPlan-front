import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { THEME_BOOT_SCRIPT } from "./bootScript";
import { ThemeProvider, useTheme } from "./ThemeProvider";

type Status = "loading" | "authenticated" | "anonymous";

const session = vi.hoisted(() => ({
  current: { status: "anonymous", user: null } as {
    status: Status;
    user: { id: number } | null;
  },
}));

vi.mock("@/lib/auth", () => ({
  useSession: () => ({
    status: session.current.status,
    user: session.current.user,
    authenticated: session.current.status === "authenticated",
  }),
}));

function signIn(id = 1) {
  session.current = { status: "authenticated", user: { id } };
}

function signOut() {
  session.current = { status: "anonymous", user: null };
}

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function renderTheme() {
  return renderHook(() => useTheme(), { wrapper });
}

const root = document.documentElement;

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    delete root.dataset.theme;
    signOut();
  });

  it("stays light without a session, even with a dark choice stored", () => {
    localStorage.setItem("smartplan:theme:1", "dark");

    const { result } = renderTheme();

    expect(result.current.theme).toBe("light");
    expect(result.current.canToggle).toBe(false);
    expect(root.dataset.theme).toBe("light");
  });

  it("applies the account's stored choice once logged in", () => {
    localStorage.setItem("smartplan:theme:1", "dark");
    signIn(1);

    const { result } = renderTheme();

    expect(result.current.theme).toBe("dark");
    expect(result.current.canToggle).toBe(true);
    expect(root.dataset.theme).toBe("dark");
    // What the boot script reads on the next reload.
    expect(localStorage.getItem("smartplan:theme")).toBe("dark");
  });

  it("toggles and remembers the choice per account", () => {
    signIn(1);
    const { result, rerender } = renderTheme();

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("dark");
    expect(root.dataset.theme).toBe("dark");
    expect(localStorage.getItem("smartplan:theme:1")).toBe("dark");

    // Another account in the same browser keeps its own (light) theme.
    signIn(2);
    rerender();
    expect(result.current.theme).toBe("light");
    expect(root.dataset.theme).toBe("light");

    signIn(1);
    rerender();
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("light");
    expect(localStorage.getItem("smartplan:theme:1")).toBe("light");
  });

  it("returns to light on logout and brings the choice back on the next login", () => {
    signIn(1);
    const { result, rerender } = renderTheme();
    act(() => {
      result.current.toggleTheme();
    });

    signOut();
    rerender();
    expect(result.current.theme).toBe("light");
    expect(result.current.canToggle).toBe(false);
    expect(root.dataset.theme).toBe("light");
    expect(localStorage.getItem("smartplan:theme")).toBe("light");
    expect(localStorage.getItem("smartplan:theme:1")).toBe("dark");

    signIn(1);
    rerender();
    expect(result.current.theme).toBe("dark");
    expect(root.dataset.theme).toBe("dark");
  });

  it("keeps the boot script's theme while the session is still loading", () => {
    localStorage.setItem("smartplan:theme", "dark");
    root.dataset.theme = "dark";
    session.current = { status: "loading", user: null };

    const { result } = renderTheme();

    expect(result.current.theme).toBe("dark");
    expect(root.dataset.theme).toBe("dark");
  });

  it("follows a change made in another tab", () => {
    signIn(1);
    const { result } = renderTheme();

    act(() => {
      localStorage.setItem("smartplan:theme:1", "dark");
      window.dispatchEvent(new StorageEvent("storage", { key: "smartplan:theme:1" }));
    });

    expect(result.current.theme).toBe("dark");
    expect(root.dataset.theme).toBe("dark");
  });

  it("is light, with nothing to toggle, outside a provider", () => {
    signIn(1);
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
    expect(result.current.canToggle).toBe(false);

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("light");
  });
});

describe("THEME_BOOT_SCRIPT", () => {
  beforeEach(() => {
    localStorage.clear();
    delete root.dataset.theme;
  });

  // The script is a string that runs inline in <head>; running it the same
  // way here checks the code that actually ships, not a copy of it.
  function runBootScript() {
    new Function(THEME_BOOT_SCRIPT)();
  }

  it("marks the page dark before React when the last theme was dark", () => {
    localStorage.setItem("smartplan:theme", "dark");

    runBootScript();

    expect(root.dataset.theme).toBe("dark");
  });

  it("leaves the page alone otherwise", () => {
    localStorage.setItem("smartplan:theme", "light");

    runBootScript();

    expect(root.dataset.theme).toBeUndefined();
  });
});
