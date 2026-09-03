import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/lib/routes";

import FavoritesPage, { metadata } from "./page";

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

  it("keeps route metadata in the server page", () => {
    expect(metadata.title).toBe("Favoritos");
  });

  it("marks Actividades as the default active tab", () => {
    render(<FavoritesPage />);

    expect(
      screen.getByRole("tab", { name: "Actividades" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("tab", { name: "Planes" }),
    ).toHaveAttribute("aria-selected", "false");
  });

  it("renders the SavedActivitiesPanel by default (CU39)", () => {
    render(<FavoritesPage />);

    expect(screen.getByTestId("saved-activities-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("saved-plans-panel")).not.toBeInTheDocument();
  });

  it("switches to SavedPlansPanel when clicking Planes tab (CU40)", async () => {
    const user = userEvent.setup();
    render(<FavoritesPage />);

    const plansTab = screen.getByRole("tab", { name: "Planes" });
    await user.click(plansTab);

    expect(plansTab).toHaveAttribute("aria-selected", "true");
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
