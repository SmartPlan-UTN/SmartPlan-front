import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanSearchResult } from "@/types";

import { PlanCard } from "./PlanCard";

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

const basePlan: PlanSearchResult = {
  id: 10,
  title: "Fin de semana en Mendoza",
  description: "Visita a bodegas y almuerzo gourmet",
  estimatedTotalCost: 35000,
  estimatedTotalDuration: 360,
  activityCount: 3,
  averageRating: 4.8,
  distanceKm: 5.2,
  categories: [
    { id: 1, name: "Gastronómico" },
    { id: 2, name: "Cultural" },
  ],
  activityNames: ["Bodega", "Almuerzo", "Degustación"],
  status: { key: "confirmed", name: "Confirmada" },
};

describe("PlanCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPlanSaved.mockReturnValue(false);
  });

  it("renders the plan's title, itinerary chain, cost, and categories", () => {
    render(<PlanCard plan={basePlan} />);

    expect(
      screen.getByRole("heading", { name: "Fin de semana en Mendoza" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Bodega → Almuerzo → Degustación"),
    ).toBeInTheDocument();
    expect(screen.getByText(/35\.000/)).toBeInTheDocument();
    expect(screen.getByText("Gastronómico")).toBeInTheDocument();
    expect(screen.getByText("Cultural")).toBeInTheDocument();
  });

  it("formats the duration in human-readable form", () => {
    render(<PlanCard plan={basePlan} />);

    expect(screen.getByText("6h")).toBeInTheDocument();
  });

  it("toggles favorite state when clicking bookmark button (CU43 / CU42)", async () => {
    const user = userEvent.setup();
    mockIsPlanSaved.mockReturnValue(false);
    mockToggleSavePlan.mockResolvedValue(true);

    render(<PlanCard plan={basePlan} />);

    const saveBtn = screen.getByRole("button", { name: "Guardar plan" });
    expect(saveBtn).toBeInTheDocument();
    expect(saveBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(saveBtn);

    expect(mockToggleSavePlan).toHaveBeenCalledWith(10);
  });

  it("shows active state when plan is saved (CU43)", () => {
    mockIsPlanSaved.mockReturnValue(true);

    render(<PlanCard plan={basePlan} />);

    const saveBtn = screen.getByRole("button", { name: "Quitar de guardados" });
    expect(saveBtn).toBeInTheDocument();
    expect(saveBtn).toHaveAttribute("aria-pressed", "true");
  });
});
