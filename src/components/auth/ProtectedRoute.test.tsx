import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_TOKEN_STORAGE_KEY } from "@/lib/api";
import { SessionProvider, clearToken } from "@/lib/auth";

import { ProtectedRoute } from "./ProtectedRoute";

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/favorites",
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

function renderProtected() {
  return render(
    <SessionProvider>
      <ProtectedRoute>
        <p>Tus favoritos</p>
      </ProtectedRoute>
    </SessionProvider>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
    replace.mockClear();
  });

  it("shows the content when there is a session", () => {
    localStorage.setItem(DEFAULT_TOKEN_STORAGE_KEY, "jwt-de-prueba");

    renderProtected();

    expect(screen.getByText("Tus favoritos")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to login with the saved destination when there is no session", () => {
    renderProtected();

    expect(screen.queryByText("Tus favoritos")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/login?redirect=%2Ffavorites");
  });

  it("kicks the user to login if the session drops while the screen is mounted", () => {
    localStorage.setItem(DEFAULT_TOKEN_STORAGE_KEY, "jwt-de-prueba");
    renderProtected();

    // This is what happens when the API responds with 401, or when the
    // session is closed in another tab: the token disappears while the
    // screen is already mounted.
    act(() => {
      clearToken();
    });

    expect(screen.queryByText("Tus favoritos")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/login?redirect=%2Ffavorites");
  });
});
