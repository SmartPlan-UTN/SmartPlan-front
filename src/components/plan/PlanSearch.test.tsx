import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanSearch } from "./PlanSearch";

const searchPlans = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ useSession: () => ({ status: "authenticated" }) }));
vi.mock("@/components/explore/categoryCatalog", () => ({ getCategoriesOnce: () => Promise.resolve([]) }));
vi.mock("@/lib/api", async () => ({ ...await vi.importActual<typeof import("@/lib/api")>("@/lib/api"), searchPlans }));

describe("plan price filters (CU12)", () => {
  it("keeps invalid ranges out of requests and lets the user recover", async () => {
    vi.useFakeTimers();
    try {
      searchPlans.mockResolvedValue({ data: [], pagination: { page: 1, total: 0, totalPages: 0, limit: 12 } });
      render(<PlanSearch />);
      const initialCalls = searchPlans.mock.calls.length;
      fireEvent.change(screen.getByLabelText("Mínimo"), { target: { value: "20000" } });
      fireEvent.change(screen.getByLabelText("Máximo"), { target: { value: "10000" } });
      await act(async () => { vi.advanceTimersByTime(400); });
      expect(screen.getByRole("alert")).toHaveTextContent("El precio mínimo no puede superar al máximo.");
      expect(searchPlans).toHaveBeenCalledTimes(initialCalls);
      fireEvent.change(screen.getByLabelText("Máximo"), { target: { value: "30000" } });
      await act(async () => { vi.advanceTimersByTime(400); });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(searchPlans).toHaveBeenLastCalledWith(expect.objectContaining({ minPrice: 20000, maxPrice: 30000 }));
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("plan search empty state (#160)", () => {
  it("explains that only published plans reach Explorar", async () => {
    searchPlans.mockResolvedValue({ data: [], pagination: { page: 1, total: 0, totalPages: 0, limit: 12 } });
    render(<PlanSearch />);

    expect(await screen.findByRole("heading", { name: "Todavía no hay planes publicados" })).toBeInTheDocument();
    expect(screen.getByText(/solo aparecen los planes que sus autores publicaron/)).toBeInTheDocument();
  });
});
