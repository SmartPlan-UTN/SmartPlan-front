import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PreferredAreaField } from "./PreferredAreaField";

const loadGoogleMaps = vi.hoisted(() =>
  vi.fn(() => Promise.reject(new Error("No Maps key in tests"))),
);

vi.mock("@/lib/maps/loadGoogleMaps", () => ({
  GOOGLE_MAPS_AUTH_FAILURE_EVENT: "smartplan:maps-auth-failure",
  loadGoogleMaps,
}));

function renderField() {
  render(
    <PreferredAreaField
      text=""
      resolved={null}
      onTextChange={vi.fn()}
      onResolvedChange={vi.fn()}
      onStatusChange={vi.fn()}
      onLocatingChange={vi.fn()}
    />,
  );
}

describe("PreferredAreaField", () => {
  it("loads Google Maps only once the map is asked for", async () => {
    const user = userEvent.setup();
    renderField();

    expect(loadGoogleMaps).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Elegir en el mapa" }));

    expect(loadGoogleMaps).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(/El mapa no está disponible ahora/),
    ).toBeInTheDocument();
  });
});
