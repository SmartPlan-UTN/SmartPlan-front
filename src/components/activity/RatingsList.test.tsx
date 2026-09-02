import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listRatings } from "@/lib/api";
import type { PublicRating } from "@/types";

import { RatingsList } from "./RatingsList";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, listRatings: vi.fn() };
});

function mockRating(overrides: Partial<PublicRating> = {}): PublicRating {
  return {
    id: 1,
    score: 5,
    comment: "Excelente experiencia, muy recomendable.",
    authorAlias: "Ana P.",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("RatingsList", () => {
  beforeEach(() => {
    vi.mocked(listRatings).mockReset();
  });

  it("renders the empty state when there are no ratings", async () => {
    vi.mocked(listRatings).mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      summary: { averageRating: 0, ratingCount: 0 },
    });
    render(<RatingsList activityId={42} />);

    expect(
      await screen.findByText("Todavía no hay reseñas para mostrar en detalle."),
    ).toBeInTheDocument();
  });

  it("renders the review list with author, date, score, and comment", async () => {
    vi.mocked(listRatings).mockResolvedValueOnce({
      data: [mockRating()],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      summary: { averageRating: 5, ratingCount: 1 },
    });
    render(<RatingsList activityId={42} />);

    expect(await screen.findByText("Ana P.")).toBeInTheDocument();
    expect(
      screen.getByText("Excelente experiencia, muy recomendable."),
    ).toBeInTheDocument();
    expect(listRatings).toHaveBeenCalledWith(42, { page: 1 });
  });

  it("shows an error state when the request fails", async () => {
    vi.mocked(listRatings).mockRejectedValueOnce(new Error("network error"));
    render(<RatingsList activityId={42} />);

    expect(
      await screen.findByText("No pudimos cargar las reseñas. Intentá de nuevo."),
    ).toBeInTheDocument();
  });

  it("requests the next page when Página siguiente is clicked", async () => {
    vi.mocked(listRatings).mockResolvedValueOnce({
      data: [mockRating({ id: 1 })],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 2 },
      summary: { averageRating: 5, ratingCount: 2 },
    });
    const user = userEvent.setup();
    render(<RatingsList activityId={42} />);

    await screen.findByText("Ana P.");

    vi.mocked(listRatings).mockResolvedValueOnce({
      data: [mockRating({ id: 2, authorAlias: "Diego R." })],
      pagination: { page: 2, limit: 20, total: 2, totalPages: 2 },
      summary: { averageRating: 5, ratingCount: 2 },
    });
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));

    await waitFor(() => {
      expect(listRatings).toHaveBeenCalledWith(42, { page: 2 });
    });
    expect(await screen.findByText("Diego R.")).toBeInTheDocument();
  });

  it("hands the freshly fetched summary back up via onSummaryChange", async () => {
    vi.mocked(listRatings).mockResolvedValueOnce({
      data: [mockRating()],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      summary: { averageRating: 4.2, ratingCount: 5 },
    });
    const onSummaryChange = vi.fn();
    render(<RatingsList activityId={42} onSummaryChange={onSummaryChange} />);

    await waitFor(() => {
      expect(onSummaryChange).toHaveBeenCalledWith({ averageRating: 4.2, ratingCount: 5 });
    });
  });

  it("resets to page 1 and refetches when refreshToken changes (CU47)", async () => {
    vi.mocked(listRatings).mockResolvedValueOnce({
      data: [mockRating({ id: 1, authorAlias: "Ana P." })],
      pagination: { page: 2, limit: 20, total: 21, totalPages: 2 },
      summary: { averageRating: 5, ratingCount: 21 },
    });
    const { rerender } = render(<RatingsList activityId={42} refreshToken={0} />);
    await screen.findByText("Ana P.");

    // Land on page 2 first, as if the user had paginated there.
    vi.mocked(listRatings).mockResolvedValueOnce({
      data: [mockRating({ id: 2, authorAlias: "Diego R." })],
      pagination: { page: 2, limit: 20, total: 21, totalPages: 2 },
      summary: { averageRating: 5, ratingCount: 21 },
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    await screen.findByText("Diego R.");
    vi.mocked(listRatings).mockClear();

    vi.mocked(listRatings).mockResolvedValueOnce({
      data: [mockRating({ id: 1, authorAlias: "Ana P." })],
      pagination: { page: 1, limit: 20, total: 20, totalPages: 1 },
      summary: { averageRating: 4, ratingCount: 20 },
    });
    rerender(<RatingsList activityId={42} refreshToken={1} />);

    await waitFor(() => {
      expect(listRatings).toHaveBeenCalledWith(42, { page: 1 });
    });
    expect(await screen.findByText("Ana P.")).toBeInTheDocument();
  });
});
