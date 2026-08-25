import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { PlanDetailView } from "./PlanDetailView";
import * as api from "@/lib/api";
import { ROUTES } from "@/lib/routes";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    getPlan: vi.fn(),
    cancelOwnPlan: vi.fn(),
  };
});

describe("PlanDetailView Component (CU26)", () => {
  const samplePlan = {
    id: 1,
    title: "Tour de Bodegas Luján",
    description: "Visita guiada por viñedos de Luján de Cuyo.",
    estimatedTotalCost: 35000,
    estimatedTotalDuration: 180,
    averageRating: 4.8,
    status: { id: 1, key: "confirmed", name: "Confirmado" },
    details: [
      {
        id: 10,
        order: 1,
        estimatedCost: 15000,
        estimatedDuration: 90,
        activity: {
          id: 101,
          name: "Bodega Zuccardi",
          averageRating: 4.9,
          categories: [{ id: 1, name: "Bodega" }],
          locations: [
            {
              id: 1,
              latitude: -33,
              longitude: -68,
              place: { id: 1, address: "Ruta 40, Agrelo" },
            },
          ],
        },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  it("renders plan details correctly", async () => {
    vi.mocked(api.getPlan).mockResolvedValue(samplePlan);

    render(<PlanDetailView planId={1} />);

    expect(await screen.findByText("Tour de Bodegas Luján")).toBeInTheDocument();
    expect(screen.getByText("Visita guiada por viñedos de Luján de Cuyo.")).toBeInTheDocument();
    expect(screen.getAllByText("Bodega Zuccardi").length).toBeGreaterThan(0);
    expect(screen.getByText("Editar plan")).toBeInTheDocument();
    expect(screen.getByText("Cancelar plan")).toBeInTheDocument();
  });

  it("opens explicit confirmation dialog on cancel click and handles modal close", async () => {
    vi.mocked(api.getPlan).mockResolvedValue(samplePlan);

    render(<PlanDetailView planId={1} />);

    expect(await screen.findByText("Tour de Bodegas Luján")).toBeInTheDocument();

    const cancelButton = screen.getByText("Cancelar plan");
    fireEvent.click(cancelButton);

    expect(screen.getByText("¿Cancelar este plan?")).toBeInTheDocument();
    expect(
      screen.getByText(/El plan pasará a estar cancelado y se conservará únicamente como historial/i)
    ).toBeInTheDocument();

    const backButton = screen.getByRole("button", { name: "Volver" });
    fireEvent.click(backButton);

    expect(screen.queryByText("¿Cancelar este plan?")).not.toBeInTheDocument();
  });

  it("executes cancelOwnPlan and redirects to explore on confirmation (CU26)", async () => {
    vi.mocked(api.getPlan).mockResolvedValue(samplePlan);
    vi.mocked(api.cancelOwnPlan).mockResolvedValue(undefined);

    render(<PlanDetailView planId={1} />);

    expect(await screen.findByText("Tour de Bodegas Luján")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancelar plan"));
    fireEvent.click(screen.getByText("Sí, cancelar plan"));

    await waitFor(() => {
      expect(api.cancelOwnPlan).toHaveBeenCalledWith(1);
      expect(mockPush).toHaveBeenCalledWith(ROUTES.explore);
    });
  });

  it("renders cancelled status banner and hides edit/cancel buttons for cancelled plans", async () => {
    const cancelledPlan = {
      ...samplePlan,
      status: { id: 3, key: "cancelled", name: "Cancelado" },
    };
    vi.mocked(api.getPlan).mockResolvedValue(cancelledPlan);

    render(<PlanDetailView planId={1} />);

    expect(await screen.findByText("Tour de Bodegas Luján")).toBeInTheDocument();
    expect(screen.getByText(/Este plan se encuentra conservado como historial de lectura/i)).toBeInTheDocument();
    expect(screen.queryByText("Editar plan")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancelar plan")).not.toBeInTheDocument();
  });
});
