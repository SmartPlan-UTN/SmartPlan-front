import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { ActivitySearchResult, PaginatedResult } from "@/types";

import { ActivitySearch } from "./ActivitySearch";

const searchActivities = vi.hoisted(() => vi.fn());
const listCategories = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, searchActivities, listCategories };
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
