import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listNotifications, markNotificationAsRead } from "@/lib/api";
import type { AppNotification } from "@/types";

import { NotificationBell } from "./NotificationBell";

const session = vi.hoisted(() => ({ authenticated: true }));
const push = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  useSession: () => ({
    authenticated: session.authenticated,
    status: session.authenticated ? "authenticated" : "anonymous",
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  listNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
}));

const REMINDER: AppNotification = {
  id: 9,
  title: "¿Cómo te fue?",
  message: 'Contanos cómo estuvo "Día de viñedos".',
  resourceType: "outing",
  resourceId: 40,
  readAt: null,
  createdAt: new Date().toISOString(),
};

function listing(data: AppNotification[], unreadCount: number) {
  return {
    data,
    pagination: { page: 1, limit: 10, total: data.length, totalPages: 1 },
    unreadCount,
  };
}

describe("NotificationBell (#130, CU23)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.authenticated = true;
    vi.mocked(markNotificationAsRead).mockResolvedValue({
      ...REMINDER,
      readAt: new Date().toISOString(),
    });
  });

  it("shows the unread count in its accessible name", async () => {
    vi.mocked(listNotifications).mockResolvedValue(listing([REMINDER], 1));
    render(<NotificationBell />);

    expect(
      await screen.findByRole("button", {
        name: "Notificaciones, 1 sin leer",
      }),
    ).toBeInTheDocument();
  });

  it("opens the 24 h reminder straight into its outing and marks it read", async () => {
    vi.mocked(listNotifications).mockResolvedValue(listing([REMINDER], 1));
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(
      await screen.findByRole("button", { name: /1 sin leer/i }),
    );
    await user.click(screen.getByRole("button", { name: /cómo te fue/i }));

    expect(markNotificationAsRead).toHaveBeenCalledWith(9);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/outings/40"));
    expect(
      screen.getByRole("button", { name: "Notificaciones" }),
    ).toBeInTheDocument();
  });

  it("says so when there is nothing to show", async () => {
    vi.mocked(listNotifications).mockResolvedValue(listing([], 0));
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(await screen.findByRole("button", { name: "Notificaciones" }));

    expect(
      screen.getByText("No tenés notificaciones por ahora."),
    ).toBeInTheDocument();
  });

  it("renders nothing and never polls without a session", () => {
    session.authenticated = false;
    const { container } = render(<NotificationBell />);

    expect(container).toBeEmptyDOMElement();
    expect(listNotifications).not.toHaveBeenCalled();
  });
});
