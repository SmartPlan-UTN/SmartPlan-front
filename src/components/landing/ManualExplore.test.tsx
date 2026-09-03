import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ROUTES } from "@/lib/routes";
import { ManualExplore } from "./ManualExplore";

describe("ManualExplore", () => {
  it("offers the verified manual exploration path", () => {
    render(<ManualExplore />);
    expect(screen.getByRole("link", { name: /explorar lugares/i })).toHaveAttribute("href", ROUTES.explore);
    for (const capability of ["Búsqueda", "Categorías", "Precio", "Rating", "Cercanía y mapa", "Ordenamiento"]) {
      expect(screen.getByText(capability)).toBeInTheDocument();
    }
  });
});
