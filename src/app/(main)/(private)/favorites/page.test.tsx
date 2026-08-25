import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ROUTES } from "@/lib/routes";

import FavoritesPage from "./page";

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
  });

  it("does not render mock favorite or collection data", () => {
    render(<FavoritesPage />);

    expect(screen.queryByText("Bodegas para visitar")).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ actividades/)).not.toBeInTheDocument();
  });
});
