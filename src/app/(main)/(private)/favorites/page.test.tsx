import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/lib/routes";

import FavoritesPage from "./page";

vi.mock("@/components/collection", () => ({
  CollectionsPanel: () => (
    <a href={ROUTES.createCollection}>Crear nueva colección</a>
  ),
}));

vi.mock("@/components/ui", () => ({
  MoodBackground: ({ mood }: { mood: string }) => (
    <div data-testid="mood-background" data-mood={mood} />
  ),
}));

describe("FavoritesPage collection navigation", () => {
  it("separates the pending favorites sections from the active collections section", () => {
    render(<FavoritesPage />);

    expect(screen.getByText("Planes")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Actividades")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByText("Colecciones")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Crear nueva colección" }),
    ).toHaveAttribute("href", ROUTES.createCollection);
    expect(screen.getByTestId("mood-background")).toHaveAttribute(
      "data-mood",
      "idle",
    );
  });

  it("does not render mock favorite or collection data", () => {
    render(<FavoritesPage />);

    expect(screen.queryByText("Bodegas para visitar")).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ actividades/)).not.toBeInTheDocument();
  });
});
