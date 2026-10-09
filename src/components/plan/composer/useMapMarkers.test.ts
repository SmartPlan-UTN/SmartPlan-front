import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getActivityMapMarkers } from "@/lib/api";
import type { ActivityMapMarker } from "@/types";

import type { Bounds } from "./mapGeometry";
import { clearMapMarkerCache, useMapMarkers } from "./useMapMarkers";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, getActivityMapMarkers: vi.fn() };
});

/** Just enough of a Google map: a camera and an "idle" event to fire. */
function fakeMap(view: Bounds, zoom = 13) {
  const idle: (() => void)[] = [];
  const camera = { view, zoom };
  const map = {
    getZoom: () => camera.zoom,
    getBounds: () => ({ toJSON: () => camera.view }),
    addListener: (event: string, handler: () => void) => {
      if (event === "idle") idle.push(handler);
      return { remove: () => idle.splice(idle.indexOf(handler), 1) };
    },
  };
  return {
    map: map as unknown as google.maps.Map,
    moveTo(next: Bounds, nextZoom = camera.zoom) {
      camera.view = next;
      camera.zoom = nextZoom;
      idle.forEach((handler) => handler());
    },
  };
}

function marker(id: number): ActivityMapMarker {
  return {
    id,
    activityId: id,
    placeId: id,
    name: `Actividad ${id}`,
    placeName: "Lugar",
    address: "Calle",
    estimatedCost: 1000,
    type: null,
    averageRating: 0,
    latitude: -32.89,
    longitude: -68.84,
    distanceKm: null,
    categories: [],
  };
}

function page(count: number, total = count) {
  return {
    data: Array.from({ length: count }, (_, index) => marker(index + 1)),
    pagination: {
      page: 1,
      limit: 100,
      total,
      totalPages: Math.ceil(total / 100),
    },
  };
}

const CITY = { south: -32.92, west: -68.9, north: -32.86, east: -68.82 };

beforeEach(() => {
  vi.clearAllMocks();
  clearMapMarkerCache();
});

describe("useMapMarkers", () => {
  it("answers a query with one request and never repeats it", async () => {
    vi.mocked(getActivityMapMarkers).mockResolvedValue(page(34));
    const { map, moveTo } = fakeMap(CITY);
    const params = { sortBy: "relevance" as const };
    const { result, rerender, unmount } = renderHook(
      ({ query }) => useMapMarkers(map, query, true),
      { initialProps: { query: params } },
    );

    await waitFor(() => expect(result.current.candidates).toHaveLength(34));
    expect(getActivityMapMarkers).toHaveBeenCalledOnce();
    // The whole catalog came back: panning needs nothing more.
    act(() => moveTo({ ...CITY, west: -69.5, east: -69.4 }));
    // An equal query (a new object) is the same query.
    rerender({ query: { sortBy: "relevance" } });
    unmount();

    // Back on the map later (List → Map): straight from what was loaded.
    const again = renderHook(() => useMapMarkers(map, params, true));
    await waitFor(() =>
      expect(again.result.current.candidates).toHaveLength(34),
    );
    expect(getActivityMapMarkers).toHaveBeenCalledOnce();
  });

  it("follows the camera only when a query is cut off, and only past what is loaded", async () => {
    vi.mocked(getActivityMapMarkers).mockResolvedValue(page(100, 450));
    const { map, moveTo } = fakeMap(CITY);
    const { result } = renderHook(() =>
      useMapMarkers(map, { sortBy: "relevance" }, true),
    );

    // The whole catalog first, then (cut off) the visible area, padded.
    await waitFor(() => expect(getActivityMapMarkers).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.truncated).toBe(true));
    const viewport = vi.mocked(getActivityMapMarkers).mock.calls[1][0];
    expect(viewport.north).toBeGreaterThan(CITY.north);
    expect(viewport.south).toBeLessThan(CITY.south);

    // A small pan inside the padded area: nothing to ask.
    act(() =>
      moveTo({
        south: CITY.south + 0.005,
        west: CITY.west + 0.005,
        north: CITY.north + 0.005,
        east: CITY.east + 0.005,
      }),
    );
    expect(getActivityMapMarkers).toHaveBeenCalledTimes(2);

    // Out of it: ask for the new area.
    act(() => moveTo({ ...CITY, west: -69.3, east: -69.2 }));
    await waitFor(() => expect(getActivityMapMarkers).toHaveBeenCalledTimes(3));
  });

  it("asks nothing while the list's gate is closed", () => {
    const { map } = fakeMap(CITY);
    renderHook(() => useMapMarkers(map, { search: "vi" }, false));
    expect(getActivityMapMarkers).not.toHaveBeenCalled();
  });
});
