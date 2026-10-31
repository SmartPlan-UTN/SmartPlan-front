import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CreatePlanRequestPayload } from "@/types";
import { withRequestLocation } from "./requestLocation";

const preferences = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/users", () => ({ getPreferences: preferences }));
const coordinates = { latitude: -32.89, longitude: -68.84 };
const payload: CreatePlanRequestPayload = { query: "Un plan con amigos", context: { freeOnly: true } };
let locate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  preferences.mockReset().mockResolvedValue({ useDeviceLocation: true, preferredArea: null });
  locate = vi.fn((success: PositionCallback) => success({ coords: coordinates } as GeolocationPosition));
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: locate } });
});
afterEach(() => vi.unstubAllGlobals());

it("uses the saved GPS preference without requiring a preferred area", async () => {
  expect(await withRequestLocation(payload)).toEqual({ ...payload, context: { freeOnly: true, ...coordinates } });
  expect(payload.context).toEqual({ freeOnly: true });
});
it("does not read GPS when the preference is off", async () => {
  preferences.mockResolvedValue({ useDeviceLocation: false });
  expect(await withRequestLocation(payload)).toBe(payload);
  expect(locate).not.toHaveBeenCalled();
});
it("preserves an explicitly supplied starting point, including zero coordinates", async () => {
  const explicit = { query: "Cerca del centro", context: { latitude: 0, longitude: 0 } };
  expect(await withRequestLocation(explicit)).toBe(explicit);
  expect(preferences).not.toHaveBeenCalled();
  expect(locate).not.toHaveBeenCalled();
});
it("lets the backend use its fallback when GPS is denied", async () => {
  locate.mockImplementation((_success: PositionCallback, error: PositionErrorCallback) => error({ code: 1 } as GeolocationPositionError));
  expect(await withRequestLocation(payload)).toBe(payload);
});
it("does not request GPS if loading the saved preference fails", async () => {
  preferences.mockRejectedValue(new Error("Unavailable"));
  expect(await withRequestLocation(payload)).toBe(payload);
  expect(locate).not.toHaveBeenCalled();
});
it("does not require geolocation support to submit a plan", async () => {
  vi.stubGlobal("navigator", {});
  expect(await withRequestLocation(payload)).toBe(payload);
  expect(preferences).not.toHaveBeenCalled();
});
