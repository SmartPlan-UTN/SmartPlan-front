import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionProvider } from "@/lib/auth";
import { getCurrentSession, logout, refreshSession } from "@/lib/auth/api";

import { ActiveSessionCard } from "./ActiveSessionCard";

vi.mock("@/lib/auth/api", () => ({
  refreshSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  getCurrentSession: vi.fn(),
}));

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

function renderCard() {
  return render(
    <SessionProvider>
      <ActiveSessionCard />
    </SessionProvider>,
  );
}

describe("ActiveSessionCard", () => {
  beforeEach(() => {
    vi.mocked(refreshSession).mockRejectedValue(new Error("no session"));
    vi.mocked(logout).mockReset();
    vi.mocked(getCurrentSession).mockReset();
    replace.mockClear();
  });

  it("shows the current session's ip and relative time once loaded", async () => {
    const startedAt = new Date(Date.now() - 5 * 60_000).toISOString();
    vi.mocked(getCurrentSession).mockResolvedValueOnce({
      ip: "190.16.34.2",
      startedAt,
    });
    renderCard();

    expect(await screen.findByText("Sesión actual")).toBeInTheDocument();
    expect(screen.getByText(/190\.16\.34\.2/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    ).toBeInTheDocument();
  });

  it("renders nothing when the session fails to load", async () => {
    vi.mocked(getCurrentSession).mockRejectedValueOnce(new Error("network error"));
    renderCard();

    await waitFor(() => {
      expect(getCurrentSession).toHaveBeenCalledOnce();
    });
    expect(screen.queryByText("Sesión actual")).not.toBeInTheDocument();
  });

  it("closes the session and redirects to login", async () => {
    vi.mocked(getCurrentSession).mockResolvedValueOnce({
      ip: "190.16.34.2",
      startedAt: new Date().toISOString(),
    });
    vi.mocked(logout).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByRole("button", { name: "Cerrar sesión" }));

    expect(logout).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith("/login");
  });
});
