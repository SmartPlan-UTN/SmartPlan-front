import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PreferredAreaMap } from "./PreferredAreaMap";

const geocode = vi.hoisted(() => vi.fn());
const layer = vi.hoisted(() => ({ setMarkers: vi.fn(), destroy: vi.fn() }));
const map = vi.hoisted(() => ({ panTo: vi.fn(), setZoom: vi.fn(), getZoom: () => 14, addListener: vi.fn(() => ({ remove: vi.fn() })) }));
vi.mock("@/lib/maps/htmlMarkerLayer", () => ({ createHtmlMarkerLayer: () => layer }));
vi.mock("@/lib/maps/useGoogleMap", async () => {
  const { useEffect } = await import("react");
  return { useGoogleMap: (_host: unknown, _options: unknown, ready: (value: unknown) => void) => {
    useEffect(() => { ready(map); }, [ready]);
    return { status: "ready" };
  } };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("google", { maps: {
    LatLng: class { constructor(private latitude: number, private longitude: number) {} lat() { return this.latitude; } lng() { return this.longitude; } },
    Geocoder: class { geocode = geocode; },
  } });
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: -32.9, longitude: -68.8 } } as GeolocationPosition) } });
  geocode.mockResolvedValue({ results: [{ place_id: "zone", types: ["locality"], formatted_address: "Ciudad de Mendoza",
    address_components: [{ long_name: "Ciudad de Mendoza", types: ["locality"] }] }] });
});
afterEach(() => vi.unstubAllGlobals());

it("picks and names the device position through the same map selection flow", async () => {
  const pick = vi.fn();
  const locating = vi.fn();
  render(<PreferredAreaMap area={null} onPick={pick} onPickError={vi.fn()} onLocatingChange={locating} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Usar mi ubicación" }));
  await waitFor(() => expect(pick).toHaveBeenCalledWith({
    area: { label: "Ciudad de Mendoza", placeId: "zone", latitude: -32.9, longitude: -68.8 }, address: "Ciudad de Mendoza",
  }));
  expect(locating).toHaveBeenLastCalledWith(false);
});

it("explains denied GPS access and leaves the existing area unchanged", async () => {
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => error({ code: 1 } as GeolocationPositionError) } });
  const error = vi.fn(); const pick = vi.fn();
  render(<PreferredAreaMap area={null} onPick={pick} onPickError={error} onLocatingChange={vi.fn()} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Usar mi ubicación" }));
  await waitFor(() => expect(error).toHaveBeenCalledWith(expect.stringContaining("No tenemos permiso")));
  expect(pick).not.toHaveBeenCalled();
});

it("ignores an old GPS reply after the user edits the area text", async () => {
  let resolvePosition: PositionCallback = () => undefined;
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: (success: PositionCallback) => { resolvePosition = success; } } });
  const pick = vi.fn(); const props = { area: null, onPick: pick, onPickError: vi.fn(), onLocatingChange: vi.fn() };
  const { rerender } = render(<PreferredAreaMap {...props} selectionKey="" />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Usar mi ubicación" }));
  rerender(<PreferredAreaMap {...props} selectionKey="Otra zona" />);
  await act(async () => { resolvePosition({ coords: { latitude: -32.9, longitude: -68.8 } } as GeolocationPosition); });
  expect(pick).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Usar mi ubicación" })).toBeEnabled();
});
