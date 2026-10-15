import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GooglePlacePhoto } from "./GooglePlacePhoto";

const mockGet = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

vi.mock("@/lib/api/config", () => ({
  getApiBaseUrl: () => "http://api.test/api",
}));

describe("GooglePlacePhoto", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("shows the live photo with the author credit and Google Maps", async () => {
    mockGet.mockResolvedValue({
      hasPhoto: true,
      authors: [{ displayName: "Ana Pérez", uri: "https://maps.example/a" }],
      provider: "Google Maps",
    });

    render(<GooglePlacePhoto placeId="ChIJ-place-0001" alt="Foto de la bodega" />);

    const image = await screen.findByAltText("Foto de la bodega");
    expect(image).toHaveAttribute(
      "src",
      "http://api.test/api/external-integration/places/ChIJ-place-0001/photo?maxWidthPx=900",
    );
    expect(screen.getByRole("link", { name: "Ana Pérez" })).toHaveAttribute(
      "href",
      "https://maps.example/a",
    );
    expect(screen.getByText("Google Maps")).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith(
      "/external-integration/places/ChIJ-place-0001/photo-attribution",
    );
  });

  it("renders nothing when the place has no photo", async () => {
    mockGet.mockResolvedValue({ hasPhoto: false, authors: [], provider: "Google Maps" });

    const { container } = render(<GooglePlacePhoto placeId="ChIJ-place-0001" alt="x" />);

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("stays silent when the provider is unavailable", async () => {
    mockGet.mockRejectedValue(new Error("503"));

    const { container } = render(<GooglePlacePhoto placeId="ChIJ-place-0001" alt="x" />);

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
