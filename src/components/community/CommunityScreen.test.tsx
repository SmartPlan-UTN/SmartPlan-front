import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CommunityExperience, CommunityPlan, PaginatedResult } from "@/types";
import { CommunityScreen } from "./CommunityScreen";

const getCommunityExperiences = vi.hoisted(() => vi.fn());
const getCommunityPlans = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getCommunityExperiences,
  getCommunityPlans,
}));

const story: CommunityExperience = {
  id: 3,
  rating: 5,
  tags: [],
  comment: "El atardecer estuvo buenísimo.",
  isOwn: false,
  completedAt: "2026-10-01T12:00:00.000Z",
  author: { alias: "Viajero/a", username: "lucia", avatarUrl: null },
  photos: [],
};

function plan(title: string): CommunityPlan {
  return {
    id: title === "En Mendoza" ? 8 : 9,
    title,
    description: "Una idea para la próxima salida.",
    estimatedTotalCost: null,
    estimatedTotalCostMax: null,
    priceCompleteness: null,
    estimatedTotalDuration: 120,
    imageUrl: null,
    authorUsername: "lucia",
  };
}

function page<T>(data: T[]): PaginatedResult<T> {
  return { data, pagination: { page: 1, limit: 8, total: data.length, totalPages: 1 } };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

describe("CommunityScreen", () => {
  afterEach(() => vi.clearAllMocks());

  it("keeps plans discoverable when the lived experiences endpoint fails, with a focused retry", async () => {
    getCommunityExperiences
      .mockRejectedValueOnce(new Error("Experiences unavailable"))
      .mockResolvedValueOnce(page([story]));
    getCommunityPlans.mockResolvedValue(page([plan("Una tarde en Mendoza")]));

    const user = userEvent.setup();
    render(<CommunityScreen />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar las vivencias");
    expect(screen.getByRole("link", { name: "Una tarde en Mendoza" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText(/El atardecer estuvo buenísimo/)).toBeInTheDocument();
  });

  it("ignores an older search response when a newer search finishes first", async () => {
    const older = deferred<PaginatedResult<CommunityPlan>>();
    const newer = deferred<PaginatedResult<CommunityPlan>>();
    getCommunityExperiences.mockResolvedValue(page([]));
    getCommunityPlans.mockImplementation(({ q }: { q?: string }) => {
      if (q === "Mendoza") return older.promise;
      if (q === "Potrerillos") return newer.promise;
      return Promise.resolve(page([]));
    });

    const user = userEvent.setup();
    render(<CommunityScreen />);
    await screen.findByRole("heading", { name: "Así se sintió estar ahí" });

    const search = screen.getByRole("textbox", { name: "Buscar experiencias o planes" });
    await user.type(search, "Mendoza");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await user.clear(search);
    await user.type(search, "Potrerillos");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    newer.resolve(page([plan("Una tarde en Potrerillos")]));
    expect(await screen.findByRole("link", { name: "Una tarde en Potrerillos" })).toBeInTheDocument();
    older.resolve(page([plan("En Mendoza")]));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Una tarde en Potrerillos" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "En Mendoza" })).not.toBeInTheDocument();
    });
  });
});
