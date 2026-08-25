import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { CategoryOption, PaginatedResult, UserPreferencesResponse } from "@/types";

import { PreferencesForm } from "./PreferencesForm";

const listCategories = vi.hoisted(() => vi.fn());
const getPreferences = vi.hoisted(() => vi.fn());
const updatePreferences = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, listCategories, getPreferences, updatePreferences };
});

const CATALOG: CategoryOption[] = [
  { id: 1, name: "Gastronomía", description: null },
  { id: 2, name: "Aire libre", description: null },
  { id: 3, name: "Cultura", description: null },
];

const BACKEND_SEED_CATALOG: CategoryOption[] = [
  { id: 1, name: "Gastronomy", description: "Dining experiences." },
  { id: 2, name: "Outdoors", description: "Outdoor activities." },
  { id: 3, name: "Culture", description: "Museums and theater." },
  { id: 4, name: "Entertainment", description: "Cinema and shows." },
  { id: 5, name: "Nightlife", description: "Bars and clubs." },
  { id: 6, name: "Sports", description: "Sports activities." },
  { id: 7, name: "Live music", description: "Concerts and shows." },
  { id: 8, name: "Wellness", description: "Relaxation activities." },
  { id: 9, name: "Shopping", description: "Fairs and markets." },
  { id: 10, name: "Short trips", description: "Nearby destinations." },
];

function catalogResult(data: CategoryOption[]): PaginatedResult<CategoryOption> {
  return { data, pagination: { page: 1, limit: 50, total: data.length, totalPages: 1 } };
}

function preferencesFrom(
  ids: number[],
  profile: Pick<UserPreferencesResponse, "usualBudget" | "preferredArea"> = {
    usualBudget: null,
    preferredArea: null,
  },
): UserPreferencesResponse {
  return {
    categories: CATALOG.filter((category) => ids.includes(category.id)),
    ...profile,
  };
}

describe("PreferencesForm", () => {
  beforeEach(() => {
    listCategories.mockReset();
    getPreferences.mockReset();
    updatePreferences.mockReset();
  });

  it("loads the complete recommendation profile and explains its purpose", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(
      preferencesFrom([1], { usualBudget: 35000, preferredArea: "Mendoza Capital" }),
    );
    render(<PreferencesForm />);

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Afiná los planes que smartplan arma para vos.",
    );
    expect(screen.getByText(/Tus respuestas nos ayudan a recomendar mejor/)).toBeInTheDocument();
    expect(screen.getByText("Perfil de preferencias 100% completo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gastronomía" })).toHaveAttribute("aria-pressed", "true");
  });

  it("presents backend category seeds in stable Spanish order", async () => {
    listCategories.mockResolvedValueOnce(catalogResult([...BACKEND_SEED_CATALOG].reverse()));
    getPreferences.mockResolvedValueOnce(preferencesFrom([]));
    render(<PreferencesForm />);

    await screen.findByRole("button", { name: "Gastronomía" });
    const labels = screen.getAllByRole("button")
      .filter((button) => button.hasAttribute("aria-pressed"))
      .map((button) => button.getAttribute("aria-label"));
    expect(labels).toEqual([
      "Gastronomía", "Aire libre", "Cultura", "Entretenimiento", "Vida nocturna",
      "Deportes", "Música en vivo", "Bienestar", "Compras", "Escapadas",
    ]);
  });

  it("keeps unexpected categories after the known catalog", async () => {
    const catalog = [
      { id: 90, name: "Sorpresa local", description: "Nueva." },
      BACKEND_SEED_CATALOG[9], BACKEND_SEED_CATALOG[2], BACKEND_SEED_CATALOG[0],
    ];
    listCategories.mockResolvedValueOnce(catalogResult(catalog));
    getPreferences.mockResolvedValueOnce(preferencesFrom([]));
    render(<PreferencesForm />);

    await screen.findByRole("button", { name: "Gastronomía" });
    const labels = screen.getAllByRole("button")
      .filter((button) => button.hasAttribute("aria-pressed"))
      .map((button) => button.getAttribute("aria-label"));
    expect(labels).toEqual(["Gastronomía", "Cultura", "Escapadas", "Sorpresa local"]);
  });

  it("navigates through three clearly named preference sections", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([]));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await screen.findByRole("group", { name: "1. Intereses" });
    await user.click(screen.getByRole("button", { name: /Presupuesto.*Sin definir/ }));
    expect(screen.getByRole("group", { name: "2. Presupuesto habitual" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Zona.*Sin definir/ }));
    expect(screen.getByRole("group", { name: "3. Zona preferida" })).toBeInTheDocument();
  });

  it("updates progress without requiring users to finish every section", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([]));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await user.click(await screen.findByRole("button", { name: "Cultura" }));
    expect(screen.getByText("Perfil de preferencias 33% completo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Intereses.*1 elegidos/ })).toBeInTheDocument();
  });

  it("saves interests, budget and area as one profile", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([1]));
    updatePreferences.mockResolvedValueOnce(
      preferencesFrom([1, 3], { usualBudget: 35000, preferredArea: "Mendoza Capital" }),
    );
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await user.click(await screen.findByRole("button", { name: "Cultura" }));
    await user.click(screen.getByRole("button", { name: /Presupuesto.*Sin definir/ }));
    await user.type(screen.getByRole("spinbutton", { name: /Cuánto solés gastar/ }), "35000");
    await user.click(screen.getByRole("button", { name: /Zona.*Sin definir/ }));
    await user.type(screen.getByRole("textbox", { name: /Barrio, ciudad/ }), "Mendoza Capital");
    await user.click(screen.getByRole("button", { name: "Guardar preferencias" }));

    expect(updatePreferences).toHaveBeenCalledWith({
      categoryIds: expect.arrayContaining([1, 3]),
      usualBudget: 35000,
      preferredArea: "Mendoza Capital",
    });
    expect(await screen.findByText("Perfil de preferencias guardado")).toBeInTheDocument();
  });

  it("allows zero categories and nullable profile details", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([1]));
    updatePreferences.mockResolvedValueOnce(preferencesFrom([]));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await user.click(await screen.findByRole("button", { name: "Gastronomía" }));
    await user.click(screen.getByRole("button", { name: "Guardar preferencias" }));
    expect(updatePreferences).toHaveBeenCalledWith({
      categoryIds: [], usualBudget: null, preferredArea: null,
    });
  });

  it("validates a non-empty invalid budget and moves focus back to its section", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([1]));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await screen.findByRole("button", { name: "Gastronomía" });
    await user.click(screen.getByRole("button", { name: /Presupuesto.*Sin definir/ }));
    await user.type(screen.getByRole("spinbutton"), "0");
    await user.click(screen.getByRole("button", { name: "Guardar preferencias" }));
    expect(screen.getByText("Ingresá un presupuesto válido mayor a $0")).toBeInTheDocument();
    expect(updatePreferences).not.toHaveBeenCalled();
  });

  it("validates a non-empty ambiguous area", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([1]));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await screen.findByRole("button", { name: "Gastronomía" });
    await user.click(screen.getByRole("button", { name: /Zona.*Sin definir/ }));
    await user.type(screen.getByRole("textbox"), "M");
    expect(screen.getByText("Ingresá una zona más específica")).toBeInTheDocument();
  });

  it("restores all saved fields when changes are discarded", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(
      preferencesFrom([1], { usualBudget: 20000, preferredArea: "Godoy Cruz" }),
    );
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await user.click(await screen.findByRole("button", { name: "Cultura" }));
    await user.click(screen.getByRole("button", { name: /Presupuesto.*20\.000/ }));
    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "45000");
    await user.click(screen.getByRole("button", { name: "Descartar cambios" }));
    expect(input).toHaveValue(20000);
    await user.click(screen.getByRole("button", { name: /Intereses.*1 elegidos/ }));
    expect(screen.getByRole("button", { name: "Cultura" })).toHaveAttribute("aria-pressed", "false");
  });

  it("preserves changes and shows a safe message after save failure", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([1]));
    updatePreferences.mockRejectedValueOnce(new ApiError({
      message: "Internal details", type: "HTTP", status: 500, code: "INTERNAL_ERROR",
    }));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await user.click(await screen.findByRole("button", { name: "Cultura" }));
    await user.click(screen.getByRole("button", { name: "Guardar preferencias" }));
    expect(await screen.findByText(GENERIC_SAVE_ERROR)).toBeInTheDocument();
    expect(screen.queryByText("Internal details")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cultura" })).toHaveAttribute("aria-pressed", "true");
  });

  it("maps unavailable categories to a specific recovery message", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([1]));
    updatePreferences.mockRejectedValueOnce(new ApiError({
      message: "Unavailable", type: "HTTP", status: 422, code: "CATEGORY_NOT_AVAILABLE",
    }));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await user.click(await screen.findByRole("button", { name: "Cultura" }));
    await user.click(screen.getByRole("button", { name: "Guardar preferencias" }));
    expect(await screen.findByText(/ya no está disponible/)).toBeInTheDocument();
  });

  it("disables editable controls while saving", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([1]));
    let resolveSave: ((value: UserPreferencesResponse) => void) | undefined;
    updatePreferences.mockImplementationOnce(() => new Promise<UserPreferencesResponse>((resolve) => {
      resolveSave = resolve;
    }));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await user.click(await screen.findByRole("button", { name: "Cultura" }));
    await user.click(screen.getByRole("button", { name: "Guardar preferencias" }));
    expect(await screen.findByText("Guardando…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cultura" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Descartar cambios" })).toBeDisabled();
    resolveSave?.(preferencesFrom([1, 3]));
    expect(await screen.findByText("Perfil de preferencias guardado")).toBeInTheDocument();
  });

  it("filters stale preferences and keeps the current catalog as source of truth", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce({
      categories: [
        { id: 1, name: "Gastronomía", description: null },
        { id: 99, name: "Categoría eliminada", description: null },
      ],
      usualBudget: null,
      preferredArea: null,
    });
    render(<PreferencesForm />);

    await screen.findByRole("button", { name: "Gastronomía" });
    expect(screen.queryByText("Categoría eliminada")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar preferencias" })).toBeDisabled();
  });

  it("supports keyboard selection with aria-pressed", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([]));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    const gastronomy = await screen.findByRole("button", { name: "Gastronomía" });
    gastronomy.focus();
    await user.keyboard(" ");
    expect(gastronomy).toHaveAttribute("aria-pressed", "true");
  });

  it("offers retry when either profile request fails", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockRejectedValueOnce(new Error("network"));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    expect(await screen.findByText("No pudimos cargarlas. Intentá de nuevo.")).toBeInTheDocument();
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([1]));
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("button", { name: "Gastronomía" })).toBeInTheDocument();
  });

  it("keeps an accessible interests group when the catalog is empty", async () => {
    listCategories.mockResolvedValueOnce(catalogResult([]));
    getPreferences.mockResolvedValueOnce(preferencesFrom([]));
    render(<PreferencesForm />);

    expect(await screen.findByText("Todavía no hay categorías disponibles.")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "1. Intereses" })).toBeInTheDocument();
  });
});

const GENERIC_SAVE_ERROR = "No pudimos guardar tus preferencias. Intentá de nuevo.";
