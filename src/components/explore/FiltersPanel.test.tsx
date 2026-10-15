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
    expect(await screen.findByRole("checkbox", { name: "Cultura" })).toBeInTheDocument();
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

    expect(await screen.findByRole("checkbox", { name: "Gastronomía" })).toBeChecked();
    expect(screen.queryByRole("checkbox", { name: "Deportes" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Cultura" }));
    expect(onToggleCategory).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole("button", { name: "Ver todas (7)" }));
    expect(screen.getByRole("checkbox", { name: "Deportes" })).toBeInTheDocument();
  });

  it("labels both location levels visibly and keeps Localidad locked until a Provincia is picked", () => {
    render(<FiltersPanel {...props()} />);

    expect(screen.getByText("Provincia")).toBeVisible();
    expect(screen.getByText("Localidad")).toBeVisible();
    expect(screen.getByLabelText("Provincia")).toHaveTextContent("Cualquier provincia");
    const department = screen.getByLabelText("Localidad");
    expect(department).toHaveTextContent("Cualquier localidad");
    expect(department).not.toHaveTextContent(/provincia/i);
    expect(department).toBeDisabled();
    expect(department).toHaveAccessibleDescription(
      "Elegí primero una provincia para ver sus localidades.",
    );
  });

  it("offers the localities of the chosen Provincia and reports the pick", async () => {
    const user = userEvent.setup();
    const onDepartmentIdChange = vi.fn();
    render(
      <FiltersPanel
        {...props({
          location: {
            cities: [{ id: 1, name: "Mendoza" }],
            cityId: 1,
            onCityIdChange: vi.fn(),
            departments: [{ id: 7, name: "Godoy Cruz" }],
            departmentId: null,
            onDepartmentIdChange,
          },
        })}
      />,
    );

    const department = screen.getByLabelText("Localidad");
    expect(department).toBeEnabled();
    expect(department).not.toHaveAccessibleDescription();

    await user.click(department);
    await user.click(screen.getByRole("option", { name: "Godoy Cruz" }));

    expect(onDepartmentIdChange).toHaveBeenCalledWith(7);
  });

  it("tells loading, empty and failed localities apart from the options", async () => {
    const user = userEvent.setup();
    const onRetryDepartments = vi.fn();
    const location = {
      cities: [{ id: 1, name: "Mendoza" }],
      cityId: 1,
      onCityIdChange: vi.fn(),
      departments: [],
      departmentId: null,
      onDepartmentIdChange: vi.fn(),
      onRetryDepartments,
    };
    const { rerender } = render(
      <FiltersPanel {...props({ location: { ...location, departmentsLoading: true } })} />,
    );

    expect(screen.getByLabelText("Localidad")).toBeDisabled();
    expect(screen.getByLabelText("Localidad")).toHaveAccessibleDescription(
      "Cargando localidades...",
    );

    rerender(<FiltersPanel {...props({ location })} />);
    expect(screen.getByLabelText("Localidad")).toHaveAccessibleDescription(
      "No hay localidades disponibles en esta provincia.",
    );

    rerender(<FiltersPanel {...props({ location: { ...location, departmentsError: true } })} />);
    expect(screen.getByLabelText("Localidad")).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar las localidades.");
    expect(screen.getByLabelText("Localidad")).toHaveAccessibleDescription(
      /No pudimos cargar las localidades\./,
    );

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetryDepartments).toHaveBeenCalledTimes(1);
  });

  it("keeps the keyboard focus through a retry and hands it to Localidad once it loads", async () => {
    const user = userEvent.setup();
    const location = {
      cities: [{ id: 1, name: "Mendoza" }],
      cityId: 1,
      onCityIdChange: vi.fn(),
      departments: [],
      departmentId: null,
      onDepartmentIdChange: vi.fn(),
      onRetryDepartments: vi.fn(),
    };
    const { rerender } = render(
      <FiltersPanel {...props({ location: { ...location, departmentsError: true } })} />,
    );

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    rerender(<FiltersPanel {...props({ location: { ...location, departmentsLoading: true } })} />);
    expect(document.activeElement).toHaveTextContent("Cargando localidades...");

    rerender(
      <FiltersPanel
        {...props({ location: { ...location, departments: [{ id: 7, name: "Godoy Cruz" }] } })}
      />,
    );
    expect(screen.getByLabelText("Localidad")).toHaveFocus();
  });

  it("returns the focus to Reintentar when the retry fails again", async () => {
    const user = userEvent.setup();
    const location = {
      cities: [{ id: 1, name: "Mendoza" }],
      cityId: 1,
      onCityIdChange: vi.fn(),
      departments: [],
      departmentId: null,
      onDepartmentIdChange: vi.fn(),
      onRetryDepartments: vi.fn(),
    };
    const { rerender } = render(
      <FiltersPanel {...props({ location: { ...location, departmentsError: true } })} />,
    );

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    rerender(<FiltersPanel {...props({ location: { ...location, departmentsLoading: true } })} />);
    rerender(<FiltersPanel {...props({ location: { ...location, departmentsError: true } })} />);

    expect(screen.getByRole("button", { name: "Reintentar" })).toHaveFocus();
  });

  it("leaves out the location section when there is nothing to locate (plans)", () => {
    render(<FiltersPanel {...props({ location: undefined })} />);

    expect(screen.queryByLabelText("Provincia")).not.toBeInTheDocument();
  });
});
