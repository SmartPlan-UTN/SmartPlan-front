import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPlacePhotoMedia } from "@/lib/api";
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

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getPlacePhotoMedia: vi.fn(),
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

  it("shows an unknown price as unavailable, never as $0", () => {
    render(
      <ActivityCard
        activity={{
          ...baseActivity,
          estimatedCost: null,
          price: {
            kind: "UNKNOWN",
            min: null,
            max: null,
            unit: null,
            currency: "ARS",
            source: null,
            sourceRef: null,
            verifiedAt: null,
            confidence: "NONE",
            stale: false,
          },
        }}
      />,
    );

    expect(screen.getByText("Precio no disponible")).toBeInTheDocument();
    expect(screen.queryByText(/$s?0/)).not.toBeInTheDocument();
  });

  it("shows a free activity only when its price kind is FREE", () => {
    render(
      <ActivityCard
        activity={{
          ...baseActivity,
          estimatedCost: 0,
          price: {
            kind: "FREE",
            min: 0,
            max: 0,
            unit: "PER_PERSON",
            currency: "ARS",
            source: "OFFICIAL",
            sourceRef: null,
            verifiedAt: null,
            confidence: "HIGH",
            stale: false,
          },
        }}
      />,
    );

    expect(screen.getByText("Gratis")).toBeInTheDocument();
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

  it("shows a game at home as \"En casa\", without a distance (#210)", () => {
    render(
      <ActivityCard
        activity={{ ...baseActivity, name: "El impostor", atHome: true, distanceKm: 4.2, place: { id: 1, name: "En casa / donde estén", kind: "home" } as never }}
      />,
    );
    expect(screen.getByText("En casa")).toBeInTheDocument();
    expect(screen.getByText("En casa / donde estén", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText("4.2 km")).not.toBeInTheDocument();
  });

  it("shows at most two occasions and counts the rest (#210)", () => {
    render(<ActivityCard activity={{ ...baseActivity, occasions: ["quiet", "romantic", "friends", "special"] }} />);
    const pills = screen.getByRole("list", { name: /Ideal para:/ });
    expect(pills).toHaveTextContent("En pareja");
    expect(pills).toHaveTextContent("Con amigos");
    expect(pills).toHaveTextContent("+2");
    expect(pills).not.toHaveTextContent("Tranquilo");
  });
});


it("does not fetch a place photo for an activity explicitly marked at home", () => {
  render(<ActivityCard activity={{ ...baseActivity, atHome: true,
    place: { id: 1, name: "Legacy place", kind: "cafe", kindLabel: null, address: "", department: null,
      googlePlaceId: "stale-place", latitude: null, longitude: null, coordinatesOwned: false,
      externalRating: null, externalPrice: null, image: null } }} />);
  expect(getPlacePhotoMedia).not.toHaveBeenCalled();
});
