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
