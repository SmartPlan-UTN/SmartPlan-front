import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, ensurePlaceVisit, getActivity, getPlaceDetail } from "@/lib/api";
import type { ActivityDetailResult, PlaceDetailResult } from "@/types";

import { PlaceDetailView } from "./PlaceDetailView";
import { ActivityDetailView } from "@/components/activity/ActivityDetailView";

const { push, session } = vi.hoisted(() => ({ push: vi.fn(), session: { authenticated: true, status: "authenticated" } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/auth", () => ({ useSession: () => session }));

const toggleSaveActivity = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock("@/context", () => ({ useFavorites: () => ({
  isActivitySaved: () => false,
  toggleSaveActivity,
}) }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api")>(),
  getActivity: vi.fn(),
  getPlaceDetail: vi.fn(),
  ensurePlaceVisit: vi.fn(),
}));
vi.mock("@/components/media", () => ({
  PlaceMedia: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
  GooglePlaceContext: () => null,
  RatingBadge: () => <span>Sin reseñas</span>,
  MediaGallery: () => null,
}));
vi.mock("@/components/ui", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/components/ui")>(),
  FloatingBackLink: () => null,
}));
vi.mock("@/components/plan", () => ({
  AddToPlanDialog: ({ activityId }: { activityId: number }) => <div role="dialog">Plan activity {activityId}</div>,
}));
vi.mock("@/components/collection", () => ({
  AddToCollectionDialog: ({ activityId }: { activityId: number }) => <div role="dialog">Collection activity {activityId}</div>,
}));
vi.mock("@/components/activity/ActivityRatingSection", () => ({
  ActivityRatingSection: ({ activityId }: { activityId: number }) => <p>Rate activity {activityId}</p>,
}));
vi.mock("@/components/activity/RatingsList", () => ({
  RatingsList: ({ activityId }: { activityId: number }) => <p>Reviews for activity {activityId}</p>,
}));

function activity(id: number): ActivityDetailResult {
  return {
    id, name: `Experiencia ${id}`, description: `Descripción ${id}`,
    estimatedCost: 15000, estimatedDuration: 120, type: null,
    averageRating: null, ratingCount: 0, distanceKm: null,
    categories: [], locations: [], planEligible: true,
  };
}

function place(activityIds = [42]): PlaceDetailResult {
  return {
    id: 52, name: "Antares", description: "Una cervecería", address: "Arístides 153",
    kind: "brewery", kindLabel: "Cervecería", summary: null,
    activities: activityIds.map((id) => ({
      id, name: `Experiencia ${id}`, type: null, typeLabel: null,
      estimatedDuration: 120, planEligible: true,
      price: { kind: "UNKNOWN", min: null, max: null, currency: "ARS", unit: "PER_PERSON", source: null, sourceRef: null, verifiedAt: null, confidence: "NONE", stale: false },
    })),
    department: { id: 1, name: "Ciudad de Mendoza", city: { id: 1, name: "Mendoza", country: { id: 1, name: "Argentina" } } },
  };
}

describe("Place detail uses the complete activity flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.authenticated = true;
    vi.mocked(ensurePlaceVisit).mockResolvedValue({ activityId: 97 });
    vi.mocked(getPlaceDetail).mockResolvedValue(place());
    vi.mocked(getActivity).mockImplementation(async (id) => activity(id));
  });

  it("adds the associated activity to a plan, never the place ID", async () => {
    const user = userEvent.setup();
    render(<PlaceDetailView placeId={52} />);
    await user.click(await screen.findByRole("button", { name: "Agregar a plan" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Plan activity 42");
    expect(getActivity).toHaveBeenCalledWith(42);
    expect(getActivity).not.toHaveBeenCalledWith(52);
  });

  it("saves and collects the associated activity", async () => {
    const user = userEvent.setup();
    render(<PlaceDetailView placeId={52} />);
    await user.click(await screen.findByRole("button", { name: "Guardar" }));
    expect(toggleSaveActivity).toHaveBeenCalledWith(42);
    await user.click(screen.getByRole("button", { name: "Colección" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Collection activity 42");
  });

  it("shows the selected activity's ratings and resets open dialogs when switching", async () => {
    const user = userEvent.setup();
    vi.mocked(getPlaceDetail).mockResolvedValue(place([42, 43]));
    render(<PlaceDetailView placeId={52} />);
    await user.click(await screen.findByRole("button", { name: "Valoraciones" }));
    expect(screen.getByText("Reviews for activity 42")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Agregar a plan" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Qué hacer en Antares" }), "43");
    await screen.findByRole("heading", { name: "Experiencia 43", level: 1 });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Descripción 43")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Valoraciones" }));
    expect(screen.getByText("Rate activity 43")).toBeInTheDocument();
    expect(screen.queryByText("Reviews for activity 42")).not.toBeInTheDocument();
  });

  it("keeps planning eligibility enforced from the activity detail", async () => {
    const user = userEvent.setup();
    vi.mocked(getActivity).mockResolvedValue({ ...activity(42), planEligible: false });
    render(<PlaceDetailView placeId={52} />);
    expect(await screen.findByRole("button", { name: "Agregar a plan" })).toBeDisabled();
    expect(screen.getByText("Esta actividad todavía no está disponible para agregar a un plan.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(toggleSaveActivity).toHaveBeenCalledWith(42);
  });

  it.each(["place", "activity"])("opens the location from ratings on the %s route", async (route) => {
    const user = userEvent.setup();
    const venue = place();
    vi.mocked(getActivity).mockResolvedValue({
      ...activity(42),
      locations: [{
        id: 1, latitude: -32.89, longitude: -68.85, notes: null,
        place: { id: venue.id, name: venue.name, description: venue.description,
          address: venue.address, department: venue.department },
      }],
    });
    render(route === "place" ? <PlaceDetailView placeId={52} /> : <ActivityDetailView activityId={42} />);
    await user.click(await screen.findByRole("button", { name: "Valoraciones" }));
    expect(screen.getByText("Reviews for activity 42")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Antares" });
    const destination = "#activity-location";
    expect(link).toHaveAttribute("href", destination);
    expect(document.querySelector(destination)).toBeNull();
    // Native fragment navigation needs its target during the click event.
    let mountedDuringClick = false;
    const observeClick = () => { mountedDuringClick = document.querySelector(destination) !== null; };
    document.addEventListener("click", observeClick, { once: true });
    await user.click(link);
    expect(mountedDuringClick).toBe(true);
    expect(document.querySelector(destination)).toHaveTextContent("ubicación");
    expect(screen.queryByText("Reviews for activity 42")).not.toBeInTheDocument();
  });

  it("does not treat a place without activities as an existing activity", async () => {
    vi.mocked(getPlaceDetail).mockResolvedValue(place([]));
    render(<PlaceDetailView placeId={52} />);
    await screen.findByRole("heading", { name: "Antares" });
    expect(getActivity).not.toHaveBeenCalled();
    expect(ensurePlaceVisit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Agregar a plan" })).toBeEnabled();
  });

  it("creates a reusable self-guided visit on an explicit planning action", async () => {
    const user = userEvent.setup();
    vi.mocked(getPlaceDetail).mockResolvedValue(place([]));
    render(<PlaceDetailView placeId={52} />);
    await user.click(await screen.findByRole("button", { name: "Agregar a plan" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Plan activity 97");
    expect(ensurePlaceVisit).toHaveBeenCalledExactlyOnceWith(52);
    expect(getActivity).toHaveBeenCalledWith(97);
  });

  it("shows visit information and its own empty ratings without creating records", async () => {
    const user = userEvent.setup();
    vi.mocked(getPlaceDetail).mockResolvedValue(place([]));
    render(<PlaceDetailView placeId={52} />);
    expect(await screen.findByText("Precio no disponible")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Valoraciones" }));
    expect(screen.getByText("Sin valoraciones de visitas aún")).toBeInTheDocument();
    expect(ensurePlaceVisit).not.toHaveBeenCalled();
    expect(getActivity).not.toHaveBeenCalled();
  });

  it("saves a visit using its activity ID", async () => {
    const user = userEvent.setup();
    vi.mocked(getPlaceDetail).mockResolvedValue(place([]));
    render(<PlaceDetailView placeId={52} />);
    await user.click(await screen.findByRole("button", { name: "Guardar" }));
    await screen.findByRole("heading", { name: "Experiencia 97" });
    expect(toggleSaveActivity).toHaveBeenCalledWith(97);
  });

  it("offers recovery when preparing the visit fails", async () => {
    const user = userEvent.setup();
    vi.mocked(getPlaceDetail).mockResolvedValue(place([]));
    vi.mocked(ensurePlaceVisit).mockRejectedValueOnce(new Error("Offline"));
    render(<PlaceDetailView placeId={52} />);
    await user.click(await screen.findByRole("button", { name: "Agregar a plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos preparar la visita");
    await user.click(screen.getByRole("button", { name: "Agregar a plan" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Plan activity 97");
  });

  it("returns to the place after signing in without creating an anonymous visit", async () => {
    const user = userEvent.setup();
    session.authenticated = false;
    vi.mocked(getPlaceDetail).mockResolvedValue(place([]));
    render(<PlaceDetailView placeId={52} />);
    await user.click(await screen.findByRole("button", { name: "Agregar a plan" }));
    expect(push).toHaveBeenCalledWith("/login?redirect=%2Fexplore%2Fplaces%2F52");
    expect(ensurePlaceVisit).not.toHaveBeenCalled();
  });

  it("shows a missing place rather than requesting an unrelated activity", async () => {
    vi.mocked(getPlaceDetail).mockRejectedValue(new ApiError({ type: "HTTP", status: 404, message: "Missing place" }));
    render(<PlaceDetailView placeId={52} />);
    expect(await screen.findByRole("heading", { name: "No encontramos este lugar" })).toBeInTheDocument();
    expect(getActivity).not.toHaveBeenCalled();
  });
});
