import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/lib/routes";

import FavoritesPage from "./page";

vi.mock("@/components/favorites", () => ({
  SavedActivitiesPanel: () => (
    <div data-testid="saved-activities-panel">Actividades guardadas</div>
  ),
  SavedPlansPanel: () => (
    <div data-testid="saved-plans-panel">Planes guardados</div>
  ),
}));

vi.mock("@/components/collection", () => ({
  CollectionsPanel: () => (
    <a href={ROUTES.createCollection}>Crear nueva colección</a>
  ),
}));

describe("FavoritesPage (CU39, CU40)", () => {
  it("renders the page heading and navigation tabs", () => {
    render(<FavoritesPage />);

    expect(
      screen.getByRole("heading", { name: "Tus favoritos", level: 1 }),
    ).toBeInTheDocument();
  });

  it("marks Actividades as default active tab and Colecciones as pending", () => {
    render(<FavoritesPage />);

    expect(
      screen.getByRole("button", { name: "Actividades" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("button", { name: "Planes" }),
    ).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Colecciones")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("renders the SavedActivitiesPanel by default (CU39)", () => {
    render(<FavoritesPage />);

    expect(screen.getByTestId("saved-activities-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("saved-plans-panel")).not.toBeInTheDocument();
  });

  it("switches to SavedPlansPanel when clicking Planes tab (CU40)", async () => {
    const user = userEvent.setup();
    render(<FavoritesPage />);

    const plansTab = screen.getByRole("button", { name: "Planes" });
    await user.click(plansTab);

    expect(plansTab).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("saved-plans-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("saved-activities-panel")).not.toBeInTheDocument();
  });

  it("renders the CollectionsPanel below the active panel (CU34)", () => {
    render(<FavoritesPage />);

    expect(
      screen.getByRole("link", { name: "Crear nueva colección" }),
    ).toHaveAttribute("href", ROUTES.createCollection);
  });
});
