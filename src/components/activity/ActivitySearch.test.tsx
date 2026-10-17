import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { ActivitySearchResult, PaginatedResult } from "@/types";

import { readExplorationState } from "@/components/explore/searchState";
import { ActivitySearch } from "./ActivitySearch";

const searchExplore = vi.hoisted(() => vi.fn());
const listCategories = vi.hoisted(() => vi.fn());
const listCities = vi.hoisted(() => vi.fn());
const listDepartments = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, searchExplore, listCategories,
    listCities,
    listDepartments,
  };
});

function makeActivity(
  overrides: Partial<ActivitySearchResult> = {},
): ActivitySearchResult {
  return {
    id: 1,
    name: "Ruta del vino",
    description: "Recorrido por bodegas.",
    estimatedCost: 15000,
    estimatedDuration: 180,
    type: "wine-tour",
    averageRating: 4.5,
    ratingCount: 32,
    distanceKm: null,
    categories: [],
    ...overrides,
  };
}

function page(
  data: ActivitySearchResult[],
  overrides: Partial<PaginatedResult<ActivitySearchResult>["pagination"]> = {},
): PaginatedResult<ActivitySearchResult> {
  return {
    data: data.map((activity) => ({ ...activity, itemType: "ACTIVITY" as const })),
    pagination: {
      page: 1,
      limit: 20,
      total: data.length,
      totalPages: 1,
      ...overrides,
    },
  };
}

// Top level: the location lookups run in every describe below.
beforeEach(() => {
  listCities.mockReset();
  listCities.mockResolvedValue({ data: [] });
  listDepartments.mockReset();
  listDepartments.mockResolvedValue({ data: [] });
});

describe("ActivitySearch", () => {
  it("filters a subtype and carries the activity and subtype selection to the map", async () => {
    searchExplore.mockResolvedValue(page([makeActivity()]));
    const user = userEvent.setup();
    render(<ActivitySearch />);
    await screen.findByRole("heading", { name: "Ruta del vino" });
    await user.click(screen.getByRole("button", { name: "Tipo de actividad" }));
    await user.click(screen.getByRole("option", { name: "Degustación" }));
    expect(searchExplore).toHaveBeenLastCalledWith(expect.objectContaining({ type: "tasting", itemType: "ACTIVITY" }));
    expect(screen.getByRole("link", { name: "Ver mapa" })).toHaveAttribute("href", expect.stringContaining("type=tasting"));
    expect(screen.getByRole("link", { name: "Ver mapa" })).toHaveAttribute("href", expect.stringContaining("itemType=ACTIVITY"));
    await user.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(searchExplore).toHaveBeenLastCalledWith(expect.objectContaining({ type: undefined }));
  });
  beforeEach(() => {
    searchExplore.mockReset();
    listCategories.mockReset();
    listCategories.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the results grid once the search resolves", async () => {
    searchExplore.mockResolvedValue(page([makeActivity()]));

    render(<ActivitySearch />);

    expect(
      await screen.findByRole("heading", { name: "Ruta del vino" }),
    ).toBeInTheDocument();
  });

  it("shows how many activities matched, pluralized", async () => {
    searchExplore.mockResolvedValue(
      page([makeActivity()], { total: 1, totalPages: 1 }),
    );

    render(<ActivitySearch />);

    expect(
      await screen.findByText("resultado en Mendoza", {
        exact: false,
      }),
    ).toBeInTheDocument();
  });

  it("shows the empty state when there are no results", async () => {
    searchExplore.mockResolvedValue(page([]));

    render(<ActivitySearch />);

    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
  });

  it("shows the error state and retries on demand", async () => {
    searchExplore.mockRejectedValueOnce(
      new ApiError({ message: "No se pudo conectar.", type: "NETWORK" }),
    );
    const user = userEvent.setup();
    render(<ActivitySearch />);

    expect(await screen.findByText("No se pudo conectar.")).toBeInTheDocument();

    searchExplore.mockResolvedValueOnce(page([makeActivity()]));
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("heading", { name: "Ruta del vino" }),
    ).toBeInTheDocument();
  });

  it("debounces the search box before calling the API again", async () => {
    vi.useFakeTimers();
    searchExplore.mockResolvedValue(page([]));
    render(<ActivitySearch />);

    // Initial mount fires one search with an empty query.
    expect(searchExplore).toHaveBeenCalledTimes(1);

    const input = screen.getByLabelText("Buscar actividades y lugares");
    fireEvent.change(input, { target: { value: "v" } });
    fireEvent.change(input, { target: { value: "vi" } });
    fireEvent.change(input, { target: { value: "vino" } });

    // Still debouncing: intermediate keystrokes don't fire a request.
    expect(searchExplore).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(searchExplore).toHaveBeenCalledTimes(2);
    expect(searchExplore).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "vino" }),
    );
  });

  it("searches immediately on 'Buscar', without waiting for the debounce", async () => {
    vi.useFakeTimers();
    searchExplore.mockResolvedValue(page([]));
    render(<ActivitySearch />);

    expect(searchExplore).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("Buscar actividades y lugares"), {
      target: { value: "vino" },
    });
    expect(searchExplore).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(searchExplore).toHaveBeenCalledTimes(2);
    expect(searchExplore).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "vino" }),
    );

    // The pending debounce timer firing afterwards doesn't repeat the search.
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(searchExplore).toHaveBeenCalledTimes(2);
  });

  it("also searches immediately when Enter is pressed in the search box", async () => {
    vi.useFakeTimers();
    searchExplore.mockResolvedValue(page([]));
    render(<ActivitySearch />);

    const input = screen.getByLabelText("Buscar actividades y lugares");
    fireEvent.change(input, { target: { value: "termas" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(searchExplore).toHaveBeenCalledTimes(2);
    expect(searchExplore).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "termas" }),
    );
  });

  it("replaces the grid with the next page instead of appending to it", async () => {
    searchExplore.mockResolvedValueOnce(
      page([makeActivity({ id: 1, name: "Ruta del vino" })], {
        page: 1,
        totalPages: 2,
      }),
    );
    const user = userEvent.setup();
    render(<ActivitySearch />);

    await screen.findByRole("heading", { name: "Ruta del vino" });
    expect(
      screen.getByRole("navigation", { name: "Paginación de resultados" }),
    ).toBeInTheDocument();

    searchExplore.mockResolvedValueOnce(
      page([makeActivity({ id: 2, name: "Termas de Cacheuta" })], {
        page: 2,
        totalPages: 2,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));

    expect(
      await screen.findByRole("heading", { name: "Termas de Cacheuta" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Ruta del vino" }),
    ).not.toBeInTheDocument();
    expect(searchExplore).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });

  it("doesn't show pagination controls when there's only one page", async () => {
    searchExplore.mockResolvedValue(
      page([makeActivity()], { page: 1, totalPages: 1 }),
    );
    render(<ActivitySearch />);

    await screen.findByRole("heading", { name: "Ruta del vino" });

    expect(
      screen.queryByRole("navigation", { name: "Paginación de resultados" }),
    ).not.toBeInTheDocument();
  });
});


describe("exploration filter continuity (CU10/CU16)", () => {
  it("restores the search, filters, ordering and page carried by the map URL", async () => {
    searchExplore.mockReset();
    searchExplore.mockResolvedValue(page([makeActivity()], { page: 3, totalPages: 4 }));
    listCategories.mockResolvedValue({ data: [], pagination: { total: 0 } });
    listDepartments.mockResolvedValue({ data: [{ id: 2, name: "Godoy Cruz" }] });
    const initialState = readExplorationState({
      search: "vino & cena", categoryIds: "2,4", minPrice: "0", maxPrice: "20000",
      minRating: "4", cityId: "1", departmentId: "2", sortBy: "price", direction: "desc", page: "3",
    });
    const { unmount } = render(<ActivitySearch initialState={initialState} />);
    await screen.findByRole("heading", { name: "Ruta del vino" });
    expect(searchExplore).toHaveBeenLastCalledWith(expect.objectContaining({
      search: "vino & cena", categoryIds: [2, 4], minPrice: 0, maxPrice: 20000,
      minRating: 4, cityId: 1, departmentId: 2, sortBy: "price", direction: "desc", page: 3,
    }));
    expect(screen.getByLabelText("Buscar actividades y lugares")).toHaveValue("vino & cena");
    const mapUrl = new URL(screen.getByRole("link", { name: "Ver mapa" }).getAttribute("href") ?? "", "http://localhost");
    unmount();
    // The map return link carries these same supported parameters.
    render(<ActivitySearch initialState={readExplorationState(Object.fromEntries(mapUrl.searchParams))} />);
    await screen.findByRole("heading", { name: "Ruta del vino" });
    expect(searchExplore).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3, categoryIds: [2, 4], search: "vino & cena" }));
    expect(screen.getByLabelText("Mínimo")).toHaveValue(0);
    expect(screen.getByLabelText("Máximo")).toHaveValue(20000);
  });

  it("loads only the chosen province's localities and drops the locality when the province changes (#181)", async () => {
    searchExplore.mockResolvedValue(page([makeActivity()]));
    listCities.mockResolvedValue({
      data: [
        { id: 1, name: "Mendoza" },
        { id: 2, name: "San Juan" },
      ],
    });
    listDepartments.mockImplementation((cityId: number) =>
      Promise.resolve({
        data: cityId === 1 ? [{ id: 10, name: "Godoy Cruz" }] : [{ id: 20, name: "Rivadavia" }],
      }),
    );
    const user = userEvent.setup();
    render(<ActivitySearch />);
    await screen.findByRole("heading", { name: "Ruta del vino" });

    expect(screen.getByLabelText("Localidad")).toBeDisabled();

    await user.click(screen.getByLabelText("Provincia"));
    await user.click(await screen.findByRole("option", { name: "Mendoza" }));
    expect(listDepartments).toHaveBeenLastCalledWith(1);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("Localidad")).toBeEnabled();
    });

    await user.click(screen.getByLabelText("Localidad"));
    expect(screen.queryByRole("option", { name: "Rivadavia" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Godoy Cruz" }));
    await vi.waitFor(() => {
      expect(searchExplore).toHaveBeenLastCalledWith(
        expect.objectContaining({ cityId: 1, departmentId: 10 }),
      );
    });

    await user.click(screen.getByLabelText("Provincia"));
    await user.click(screen.getByRole("option", { name: "San Juan" }));
    await vi.waitFor(() => {
      expect(searchExplore).toHaveBeenLastCalledWith(
        expect.objectContaining({ cityId: 2, departmentId: undefined }),
      );
    });
    expect(screen.getByLabelText("Localidad")).toHaveTextContent("Cualquier localidad");

    await user.click(screen.getByRole("button", { name: "Limpiar" }));
    await vi.waitFor(() => {
      expect(searchExplore).toHaveBeenLastCalledWith(
        expect.objectContaining({ cityId: undefined, departmentId: undefined }),
      );
    });
    expect(screen.getByLabelText("Localidad")).toBeDisabled();
  });

  it("keeps a restored locality only while its province offers it (#181)", async () => {
    searchExplore.mockResolvedValue(page([makeActivity()]));
    listDepartments.mockResolvedValue({ data: [{ id: 10, name: "Godoy Cruz" }] });
    const { unmount } = render(
      <ActivitySearch initialState={readExplorationState({ cityId: "1", departmentId: "10" })} />,
    );
    await vi.waitFor(() => {
      expect(screen.getByLabelText("Localidad")).toHaveTextContent("Godoy Cruz");
    });
    expect(searchExplore).toHaveBeenLastCalledWith(
      expect.objectContaining({ cityId: 1, departmentId: 10 }),
    );
    unmount();

    // A locality from another province can't be shown, so it can't filter.
    searchExplore.mockClear();
    render(
      <ActivitySearch initialState={readExplorationState({ cityId: "1", departmentId: "99" })} />,
    );
    await vi.waitFor(() => {
      expect(searchExplore).toHaveBeenLastCalledWith(
        expect.objectContaining({ cityId: 1, departmentId: undefined }),
      );
    });
    expect(screen.getByLabelText("Localidad")).toHaveTextContent("Cualquier localidad");
    expect(screen.getByLabelText("Localidad")).toBeEnabled();
  });

  it("drops a restored locality it can't show when the lookup fails (#181)", async () => {
    searchExplore.mockResolvedValue(page([makeActivity()]));
    listDepartments.mockRejectedValue(new Error("boom"));
    render(
      <ActivitySearch initialState={readExplorationState({ cityId: "1", departmentId: "10" })} />,
    );

    expect(
      await screen.findByText("No pudimos cargar las localidades.", { exact: false }),
    ).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(searchExplore).toHaveBeenLastCalledWith(
        expect.objectContaining({ cityId: 1, departmentId: undefined }),
      );
    });
    expect(screen.getByLabelText("Localidad")).toHaveTextContent("Cualquier localidad");
  });

  it("reports a failed localities lookup and retries it on demand", async () => {
    searchExplore.mockResolvedValue(page([makeActivity()]));
    listCities.mockResolvedValue({ data: [{ id: 1, name: "Mendoza" }] });
    listDepartments.mockRejectedValueOnce(new Error("boom"));
    listDepartments.mockResolvedValueOnce({ data: [{ id: 10, name: "Godoy Cruz" }] });
    const user = userEvent.setup();
    render(<ActivitySearch />);
    await screen.findByRole("heading", { name: "Ruta del vino" });

    await user.click(screen.getByLabelText("Provincia"));
    await user.click(await screen.findByRole("option", { name: "Mendoza" }));

    expect(await screen.findByText("No pudimos cargar las localidades.", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Localidad")).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await vi.waitFor(() => {
      expect(screen.getByLabelText("Localidad")).toBeEnabled();
    });
    expect(listDepartments).toHaveBeenCalledTimes(2);
  });

  it("blocks contradictory prices and resumes after correcting them", async () => {
    vi.useFakeTimers();
    searchExplore.mockReset();
    searchExplore.mockResolvedValue(page([]));
    listCategories.mockResolvedValue({ data: [], pagination: { total: 0 } });
    render(<ActivitySearch />);
    const initialCalls = searchExplore.mock.calls.length;
    fireEvent.change(screen.getByLabelText("Mínimo"), { target: { value: "20000" } });
    fireEvent.change(screen.getByLabelText("Máximo"), { target: { value: "10000" } });
    expect(screen.getByRole("alert")).toHaveTextContent("El precio mínimo no puede superar al máximo.");
    expect(screen.getByLabelText("Mínimo")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("link", { name: "Ver mapa" })).toHaveAttribute("aria-disabled", "true");
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(searchExplore).toHaveBeenCalledTimes(initialCalls);
    fireEvent.change(screen.getByLabelText("Máximo"), { target: { value: "30000" } });
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(searchExplore).toHaveBeenLastCalledWith(expect.objectContaining({ minPrice: 20000, maxPrice: 30000, page: 1 }));
    vi.useRealTimers();
  });
});


it("clears an invalid restored range with the keyboard and searches again", async () => {
  searchExplore.mockReset();
  searchExplore.mockResolvedValue(page([]));
  listCategories.mockResolvedValue({ data: [], pagination: { total: 0 } });
  const user = userEvent.setup();
  render(<ActivitySearch initialState={readExplorationState({ minPrice: "20", maxPrice: "10" })} />);
  expect(searchExplore).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toBeInTheDocument();
  screen.getByRole("button", { name: "Limpiar" }).focus();
  await user.keyboard("{Enter}");
  expect(screen.getByLabelText("Mínimo")).toHaveValue(null);
  expect(screen.getByLabelText("Máximo")).toHaveValue(null);
  expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
  expect(searchExplore).toHaveBeenLastCalledWith(expect.objectContaining({ minPrice: undefined, maxPrice: undefined }));
});
