import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, updateRating } from "@/lib/api";
import type { OwnRating } from "@/types";

import { EditRatingForm } from "./EditRatingForm";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, updateRating: vi.fn() };
});

function mockRating(overrides: Partial<OwnRating> = {}): OwnRating {
  return {
    id: 7,
    score: 3,
    comment: "Estuvo bien",
    authorAlias: "Ana P.",
    createdAt: "2026-08-25T12:00:00.000Z",
    updatedAt: "2026-08-25T12:00:00.000Z",
    activityId: 42,
    planId: 10,
    moderationStatus: "approved",
    moderationReason: null,
    ...overrides,
  };
}

describe("EditRatingForm", () => {
  beforeEach(() => {
    vi.mocked(updateRating).mockReset();
  });

  it("pre-fills the score and comment from the current rating", () => {
    render(
      <EditRatingForm rating={mockRating()} onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "3 estrellas" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Comentario")).toHaveValue("Estuvo bien");
  });

  it("requires a score before saving", async () => {
    const user = userEvent.setup();
    render(
      <EditRatingForm
        rating={mockRating({ score: 0 })}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Seleccioná un puntaje")).toBeInTheDocument();
    expect(updateRating).not.toHaveBeenCalled();
  });

  it("submits the updated score and trimmed comment, then reports the saved rating", async () => {
    const updated = mockRating({ score: 5, comment: "Excelente" });
    vi.mocked(updateRating).mockResolvedValueOnce(updated);
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(
      <EditRatingForm rating={mockRating()} onSaved={onSaved} onCancel={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "5 estrellas" }));
    await user.clear(screen.getByLabelText("Comentario"));
    await user.type(screen.getByLabelText("Comentario"), "  Excelente  ");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(updateRating).toHaveBeenCalledWith(7, { score: 5, comment: "Excelente" });
    expect(onSaved).toHaveBeenCalledWith(updated);
  });

  it("sends null when the comment is cleared out entirely", async () => {
    vi.mocked(updateRating).mockResolvedValueOnce(mockRating({ comment: null }));
    const user = userEvent.setup();
    render(
      <EditRatingForm rating={mockRating()} onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    await user.clear(screen.getByLabelText("Comentario"));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(updateRating).toHaveBeenCalledWith(7, { score: 3, comment: null });
  });

  it("calls onCancel without saving", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <EditRatingForm rating={mockRating()} onSaved={vi.fn()} onCancel={onCancel} />,
    );

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalled();
    expect(updateRating).not.toHaveBeenCalled();
  });

  it("shows a generic message when the rating no longer exists", async () => {
    vi.mocked(updateRating).mockRejectedValueOnce(
      new ApiError({
        message: "The requested rating does not exist",
        type: "HTTP",
        status: 404,
        code: "RATING_NOT_FOUND",
      }),
    );
    const user = userEvent.setup();
    render(
      <EditRatingForm rating={mockRating()} onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("Esta valoración ya no existe. Recargá la página."),
    ).toBeInTheDocument();
  });
});
