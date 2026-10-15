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

  it("links each search to its results", () => {
    useRecentPlanRequests.mockReturnValue({
      status: "ready",
      requests: [
        summary(42, { planTitles: ["Cena con vista", "Paseo y vino"] }),
        summary(41, { mode: "surprise", query: null, planCount: 1 }),
        summary(40, { statusKey: "processing", planCount: 0 }),
      ],
      retry,
    });

    render(<RecentSearches />);

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/plan-requests/42",
      "/plan-requests/41",
      "/plan-requests/40",
    ]);
    expect(links[0]).toHaveTextContent("«plan romántico con mi novia»");
    expect(links[0]).toHaveTextContent("hoy · 4 planes");
    expect(links[0]).toHaveAttribute("title", "Cena con vista · Paseo y vino");
    expect(links[1]).not.toHaveAttribute("title");
    expect(links[1]).toHaveTextContent("Sorpréndeme");
    expect(links[1]).toHaveTextContent("1 plan");
    expect(links[2]).toHaveTextContent("Generando…");
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
