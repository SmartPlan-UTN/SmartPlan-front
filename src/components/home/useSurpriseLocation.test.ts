import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UserPreferencesResponse } from "@/types";

import { useSurpriseLocation } from "./useSurpriseLocation";

const getPreferences = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, getPreferences };
});

const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;

function preferences(
  overrides: Partial<UserPreferencesResponse> = {},
): UserPreferencesResponse {
  return {
    categories: [],
    usualBudget: null,
    usualPeopleCount: null,
    preferredArea: null,
    useDeviceLocation: false,
    maxDistanceKm: null,
    ...overrides,
  };
}

function mockGeolocation(
  impl: (
    success: PositionCallback,
    error: PositionErrorCallback,
  ) => void,
) {
  Object.defineProperty(globalThis.navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: vi.fn(impl) },
  });
}

describe("useSurpriseLocation", () => {
  beforeEach(() => {
    getPreferences.mockReset().mockResolvedValue(preferences());
  });

  afterEach(() => {
    // @ts-expect-error -- reset between tests
    delete globalThis.navigator.geolocation;
  });

  it("resolves the device coordinates when permission is granted", async () => {
    mockGeolocation((success) =>
      success({
        coords: { latitude: -32.9, longitude: -68.84 },
      } as GeolocationPosition),
    );

    const { result } = renderHook(() => useSurpriseLocation());
    act(() => result.current.request());

    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: "resolved",
        coords: { latitude: -32.9, longitude: -68.84 },
        source: "device",
      }),
    );
  });

  it("falls back to the saved preferred area when GPS is denied", async () => {
    getPreferences.mockResolvedValue(
      preferences({
        preferredArea: {
          label: "Godoy Cruz",
          placeId: "abc",
          latitude: -32.92,
          longitude: -68.84,
        },
      }),
    );
    mockGeolocation((_success, error) =>
      error({ code: PERMISSION_DENIED } as GeolocationPositionError),
    );

    const { result } = renderHook(() => useSurpriseLocation());
    act(() => result.current.request());

    await waitFor(() =>
      expect(result.current.state).toMatchObject({
        status: "resolved",
        source: "preferred-area",
        coords: { latitude: -32.92, longitude: -68.84 },
      }),
    );
  });

  it("surfaces an actionable error when GPS is denied and there is no preferred area", async () => {
    mockGeolocation((_success, error) =>
      error({ code: PERMISSION_DENIED } as GeolocationPositionError),
    );

    const { result } = renderHook(() => useSurpriseLocation());
    act(() => result.current.request());

    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: "error",
        kind: "no-location",
      }),
    );
  });

  it("falls back the same way when the position is unavailable", async () => {
    getPreferences.mockResolvedValue(
      preferences({
        preferredArea: {
          label: "Ciudad",
          placeId: "xyz",
          latitude: -32.89,
          longitude: -68.85,
        },
      }),
    );
    mockGeolocation((_success, error) =>
      error({ code: POSITION_UNAVAILABLE } as GeolocationPositionError),
    );

    const { result } = renderHook(() => useSurpriseLocation());
    act(() => result.current.request());

    await waitFor(() =>
      expect(result.current.state).toMatchObject({ status: "resolved" }),
    );
  });

  it("reports whether the user has saved interest categories", async () => {
    getPreferences.mockResolvedValue(
      preferences({ categories: [{ id: 1, name: "Vinos", description: null }] }),
    );
    mockGeolocation((success) =>
      success({
        coords: { latitude: 0, longitude: 0 },
      } as GeolocationPosition),
    );

    const { result } = renderHook(() => useSurpriseLocation());
    act(() => result.current.request());

    await waitFor(() =>
      expect(result.current.hasCategoryPreferences).toBe(true),
    );
  });
});
