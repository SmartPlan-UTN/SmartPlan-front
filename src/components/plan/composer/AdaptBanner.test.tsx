import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdaptBanner, adaptationChanges, type AdaptSource } from "./AdaptBanner";

const source: AdaptSource = {
  id: 43,
  title: "Una tarde sin apuro",
  authorUsername: "viajero1",
  authorAvatarUrl: null,
  peopleCount: 2,
  stopKeys: ["a1", "a2", "a3"],
  totalCost: 37000,
  totalLabel: "$ 37.000",
  duration: 465,
};

describe("adaptationChanges", () => {
  it("reports nothing while the draft is still the original", () => {
    expect(adaptationChanges(source, { peopleCount: 2, stopKeys: ["a1", "a2", "a3"], totalCost: 37000 })).toEqual([]);
  });

  it("reports company, stops and budget as they change", () => {
    expect(adaptationChanges(source, { peopleCount: 4, stopKeys: ["a1", "a3"], totalCost: 20000 })).toEqual([
      "Compañía",
      "Paradas",
      "Presupuesto",
    ]);
  });

  it("treats a reordered itinerary as a change of stops", () => {
    expect(adaptationChanges(source, { peopleCount: 2, stopKeys: ["a2", "a1", "a3"], totalCost: 37000 })).toEqual(["Paradas"]);
  });
});

describe("AdaptBanner", () => {
  it("says the original is untouched and keeps the credit", () => {
    render(<AdaptBanner source={source} current={{ peopleCount: 2, stopKeys: source.stopKeys, totalCost: 37000 }} />);

    expect(screen.getByText(/El original no cambia/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Inspirado en.*Una tarde sin apuro/ })).toHaveAttribute("href", expect.stringContaining("/plans/43"));
    expect(screen.getAllByRole("link", { name: /@viajero1/ })[0]).toHaveAttribute("href", "/community/creators/viajero1");
  });

  it("tells assistive tech which parts were changed", () => {
    render(<AdaptBanner source={source} current={{ peopleCount: 5, stopKeys: source.stopKeys, totalCost: 37000 }} />);

    expect(screen.getByText("Compañía").closest("li")).toHaveTextContent("Compañía: cambiado");
    expect(screen.getByText("Paradas").closest("li")).toHaveTextContent("Paradas: igual al original");
  });
});
