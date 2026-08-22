import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { ActivitySearchResult, PaginatedResult } from "@/types";

import { ActivitySearch } from "./ActivitySearch";

const searchActivities = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, searchActivities };
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

  it("loads the next page and appends it to the grid", async () => {
    searchActivities.mockResolvedValueOnce(
      page([makeActivity({ id: 1, name: "Ruta del vino" })], {
        page: 1,
        totalPages: 2,
      }),
    );
    const user = userEvent.setup();
    render(<ActivitySearch />);

    await screen.findByRole("heading", { name: "Ruta del vino" });

    searchActivities.mockResolvedValueOnce(
      page([makeActivity({ id: 2, name: "Termas de Cacheuta" })], {
        page: 2,
        totalPages: 2,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Cargar más" }));

    expect(
      await screen.findByRole("heading", { name: "Termas de Cacheuta" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ruta del vino" }),
    ).toBeInTheDocument();
  });
});
