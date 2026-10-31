import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapView } from "./MapView";

const mocks = vi.hoisted(() => ({
  getMarkers: vi.fn(),
  ready: null as null | ((map: unknown) => unknown),
  markerClicks: [] as Array<() => void>,
  params: new URLSearchParams("type=tasting&itemType=ACTIVITY"),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.params,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/lib/api", () => ({ getExploreMapMarkers: mocks.getMarkers }));
vi.mock("@/lib/maps/useGoogleMap", () => ({
  useGoogleMap: (_ref: unknown, _options: unknown, ready: typeof mocks.ready) => {
    mocks.ready = ready;
    return { status: "ready", errorMessage: null };
  },
}));

afterEach(() => {
  mocks.markerClicks = [];
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function setup() {
  let idle: (() => void) | undefined;
  const fitBounds = vi.fn();
  const extend = vi.fn();
  vi.stubGlobal("google", { maps: {
    InfoWindow: class {
      content: HTMLElement;
      constructor(options: { content: HTMLElement }) { this.content = options.content; }
      close() {}
      open() { document.body.append(this.content); }
      addListener() { return { remove() {} }; }
    },
    Marker: class {
      addListener(_name: string, callback: () => void) { mocks.markerClicks.push(callback); }
      setMap() {}
      setLabel() {}
    },
    LatLngBounds: class { extend = extend; },
    Size: class {},
    Point: class {},
  } });
  const map = {
    getBounds: () => ({ toJSON: () => ({ north: -32.8, south: -32.94, east: -68.7, west: -69 }) }),
    addListener: (name: string, callback: () => void) => { if (name === "idle") idle = callback; return { remove: vi.fn() }; },
    fitBounds,
    getZoom: () => 12,
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

  it("opens a card that leads to the activity when a marker is clicked", async () => {
    mocks.getMarkers.mockResolvedValue({ data: [{
      itemType: "ACTIVITY", id: 7, activityId: 7, placeId: 3, name: "Cata en Aymara",
      placeName: "Aymara", type: "tasting", typeLabel: "Degustación", averageRating: null,
      latitude: -32.9, longitude: -68.8, categories: [], place: null,
      estimatedCost: null, price: { kind: "UNKNOWN" },
    }] });
    const map = setup();
    await act(async () => { map.idle(); });
    await act(async () => { mocks.markerClicks[0]?.(); });
    expect(screen.getByRole("link", { name: /Cata en Aymara/ })).toHaveAttribute("href", "/explore/7");
    expect(screen.getByText(/Ver actividad/)).toBeInTheDocument();
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

describe("map markers (#210)", () => {
  it("never pins the Hogar or a marker without coordinates", async () => {
    const { isMappableMarker } = await import("./MapView");
    const base = { itemType: "ACTIVITY", latitude: -32.9, longitude: -68.8, place: { kind: "park" } };
    expect(isMappableMarker(base as never)).toBe(true);
    expect(isMappableMarker({ ...base, place: { kind: "home" } } as never)).toBe(false);
    expect(isMappableMarker({ ...base, latitude: Number.NaN } as never)).toBe(false);
  });
});
