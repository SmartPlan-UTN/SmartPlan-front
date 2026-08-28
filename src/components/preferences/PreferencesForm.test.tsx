import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPreferences, listCategories, updatePreferences } from "@/lib/api";
import type { UserPreferences } from "@/types";

import { PreferencesForm } from "./PreferencesForm";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
    listCategories: vi.fn(),
  };
});

function categoriesPage() {
  return {
    data: [
      { id: 1, name: "Gastronomy", description: null },
      { id: 2, name: "Outdoors", description: null },
      { id: 3, name: "Nightlife", description: null },
    ],
    pagination: { page: 1, limit: 50, total: 3, totalPages: 1 },
  };
}

function preferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return {
    categories: [{ id: 1, name: "Gastronomy", description: null }],
    usualBudget: 15000,
    usualPeopleCount: 3,
    preferredArea: {
      label: "Buenos Aires, CABA",
      placeId: "place-1",
      latitude: -34.6,
      longitude: -58.4,
    },
    useDeviceLocation: false,
    maxDistanceKm: 10,
    ...overrides,
  };
}

describe("PreferencesForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listCategories).mockResolvedValue(categoriesPage());
    vi.mocked(getPreferences).mockResolvedValue(preferences());
  });

  it("preloads the saved profile: selected categories, budget, people, and location", async () => {
    render(<PreferencesForm />);

    const gastro = await screen.findByRole("button", { name: "Gastronomy" });
    expect(gastro).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Outdoors" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    expect(screen.getByLabelText("Presupuesto por salida")).toHaveValue(15000);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByLabelText("Ubicación preferida")).toHaveValue("Buenos Aires, CABA");
  });

  it("preloads an empty, no-preference-yet form without showing a budget error", async () => {
    vi.mocked(getPreferences).mockResolvedValue(
      preferences({
        categories: [],
        usualBudget: null,
        usualPeopleCount: null,
        preferredArea: null,
      }),
    );

    render(<PreferencesForm />);

    await screen.findByRole("button", { name: "Gastronomy" });
    expect(screen.getByLabelText("Presupuesto por salida")).toHaveValue(null);
    expect(
      screen.queryByText("Ingresá un presupuesto válido mayor a $0"),
    ).not.toBeInTheDocument();
  });

  it("toggles a category chip", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm />);

    const outdoors = await screen.findByRole("button", { name: "Outdoors" });
    await user.click(outdoors);
    expect(outdoors).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the budget error only once the value is actually invalid, and blocks saving", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm />);

    const budgetInput = await screen.findByLabelText("Presupuesto por salida");
    await user.clear(budgetInput);
    await user.type(budgetInput, "0");

    expect(
      await screen.findByText("Ingresá un presupuesto válido mayor a $0"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Guardar preferencias/ })).toBeDisabled();
    expect(updatePreferences).not.toHaveBeenCalled();
  });

  it("increments and decrements the people counter within 1-20", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await screen.findByText("3");
    await user.click(screen.getByRole("button", { name: "Sumar una persona" }));
    expect(screen.getByText("4")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Restar una persona" }));
    await user.click(screen.getByRole("button", { name: "Restar una persona" }));
    await user.click(screen.getByRole("button", { name: "Restar una persona" }));
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restar una persona" })).toBeDisabled();
  });

  it("picks a distance preset", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm />);

    expect(await screen.findByRole("button", { name: "10 km", pressed: true })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "30 km" }));
    expect(screen.getByRole("button", { name: "30 km", pressed: true })).toBeInTheDocument();
  });

  it("saves the current selection and shows a confirmation toast", async () => {
    const user = userEvent.setup();
    vi.mocked(updatePreferences).mockResolvedValue(preferences());
    render(<PreferencesForm />);

    await screen.findByRole("button", { name: "Gastronomy" });
    await user.click(screen.getByRole("button", { name: /Guardar preferencias/ }));

    await waitFor(() => {
      expect(updatePreferences).toHaveBeenCalledWith({
        categoryIds: [1],
        usualBudget: 15000,
        usualPeopleCount: 3,
        preferredArea: {
          label: "Buenos Aires, CABA",
          placeId: "place-1",
          latitude: -34.6,
          longitude: -58.4,
        },
        useDeviceLocation: false,
        maxDistanceKm: 10,
      });
    });
    expect(await screen.findByText("Preferencias guardadas")).toBeInTheDocument();
  });

  it("resets every field back to its no-preference defaults", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await screen.findByRole("button", { name: "Gastronomy" });
    await user.click(screen.getByRole("button", { name: "Restablecer preferencias" }));

    expect(screen.getByRole("button", { name: "Gastronomy" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByLabelText("Presupuesto por salida")).toHaveValue(null);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByLabelText("Ubicación preferida")).toHaveValue("");
    expect(screen.getByRole("button", { name: "10 km", pressed: true })).toBeInTheDocument();
  });

  it("shows a load error when the initial fetch fails", async () => {
    vi.mocked(getPreferences).mockRejectedValue(new Error("network"));
    render(<PreferencesForm />);

    expect(
      await screen.findByText("No pudimos cargar tus preferencias."),
    ).toBeInTheDocument();
  });
});
