import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActivitySearchResult } from "@/types";

import { ActivityCard } from "./ActivityCard";

const mockToggleSaveActivity = vi.fn();
const mockIsActivitySaved = vi.fn();

vi.mock("@/context", () => ({
  useFavorites: () => ({
    isActivitySaved: mockIsActivitySaved,
    toggleSaveActivity: mockToggleSaveActivity,
    savedActivityIds: new Set(),
    loading: false,
  }),
}));

const baseActivity: ActivitySearchResult = {
  id: 1,
  name: "Ruta del vino",
  description: "Recorrido por bodegas de Luján de Cuyo con degustación.",
  estimatedCost: 15000,
  estimatedDuration: 180,
  type: "wine-tour",
  averageRating: 4.5,
  ratingCount: 32,
  distanceKm: 2.3,
  categories: [
    { id: 1, name: "Gastronómico" },
    { id: 2, name: "Cultural" },
  ],
};

describe("ActivityCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsActivitySaved.mockReturnValue(false);
  });

  it("renders the activity's name, description, cost, and categories", () => {
    render(<ActivityCard activity={baseActivity} />);

    expect(
      screen.getByRole("heading", { name: "Ruta del vino" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Recorrido por bodegas/),
    ).toBeInTheDocument();
    expect(screen.getByText(/15\.000/)).toBeInTheDocument();
    expect(screen.getByText("Gastronómico")).toBeInTheDocument();
    expect(screen.getByText("Cultural")).toBeInTheDocument();
  });

  it("formats the duration in a compact, human-readable form", () => {
    render(<ActivityCard activity={baseActivity} />);

    expect(screen.getByText("3h")).toBeInTheDocument();
  });

  it("shows the distance when it's available", () => {
    render(<ActivityCard activity={baseActivity} />);

    expect(screen.getByText("2.3 km")).toBeInTheDocument();
  });

  it("omits the distance when the backend doesn't send it", () => {
    render(
      <ActivityCard activity={{ ...baseActivity, distanceKm: null }} />,
    );

    expect(screen.queryByText(/km$/)).not.toBeInTheDocument();
  });

  it("only shows the first two categories", () => {
    render(
      <ActivityCard
        activity={{
          ...baseActivity,
          categories: [
            { id: 1, name: "Uno" },
            { id: 2, name: "Dos" },
            { id: 3, name: "Tres" },
          ],
        }}
      />,
    );

    expect(screen.getByText("Uno")).toBeInTheDocument();
    expect(screen.getByText("Dos")).toBeInTheDocument();
    expect(screen.queryByText("Tres")).not.toBeInTheDocument();
  });

  it("toggles favorite state when clicking bookmark button without following link", async () => {
    const user = userEvent.setup();
    mockIsActivitySaved.mockReturnValue(false);
    mockToggleSaveActivity.mockResolvedValue(true);

    render(<ActivityCard activity={baseActivity} />);

    const saveBtn = screen.getByRole("button", { name: "Guardar actividad" });
    expect(saveBtn).toBeInTheDocument();
    expect(saveBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(saveBtn);

    expect(mockToggleSaveActivity).toHaveBeenCalledWith(1);
  });

  it("shows active state when activity is saved", () => {
    mockIsActivitySaved.mockReturnValue(true);

    render(<ActivityCard activity={baseActivity} />);

    const saveBtn = screen.getByRole("button", { name: "Quitar de guardados" });
    expect(saveBtn).toBeInTheDocument();
    expect(saveBtn).toHaveAttribute("aria-pressed", "true");
  });
});
