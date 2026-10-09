import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FiltersPanel, type FiltersPanelProps } from "./FiltersPanel";

vi.mock("./categoryCatalog", () => ({
  getCategoriesOnce: () =>
    Promise.resolve(
      ["Culture", "Entertainment", "Gastronomy", "Live music", "Nightlife", "Outdoors", "Sports"].map(
        (name, index) => ({ id: index + 1, name }),
      ),
    ),
}));

function props(overrides: Partial<FiltersPanelProps> = {}): FiltersPanelProps {
  return {
    minPrice: "",
    onMinPriceChange: vi.fn(),
    maxPrice: "",
    onMaxPriceChange: vi.fn(),
    minRating: "",
    onMinRatingChange: vi.fn(),
    categoryIds: [],
    onToggleCategory: vi.fn(),
    onClear: vi.fn(),
    location: {
      cities: [],
      cityId: null,
      onCityIdChange: vi.fn(),
      departments: [],
      departmentId: null,
      onDepartmentIdChange: vi.fn(),
    },
    ...overrides,
  };
}

describe("FiltersPanel", () => {
  it("shows every filter section at once (CU10)", async () => {
    render(<FiltersPanel {...props()} />);

    expect(screen.getByLabelText("Provincia")).toBeInTheDocument();
    expect(screen.getByLabelText("Localidad")).toBeInTheDocument();
    expect(screen.getByLabelText("Mínimo")).toBeInTheDocument();
    expect(screen.getByLabelText("Máximo")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Cualquiera" })).toBeChecked();
    expect(await screen.findByRole("checkbox", { name: "Culture" })).toBeInTheDocument();
  });

  it("sets the minimum rating from its radio option", async () => {
    const user = userEvent.setup();
    const onMinRatingChange = vi.fn();
    render(<FiltersPanel {...props({ onMinRatingChange })} />);

    await user.click(screen.getByRole("radio", { name: "4 ★ o más" }));

    expect(onMinRatingChange).toHaveBeenCalledWith("4");
  });

  it("toggles a category and reveals the rest of the catalog on demand", async () => {
    const user = userEvent.setup();
    const onToggleCategory = vi.fn();
    render(<FiltersPanel {...props({ categoryIds: [3], onToggleCategory })} />);

    expect(await screen.findByRole("checkbox", { name: "Gastronomy" })).toBeChecked();
    expect(screen.queryByRole("checkbox", { name: "Sports" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Culture" }));
    expect(onToggleCategory).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole("button", { name: "Ver todas (7)" }));
    expect(screen.getByRole("checkbox", { name: "Sports" })).toBeInTheDocument();
  });

  it("leaves out the location section when there is nothing to locate (plans)", () => {
    render(<FiltersPanel {...props({ location: undefined })} />);

    expect(screen.queryByLabelText("Provincia")).not.toBeInTheDocument();
  });
});
