import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { ActivitySearchResult, PaginatedResult } from "@/types";

import { readExplorationState } from "@/components/explore/searchState";
import { ActivitySearch } from "./ActivitySearch";

const searchActivities = vi.hoisted(() => vi.fn());
const listCategories = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, searchActivities, listCategories,
    listCities: vi.fn().mockResolvedValue({ data: [] }),
    listDepartments: vi.fn().mockResolvedValue({ data: [] }),
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
    data,
    pagination: {
      page: 1,
      limit: 20,
      total: data.length,
      totalPages: 1,
      ...overrides,
    },
  };
}

describe("ActivitySearch", () => {
  beforeEach(() => {
    searchActivities.mockReset();
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
    searchActivities.mockResolvedValue(page([makeActivity()]));

    render(<ActivitySearch />);

    expect(
      await screen.findByRole("heading", { name: "Ruta del vino" }),
    ).toBeInTheDocument();
  });

  it("shows how many activities matched, pluralized", async () => {
    searchActivities.mockResolvedValue(
      page([makeActivity()], { total: 1, totalPages: 1 }),
    );

    render(<ActivitySearch />);

    expect(
      await screen.findByText("actividad encontrada cerca tuyo", {
        exact: false,
      }),
    ).toBeInTheDocument();
  });

  it("shows the empty state when there are no results", async () => {
    searchActivities.mockResolvedValue(page([]));

    render(<ActivitySearch />);

    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
  });

  it("shows the error state and retries on demand", async () => {
    searchActivities.mockRejectedValueOnce(
      new ApiError({ message: "No se pudo conectar.", type: "NETWORK" }),
    );
    const user = userEvent.setup();
    render(<ActivitySearch />);

    expect(await screen.findByText("No se pudo conectar.")).toBeInTheDocument();

    searchActivities.mockResolvedValueOnce(page([makeActivity()]));
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("heading", { name: "Ruta del vino" }),
    ).toBeInTheDocument();
  });

  it("debounces the search box before calling the API again", async () => {
    vi.useFakeTimers();
    searchActivities.mockResolvedValue(page([]));
    render(<ActivitySearch />);

    // Initial mount fires one search with an empty query.
    expect(searchActivities).toHaveBeenCalledTimes(1);

    const input = screen.getByLabelText("Buscar actividades");
    fireEvent.change(input, { target: { value: "v" } });
    fireEvent.change(input, { target: { value: "vi" } });
    fireEvent.change(input, { target: { value: "vino" } });

    // Still debouncing: intermediate keystrokes don't fire a request.
    expect(searchActivities).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(searchActivities).toHaveBeenCalledTimes(2);
    expect(searchActivities).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "vino" }),
    );
  });

  it("searches immediately on 'Buscar', without waiting for the debounce", async () => {
    vi.useFakeTimers();
    searchActivities.mockResolvedValue(page([]));
    render(<ActivitySearch />);

    expect(searchActivities).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("Buscar actividades"), {
      target: { value: "vino" },
    });
    expect(searchActivities).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(searchActivities).toHaveBeenCalledTimes(2);
    expect(searchActivities).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "vino" }),
    );

    // The pending debounce timer firing afterwards doesn't repeat the search.
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(searchActivities).toHaveBeenCalledTimes(2);
  });

  it("also searches immediately when Enter is pressed in the search box", async () => {
    vi.useFakeTimers();
    searchActivities.mockResolvedValue(page([]));
    render(<ActivitySearch />);

    const input = screen.getByLabelText("Buscar actividades");
    fireEvent.change(input, { target: { value: "termas" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(searchActivities).toHaveBeenCalledTimes(2);
    expect(searchActivities).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "termas" }),
    );
  });

  it("replaces the grid with the next page instead of appending to it", async () => {
    searchActivities.mockResolvedValueOnce(
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

    searchActivities.mockResolvedValueOnce(
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
    expect(searchActivities).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });

  it("doesn't show pagination controls when there's only one page", async () => {
    searchActivities.mockResolvedValue(
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
    searchActivities.mockReset();
    searchActivities.mockResolvedValue(page([makeActivity()], { page: 3, totalPages: 4 }));
    listCategories.mockResolvedValue({ data: [], pagination: { total: 0 } });
    const initialState = readExplorationState({
      search: "vino & cena", categoryIds: "2,4", minPrice: "0", maxPrice: "20000",
      minRating: "4", cityId: "1", departmentId: "2", sortBy: "price", direction: "desc", page: "3",
    });
    const { unmount } = render(<ActivitySearch initialState={initialState} />);
    await screen.findByRole("heading", { name: "Ruta del vino" });
    expect(searchActivities).toHaveBeenLastCalledWith(expect.objectContaining({
      search: "vino & cena", categoryIds: [2, 4], minPrice: 0, maxPrice: 20000,
      minRating: 4, cityId: 1, departmentId: 2, sortBy: "price", direction: "desc", page: 3,
    }));
    expect(screen.getByLabelText("Buscar actividades")).toHaveValue("vino & cena");
    const mapUrl = new URL(screen.getByRole("link", { name: "Ver mapa" }).getAttribute("href") ?? "", "http://localhost");
    unmount();
    // The map return link carries these same supported parameters.
    render(<ActivitySearch initialState={readExplorationState(Object.fromEntries(mapUrl.searchParams))} />);
    await screen.findByRole("heading", { name: "Ruta del vino" });
    expect(searchActivities).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3, categoryIds: [2, 4], search: "vino & cena" }));
    expect(screen.getByLabelText("Mínimo")).toHaveValue(0);
    expect(screen.getByLabelText("Máximo")).toHaveValue(20000);
  });

  it("blocks contradictory prices and resumes after correcting them", async () => {
    vi.useFakeTimers();
    searchActivities.mockReset();
    searchActivities.mockResolvedValue(page([]));
    listCategories.mockResolvedValue({ data: [], pagination: { total: 0 } });
    render(<ActivitySearch />);
    const initialCalls = searchActivities.mock.calls.length;
    fireEvent.change(screen.getByLabelText("Mínimo"), { target: { value: "20000" } });
    fireEvent.change(screen.getByLabelText("Máximo"), { target: { value: "10000" } });
    expect(screen.getByRole("alert")).toHaveTextContent("El precio mínimo no puede superar al máximo.");
    expect(screen.getByLabelText("Mínimo")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("link", { name: "Ver mapa" })).toHaveAttribute("aria-disabled", "true");
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(searchActivities).toHaveBeenCalledTimes(initialCalls);
    fireEvent.change(screen.getByLabelText("Máximo"), { target: { value: "30000" } });
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(searchActivities).toHaveBeenLastCalledWith(expect.objectContaining({ minPrice: 20000, maxPrice: 30000, page: 1 }));
    vi.useRealTimers();
  });
});


it("clears an invalid restored range with the keyboard and searches again", async () => {
  searchActivities.mockReset();
  searchActivities.mockResolvedValue(page([]));
  listCategories.mockResolvedValue({ data: [], pagination: { total: 0 } });
  const user = userEvent.setup();
  render(<ActivitySearch initialState={readExplorationState({ minPrice: "20", maxPrice: "10" })} />);
  expect(searchActivities).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toBeInTheDocument();
  screen.getByRole("button", { name: "Limpiar" }).focus();
  await user.keyboard("{Enter}");
  expect(screen.getByLabelText("Mínimo")).toHaveValue(null);
  expect(screen.getByLabelText("Máximo")).toHaveValue(null);
  expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
  expect(searchActivities).toHaveBeenLastCalledWith(expect.objectContaining({ minPrice: undefined, maxPrice: undefined }));
});
