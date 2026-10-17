import { act, render, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { ResultsMapPlanPin } from "@/lib/maps/buildPlanPins";
import { ResultsMap, type ResultsMapHandle } from "./ResultsMap";

vi.mock("@/lib/maps/loadGoogleMaps", () => ({ loadGoogleMaps: async () => undefined }));
vi.mock("@/hooks", () => ({ useReducedMotion: () => true }));

class Bounds {
  positions: google.maps.LatLngLiteral[] = [];
  extend(position: google.maps.LatLngLiteral) { this.positions.push(position); return this; }
  getCenter() { return this.positions[0]; }
}

let zoom: number;
let idleListeners: Set<() => void>;
const map = {
  setCenter: vi.fn(), setZoom: vi.fn((value: number) => { zoom = value; }),
  getZoom: () => zoom, fitBounds: vi.fn(), panTo: vi.fn(),
};
const trigger = vi.fn();
const clearInstanceListeners = vi.fn();

function idle(nextZoom: number) {
  zoom = nextZoom;
  act(() => { [...idleListeners].forEach((listener) => listener()); });
}

function plan(planId: number, positions: google.maps.LatLngLiteral[]): ResultsMapPlanPin {
  return { planId, color: "orange", stops: positions.map((position, index) => ({
    ...position, activityId: index + 1, name: `Stop ${index}`, order: index + 1,
  })) };
}

const first = { lat: -32.9, lng: -68.8 };
const nearby = { lat: -32.9001, lng: -68.8001 };
const far = { lat: -33.9, lng: -69.8 };
const callbacks = { onPinClick: vi.fn(), onPinHover: vi.fn(), activePlanId: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(500);
  zoom = 12;
  idleListeners = new Set();
  vi.stubGlobal("google", { maps: {
    Map: class { constructor() { return map; } },
    Marker: class {
      addListener = vi.fn(); setMap = vi.fn(); setIcon = vi.fn(); setOpacity = vi.fn(); setZIndex = vi.fn();
    },
    Polyline: class { setMap = vi.fn(); setOptions = vi.fn(); },
    Size: class {}, Point: class {}, LatLngBounds: Bounds,
    event: {
      trigger, clearInstanceListeners,
      addListenerOnce: (_map: unknown, _event: string, callback: () => void) => {
        const once = () => { idleListeners.delete(once); callback(); };
        idleListeners.add(once);
        return { remove: () => idleListeners.delete(once) };
      },
    },
  } });
});
afterAll(() => vi.unstubAllGlobals());

async function ready() { await waitFor(() => expect(map.setCenter.mock.calls.length + map.fitBounds.mock.calls.length).toBeGreaterThan(0)); }

describe("ResultsMap framing", () => {
  it.each([[first], [first, first]])("frames one distinct location at neighborhood zoom: %j", async (...positions) => {
    render(<ResultsMap {...callbacks} plans={[plan(1, positions)]} />);
    await ready();
    expect(map.setCenter).toHaveBeenLastCalledWith(first);
    expect(map.setZoom).toHaveBeenLastCalledWith(15);
    expect(map.fitBounds).not.toHaveBeenCalled();
  });

  it("caps nearby stops after asynchronous fit completion and then permits manual zoom", async () => {
    render(<ResultsMap {...callbacks} plans={[plan(1, [first, nearby])]} />);
    await ready();
    expect(map.fitBounds).toHaveBeenLastCalledWith(expect.objectContaining({ positions: [first, nearby] }), 48);
    expect(map.setZoom).not.toHaveBeenCalled();
    idle(21);
    expect(zoom).toBe(15);
    map.setZoom(19);
    idle(19);
    expect(zoom).toBe(19);
  });

  it("keeps the fit zoom and all bounds for distant stops", async () => {
    render(<ResultsMap {...callbacks} plans={[plan(1, [first, far])]} />);
    await ready();
    expect(map.fitBounds).toHaveBeenLastCalledWith(expect.objectContaining({ positions: [first, far] }), 48);
    idle(9);
    expect(map.setZoom).not.toHaveBeenCalled();
    expect(zoom).toBe(9);
  });

  it("does not frame empty plans", async () => {
    const { unmount } = render(<ResultsMap {...callbacks} plans={[plan(1, [])]} />);
    await act(async () => undefined);
    expect(map.fitBounds).not.toHaveBeenCalled();
    expect(map.setZoom).not.toHaveBeenCalled();
    unmount();
    expect(clearInstanceListeners).toHaveBeenCalled();
  });

  it("replays a selected route when the hidden mobile map opens", async () => {
    const ref = createRef<ResultsMapHandle>();
    const plans = [plan(1, [first]), plan(2, [far])];
    const { rerender } = render(<ResultsMap {...callbacks} ref={ref} plans={plans} visible={false} />);
    await ready();
    act(() => ref.current?.panToPlan(2));
    rerender(<ResultsMap {...callbacks} ref={ref} plans={plans} visible />);
    expect(trigger).toHaveBeenCalledWith(map, "resize");
    expect(map.setCenter).toHaveBeenLastCalledWith(far);
    expect(map.setZoom).toHaveBeenLastCalledWith(15);
  });

  it("caps explicit route framing and cancels superseded and unmounted fits", async () => {
    const ref = createRef<ResultsMapHandle>();
    const plans = [plan(1, [first, nearby]), plan(2, [far])];
    const { unmount } = render(<ResultsMap {...callbacks} ref={ref} plans={plans} />);
    await ready();
    act(() => ref.current?.panToPlan(1));
    expect(idleListeners.size).toBe(1);
    expect(map.fitBounds).toHaveBeenLastCalledWith(expect.objectContaining({ positions: [first, nearby] }), 64);
    idle(21);
    expect(zoom).toBe(15);
    act(() => ref.current?.panToPlan(1));
    act(() => ref.current?.panToPlan(2));
    expect(idleListeners.size).toBe(0);
    act(() => ref.current?.panToPlan(1));
    unmount();
    expect(idleListeners.size).toBe(0);
  });

  it("refits and caps all plans when toggling Lista/Mapa without a route selection", async () => {
    const plans = [plan(1, [first, nearby])];
    const { rerender } = render(<ResultsMap {...callbacks} plans={plans} visible={false} />);
    await ready();
    rerender(<ResultsMap {...callbacks} plans={plans} visible />);
    expect(map.fitBounds).toHaveBeenLastCalledWith(expect.objectContaining({ positions: [first, nearby] }), 48);
    expect(idleListeners.size).toBe(1);
    idle(20);
    expect(zoom).toBe(15);
  });
});


it("defers framing a zero-size mobile viewport and keeps its pending route", async () => {
  const width = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(0);
  const ref = createRef<ResultsMapHandle>();
  const plans = [plan(1, [first]), plan(2, [far])];
  const { rerender } = render(<ResultsMap {...callbacks} ref={ref} plans={plans} visible={false} />);
  await act(async () => undefined);
  expect(map.fitBounds).not.toHaveBeenCalled();
  act(() => ref.current?.panToPlan(2));
  expect(map.setCenter).not.toHaveBeenCalled();
  width.mockReturnValue(390);
  rerender(<ResultsMap {...callbacks} ref={ref} plans={plans} visible />);
  expect(map.setCenter).toHaveBeenLastCalledWith(far);
  expect(map.setZoom).toHaveBeenLastCalledWith(15);
});
