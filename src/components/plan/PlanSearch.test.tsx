import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PaginatedResult, PlanSearchResult } from "@/types";

import { PlanSearch } from "./PlanSearch";

const searchPlans = vi.hoisted(() => vi.fn());
const listCategories = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, searchPlans, listCategories };
});

function makePlan(overrides: Partial<PlanSearchResult> = {}): PlanSearchResult {
  return {
    id: 1,
    title: "Tarde íntima en San Telmo",
    description: null,
    estimatedTotalCost: 3800,
    estimatedTotalDuration: 270,
    activityCount: 3,
    averageRating: 4.8,
    distanceKm: null,
    categories: [],
    activityNames: ["Café", "Paseo", "Cena"],
    status: { key: "confirmed", name: "Confirmado" },
    ...overrides,
  };
}

function page(
  data: PlanSearchResult[],
  overrides: Partial<PaginatedResult<PlanSearchResult>["pagination"]> = {},
): PaginatedResult<PlanSearchResult> {
  return {
    data,
    pagination: {
      page: 1,
      limit: 12,
      total: data.length,
      totalPages: 1,
      ...overrides,
    },
  };
}

/** Resolves every pending microtask (the mocked `searchPlans` promise
 * included) without advancing any fake timer. */
async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("PlanSearch", () => {
  beforeEach(() => {
    searchPlans.mockReset();
    listCategories.mockReset();
    listCategories.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the CU12 transition immediately, before the first search resolves", async () => {
    searchPlans.mockReturnValue(new Promise(() => {})); // never resolves in this test
    render(<PlanSearch />);

    expect(screen.getByText("Armando tu plan perfecto...")).toBeInTheDocument();
    expect(screen.getByText("Buscando lo mejor cerca tuyo")).toBeInTheDocument();
  });

  it("quotes the active query under the transition title", async () => {
    searchPlans.mockReturnValue(new Promise(() => {}));
    render(<PlanSearch />);

    fireEvent.change(screen.getByLabelText("Buscar planes"), {
      target: { value: "Tarde romántica" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText('"Tarde romántica"')).toBeInTheDocument();
  });

  it("holds the transition up for at least 3s even after the search resolves quickly", async () => {
    vi.useFakeTimers();
    searchPlans.mockResolvedValue(page([makePlan()]));
    render(<PlanSearch />);

    expect(screen.getByText("Armando tu plan perfecto...")).toBeInTheDocument();

    // The mocked request already resolved, but the 3s hold hasn't.
    await flushMicrotasks();
    expect(screen.getByText("Armando tu plan perfecto...")).toBeInTheDocument();
    expect(screen.queryByText("Tarde íntima en San Telmo")).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("Armando tu plan perfecto...")).toBeInTheDocument();
    expect(screen.queryByText("Tarde íntima en San Telmo")).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText("Armando tu plan perfecto...")).not.toBeInTheDocument();
    expect(screen.getByText("Tarde íntima en San Telmo")).toBeInTheDocument();
  });

  it("never shows the big transition again on a refetch once results already exist", async () => {
    vi.useFakeTimers();
    searchPlans.mockResolvedValue(page([makePlan()]));
    render(<PlanSearch />);

    await flushMicrotasks();
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText("Tarde íntima en San Telmo")).toBeInTheDocument();

    // Changing a filter refetches without ever clearing `hasResults`, so
    // this should dim the existing grid in place, not replay the
    // transition (`isRefetching`/`.resultsFadeLoading`, not `showTransition`).
    searchPlans.mockResolvedValue(
      page([makePlan({ id: 2, title: "Verde y tranquilo en Palermo" })]),
    );
    fireEvent.click(screen.getByRole("button", { name: "Filtros" }));
    fireEvent.change(screen.getByLabelText("Precio mínimo"), {
      target: { value: "1000" },
    });

    await act(async () => {
      vi.advanceTimersByTime(400); // PlanSearch's own DEBOUNCE_MS
    });
    await flushMicrotasks();

    expect(screen.queryByText("Armando tu plan perfecto...")).not.toBeInTheDocument();
    expect(screen.getByText("Verde y tranquilo en Palermo")).toBeInTheDocument();
  });
});
