import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlaceSummary } from "@/types";
import { PlaceMedia } from "./PlaceMedia";

const photo = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({ getPlacePhotoMedia: photo }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
const place: PlaceSummary = { id: 1, name: "Bodega", kind: "winery", kindLabel: "Bodega", address: "Ozamis 375", department: "Maipú", googlePlaceId: "ChIJ-verified-place", latitude: -32.96, longitude: -68.78, coordinatesOwned: true, externalRating: null, externalPrice: null, image: null };

describe("Compact place photo", () => {
  it("waits for the viewport and preserves linked author credit beside the photo", async () => {
    let enter: ((entries: { isIntersecting: boolean }[]) => void) | undefined;
    vi.stubGlobal("IntersectionObserver", class { constructor(callback: typeof enter) { enter = callback; } observe() {} disconnect() {} });
    photo.mockResolvedValue({ photoUri: "https://lh3.googleusercontent.com/photo", authors: [{ displayName: "Ana", uri: "https://maps.google.com/contrib/1" }], provider: "Google Maps" });
    render(<PlaceMedia place={place} alt="Tour real" artwork={{ family: "wine", icon: "wine", label: "Visita" }} />);
    expect(photo).not.toHaveBeenCalled();
    await act(async () => { enter?.([{ isIntersecting: true }]); });
    expect(photo).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Ana" })).toHaveAttribute("href", "https://maps.google.com/contrib/1");
    expect(screen.getByText(/Google Maps/)).toBeInTheDocument();
    fireEvent.load(screen.getByRole("img", { name: "Tour real" }));
    expect(screen.queryByRole("heading", { name: "Bodega" })).not.toBeInTheDocument();
  });

  it("keeps the designed fallback when the photo allowance is exhausted", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    photo.mockRejectedValue(new Error("quota exhausted"));
    const { container } = render(<PlaceMedia place={place} alt="Tour real" artwork={{ family: "wine", icon: "wine", label: "Visita" }} />);
    await act(async () => {});
    expect(container.querySelector('[data-media="artwork"]')).not.toBeNull();
    expect(screen.queryByText(/Google Maps/)).not.toBeInTheDocument();
  });
});
