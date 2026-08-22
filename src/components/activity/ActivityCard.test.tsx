import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ActivitySearchResult } from "@/types";

import { ActivityCard } from "./ActivityCard";

const baseActivity: ActivitySearchResult = {
  id: 1,
  name: "Ruta del vino",
  description: "Recorrido por bodegas de Luján de Cuyo con degustación.",
  estimatedCost: 15000,
  estimatedDuration: 180,
  type: "wine-tour",
  averageRating: 4.5,
  ratingCount: 32,
  distanceKm: 2.3,
  categories: [
    { id: 1, name: "Gastronómico" },
    { id: 2, name: "Cultural" },
  ],
};

describe("ActivityCard", () => {
  it("renders the activity's name, description, cost, and categories", () => {
    render(<ActivityCard activity={baseActivity} />);

    expect(
      screen.getByRole("heading", { name: "Ruta del vino" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Recorrido por bodegas/),
    ).toBeInTheDocument();
    expect(screen.getByText(/15\.000/)).toBeInTheDocument();
    expect(screen.getByText("Gastronómico")).toBeInTheDocument();
    expect(screen.getByText("Cultural")).toBeInTheDocument();
  });

  it("shows the distance when it's available", () => {
    render(<ActivityCard activity={baseActivity} />);

    expect(screen.getByText("2.3 km")).toBeInTheDocument();
  });

  it("omits the distance when the backend doesn't send it", () => {
    render(
      <ActivityCard activity={{ ...baseActivity, distanceKm: null }} />,
    );

    expect(screen.queryByText(/km$/)).not.toBeInTheDocument();
  });

  it("only shows the first two categories", () => {
    render(
      <ActivityCard
        activity={{
          ...baseActivity,
          categories: [
            { id: 1, name: "Uno" },
            { id: 2, name: "Dos" },
            { id: 3, name: "Tres" },
          ],
        }}
      />,
    );

    expect(screen.getByText("Uno")).toBeInTheDocument();
    expect(screen.getByText("Dos")).toBeInTheDocument();
    expect(screen.queryByText("Tres")).not.toBeInTheDocument();
  });
});
