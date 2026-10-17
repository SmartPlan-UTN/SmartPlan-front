import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapView } from "./MapView";

const mocks = vi.hoisted(() => ({
  getMarkers: vi.fn(),
  ready: null as null | ((map: unknown) => unknown),
  params: new URLSearchParams("type=tasting&itemType=ACTIVITY"),
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => mocks.params }));
vi.mock("@/lib/api", () => ({ getExploreMapMarkers: mocks.getMarkers }));
vi.mock("@/lib/maps/useGoogleMap", () => ({
  useGoogleMap: (_ref: unknown, _options: unknown, ready: typeof mocks.ready) => {
    mocks.ready = ready;
    return { status: "ready", errorMessage: null };
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function setup() {
  let idle: (() => void) | undefined;
  const fitBounds = vi.fn();
  const extend = vi.fn();
  vi.stubGlobal("google", { maps: {
    InfoWindow: class { close() {} },
    Marker: class { addListener() {} setMap() {} },
    LatLngBounds: class { extend = extend; },
  } });
  const map = {
    getBounds: () => ({ toJSON: () => ({ north: -32.8, south: -32.94, east: -68.7, west: -69 }) }),
    addListener: (_name: string, callback: () => void) => { idle = callback; return { remove: vi.fn() }; },
    fitBounds,
  };
  render(<MapView />);
  mocks.ready?.(map);
  return { idle: () => idle?.(), fitBounds, extend };
}

describe("Explore map", () => {
  it("uses a valid page size and frames filtered results outside downtown", async () => {
    mocks.getMarkers.mockResolvedValue({ data: [{ itemType: "ACTIVITY", latitude: -33.45, longitude: -69.21, name: "Cata" }] });
    const map = setup();
    await act(async () => { map.idle(); });
    expect(mocks.getMarkers).toHaveBeenCalledWith(expect.objectContaining({ limit: 100, type: "tasting", itemType: "ACTIVITY", south: -90 }));
    expect(map.extend).toHaveBeenCalledWith({ lat: -33.45, lng: -69.21 });
    expect(map.fitBounds).toHaveBeenCalledOnce();
    await act(async () => { map.idle(); });
    expect(mocks.getMarkers).toHaveBeenLastCalledWith(expect.objectContaining({ south: -32.94 }));
    expect(map.fitBounds).toHaveBeenCalledOnce();
  });

  it("explains a failed marker request and allows a pan to retry", async () => {
    mocks.getMarkers.mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce({ data: [] });
    const map = setup();
    await act(async () => { map.idle(); });
    expect(screen.getByRole("status")).toHaveTextContent("No pudimos actualizar");
    await act(async () => { map.idle(); });
    expect(screen.getByRole("status")).toHaveTextContent("No hay resultados");
  });
});
