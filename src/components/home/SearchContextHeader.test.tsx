import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchContextHeader } from "./SearchContextHeader";

const context = { budget: null, partySize: null, departmentName: null, categories: [] };

describe("SearchContextHeader applied preferences (CU18)", () => {
  it("shows the radius only when the backend applied it", () => {
    render(<SearchContextHeader mode="auto" planCount={1} resolvedContext={{ ...context, appliedMaxDistanceKm: 5 }} />);
    expect(screen.getByText("Hasta 5 km")).toBeInTheDocument();
  });
  it.each([null, undefined])("does not claim a distance filter for %s", (appliedMaxDistanceKm) => {
    render(<SearchContextHeader mode="auto" planCount={1} resolvedContext={{ ...context, appliedMaxDistanceKm }} />);
    expect(screen.queryByText(/Hasta .* km/)).not.toBeInTheDocument();
  });
});

describe("SearchContextHeader occasions, at home and free (#210)", () => {
  it("shows what the plans respect", () => {
    render(
      <SearchContextHeader
        mode="auto"
        planCount={2}
        resolvedContext={{ ...context, atHome: true, freeOnly: true, occasions: ["quiet", "romantic", "nope"] }}
      />,
    );
    expect(screen.getByText("En casa")).toBeInTheDocument();
    expect(screen.getByText("Gratis")).toBeInTheDocument();
    expect(screen.getByText("En pareja")).toBeInTheDocument();
    expect(screen.getByText("Tranquilo")).toBeInTheDocument();
    expect(screen.queryByText("nope")).not.toBeInTheDocument();
  });

  it("shows nothing for a plain search", () => {
    render(<SearchContextHeader mode="auto" planCount={1} resolvedContext={{ ...context, occasions: [], atHome: false, freeOnly: false }} />);
    expect(screen.queryByText("En casa")).not.toBeInTheDocument();
    expect(screen.queryByText("Gratis")).not.toBeInTheDocument();
  });
});
