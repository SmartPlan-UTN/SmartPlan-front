import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/lib/routes";

import FavoritesPage from "./page";

vi.mock("@/components/favorites", () => ({
  SavedActivitiesPanel: () => (
    <div data-testid="saved-activities-panel">Actividades guardadas</div>
  ),
}));

vi.mock("@/components/collection", () => ({
  CollectionsPanel: () => (
    <a href={ROUTES.createCollection}>Crear nueva colección</a>
  ),
}));

describe("FavoritesPage (CU39)", () => {
  it("renders the page heading and navigation tabs", () => {
    render(<FavoritesPage />);

    expect(
      screen.getByRole("heading", { name: "Tus favoritos", level: 1 }),
    ).toBeInTheDocument();
  });

  it("marks Actividades as the active tab and Planes and Colecciones as pending", () => {
    render(<FavoritesPage />);

    expect(screen.getByText("Planes")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Actividades")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("Colecciones")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("renders the SavedActivitiesPanel (CU39)", () => {
    render(<FavoritesPage />);

    expect(screen.getByTestId("saved-activities-panel")).toBeInTheDocument();
  });

  it("renders the CollectionsPanel below the activities (CU34)", () => {
    render(<FavoritesPage />);

    expect(
      screen.getByRole("link", { name: "Crear nueva colección" }),
    ).toHaveAttribute("href", ROUTES.createCollection);
  });
});
