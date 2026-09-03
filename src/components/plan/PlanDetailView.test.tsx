import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { PlanDetailView } from "./PlanDetailView";
import { ApiError, getPlan, getOwnPlan, cancelOwnPlan } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import type { OwnPlanDetail, PlanDetailResult } from "@/types";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getPlan: vi.fn(),
    getOwnPlan: vi.fn(),
    cancelOwnPlan: vi.fn(),
  };
});

const mockToggleSavePlan = vi.fn();
const mockIsPlanSaved = vi.fn();

vi.mock("@/context", () => ({
  useFavorites: () => ({
    isPlanSaved: mockIsPlanSaved,
    toggleSavePlan: mockToggleSavePlan,
    savedPlanIds: new Set(),
    loading: false,
  }),
}));

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, useSession: vi.fn() };
});

function mockPlan(overrides: Partial<PlanDetailResult> = {}): PlanDetailResult {
  return {
    id: 1,
    title: "Tour de Bodegas Luján",
    description: "Visita guiada por viñedos de Luján de Cuyo.",
    estimatedTotalCost: 35000,
    estimatedTotalDuration: 180,
    activityCount: 1,
    averageRating: 4.8,
    distanceKm: null,
    categories: [{ id: 1, name: "Bodega" }],
    activityNames: ["Bodega Zuccardi"],
    status: { key: "confirmed", name: "Confirmado" },
    details: [
      {
        id: 10,
        order: 1,
        estimatedCost: 15000,
        estimatedDuration: 90,
        activity: {
          id: 101,
          name: "Bodega Zuccardi",
          description: "Degustación de alta gama",
          estimatedCost: 15000,
          estimatedDuration: 90,
          type: "Bodega",
          averageRating: 4.9,
          ratingCount: 120,
          categories: [{ id: 1, name: "Bodega" }],
          locations: [
            {
              id: 1,
              latitude: -33,
              longitude: -68,
              notes: null,
              place: {
                id: 1,
                name: "Zuccardi",
                description: null,
                address: "Ruta 40, Agrelo",
                department: {
                  id: 1,
                  name: "Luján de Cuyo",
                  city: {
                    id: 1,
                    name: "Mendoza",
                    country: { id: 1, name: "Argentina" },
                  },
                },
              },
            },
          ],
        },
      },
    ],
    ...overrides,
  };
}

/** Minimal owned-plan payload: the probe only cares that it resolves. */
function mockOwnPlan(): OwnPlanDetail {
  return {
    id: 1,
    title: "Tour de Bodegas Luján",
    description: null,
    peopleCount: 2,
    estimatedTotalCost: 35000,
    estimatedCostPerPerson: 17500,
    estimatedTotalDuration: 180,
    activityCount: 1,
    status: { key: "confirmed", name: "Confirmado" },
    createdAt: "2026-08-25T12:00:00.000Z",
    updatedAt: "2026-08-25T12:00:00.000Z",
    details: [],
  };
}

function mockSession(authenticated: boolean) {
  vi.mocked(useSession).mockReturnValue({
    status: authenticated ? "authenticated" : "anonymous",
    user: null,
    authenticated,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  } as unknown as ReturnType<typeof useSession>);
}

describe("PlanDetailView Component (CU13, CU26)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPlan).mockResolvedValue(mockPlan());
    vi.mocked(getOwnPlan).mockResolvedValue(mockOwnPlan());
    mockSession(true);

    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    window.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  it("renders plan details correctly", async () => {
    render(<PlanDetailView planId={1} />);

    expect(await screen.findByText("Tour de Bodegas Luján")).toBeInTheDocument();
    expect(
      screen.getByText("Visita guiada por viñedos de Luján de Cuyo."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Bodega Zuccardi").length).toBeGreaterThan(0);
  });

  it("shows owner actions once the ownership probe resolves (CU25, CU26)", async () => {
    render(<PlanDetailView planId={1} />);

    expect(await screen.findByText("Editar plan")).toBeInTheDocument();
    expect(screen.getByText("Eliminar plan")).toBeInTheDocument();
    expect(getOwnPlan).toHaveBeenCalledWith(1);
  });

  it("hides owner actions when the plan belongs to someone else", async () => {
    vi.mocked(getOwnPlan).mockRejectedValue(
      new ApiError({ message: "No encontrado", type: "HTTP", status: 404 }),
    );

    render(<PlanDetailView planId={1} />);

    expect(await screen.findByText("Tour de Bodegas Luján")).toBeInTheDocument();
    await waitFor(() => {
      expect(getOwnPlan).toHaveBeenCalledWith(1);
    });
    expect(screen.queryByText("Editar plan")).not.toBeInTheDocument();
    expect(screen.queryByText("Eliminar plan")).not.toBeInTheDocument();
  });

  it("never probes ownership for an anonymous visitor", async () => {
    mockSession(false);

    render(<PlanDetailView planId={1} />);

    expect(await screen.findByText("Tour de Bodegas Luján")).toBeInTheDocument();
    expect(getOwnPlan).not.toHaveBeenCalled();
    expect(screen.queryByText("Eliminar plan")).not.toBeInTheDocument();
  });

  it("opens explicit confirmation dialog on delete click and handles modal close", async () => {
    render(<PlanDetailView planId={1} />);

    fireEvent.click(await screen.findByText("Eliminar plan"));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("¿Eliminar este plan?")).toBeInTheDocument();
    expect(
      screen.getByText(
        /El plan se eliminará de tus planes y ya no estará disponible/i,
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Volver" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("closes the confirmation dialog on Escape", async () => {
    render(<PlanDetailView planId={1} />);

    fireEvent.click(await screen.findByText("Eliminar plan"));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("executes cancelOwnPlan and redirects to plans on confirmation (CU26)", async () => {
    vi.mocked(cancelOwnPlan).mockResolvedValue(undefined);

    render(<PlanDetailView planId={1} />);

    fireEvent.click(await screen.findByText("Eliminar plan"));
    fireEvent.click(screen.getByText("Sí, eliminar plan"));

    await waitFor(() => {
      expect(cancelOwnPlan).toHaveBeenCalledWith(1);
      expect(push).toHaveBeenCalledWith(ROUTES.plans);
    });
  });

  it("keeps the dialog open and surfaces the message when deletion fails", async () => {
    vi.mocked(cancelOwnPlan).mockRejectedValue(
      new ApiError({
        message: "El plan ya fue eliminado",
        type: "HTTP",
        status: 409,
      }),
    );

    render(<PlanDetailView planId={1} />);

    fireEvent.click(await screen.findByText("Eliminar plan"));
    fireEvent.click(screen.getByText("Sí, eliminar plan"));

    expect(
      await screen.findByText("El plan ya fue eliminado"),
    ).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("renders cancelled status banner and hides edit/delete buttons for cancelled plans", async () => {
    vi.mocked(getPlan).mockResolvedValue(
      mockPlan({ status: { key: "cancelled", name: "Cancelado" } }),
    );

    render(<PlanDetailView planId={1} />);

    expect(await screen.findByText("Tour de Bodegas Luján")).toBeInTheDocument();
    expect(
      screen.getByText(/Este plan se encuentra conservado como historial de lectura/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Editar plan")).not.toBeInTheDocument();
    expect(screen.queryByText("Eliminar plan")).not.toBeInTheDocument();
  });

  it("toggles favorite plan when clicking the save button (CU43 / CU42)", async () => {
    mockIsPlanSaved.mockReturnValue(false);
    mockToggleSavePlan.mockResolvedValue(true);

    render(<PlanDetailView planId={1} />);

    const saveBtn = await screen.findByRole("button", { name: "Guardar plan" });
    expect(saveBtn).toBeInTheDocument();
    expect(saveBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(saveBtn);

    expect(mockToggleSavePlan).toHaveBeenCalledWith(1);
  });

  it("shows saved state when plan is saved (CU43)", async () => {
    mockIsPlanSaved.mockReturnValue(true);

    render(<PlanDetailView planId={1} />);

    const saveBtn = await screen.findByRole("button", { name: "Quitar de guardados" });
    expect(saveBtn).toBeInTheDocument();
    expect(saveBtn).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("¡Guardado!")).toBeInTheDocument();
  });
});
