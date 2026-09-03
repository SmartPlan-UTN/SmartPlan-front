import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getActivity } from "@/lib/api";

import { ActivityDetailView } from "./ActivityDetailView";

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

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, getActivity: vi.fn() };
});

vi.mock("@/components/collection", () => ({
  AddToCollectionDialog: ({ activityName }: { activityName: string }) => (
    <div role="dialog">Selector para {activityName}</div>
  ),
}));

vi.mock("@/components/plan", () => ({
  AddToPlanDialog: ({ activityName }: { activityName: string }) => (
    <div role="dialog">Selector de plan para {activityName}</div>
  ),
}));

vi.mock("@/components/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui")>();
  return { ...actual, FloatingBackLink: () => null };
});

describe("ActivityDetailView actions (CU15, CU27, CU35)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsActivitySaved.mockReturnValue(false);
    vi.mocked(getActivity).mockResolvedValue({
      id: 42,
      name: "Degustación de vinos",
      description: "Una experiencia guiada",
      estimatedCost: 15000,
      estimatedDuration: 120,
      type: "Gastronomía",
      averageRating: 4.5,
      ratingCount: 10,
      distanceKm: null,
      categories: [{ id: 3, name: "Gastronomía" }],
      locations: [],
    });
  });

  it("opens the CU35 collection selector from PAN 18", async () => {
    const user = userEvent.setup();
    render(<ActivityDetailView activityId={42} />);

    await user.click(await screen.findByRole("button", { name: "Colección" }));

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Selector para Degustación de vinos",
    );
  });

  it("opens the CU27 plan selector from PAN 18", async () => {
    const user = userEvent.setup();
    render(<ActivityDetailView activityId={42} />);

    await user.click(await screen.findByRole("button", { name: "Agregar a plan" }));

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Selector de plan para Degustación de vinos",
    );
  });

  it("calls toggleSaveActivity when hero bookmark or action bar save is clicked (CU15)", async () => {
    const user = userEvent.setup();
    mockToggleSaveActivity.mockResolvedValue(true);

    render(<ActivityDetailView activityId={42} />);

    const heroBtn = await screen.findByRole("button", { name: "Guardar actividad" });
    const barBtn = screen.getByRole("button", { name: "Guardar" });

    await user.click(heroBtn);
    expect(mockToggleSaveActivity).toHaveBeenCalledWith(42);

    await user.click(barBtn);
    expect(mockToggleSaveActivity).toHaveBeenCalledWith(42);
  });

  it("shows saved visual state when activity is saved (CU15)", async () => {
    mockIsActivitySaved.mockReturnValue(true);

    render(<ActivityDetailView activityId={42} />);

    expect(await screen.findByRole("button", { name: "Quitar de guardados" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardada" })).toBeInTheDocument();
  });
});
