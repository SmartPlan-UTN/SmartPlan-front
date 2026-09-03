import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAdminRatingCounts, listAdminRatings, moderateAdminRating } from "@/lib/api";
import type { AdminRating, AdminRatingsResult } from "@/types";

import { AdminRatingsView } from "./AdminRatingsView";

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  getAdminRatingCounts: vi.fn(),
  listAdminRatings: vi.fn(),
  moderateAdminRating: vi.fn(),
}));

function rating(overrides: Partial<AdminRating> = {}): AdminRating {
  return {
    id: 31,
    score: 4,
    comment: "La visita guiada estuvo impecable.",
    authorAlias: "Martina G.",
    createdAt: "2026-09-02T10:00:00.000Z",
    updatedAt: "2026-09-02T10:00:00.000Z",
    activityId: 12,
    planId: 7,
    moderationStatus: "pending",
    moderationReason: null,
    author: { id: 8, name: "Martina", lastName: "García" },
    activity: { id: 12, name: "Bodega Catena Zapata" },
    plan: { id: 7, title: "Sábado en Luján" },
    ...overrides,
  };
}

function result(data: AdminRating[] = [rating()]): AdminRatingsResult {
  return { data, pagination: { page: 1, limit: 20, total: 7, totalPages: 1 } };
}

describe("AdminRatingsView", () => {
  beforeEach(() => {
    // `restoreMocks` restores spies, but the module mock's `vi.fn()`s keep
    // their call history between tests, and one case asserts a call never
    // happened.
    vi.clearAllMocks();
    vi.mocked(listAdminRatings).mockResolvedValue(result());
    vi.mocked(moderateAdminRating).mockResolvedValue(rating({ moderationStatus: "approved" }));
    vi.mocked(getAdminRatingCounts).mockResolvedValue({
      pending: 7,
      approved: 40,
      rejected: 3,
    });
  });

  it("opens on the pending tray and shows what a moderator needs to decide", async () => {
    render(<AdminRatingsView />);

    expect(await screen.findByText("Martina García")).toBeInTheDocument();
    expect(screen.getByText("Bodega Catena Zapata")).toBeInTheDocument();
    expect(screen.getByText("Sábado en Luján")).toBeInTheDocument();
    expect(screen.getByText("La visita guiada estuvo impecable.")).toBeInTheDocument();
    expect(screen.getByLabelText("4 de 5 estrellas")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 1–1 de 7 valoraciones")).toBeInTheDocument();
    expect(listAdminRatings).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending", page: 1 }),
    );
  });

  it("shows how many ratings sit in each state", async () => {
    render(<AdminRatingsView />);

    const pendingTab = await screen.findByRole("tab", { name: /Pendientes/ });
    expect(pendingTab).toHaveTextContent("7");
    expect(screen.getByRole("tab", { name: /Rechazadas/ })).toHaveTextContent("3");
  });

  it("filters by moderation state from the tabs", async () => {
    const user = userEvent.setup();
    render(<AdminRatingsView />);
    await screen.findByText("Martina García");

    await user.click(screen.getByRole("tab", { name: /Rechazadas/ }));

    await waitFor(() =>
      expect(listAdminRatings).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "rejected", page: 1 }),
      ),
    );
  });

  it("approves a pending rating without asking for anything else", async () => {
    const user = userEvent.setup();
    render(<AdminRatingsView />);
    await screen.findByText("Martina García");

    await user.click(
      screen.getByRole("button", { name: "Aprobar la valoración de Martina García" }),
    );

    await waitFor(() =>
      expect(moderateAdminRating).toHaveBeenCalledWith(31, { status: "approved" }),
    );
  });

  it("requires a reason before rejecting", async () => {
    const user = userEvent.setup();
    render(<AdminRatingsView />);
    await screen.findByText("Martina García");

    await user.click(
      screen.getByRole("button", { name: "Rechazar la valoración de Martina García" }),
    );
    await user.click(screen.getByRole("button", { name: "Rechazar" }));

    expect(await screen.findByText("Ingresá el motivo del rechazo.")).toBeInTheDocument();
    expect(moderateAdminRating).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/Motivo del rechazo/), "Lenguaje ofensivo.");
    await user.click(screen.getByRole("button", { name: "Rechazar" }));

    await waitFor(() =>
      expect(moderateAdminRating).toHaveBeenCalledWith(31, {
        status: "rejected",
        reason: "Lenguaje ofensivo.",
      }),
    );
  });

  it("only offers the action that would change the rating's state", async () => {
    vi.mocked(listAdminRatings).mockResolvedValue(
      result([rating({ moderationStatus: "approved" })]),
    );
    render(<AdminRatingsView />);
    await screen.findByText("Martina García");

    expect(
      screen.queryByRole("button", { name: "Aprobar la valoración de Martina García" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Rechazar la valoración de Martina García" }),
    ).toBeInTheDocument();
  });

  it("reports a failed load and retries", async () => {
    const user = userEvent.setup();
    vi.mocked(listAdminRatings).mockRejectedValueOnce(new Error("network"));
    render(<AdminRatingsView />);

    expect(await screen.findByText("No pudimos cargar las valoraciones")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Martina García")).toBeInTheDocument();
  });

  it("says the tray is empty instead of showing nothing", async () => {
    vi.mocked(listAdminRatings).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    render(<AdminRatingsView />);

    expect(await screen.findByText("Todo al día")).toBeInTheDocument();
    expect(screen.getByText("No hay valoraciones esperando revisión.")).toBeInTheDocument();
  });
});
