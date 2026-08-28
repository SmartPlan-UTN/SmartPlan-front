import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getPlaceDetails,
  reverseGeocodeLocation,
  searchPlacePredictions,
} from "@/lib/maps/placeSearch";

import { LocationField } from "./LocationField";

vi.mock("@/lib/maps/placeSearch", () => ({
  searchPlacePredictions: vi.fn(),
  getPlaceDetails: vi.fn(),
  reverseGeocodeLocation: vi.fn(),
}));

// `AutocompleteSessionToken` only needs to exist as a constructible class —
// `LocationField` never inspects its shape, only passes it through.
vi.stubGlobal("google", {
  maps: { places: { AutocompleteSessionToken: class {} } },
});

function area() {
  return { label: "Palermo, Buenos Aires", placeId: "place-42", latitude: -34.58, longitude: -58.43 };
}

describe("LocationField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preloads the saved location and starts with the field enabled", () => {
    render(
      <LocationField initialArea={area()} initialUseDeviceLocation={false} onChange={vi.fn()} />,
    );

    expect(screen.getByLabelText("Ubicación preferida")).toHaveValue("Palermo, Buenos Aires");
    expect(screen.getByLabelText("Ubicación preferida")).toBeEnabled();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("searches, lists suggestions, and resolves the one picked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    vi.mocked(searchPlacePredictions).mockResolvedValue([
      { placeId: "place-42", description: "Palermo, Buenos Aires, Argentina" },
    ]);
    vi.mocked(getPlaceDetails).mockResolvedValue(area());

    render(<LocationField initialArea={null} initialUseDeviceLocation={false} onChange={onChange} />);

    await user.type(screen.getByLabelText("Ubicación preferida"), "Palermo");

    const suggestion = await screen.findByRole("button", {
      name: "Palermo, Buenos Aires, Argentina",
    });
    await user.click(suggestion);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(area(), false);
    });
    expect(screen.getByLabelText("Ubicación preferida")).toHaveValue("Palermo, Buenos Aires");
  });

  it("clearing the field reports no preferred area", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <LocationField initialArea={area()} initialUseDeviceLocation={false} onChange={onChange} />,
    );

    await user.clear(screen.getByLabelText("Ubicación preferida"));

    expect(onChange).toHaveBeenLastCalledWith(null, false);
  });

  it("resolves the device location and disables manual search", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({ coords: { latitude: -34.6, longitude: -58.38 } } as GeolocationPosition);
    });
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
    vi.mocked(reverseGeocodeLocation).mockResolvedValue(area());

    render(<LocationField initialArea={null} initialUseDeviceLocation={false} onChange={onChange} />);

    await user.click(screen.getByRole("switch"));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(area(), true);
    });
    expect(screen.getByLabelText("Ubicación preferida")).toBeDisabled();
  });

  it("falls back to manual search when the device denies location access", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 1 } as GeolocationPositionError);
      },
    );
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    render(<LocationField initialArea={null} initialUseDeviceLocation={false} onChange={onChange} />);

    await user.click(screen.getByRole("switch"));

    expect(
      await screen.findByText("No pudimos acceder a la ubicación del dispositivo."),
    ).toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByLabelText("Ubicación preferida")).toBeEnabled();
  });
});
