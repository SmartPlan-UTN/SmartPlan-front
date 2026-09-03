import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteRating, getOwnPlan, getOwnRating, listOwnPlans, updateRating } from "@/lib/api";
import { SessionProvider } from "@/lib/auth";
import { refreshSession } from "@/lib/auth/api";
import type { OwnPlanDetail, OwnPlanSummary, OwnRating } from "@/types";

import { ActivityRatingSection } from "./ActivityRatingSection";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getOwnRating: vi.fn(),
    listOwnPlans: vi.fn(),
    getOwnPlan: vi.fn(),
    createRating: vi.fn(),
    updateRating: vi.fn(),
    deleteRating: vi.fn(),
  };
});

vi.mock("@/lib/auth/api", () => ({
  refreshSession: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/explore/42",
}));

function planSummary(overrides: Partial<OwnPlanSummary> = {}): OwnPlanSummary {
  return {
    id: 10,
    title: "Fin de semana en Mendoza",
    description: null,
    peopleCount: 2,
    estimatedTotalCost: 20000,
    estimatedCostPerPerson: 10000,
    estimatedTotalDuration: 240,
    activityCount: 1,
    status: { key: "completed", name: "Completado" },
    completedAt: "2026-08-20T12:00:00.000Z",
    feedbackState: "available",
    feedback: null,
    createdAt: "2026-08-20T12:00:00.000Z",
    updatedAt: "2026-08-20T12:00:00.000Z",
    ...overrides,
  };
}

function planDetail(activityId: number): OwnPlanDetail {
  return {
    ...planSummary(),
    details: [
      {
        id: 1,
        order: 1,
        estimatedCost: 5000,
        estimatedDuration: 120,
        activity: {
          id: activityId,
          name: "Degustación de vinos",
          description: "Una experiencia guiada",
          estimatedCost: 5000,
          estimatedDuration: 120,
          type: "Gastronomía",
        },
      },
    ],
  };
}

function ownRating(overrides: Partial<OwnRating> = {}): OwnRating {
  return {
    id: 1,
    score: 5,
    comment: "Excelente",
    authorAlias: "Ana P.",
    createdAt: "2026-08-25T12:00:00.000Z",
    updatedAt: "2026-08-25T12:00:00.000Z",
    activityId: 42,
    planId: 10,
    moderationStatus: "approved",
    moderationReason: null,
    ...overrides,
  };
}

function renderSection(onChange?: () => void) {
  return render(
    <SessionProvider>
      <ActivityRatingSection activityId={42} onChange={onChange} />
    </SessionProvider>,
  );
}

function mockAuthenticatedSession() {
  vi.mocked(refreshSession).mockResolvedValue({
    accessToken: "t",
    tokenType: "Bearer",
    expiresIn: 900,
    user: {
      id: 1,
      name: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      role: { key: "user", name: "User" },
      permissions: [],
    },
  });
}

describe("ActivityRatingSection", () => {
  beforeEach(() => {
    vi.mocked(getOwnRating).mockReset();
    vi.mocked(listOwnPlans).mockReset();
    vi.mocked(getOwnPlan).mockReset();
    vi.mocked(refreshSession).mockReset();
    vi.mocked(updateRating).mockReset();
    vi.mocked(deleteRating).mockReset();
  });

  it("prompts anonymous visitors to log in instead of showing the form", async () => {
    vi.mocked(refreshSession).mockRejectedValue(new Error("no session"));
    renderSection();

    expect(
      await screen.findByRole("link", { name: "Iniciá sesión" }),
    ).toHaveAttribute("href", "/login?redirect=%2Fexplore%2F42");
    expect(getOwnRating).not.toHaveBeenCalled();
  });

  it("shows the user's own rating instead of the form once they've already rated", async () => {
    vi.mocked(refreshSession).mockResolvedValue({
      accessToken: "t",
      tokenType: "Bearer",
      expiresIn: 900,
      user: {
        id: 1,
        name: "Ana",
        lastName: "Pérez",
        email: "ana@example.com",
        role: { key: "user", name: "User" },
        permissions: [],
      },
    });
    vi.mocked(getOwnRating).mockResolvedValueOnce(ownRating());
    renderSection();

    expect(await screen.findByText("Tu valoración")).toBeInTheDocument();
    expect(screen.getByText("Excelente")).toBeInTheDocument();
    expect(listOwnPlans).not.toHaveBeenCalled();
    expect(screen.queryByText("Dejá tu valoración")).not.toBeInTheDocument();
  });

  it("shows a moderation note for a pending comment", async () => {
    vi.mocked(refreshSession).mockResolvedValue({
      accessToken: "t",
      tokenType: "Bearer",
      expiresIn: 900,
      user: {
        id: 1,
        name: "Ana",
        lastName: "Pérez",
        email: "ana@example.com",
        role: { key: "user", name: "User" },
        permissions: [],
      },
    });
    vi.mocked(getOwnRating).mockResolvedValueOnce(
      ownRating({ moderationStatus: "pending" }),
    );
    renderSection();

    expect(
      await screen.findByText("Tu comentario está en revisión y todavía no es público."),
    ).toBeInTheDocument();
  });

  it("explains why rating isn't available when there's no eligible completed plan", async () => {
    vi.mocked(refreshSession).mockResolvedValue({
      accessToken: "t",
      tokenType: "Bearer",
      expiresIn: 900,
      user: {
        id: 1,
        name: "Ana",
        lastName: "Pérez",
        email: "ana@example.com",
        role: { key: "user", name: "User" },
        permissions: [],
      },
    });
    vi.mocked(getOwnRating).mockResolvedValueOnce(null);
    vi.mocked(listOwnPlans).mockResolvedValueOnce({
      data: [planSummary({ status: { key: "confirmed", name: "Confirmado" } })],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    renderSection();

    expect(
      await screen.findByText(
        "Todavía no podés valorar esta actividad: necesitás haber completado un plan que la incluya.",
      ),
    ).toBeInTheDocument();
    expect(getOwnPlan).not.toHaveBeenCalled();
  });

  it("renders the rating form once a completed plan with this activity is found", async () => {
    vi.mocked(refreshSession).mockResolvedValue({
      accessToken: "t",
      tokenType: "Bearer",
      expiresIn: 900,
      user: {
        id: 1,
        name: "Ana",
        lastName: "Pérez",
        email: "ana@example.com",
        role: { key: "user", name: "User" },
        permissions: [],
      },
    });
    vi.mocked(getOwnRating).mockResolvedValueOnce(null);
    vi.mocked(listOwnPlans).mockResolvedValueOnce({
      data: [planSummary()],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    vi.mocked(getOwnPlan).mockResolvedValueOnce(planDetail(42));
    renderSection();

    expect(await screen.findByText("Dejá tu valoración")).toBeInTheDocument();
    await waitFor(() => {
      expect(getOwnPlan).toHaveBeenCalledWith(10);
    });
  });

  it("checks later own-plan pages for an eligible completed plan", async () => {
    mockAuthenticatedSession();
    vi.mocked(getOwnRating).mockResolvedValueOnce(null);
    vi.mocked(listOwnPlans)
      .mockResolvedValueOnce({
        data: [planSummary({ status: { key: "confirmed", name: "Confirmado" } })],
        pagination: { page: 1, limit: 100, total: 2, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        data: [planSummary({ id: 11 })],
        pagination: { page: 2, limit: 100, total: 2, totalPages: 2 },
      });
    vi.mocked(getOwnPlan).mockResolvedValueOnce({
      ...planDetail(42),
      id: 11,
    });

    renderSection();

    expect(await screen.findByText("Dejá tu valoración")).toBeInTheDocument();
    expect(listOwnPlans).toHaveBeenNthCalledWith(1, {
      page: 1,
      sortBy: "createdAt",
      direction: "desc",
      limit: 100,
    });
    expect(listOwnPlans).toHaveBeenNthCalledWith(2, {
      page: 2,
      sortBy: "createdAt",
      direction: "desc",
      limit: 100,
    });
    expect(getOwnPlan).toHaveBeenCalledWith(11);
  });

  it("switches to the edit form, saves, and reports the change (CU46)", async () => {
    mockAuthenticatedSession();
    vi.mocked(getOwnRating).mockResolvedValueOnce(ownRating());
    vi.mocked(updateRating).mockResolvedValueOnce(
      ownRating({ score: 4, comment: "Bastante bien" }),
    );
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderSection(onChange);

    await user.click(await screen.findByRole("button", { name: "Editar tu valoración" }));
    expect(screen.getByText("Editar tu valoración")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "4 estrellas" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(updateRating).toHaveBeenCalledWith(1, { score: 4 });
    expect(await screen.findByText("Bastante bien")).toBeInTheDocument();
    expect(screen.queryByText("Editar tu valoración")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("cancels out of the edit form without saving", async () => {
    mockAuthenticatedSession();
    vi.mocked(getOwnRating).mockResolvedValueOnce(ownRating());
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Editar tu valoración" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByText("Editar tu valoración")).not.toBeInTheDocument();
    expect(screen.getByText("Tu valoración")).toBeInTheDocument();
    expect(updateRating).not.toHaveBeenCalled();
  });

  it("deletes the own rating after confirmation and reports the change (CU47)", async () => {
    mockAuthenticatedSession();
    vi.mocked(getOwnRating).mockResolvedValueOnce(ownRating());
    vi.mocked(deleteRating).mockResolvedValueOnce(undefined);
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderSection(onChange);

    await user.click(await screen.findByRole("button", { name: "Eliminar tu valoración" }));
    expect(screen.getByText("¿Eliminar tu valoración?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar valoración" }));

    expect(deleteRating).toHaveBeenCalledWith(1);
    await waitFor(() => {
      expect(screen.queryByText("¿Eliminar tu valoración?")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("Tu valoración")).not.toBeInTheDocument();
    expect(screen.getByText("Dejá tu valoración")).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("cancels the delete confirmation without calling the API", async () => {
    mockAuthenticatedSession();
    vi.mocked(getOwnRating).mockResolvedValueOnce(ownRating());
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Eliminar tu valoración" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByText("¿Eliminar tu valoración?")).not.toBeInTheDocument();
    expect(deleteRating).not.toHaveBeenCalled();
  });

  it("shows an error and keeps the dialog open when deletion fails", async () => {
    mockAuthenticatedSession();
    vi.mocked(getOwnRating).mockResolvedValueOnce(ownRating());
    vi.mocked(deleteRating).mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Eliminar tu valoración" }));
    await user.click(screen.getByRole("button", { name: "Eliminar valoración" }));

    expect(
      await screen.findByText("No pudimos eliminar tu valoración. Intentá de nuevo."),
    ).toBeInTheDocument();
    expect(screen.getByText("¿Eliminar tu valoración?")).toBeInTheDocument();
  });
});
