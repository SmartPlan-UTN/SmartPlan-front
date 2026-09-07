import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, createRating } from "@/lib/api";

import { RatingForm } from "./RatingForm";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, createRating: vi.fn() };
});

function mockRating() {
  return {
    id: 1,
    score: 5,
    comment: "Excelente",
    authorAlias: "Ana P.",
    createdAt: "2026-08-25T12:00:00.000Z",
    updatedAt: "2026-08-25T12:00:00.000Z",
    activityId: 42,
    planId: 10,
    moderationStatus: "approved" as const,
    moderationReason: null,
  };
}

describe("RatingForm", () => {
  beforeEach(() => {
    vi.mocked(createRating).mockReset();
  });

  it("requires a score before submitting", async () => {
    const user = userEvent.setup();
    const onSubmitted = vi.fn();
    render(<RatingForm activityId={42} planId={10} onSubmitted={onSubmitted} />);

    await user.click(screen.getByRole("button", { name: "Enviar valoración" }));

    expect(await screen.findByText("Seleccioná un puntaje")).toBeInTheDocument();
    expect(createRating).not.toHaveBeenCalled();
  });

  it("submits the chosen score and trimmed comment, then reports the created rating", async () => {
    const rating = mockRating();
    vi.mocked(createRating).mockResolvedValueOnce(rating);
    const user = userEvent.setup();
    const onSubmitted = vi.fn();
    render(<RatingForm activityId={42} planId={10} onSubmitted={onSubmitted} />);

    await user.click(screen.getByRole("button", { name: "5 estrellas" }));
    await user.type(screen.getByLabelText("Comentario"), "  Excelente  ");
    await user.click(screen.getByRole("button", { name: "Enviar valoración" }));

    expect(createRating).toHaveBeenCalledWith(42, {
      planId: 10,
      score: 5,
      comment: "Excelente",
    });
    expect(onSubmitted).toHaveBeenCalledWith(rating);
  });

  it("submits with no comment field at all when the comment is left empty", async () => {
    vi.mocked(createRating).mockResolvedValueOnce(mockRating());
    const user = userEvent.setup();
    render(<RatingForm activityId={42} planId={10} onSubmitted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "4 estrellas" }));
    await user.click(screen.getByRole("button", { name: "Enviar valoración" }));

    expect(createRating).toHaveBeenCalledWith(42, { planId: 10, score: 4, comment: undefined });
  });

  it("shows a generic message when the activity no longer exists", async () => {
    vi.mocked(createRating).mockRejectedValueOnce(
      new ApiError({
        message: "The requested activity does not exist",
        type: "HTTP",
        status: 404,
        code: "ACTIVITY_NOT_FOUND",
      }),
    );
    const user = userEvent.setup();
    render(<RatingForm activityId={42} planId={10} onSubmitted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "3 estrellas" }));
    await user.click(screen.getByRole("button", { name: "Enviar valoración" }));

    expect(
      await screen.findByText("Esta actividad ya no está disponible."),
    ).toBeInTheDocument();
  });
});
