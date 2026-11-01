import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionProvider } from "@/lib/auth";
import { refreshSession } from "@/lib/auth/api";

import PrivateFullBleedLayout from "./layout";

vi.mock("@/lib/auth/api", () => ({
  refreshSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

const route = vi.hoisted(() => ({ actual: "/plans/2" }));
const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => route.actual,
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

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

function renderLayout() {
  return render(
    <SessionProvider>
      <PrivateFullBleedLayout>
        <p>Contenido privado</p>
      </PrivateFullBleedLayout>
    </SessionProvider>,
  );
}

describe("PrivateFullBleedLayout", () => {
  beforeEach(() => {
    route.actual = "/plans/2";
    replace.mockClear();
  });

  it.each(["/plans/2", "/plan-requests/4"])(
    "redirects anonymous access to login from %s",
    async (pathname) => {
      route.actual = pathname;
      vi.mocked(refreshSession).mockRejectedValueOnce(new Error("no session"));

      renderLayout();

      expect(screen.queryByText("Contenido privado")).not.toBeInTheDocument();
      await waitFor(() => {
        expect(replace).toHaveBeenCalledWith(
          `/login?redirect=${encodeURIComponent(pathname)}`,
        );
      });
    },
  );

  it("renders the protected content for an authenticated user", async () => {
    vi.mocked(refreshSession).mockResolvedValueOnce(authenticatedResponse);

    renderLayout();

    expect(await screen.findByText("Contenido privado")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
