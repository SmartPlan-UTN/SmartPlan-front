import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UserPreferencesResponse } from "@/types";

import { SurpriseButton } from "./SurpriseButton";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));

const getPreferences = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, getPreferences };
});

const EMPTY_PREFERENCES: UserPreferencesResponse = {
  categories: [],
  usualBudget: null,
  usualPeopleCount: null,
  preferredArea: null,
  useDeviceLocation: false,
  maxDistanceKm: null,
};

function mockGeolocation(
  impl: (success: PositionCallback, error: PositionErrorCallback) => void,
) {
  Object.defineProperty(globalThis.navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: vi.fn(impl) },
  });
}

describe("SurpriseButton (CU19)", () => {
  beforeEach(() => {
    push.mockReset();
    getPreferences.mockReset().mockResolvedValue(EMPTY_PREFERENCES);
  });

  afterEach(() => {
    // @ts-expect-error -- reset between tests
    delete globalThis.navigator.geolocation;
  });

  it("hands resolved coordinates up only after an explicit press", async () => {
    const user = userEvent.setup();
    mockGeolocation((success) =>
      success({
        coords: { latitude: -32.9, longitude: -68.84 },
      } as GeolocationPosition),
    );
    const onResolved = vi.fn();
    render(<SurpriseButton submitting={false} onResolved={onResolved} />);

    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /sorpréndeme/i }));

    await waitFor(() =>
      expect(onResolved).toHaveBeenCalledWith(
        { latitude: -32.9, longitude: -68.84 },
        { source: "device", hasCategoryPreferences: false },
      ),
    );
  });

  it("answers a missing location in one line, with a route to preferences", async () => {
    const user = userEvent.setup();
    mockGeolocation((_success, error) =>
      error({ code: 1 } as GeolocationPositionError),
    );
    render(<SurpriseButton submitting={false} onResolved={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /sorpréndeme/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/necesitamos tu ubicación/i);

    await user.click(screen.getByRole("button", { name: /ir a preferencias/i }));
    expect(push).toHaveBeenCalledWith("/preferences");
  });

  it("is inert while a generation is already running", () => {
    render(<SurpriseButton submitting onResolved={vi.fn()} />);

    expect(screen.getByRole("button", { name: /sorpréndeme/i })).toBeDisabled();
  });
});
