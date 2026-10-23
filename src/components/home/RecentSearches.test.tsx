import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanRequestSummary } from "@/types";

import { RecentSearches, relativeDay } from "./RecentSearches";

const useRecentPlanRequests = vi.hoisted(() => vi.fn());

vi.mock("@/hooks", async (importActual) => ({
  ...(await importActual<typeof import("@/hooks")>()),
  useRecentPlanRequests,
}));

const today = new Date().toISOString();

function summary(id: number, over: Partial<PlanRequestSummary> = {}): PlanRequestSummary {
  return {
    id,
    statusKey: "generated",
    mode: "automatic",
    requestedAt: today,
    query: "plan romántico con mi novia",
    planCount: 4,
    planTitles: [],
    ...over,
  };
}

describe("RecentSearches", () => {
  const retry = vi.fn();

  beforeEach(() => {
    retry.mockReset();
  });

  it.each(["idle", "empty"])("renders nothing when %s", (status) => {
    useRecentPlanRequests.mockReturnValue({ status, requests: [], retry });

    const { container } = render(<RecentSearches />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows only the newest search and keeps its full label available on hover", () => {
    const query = "Una salida larguísima con amigos, buena comida y una sobremesa sin apuro";
    useRecentPlanRequests.mockReturnValue({
      status: "ready",
      requests: [
        summary(42, { requestedAt: new Date(Date.now() - 86_400_000).toISOString() }),
        summary(41, { requestedAt: today, query }),
        summary(40, {
          requestedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
          statusKey: "processing",
          planCount: 0,
        }),
      ],
      retry,
    });

    render(<RecentSearches />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/plan-requests/41");
    expect(links[0]).toHaveAttribute("title", `«${query}»`);
    expect(links[0]).toHaveTextContent("hoy");
    expect(links[0]).toHaveTextContent("4 planes");
    expect(screen.getByRole("heading", { name: "Tu última búsqueda" })).toBeInTheDocument();
  });

  it("offers a retry on error", async () => {
    useRecentPlanRequests.mockReturnValue({ status: "error", requests: [], retry });

    render(<RecentSearches />);
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(retry).toHaveBeenCalled();
  });
});

describe("relativeDay", () => {
  const now = new Date(2026, 9, 15, 18, 0);

  it.each([
    [new Date(2026, 9, 15, 0, 5), "hoy"],
    [new Date(2026, 9, 14, 23, 50), "ayer"],
    [new Date(2026, 9, 2, 12, 0), "02/10"],
    [new Date(2025, 11, 31, 12, 0), "31/12/25"],
  ])("formats %s as %s", (date, expected) => {
    expect(relativeDay(date.toISOString(), now)).toBe(expected);
  });
});
