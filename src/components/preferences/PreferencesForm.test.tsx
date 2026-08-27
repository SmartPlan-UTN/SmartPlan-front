import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type {
  CategoryOption,
  PaginatedResult,
  PreferredArea,
  ResolvedPlace,
  UserPreferencesResponse,
} from "@/types";

import { PreferencesForm } from "./PreferencesForm";

const listCategories = vi.hoisted(() => vi.fn());
const getPreferences = vi.hoisted(() => vi.fn());
const updatePreferences = vi.hoisted(() => vi.fn());
const searchPlace = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    listCategories,
    getPreferences,
    updatePreferences,
    searchPlace,
  };
});

const CATALOG: CategoryOption[] = [
  { id: 1, name: "Gastronomía", description: null },
  { id: 2, name: "Aire libre", description: null },
  { id: 3, name: "Cultura", description: null },
];

const GODOY_CRUZ: PreferredArea = {
  label: "Godoy Cruz, Mendoza",
  placeId: "ChIJ-godoy-cruz",
  latitude: -32.9267,
  longitude: -68.8417,
};

const GODOY_CRUZ_PLACE: ResolvedPlace = {
  placeId: GODOY_CRUZ.placeId,
  name: "Godoy Cruz, Mendoza",
  address: "Godoy Cruz, Mendoza Province, Argentina",
  latitude: GODOY_CRUZ.latitude,
  longitude: GODOY_CRUZ.longitude,
};

function catalogResult(
  data: CategoryOption[],
): PaginatedResult<CategoryOption> {
  return {
    data,
    pagination: { page: 1, limit: 50, total: data.length, totalPages: 1 },
  };
}

function preferencesFrom(
  ids: number[],
  profile: Partial<Omit<UserPreferencesResponse, "categories">> = {},
): UserPreferencesResponse {
  return {
    categories: CATALOG.filter((category) => ids.includes(category.id)),
    usualBudget: null,
    usualPeopleCount: null,
    preferredArea: null,
    useDeviceLocation: false,
    maxDistanceKm: null,
    ...profile,
  };
}

const GENERIC_SAVE_ERROR =
  "No pudimos guardar tus preferencias. Intentá de nuevo.";

async function openStep(
  user: ReturnType<typeof userEvent.setup>,
  label: RegExp,
) {
  await user.click(screen.getByRole("button", { name: label }));
}

describe("PreferencesForm", () => {
  beforeEach(() => {
    listCategories.mockReset();
    getPreferences.mockReset();
    updatePreferences.mockReset();
    searchPlace.mockReset();
  });

  it("loads the complete recommendation profile", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(
      preferencesFrom([1], {
        usualBudget: 35000,
        usualPeopleCount: 3,
        preferredArea: GODOY_CRUZ,
        useDeviceLocation: true,
        maxDistanceKm: 20,
      }),
    );
    render(<PreferencesForm />);

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Afiná los planes que smartplan arma para vos.",
    );
    expect(
      screen.getByText("Perfil de preferencias 100% completo."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gastronomía" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("navigates through the three preference sections", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([]));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await screen.findByRole("group", { name: "1. Intereses" });
    await openStep(user, /Tu salida habitual/);
    expect(
      screen.getByRole("group", { name: "2. Tu salida habitual" }),
    ).toBeInTheDocument();
    await openStep(user, /Zona y distancia/);
    expect(
      screen.getByRole("group", { name: "3. Zona y distancia" }),
    ).toBeInTheDocument();
  });

  it("saves every field of the profile as one snapshot", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([1]));
    searchPlace.mockResolvedValueOnce(GODOY_CRUZ_PLACE);
    updatePreferences.mockResolvedValueOnce(
      preferencesFrom([1, 3], {
        usualBudget: 35000,
        usualPeopleCount: 3,
        preferredArea: GODOY_CRUZ,
        useDeviceLocation: true,
        maxDistanceKm: 20,
      }),
    );
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await user.click(await screen.findByRole("button", { name: "Cultura" }));

    await openStep(user, /Tu salida habitual/);
    await user.type(
      screen.getByRole("spinbutton", { name: /Cuánto solés gastar/ }),
      "35000",
    );
    await user.click(
      screen.getByRole("button", { name: "Definir la cantidad de personas" }),
    );
    await user.click(screen.getByRole("button", { name: "Sumar una persona" }));

    await openStep(user, /Zona y distancia/);
    await user.type(
      screen.getByRole("textbox", { name: /preferred-area|Zona preferida/ }),
      "Godoy Cruz",
    );
    await user.click(screen.getByRole("button", { name: /Confirmar/ }));
    const resolved = await screen.findByRole("group", {
      name: "Ubicación preferida",
    });
    expect(within(resolved).getByText(GODOY_CRUZ.label)).toBeInTheDocument();

    await user.click(
      screen.getByRole("checkbox", {
        name: /Usar la ubicación de mi dispositivo/,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Definir una distancia máxima" }),
    );
    await user.click(screen.getByRole("button", { name: "20 km" }));

    await user.click(
      screen.getByRole("button", { name: "Guardar preferencias" }),
    );

    expect(updatePreferences).toHaveBeenCalledWith({
      categoryIds: expect.arrayContaining([1, 3]),
      usualBudget: 35000,
      usualPeopleCount: 3,
      preferredArea: GODOY_CRUZ,
      useDeviceLocation: true,
      maxDistanceKm: 20,
    });
    expect(
      await screen.findByText("Perfil de preferencias guardado"),
    ).toBeInTheDocument();
  });

  it("allows an entirely empty profile", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([1]));
    updatePreferences.mockResolvedValueOnce(preferencesFrom([]));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await user.click(
      await screen.findByRole("button", { name: "Gastronomía" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Guardar preferencias" }),
    );

    expect(updatePreferences).toHaveBeenCalledWith({
      categoryIds: [],
      usualBudget: null,
      usualPeopleCount: null,
      preferredArea: null,
      useDeviceLocation: false,
      maxDistanceKm: null,
    });
  });

  it("blocks saving an unconfirmed preferred area", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([1]));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await screen.findByRole("button", { name: "Gastronomía" });
    await openStep(user, /Zona y distancia/);
    await user.type(screen.getByRole("textbox"), "Godoy Cruz");
    await user.click(
      screen.getByRole("button", { name: "Guardar preferencias" }),
    );

    expect(
      screen.getByText("Confirmá tu ubicación preferida antes de guardar."),
    ).toBeInTheDocument();
    expect(updatePreferences).not.toHaveBeenCalled();
  });

  it("shows the not-found message when the location cannot be resolved", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([1]));
    searchPlace.mockRejectedValueOnce(
      new ApiError({
        message: "not found",
        type: "HTTP",
        status: 404,
        code: "PLACE_NOT_FOUND",
      }),
    );
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await screen.findByRole("button", { name: "Gastronomía" });
    await openStep(user, /Zona y distancia/);
    await user.type(screen.getByRole("textbox"), "Lugar inexistente 123");
    await user.click(screen.getByRole("button", { name: /Confirmar/ }));

    expect(
      await screen.findByText(/No pudimos encontrar esa ubicación/),
    ).toBeInTheDocument();
  });

  it("validates a non-empty invalid budget", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([1]));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await screen.findByRole("button", { name: "Gastronomía" });
    await openStep(user, /Tu salida habitual/);
    await user.type(screen.getByRole("spinbutton"), "0");
    await user.click(
      screen.getByRole("button", { name: "Guardar preferencias" }),
    );

    expect(
      screen.getByText("Ingresá un presupuesto válido mayor a $0"),
    ).toBeInTheDocument();
    expect(updatePreferences).not.toHaveBeenCalled();
  });

  it("never lets the people stepper go below one or send zero", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(
      preferencesFrom([1], { usualPeopleCount: 1 }),
    );
    updatePreferences.mockResolvedValueOnce(preferencesFrom([1]));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await screen.findByRole("button", { name: "Gastronomía" });
    await openStep(user, /Tu salida habitual/);
    // At 1, the "minus" clears the value rather than going to 0.
    await user.click(
      screen.getByRole("button", { name: "Quitar la cantidad de personas" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Guardar preferencias" }),
    );

    expect(updatePreferences).toHaveBeenCalledWith(
      expect.objectContaining({ usualPeopleCount: null }),
    );
  });

  it("restores every field when changes are discarded", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(
      preferencesFrom([1], {
        usualBudget: 20000,
        usualPeopleCount: 2,
        maxDistanceKm: 10,
      }),
    );
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await user.click(await screen.findByRole("button", { name: "Cultura" }));
    await openStep(user, /Tu salida habitual/);
    const budget = screen.getByRole("spinbutton");
    await user.clear(budget);
    await user.type(budget, "45000");
    await user.click(screen.getByRole("button", { name: "Descartar cambios" }));

    expect(budget).toHaveValue(20000);
    await openStep(user, /Intereses/);
    expect(screen.getByRole("button", { name: "Cultura" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("restablece todas las preferencias tras confirmar el diálogo", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(
      preferencesFrom([1, 3], {
        usualBudget: 35000,
        usualPeopleCount: 3,
        preferredArea: GODOY_CRUZ,
        useDeviceLocation: true,
        maxDistanceKm: 20,
      }),
    );
    updatePreferences.mockResolvedValueOnce(preferencesFrom([]));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await screen.findByRole("button", { name: "Gastronomía" });
    await user.click(
      screen.getByRole("button", { name: /Restablecer preferencias/ }),
    );

    const dialog = screen.getByRole("alertdialog");
    expect(
      within(dialog).getByText(/Se van a borrar tus intereses/),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Sí, restablecer" }),
    );

    expect(updatePreferences).toHaveBeenCalledWith({
      categoryIds: [],
      usualBudget: null,
      usualPeopleCount: null,
      preferredArea: null,
      useDeviceLocation: false,
      maxDistanceKm: null,
    });
    expect(
      await screen.findByText("Preferencias restablecidas"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gastronomía" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("cancels the reset dialog without touching preferences", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([1]));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await screen.findByRole("button", { name: "Gastronomía" });
    await user.click(
      screen.getByRole("button", { name: /Restablecer preferencias/ }),
    );
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(updatePreferences).not.toHaveBeenCalled();
  });

  it("preserves changes and shows a safe message after save failure", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([1]));
    updatePreferences.mockRejectedValueOnce(
      new ApiError({
        message: "Internal details",
        type: "HTTP",
        status: 500,
        code: "INTERNAL_ERROR",
      }),
    );
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await user.click(await screen.findByRole("button", { name: "Cultura" }));
    await user.click(
      screen.getByRole("button", { name: "Guardar preferencias" }),
    );

    expect(await screen.findByText(GENERIC_SAVE_ERROR)).toBeInTheDocument();
    expect(screen.queryByText("Internal details")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cultura" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("maps unavailable categories to a specific recovery message", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([1]));
    updatePreferences.mockRejectedValueOnce(
      new ApiError({
        message: "Unavailable",
        type: "HTTP",
        status: 422,
        code: "CATEGORY_NOT_AVAILABLE",
      }),
    );
    const user = userEvent.setup();
    render(<PreferencesForm />);

    await user.click(await screen.findByRole("button", { name: "Cultura" }));
    await user.click(
      screen.getByRole("button", { name: "Guardar preferencias" }),
    );

    expect(
      await screen.findByText(/ya no está disponible/),
    ).toBeInTheDocument();
  });

  it("filters stale preferences and keeps the current catalog as source of truth", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce({
      ...preferencesFrom([1]),
      categories: [
        { id: 1, name: "Gastronomía", description: null },
        { id: 99, name: "Categoría eliminada", description: null },
      ],
    });
    render(<PreferencesForm />);

    await screen.findByRole("button", { name: "Gastronomía" });
    expect(screen.queryByText("Categoría eliminada")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Guardar preferencias" }),
    ).toBeDisabled();
  });

  it("offers retry when either profile request fails", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockRejectedValueOnce(new Error("network"));
    const user = userEvent.setup();
    render(<PreferencesForm />);

    expect(
      await screen.findByText("No pudimos cargarlas. Intentá de nuevo."),
    ).toBeInTheDocument();
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockResolvedValueOnce(preferencesFrom([1]));
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(
      await screen.findByRole("button", { name: "Gastronomía" }),
    ).toBeInTheDocument();
  });
});
