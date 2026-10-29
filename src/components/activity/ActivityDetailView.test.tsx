import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getActivity } from "@/lib/api";
import { downloadMedia } from "@/lib/api/media";

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

vi.mock("@/lib/api/media", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/media")>();
  return {
    ...actual,
    listMedia: vi.fn().mockResolvedValue([]),
    downloadMedia: vi.fn().mockRejectedValue(new Error("no image")),
  };
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

describe("ActivityDetailView hero photo (SmartPlan-back#102)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsActivitySaved.mockReturnValue(false);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:hero"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  function activity(imageUrl: string | null) {
    return {
      id: 42,
      name: "Degustación de vinos",
      description: "Una experiencia guiada",
      imageUrl,
      imageSource: imageUrl ? ("google_maps" as const) : null,
      estimatedCost: 15000,
      estimatedDuration: 120,
      type: "Gastronomía",
      averageRating: 4.5,
      ratingCount: 10,
      distanceKm: null,
      categories: [{ id: 3, name: "Gastronomía" }],
      locations: [],
    };
  }

  it("shows the place photo with Google Maps and its linked authors", async () => {
    vi.mocked(getActivity).mockResolvedValue(
      activity("/api/activity-places/5/photo"),
    );
    vi.mocked(downloadMedia).mockResolvedValue({
      blob: new Blob(["photo"]),
      attribution: {
        provider: "google_maps",
        authors: [{ displayName: "Ana Pérez", uri: "https://maps.google.com/ana" }],
      },
    });

    render(<ActivityDetailView activityId={42} />);

    expect(
      await screen.findByRole("link", { name: "Ana Pérez" }),
    ).toHaveAttribute("href", "https://maps.google.com/ana");
    expect(screen.getByText("Google Maps")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Degustación de vinos" })).toHaveAttribute(
      "src",
      "blob:hero",
    );
    expect(screen.queryByText("Sin imagen disponible")).toBeNull();
  });

  it("keeps the hero art when the photo cannot be loaded", async () => {
    vi.mocked(getActivity).mockResolvedValue(
      activity("/api/activity-places/5/photo"),
    );
    vi.mocked(downloadMedia).mockRejectedValue(new Error("503"));

    render(<ActivityDetailView activityId={42} />);

    expect(await screen.findByText("Sin imagen disponible")).toBeInTheDocument();
    expect(screen.queryByText("Google Maps")).toBeNull();
  });

  it("keeps the hero art when the activity has no image at all", async () => {
    vi.mocked(getActivity).mockResolvedValue(activity(null));

    render(<ActivityDetailView activityId={42} />);

    expect(await screen.findByText("Sin imagen disponible")).toBeInTheDocument();
    expect(downloadMedia).not.toHaveBeenCalled();
  });
});

describe("ActivityDetailView at the Hogar (#210)", () => {
  it("shows rules, materials, age and people, and no address or map", async () => {
    vi.mocked(getActivity).mockResolvedValue({
      id: 77,
      name: "El impostor",
      description: "Todos reciben una palabra menos uno, que tiene que disimular.",
      estimatedCost: 0,
      estimatedDuration: 30,
      type: null,
      averageRating: null,
      ratingCount: 0,
      distanceKm: null,
      categories: [{ id: 4, name: "Entertainment" }],
      atHome: true,
      occasions: ["friends", "big_group"],
      minPeople: 4,
      maxPeople: 12,
      minAge: 8,
      materials: ["solo celulares"],
      rulesRef: "https://example.test/reglas",
      locations: [
        {
          id: 5,
          atHome: true,
          latitude: null,
          longitude: null,
          notes: null,
          place: { id: 1, name: "En casa / donde estén", description: null, address: "Donde estén", kind: "home", department: null },
        },
      ],
    });

    render(<ActivityDetailView activityId={77} />);

    expect(await screen.findByText("En casa / donde estén")).toBeInTheDocument();
    expect(screen.getByText("De 4 a 12 personas")).toBeInTheDocument();
    expect(screen.getByText("Desde 8 años")).toBeInTheDocument();
    expect(screen.getByText("solo celulares")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver de dónde salen las reglas" })).toHaveAttribute("href", "https://example.test/reglas");
    expect(screen.getByRole("list", { name: /Ideal para: Con amigos, Grupo grande/ })).toBeInTheDocument();
    expect(screen.queryByText(/Ver en Google Maps/)).not.toBeInTheDocument();
    expect(screen.queryByText("Donde estén")).not.toBeInTheDocument();
  });
});
