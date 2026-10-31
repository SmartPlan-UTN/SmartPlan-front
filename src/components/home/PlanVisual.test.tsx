import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlanDetailResult } from "@/types";
import { PlanVisual } from "./PlanVisual";

const photo = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({ getPlacePhotoMedia: photo }));
vi.mock("@/components/media/AuthenticatedImage", () => ({
  AuthenticatedImage: ({ url, alt }: { url: string; alt: string }) => <span role="img" aria-label={alt} data-url={url} />,
}));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

function plan(): PlanDetailResult {
  return {
    id: 1, title: "Cena y postre", description: null, estimatedTotalCost: null,
    estimatedTotalDuration: 150, activityCount: 2, averageRating: 0, distanceKm: null,
    categories: [], activityNames: [], status: { key: "generated", name: "Generated" },
    viewerPlanState: "selectable", activeOutingId: null, kind: "generated", visibility: "private", ownedByViewer: true,
    details: ["Restaurante", "Perin"].map((name, index) => ({
      id: index + 1, order: index + 1, estimatedCost: null, estimatedDuration: 60, activity: null,
      stop: { kind: "PLACE_ACTION", label: name, action: index === 0 ? "meal" : "dessert", actionLabel: null,
        activityId: null, startMinute: null, legTravelMinutes: null, legDistanceMeters: null, estimateBasis: null,
        place: { id: index + 1, name, address: null, kind: null, kindLabel: null, latitude: null, longitude: null, departmentName: null, googlePlaceId: `place-${index}` } },
    })),
  };
}

describe("PlanVisual", () => {
  it("tries the second stop only after the first fails, preserving its author credit", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    let rejectFirst: (error: Error) => void = () => undefined;
    photo.mockReturnValueOnce(new Promise((_, reject) => { rejectFirst = reject; }));
    photo.mockResolvedValueOnce({ photoUri: "https://images.example/perin.jpg", authors: [{ displayName: "Ana", uri: "https://maps.google.com/contrib/1" }] });
    render(<PlanVisual plan={plan()} />);
    await waitFor(() => expect(photo).toHaveBeenCalledTimes(1));
    expect(photo).toHaveBeenCalledWith("place-0", 1200);
    await act(async () => { rejectFirst(new Error("No photo")); });
    const image = await screen.findByRole("img", { name: "Foto de Perin" });
    fireEvent.load(image);
    expect(photo).toHaveBeenCalledTimes(2);
    expect(photo).toHaveBeenLastCalledWith("place-1", 1200);
    expect(screen.getByRole("link", { name: "Ana" })).toHaveAttribute("href", "https://maps.google.com/contrib/1");
    expect(screen.getByText("Google Maps")).toBeInTheDocument();
  });

  it("uses the uploaded plan image without calling Google", () => {
    render(<PlanVisual plan={{ ...plan(), imageUrl: "/api/media/plan/4", imageSource: "uploaded" }} />);
    expect(screen.getByRole("img")).toHaveAttribute("data-url", "/api/media/plan/4");
    expect(photo).not.toHaveBeenCalled();
  });
});
