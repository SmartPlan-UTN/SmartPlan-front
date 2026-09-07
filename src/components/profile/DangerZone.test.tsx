import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionProvider } from "@/lib/auth";
import { refreshSession } from "@/lib/auth/api";

import { DangerZone } from "./DangerZone";

vi.mock("@/lib/auth/api", () => ({
  refreshSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

function renderDangerZone() {
  return render(
    <SessionProvider>
      <DangerZone />
    </SessionProvider>,
  );
}

describe("DangerZone", () => {
  beforeEach(() => {
    vi.mocked(refreshSession).mockRejectedValue(new Error("no session"));
  });

  it("shows the static warning card, matching the prototype's copy", () => {
    renderDangerZone();

    expect(screen.getByRole("button", { name: "Eliminar cuenta" })).toBeInTheDocument();
    expect(
      screen.getByText("Esta acción es irreversible y eliminará todos tus datos."),
    ).toBeInTheDocument();
  });

  it("opens the confirmation dialog on click, closed until then", async () => {
    const user = userEvent.setup();
    renderDangerZone();

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar cuenta" }));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("closes the dialog when its Cancelar is clicked", async () => {
    const user = userEvent.setup();
    renderDangerZone();

    await user.click(screen.getByRole("button", { name: "Eliminar cuenta" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
