import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type {
  CategoryOption,
  PaginatedResult,
  UserPreferencesResponse,
} from "@/types";

import { PreferencesOnboarding } from "./PreferencesOnboarding";

const listCategories = vi.hoisted(() => vi.fn());
const getPreferences = vi.hoisted(() => vi.fn());
const updatePreferences = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
const logout = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, listCategories, getPreferences, updatePreferences };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/auth", () => ({
  useSession: () => ({ logout }),
}));

const CATALOG: CategoryOption[] = [
  { id: 1, name: "Gastronomía", description: null },
  { id: 2, name: "Aire libre", description: null },
];

const EMPTY: UserPreferencesResponse = {
  categories: [],
  usualBudget: null,
  usualPeopleCount: null,
  preferredArea: null,
  useDeviceLocation: false,
  maxDistanceKm: null,
};

function catalogResult(
  data: CategoryOption[],
): PaginatedResult<CategoryOption> {
  return {
    data,
    pagination: { page: 1, limit: 50, total: data.length, totalPages: 1 },
  };
}

function savedWith(
  profile: Partial<UserPreferencesResponse>,
): UserPreferencesResponse {
  return { ...EMPTY, ...profile };
}

async function renderNewAccount() {
  listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
  getPreferences.mockResolvedValueOnce(EMPTY);
  const user = userEvent.setup();
  render(<PreferencesOnboarding />);
  await screen.findByRole("button", { name: "Gastronomía" });
  return user;
}

const saveButton = () =>
  screen.getByRole("button", { name: /Guardar preferencias|Guardando/ });
const skipButton = () =>
  screen.getByRole("button", { name: "Omitir por ahora" });

describe("PreferencesOnboarding", () => {
  beforeEach(() => {
    listCategories.mockReset();
    getPreferences.mockReset();
    updatePreferences.mockReset();
    replace.mockClear();
    logout.mockClear();
  });

  it("shows the first setup without the editing-only actions", async () => {
    await renderNewAccount();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Contanos un poco de vos antes de arrancar.",
    );
    expect(skipButton()).toBeEnabled();
    expect(saveButton()).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Descartar cambios" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Restablecer preferencias/ }),
    ).not.toBeInTheDocument();
  });

  it("saves a single interest and continues to Inicio", async () => {
    updatePreferences.mockResolvedValueOnce(
      savedWith({ categories: [CATALOG[0]] }),
    );
    const user = await renderNewAccount();

    await user.click(screen.getByRole("button", { name: "Gastronomía" }));
    await user.click(saveButton());

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(updatePreferences).toHaveBeenCalledWith({
      categoryIds: [1],
      usualBudget: null,
      usualPeopleCount: null,
      preferredArea: null,
      useDeviceLocation: false,
      maxDistanceKm: null,
    });
  });

  it("saves only a budget", async () => {
    updatePreferences.mockResolvedValueOnce(savedWith({ usualBudget: 20000 }));
    const user = await renderNewAccount();

    await user.click(screen.getByRole("button", { name: /Tu salida habitual/ }));
    await user.type(
      screen.getByRole("spinbutton", { name: /Cuánto solés gastar/ }),
      "20000",
    );
    await user.click(saveButton());

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(updatePreferences).toHaveBeenCalledWith(
      expect.objectContaining({ categoryIds: [], usualBudget: 20000 }),
    );
  });

  it("skips to Inicio without saving and without closing the session", async () => {
    const user = await renderNewAccount();

    await user.click(screen.getByRole("button", { name: "Gastronomía" }));
    await user.click(skipButton());

    expect(replace).toHaveBeenCalledWith("/");
    expect(updatePreferences).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });

  it("blocks saving an invalid budget", async () => {
    const user = await renderNewAccount();

    await user.click(screen.getByRole("button", { name: /Tu salida habitual/ }));
    await user.type(
      screen.getByRole("spinbutton", { name: /Cuánto solés gastar/ }),
      "0",
    );
    await user.click(saveButton());

    expect(
      screen.getByText("Ingresá un presupuesto válido mayor a $0"),
    ).toBeInTheDocument();
    expect(updatePreferences).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps the data and the skip option when saving fails", async () => {
    updatePreferences.mockRejectedValueOnce(
      new ApiError({
        message: "Internal details",
        type: "HTTP",
        status: 500,
        code: "INTERNAL_ERROR",
      }),
    );
    const user = await renderNewAccount();

    await user.click(screen.getByRole("button", { name: "Gastronomía" }));
    await user.click(saveButton());

    expect(
      await screen.findByText(
        "No pudimos guardar tus preferencias. Intentá de nuevo.",
      ),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Gastronomía" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(skipButton()).toBeEnabled();

    updatePreferences.mockResolvedValueOnce(
      savedWith({ categories: [CATALOG[0]] }),
    );
    await user.click(saveButton());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("cannot be submitted twice while saving", async () => {
    let resolve: (value: UserPreferencesResponse) => void = () => {};
    updatePreferences.mockReturnValueOnce(
      new Promise<UserPreferencesResponse>((done) => {
        resolve = done;
      }),
    );
    const user = await renderNewAccount();

    await user.click(screen.getByRole("button", { name: "Gastronomía" }));
    await user.click(saveButton());

    expect(saveButton()).toBeDisabled();
    expect(skipButton()).toBeDisabled();
    await user.click(saveButton());
    expect(updatePreferences).toHaveBeenCalledTimes(1);

    resolve(savedWith({ categories: [CATALOG[0]] }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(updatePreferences).toHaveBeenCalledTimes(1);
  });

  it("lets the device location be enabled without granted permission", async () => {
    updatePreferences.mockResolvedValueOnce(
      savedWith({ useDeviceLocation: true }),
    );
    const user = await renderNewAccount();

    await user.click(screen.getByRole("button", { name: /Zona y distancia/ }));
    await user.click(
      screen.getByRole("checkbox", {
        name: /Usar la ubicación de mi dispositivo/,
      }),
    );
    await user.click(saveButton());

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(updatePreferences).toHaveBeenCalledWith(
      expect.objectContaining({ useDeviceLocation: true }),
    );
  });

  it("offers skipping when the initial load fails", async () => {
    listCategories.mockResolvedValueOnce(catalogResult(CATALOG));
    getPreferences.mockRejectedValueOnce(new Error("network"));
    const user = userEvent.setup();
    render(<PreferencesOnboarding />);

    expect(
      await screen.findByRole("button", { name: "Reintentar" }),
    ).toBeInTheDocument();
    await user.click(skipButton());
    expect(replace).toHaveBeenCalledWith("/");
  });
});
