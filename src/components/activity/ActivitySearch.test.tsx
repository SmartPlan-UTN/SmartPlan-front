import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { ActivitySearchResult, PaginatedResult } from "@/types";

import { ActivitySearch } from "./ActivitySearch";

const searchExplore = vi.hoisted(() => vi.fn());
const listCategories = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, searchExplore, listCategories };
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
