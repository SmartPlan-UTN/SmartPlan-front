import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { notifyUnauthorized } from "@/lib/api";
import { SessionProvider } from "@/lib/auth";
import { refreshSession } from "@/lib/auth/api";

import { ProtectedRoute } from "./ProtectedRoute";

vi.mock("@/lib/auth/api", () => ({
  refreshSession: vi.fn(),
  login: vi.fn(),
}));

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/favorites",
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

/** What `POST /sessions` and `POST /sessions/refresh` return on success. */
const authenticatedResponse = {
  accessToken: "jwt-de-prueba",
  tokenType: "Bearer" as const,
  expiresIn: 900,
  user: {
    id: 1,
    name: "Ana",
    lastName: "Pérez",
    email: "ana@example.com",
    role: { key: "user", name: "User" },
    permissions: [],
  },
};

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
    replace.mockClear();
  });

  it("shows the content when there is a session", async () => {
    vi.mocked(refreshSession).mockResolvedValueOnce(authenticatedResponse);

    renderProtected();

    expect(await screen.findByText("Tus favoritos")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to login with the saved destination when there is no session", async () => {
    // No refresh cookie, or an expired/revoked one.
    vi.mocked(refreshSession).mockRejectedValueOnce(new Error("no session"));

    renderProtected();

    await screen.findByText(/necesitás iniciar sesión/i);
    expect(screen.queryByText("Tus favoritos")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login?redirect=%2Ffavorites");
    });
  });

  it("kicks the user to login if the session drops while the screen is mounted", async () => {
    vi.mocked(refreshSession).mockResolvedValueOnce(authenticatedResponse);
    renderProtected();
    await screen.findByText("Tus favoritos");

    // This is what happens when some other request gets a 401: SessionProvider
    // is subscribed to the same event bus the API client publishes to.
    act(() => {
      notifyUnauthorized();
    });

    expect(
      await screen.findByText(/necesitás iniciar sesión/i),
    ).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/login?redirect=%2Ffavorites");
  });
});
