import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { PlanFeedback } from "@/types";

import { FeedbackDialog } from "./FeedbackDialog";

const { submitFeedback, getOuting, getOwnRating, createRating, updateRating } = vi.hoisted(() => ({
  submitFeedback: vi.fn(),
  getOuting: vi.fn(),
  getOwnRating: vi.fn(),
  createRating: vi.fn(),
  updateRating: vi.fn(),
}));

const { listMedia, uploadMedia } = vi.hoisted(() => ({
  listMedia: vi.fn(),
  uploadMedia: vi.fn(),
}));

vi.mock("@/lib/api/media", () => ({
  listMedia,
  uploadMedia,
  updateMedia: vi.fn(),
  deleteMedia: vi.fn(),
  downloadMedia: vi.fn().mockRejectedValue(new Error("not in tests")),
}));

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  submitFeedback,
  getOuting,
  getOwnRating,
  createRating,
  updateRating,
}));

function detail(order: number, id: number, name: string) {
  return { id: order * 10, order, estimatedCost: 0, estimatedDuration: 60, activity: { id, name } };
}

const OUTING = {
  id: 7,
  details: [
    detail(2, 12, "Cata en bodega"),
    detail(1, 11, "Almuerzo en finca"),
    detail(3, 11, "Almuerzo en finca"),
  ],
};

function ownRating(activityId: number, score: number, moderationStatus = "approved") {
  return {
    id: activityId * 100,
    score,
    comment: null,
    authorAlias: "Tute",
    createdAt: "2026-08-29T00:00:00.000Z",
    updatedAt: "2026-08-29T00:00:00.000Z",
    activityId,
    planId: 7,
    moderationStatus,
    moderationReason: null,
  };
}

/** The photos step follows the thanks after a short pause. */
async function photosStep() {
  return screen.findByRole("heading", { name: /sumás fotos de la salida/i }, { timeout: 3000 });
}

async function skipPhotos() {
  await photosStep();
  await userEvent.click(screen.getByRole("button", { name: /^(seguir|listo)$/i }));
}

async function sendFeedback(star = 3) {
  await userEvent.click(screen.getAllByRole("radio")[star]);
  await userEvent.click(screen.getByRole("button", { name: /enviar opinión/i }));
}

const FEEDBACK: PlanFeedback = {
  rating: 4,
  tags: [],
  comment: null,
  actualCost: null,
  actualDuration: null,
  createdAt: "2026-08-20T00:00:00.000Z",
};

function setup(overrides: Partial<Parameters<typeof FeedbackDialog>[0]> = {}) {
  const onDismiss = vi.fn();
  const onSubmitted = vi.fn();
  const onReconcile = vi.fn();
  render(
    <FeedbackDialog
      open
      planId={7}
      planTitle="Tarde de vinos en Luján"
      estimatedTotalCost={25000}
      completedAt="2026-08-28T00:00:00.000Z"
      activityCount={3}
      onDismiss={onDismiss}
      onSubmitted={onSubmitted}
      onReconcile={onReconcile}
      {...overrides}
    />
  );
  return { onDismiss, onSubmitted, onReconcile };
}

beforeEach(() => {
  vi.clearAllMocks();
  submitFeedback.mockResolvedValue(FEEDBACK);
  listMedia.mockResolvedValue([]);
  uploadMedia.mockResolvedValue({
    id: 1,
    url: "/api/media/plan/1",
    isPrimary: true,
    displayOrder: 0,
    createdAt: "2026-10-02T00:00:00.000Z",
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:feedback-photo"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  // The CU23-only tests don't need a follow-up activity step.
  getOuting.mockResolvedValue({ ...OUTING, details: [] });
  getOwnRating.mockImplementation((id: number) => Promise.resolve(ownRating(id, 4)));
  createRating.mockImplementation((id: number, input: { score: number }) =>
    Promise.resolve(ownRating(id, input.score))
  );
  updateRating.mockImplementation((id: number, input: { score: number }) =>
    Promise.resolve(ownRating(id / 100, input.score))
  );
});

describe("FeedbackDialog (CU23)", () => {
  it("portals the overlay to the document body and locks page scroll", () => {
    setup();
    const dialog = screen.getByRole("dialog");

    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("shows the plan date and activity count as compact experience context", () => {
    setup();

    expect(screen.getByText(/28 ago/i)).toBeInTheDocument();
    expect(screen.getByText(/3 actividades/i)).toBeInTheDocument();
  });

  it("omits unavailable activity metadata instead of rendering undefined", () => {
    setup({ activityCount: undefined as unknown as number });

    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
    expect(screen.getByText(/28 ago/i)).toBeInTheDocument();
  });

  it("focuses the selected star and traps Tab inside the dialog", async () => {
    setup({ initialRating: 4 });

    const selected = screen.getByRole("radio", { name: /4 estrellas/i });
    await waitFor(() => expect(selected).toHaveFocus());

    const dismiss = screen.getByRole("button", { name: /ahora no/i });
    dismiss.focus();
    await userEvent.tab();
    expect(selected).toHaveFocus();
  });

  it("keeps the submit action disabled until a star is chosen", async () => {
    setup();
    const submit = screen.getByRole("button", { name: /enviar opinión/i });
    expect(submit).toBeDisabled();

    await userEvent.click(screen.getAllByRole("radio")[3]);
    expect(submit).toBeEnabled();
  });

  it("does not reveal the optional fields before a rating", () => {
    setup();
    expect(
      screen.queryByText(/qué destacarías/i)
    ).not.toBeInTheDocument();
  });

  it("adapts the tag question to a low rating", async () => {
    setup();
    await userEvent.click(screen.getAllByRole("radio")[1]);

    expect(screen.getByText(/qué podríamos mejorar/i)).toBeInTheDocument();
    expect(screen.queryByText(/qué destacarías/i)).not.toBeInTheDocument();
  });

  it("submits with only a rating and shows the success state", async () => {
    const { onSubmitted } = setup();

    await userEvent.click(screen.getAllByRole("radio")[3]);
    await userEvent.click(
      screen.getByRole("button", { name: /enviar opinión/i })
    );

    expect(submitFeedback).toHaveBeenCalledWith(7, { rating: 4 });
    expect(
      await screen.findByText(/¡gracias por tu opinión!/i)
    ).toBeInTheDocument();
    // Nothing to rate here: the photos step closes it with "Listo".
    await photosStep();
    expect(onSubmitted).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Listo" }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(FEEDBACK));
  });

  it("includes chosen tags and a real cost in the payload", async () => {
    setup();
    await userEvent.click(screen.getAllByRole("radio")[4]);
    await userEvent.click(
      screen.getByRole("button", { name: /lo recomendaría/i })
    );
    await userEvent.type(screen.getByLabelText(/cuánto gastaste realmente/i), "28400");
    await userEvent.click(
      screen.getByRole("button", { name: /enviar opinión/i })
    );

    expect(submitFeedback).toHaveBeenCalledWith(7, {
      rating: 5,
      tags: ["would_recommend"],
      actualCost: 28400,
    });
  });

  it("updates a tag on pointerdown without double-toggling on click", async () => {
    setup();
    await userEvent.click(screen.getAllByRole("radio")[4]);
    const tag = screen.getByRole("button", { name: /lo recomendaría/i });

    fireEvent.pointerDown(tag, { button: 0 });

    expect(tag).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(tag, { detail: 1 });
    expect(tag).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(tag, { detail: 0 });
    expect(tag).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps tag selection available from the keyboard", async () => {
    setup();
    await userEvent.click(screen.getAllByRole("radio")[4]);
    const tag = screen.getByRole("button", { name: /lo recomendaría/i });
    tag.focus();

    await userEvent.keyboard(" ");

    expect(tag).toHaveAttribute("aria-pressed", "true");
  });

  it("sanitizes and limits the real cost while preserving two decimals", async () => {
    setup();
    await userEvent.click(screen.getAllByRole("radio")[3]);
    const cost = screen.getByLabelText(/cuánto gastaste realmente/i);

    fireEvent.change(cost, { target: { value: "$ 28400,567 abc" } });

    expect(cost).toHaveValue("28.400,56");
    expect(cost).toHaveAttribute("maxlength", "16");
    expect(screen.queryByText(/hasta 2 decimales/i)).not.toBeInTheDocument();
  });

  it("rejects a real cost above the supported maximum", async () => {
    setup();
    await userEvent.click(screen.getAllByRole("radio")[3]);
    const cost = screen.getByLabelText(/cuánto gastaste realmente/i);

    fireEvent.change(cost, { target: { value: "1000000000" } });

    expect(screen.getByRole("alert")).toHaveTextContent(/monto máximo/i);
    expect(screen.getByRole("button", { name: /enviar opinión/i })).toBeDisabled();
  });

  it("rejects negative costs instead of silently turning them positive", async () => {
    setup();
    await userEvent.click(screen.getAllByRole("radio")[3]);
    const cost = screen.getByLabelText(/cuánto gastaste realmente/i);

    fireEvent.change(cost, { target: { value: "-1200" } });

    expect(cost).toHaveValue("1.200");
    expect(screen.getByRole("alert")).toHaveTextContent(/mayor a \$0/i);
    expect(screen.getByRole("button", { name: /enviar opinión/i })).toBeDisabled();
  });

  it("limits comments and reveals a subtle counter near the limit", async () => {
    setup();
    await userEvent.click(screen.getAllByRole("radio")[3]);
    await userEvent.click(screen.getByRole("button", { name: /agregar un comentario/i }));
    const comment = screen.getByRole("textbox", { name: /tu comentario/i });

    fireEvent.change(comment, { target: { value: "a".repeat(1020) } });

    expect(comment).toHaveValue("a".repeat(1000));
    expect(screen.getByText("1000/1000")).toBeInTheDocument();
    expect(screen.queryByText(/máximo 1000 caracteres/i)).not.toBeInTheDocument();
  });

  it("keeps the same dialog shell through disclosure and success", async () => {
    setup();
    const shell = screen.getByRole("dialog");
    await userEvent.click(screen.getAllByRole("radio")[3]);
    await userEvent.click(screen.getByRole("button", { name: /agregar un comentario/i }));
    const comment = screen.getByLabelText(/tu comentario/i);
    await waitFor(() => expect(comment).toHaveFocus());
    fireEvent.change(comment, {
      target: { value: "Hermoso plan" },
    });

    expect(screen.getByRole("dialog")).toBe(shell);
    await userEvent.click(screen.getByRole("button", { name: /enviar opinión/i }));
    expect(await screen.findByText(/gracias por tu opinión/i)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBe(shell);
  });

  it("shows an inline error for an invalid amount and blocks submit", async () => {
    setup();
    await userEvent.click(screen.getAllByRole("radio")[3]);
    await userEvent.type(screen.getByLabelText(/cuánto gastaste realmente/i), "0");

    expect(
      screen.getByText(/ingresá un monto válido mayor a \$0/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar opinión/i })).toBeDisabled();
    expect(submitFeedback).not.toHaveBeenCalled();
  });

  it("submits when the amount is left empty", async () => {
    setup();
    await userEvent.click(screen.getAllByRole("radio")[2]);
    await userEvent.click(
      screen.getByRole("button", { name: /enviar opinión/i })
    );
    expect(submitFeedback).toHaveBeenCalledWith(7, { rating: 3 });
  });

  it("dismisses without calling the API when 'Ahora no' is used", async () => {
    const { onDismiss } = setup();
    await userEvent.click(screen.getByRole("button", { name: /ahora no/i }));
    await waitFor(() => expect(onDismiss).toHaveBeenCalled(), { timeout: 750 });
    expect(submitFeedback).not.toHaveBeenCalled();
  });

  it("keeps the form and shows the error when the API fails", async () => {
    submitFeedback.mockRejectedValueOnce(
      new ApiError({ message: "Se cortó la conexión.", type: "NETWORK" })
    );
    setup();

    await userEvent.click(screen.getAllByRole("radio")[3]);
    await userEvent.click(
      screen.getByRole("button", { name: /enviar opinión/i })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/conexión/i);
    expect(
      screen.queryByText(/¡gracias por tu opinión!/i)
    ).not.toBeInTheDocument();
  });

  it("requests an authoritative refresh for a stale feedback state", async () => {
    submitFeedback.mockRejectedValueOnce(
      new ApiError({
        message: "Ya existe.",
        type: "HTTP",
        status: 409,
        code: "FEEDBACK_ALREADY_SUBMITTED",
      })
    );
    const { onReconcile } = setup();

    await userEvent.click(screen.getAllByRole("radio")[3]);
    await userEvent.click(
      screen.getByRole("button", { name: /enviar opinión/i })
    );

    await waitFor(() => expect(onReconcile).toHaveBeenCalledTimes(1));
  });
});

describe("FeedbackDialog → rating the activities (CU23 → CU44)", () => {
  beforeEach(() => {
    getOuting.mockResolvedValue(OUTING);
    getOwnRating.mockResolvedValue(null);
    listMedia.mockResolvedValue([]);
  });

  it("offers the activity step even when every activity is already rated", async () => {
    getOwnRating.mockImplementation((id: number) => Promise.resolve(ownRating(id, 5)));
    const { onSubmitted } = setup();
    await sendFeedback();
    await skipPhotos();

    expect(await screen.findByText(/querés valorar las actividades/i)).toBeInTheDocument();
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("ends after the photos when the activities can't be loaded", async () => {
    getOuting.mockRejectedValueOnce(new ApiError({ message: "x", type: "NETWORK" }));
    const { onSubmitted } = setup();
    await sendFeedback();
    await photosStep();

    await userEvent.click(screen.getByRole("button", { name: /ahora no/i }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(FEEDBACK));
    expect(screen.queryByText(/querés valorar las actividades/i)).not.toBeInTheDocument();
  });

  it("offers photos of the whole outing right after the feedback", async () => {
    const { onSubmitted } = setup();
    await sendFeedback();

    await photosStep();
    expect(screen.getByText(/gracias por tu opinión/i)).toBeInTheDocument();
    expect(await screen.findByLabelText("Agregar fotos")).toBeInTheDocument();
    expect(screen.getByText("Elegir fotos")).toBeInTheDocument();
    expect(listMedia).toHaveBeenCalledWith("plan", 7);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Seguir" })).toHaveFocus()
    );
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("Escape on the photos step reports the saved feedback", async () => {
    const { onSubmitted, onDismiss } = setup();
    await sendFeedback();
    await photosStep();

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(FEEDBACK));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("closes only the photo lightbox when Escape is pressed inside it", async () => {
    listMedia.mockResolvedValue([
      {
        id: 1,
        url: "/api/media/plan/1",
        isPrimary: true,
        displayOrder: 0,
        createdAt: "2026-10-02T00:00:00.000Z",
      },
    ]);
    const { onSubmitted } = setup();
    await sendFeedback();
    await photosStep();
    await userEvent.click(await screen.findByRole("button", { name: "Ver foto 1 de 1" }));

    await userEvent.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: "Fotos de Tarde de vinos en Luján" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /sumás fotos de la salida/i })).toBeInTheDocument();
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("notifies the parent when an outing photo changes", async () => {
    listMedia
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 1,
          url: "/api/media/plan/1",
          isPrimary: true,
          displayOrder: 0,
          createdAt: "2026-10-02T00:00:00.000Z",
        },
      ]);
    const onMediaChanged = vi.fn();
    setup({ onMediaChanged });
    await sendFeedback();
    await photosStep();

    await userEvent.upload(
      await screen.findByLabelText("Agregar fotos"),
      new File(["photo"], "salida.png", { type: "image/png" }),
    );

    await waitFor(() => expect(onMediaChanged).toHaveBeenCalledTimes(1));
    expect(uploadMedia).toHaveBeenCalledWith("plan", 7, expect.any(File), expect.any(Function));
  });

  it("offers rating the activities after the feedback is saved", async () => {
    const { onSubmitted } = setup();
    await sendFeedback();
    await skipPhotos();

    expect(await screen.findByText(/querés valorar las actividades/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /valorar actividades/i })).toHaveFocus()
    );
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("declining the offer still reports the saved feedback", async () => {
    const { onSubmitted, onDismiss } = setup();
    await sendFeedback();
    await skipPhotos();

    await userEvent.click(await screen.findByRole("button", { name: /ahora no/i }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(FEEDBACK));
    expect(onDismiss).not.toHaveBeenCalled();
    expect(createRating).not.toHaveBeenCalled();
  });

  it("Escape on the offer also reports the saved feedback", async () => {
    const { onSubmitted, onDismiss } = setup();
    await sendFeedback();
    await skipPhotos();
    await screen.findByText(/querés valorar las actividades/i);

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(FEEDBACK));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("lists each activity once, in itinerary order, and sends only the rated ones", async () => {
    const { onSubmitted } = setup();
    await sendFeedback();
    await skipPhotos();
    await userEvent.click(await screen.findByRole("button", { name: /valorar actividades/i }));

    const groups = screen.getAllByRole("radiogroup");
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveAccessibleName("Almuerzo en finca");
    expect(groups[1]).toHaveAccessibleName("Cata en bodega");
    expect(groups[0]).toHaveAttribute("aria-required", "false");

    const save = screen.getByRole("button", { name: /guardar valoraciones/i });
    expect(save).toBeDisabled();

    await userEvent.click(within(groups[1]).getByRole("radio", { name: /5 estrellas/i }));
    await userEvent.click(screen.getByRole("button", { name: /agregar un comentario/i }));
    await userEvent.type(
      screen.getByLabelText(/tu comentario sobre cata en bodega/i),
      "  Muy buena  "
    );
    await userEvent.click(save);

    expect(createRating).toHaveBeenCalledTimes(1);
    expect(createRating).toHaveBeenCalledWith(12, { planId: 7, score: 5, comment: "Muy buena" });
    expect(await screen.findByText(/gracias por valorar/i)).toBeInTheDocument();
    // Each rated activity can take its own photos; the person closes it.
    expect(
      await screen.findByRole("region", { name: /fotos de tu valoración de cata en bodega/i })
    ).toBeInTheDocument();
    expect(listMedia).toHaveBeenCalledWith("rating", 1200);
    expect(onSubmitted).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Listo" }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(FEEDBACK));
  });

  it("lets the person update an activity already rated", async () => {
    getOwnRating.mockImplementation((id: number) =>
      Promise.resolve(id === 11 ? ownRating(11, 3) : null)
    );
    setup();
    await sendFeedback();
    await skipPhotos();
    await userEvent.click(await screen.findByRole("button", { name: /valorar actividades/i }));

    const [lunch] = screen.getAllByRole("radiogroup");
    expect(screen.getAllByRole("radiogroup")).toHaveLength(2);
    expect(screen.getByText(/tu valoración actual/i)).toBeInTheDocument();

    await userEvent.click(within(lunch).getByRole("radio", { name: /5 estrellas/i }));
    await userEvent.click(screen.getByRole("button", { name: /guardar valoraciones/i }));

    expect(updateRating).toHaveBeenCalledWith(1100, { score: 5, comment: null });
    expect(createRating).not.toHaveBeenCalled();
  });

  it("keeps a failed rating open and the saved one read-only", async () => {
    createRating.mockImplementation((id: number, input: { score: number }) =>
      id === 11
        ? Promise.reject(new ApiError({ message: "Se cortó la conexión.", type: "NETWORK" }))
        : Promise.resolve(ownRating(id, input.score, "rejected"))
    );
    const { onSubmitted } = setup();
    await sendFeedback();
    await skipPhotos();
    await userEvent.click(await screen.findByRole("button", { name: /valorar actividades/i }));

    const [lunch, tasting] = screen.getAllByRole("radiogroup");
    await userEvent.click(within(lunch).getByRole("radio", { name: /4 estrellas/i }));
    await userEvent.click(within(tasting).getByRole("radio", { name: /5 estrellas/i }));
    await userEvent.click(screen.getByRole("button", { name: /guardar valoraciones/i }));

    expect(await screen.findByText(/no pudimos guardar una valoración/i)).toBeInTheDocument();
    expect(screen.getByText(/se cortó la conexión/i)).toBeInTheDocument();
    expect(screen.getByText("Guardada")).toBeInTheDocument();
    expect(screen.getAllByRole("radiogroup")).toHaveLength(1);
    expect(onSubmitted).not.toHaveBeenCalled();

    createRating.mockClear();
    createRating.mockImplementation((id: number, input: { score: number }) =>
      Promise.resolve(ownRating(id, input.score))
    );
    await userEvent.click(screen.getByRole("button", { name: /guardar valoraciones/i }));
    expect(createRating).toHaveBeenCalledTimes(1);
    expect(createRating).toHaveBeenCalledWith(11, { planId: 7, score: 4, comment: undefined });
    expect(await screen.findByText(/no pasó la moderación/i)).toBeInTheDocument();
  });

  it("updates a rating created elsewhere meanwhile", async () => {
    createRating.mockRejectedValue(
      new ApiError({
        message: "Ya existe.",
        type: "HTTP",
        status: 409,
        code: "RATING_ALREADY_EXISTS",
      })
    );
    setup();
    await sendFeedback();
    await skipPhotos();
    await userEvent.click(await screen.findByRole("button", { name: /valorar actividades/i }));

    const [lunch] = screen.getAllByRole("radiogroup");
    getOwnRating.mockResolvedValue(ownRating(11, 3));
    await userEvent.click(within(lunch).getByRole("radio", { name: /2 estrellas/i }));
    await userEvent.click(screen.getByRole("button", { name: /guardar valoraciones/i }));

    expect(updateRating).toHaveBeenCalledWith(1100, { score: 2, comment: null });
    expect(await screen.findByText(/gracias por valorar/i)).toBeInTheDocument();
  });

  it("warns when a comment didn't pass moderation", async () => {
    createRating.mockImplementation((id: number, input: { score: number }) =>
      Promise.resolve(ownRating(id, input.score, "rejected"))
    );
    setup();
    await sendFeedback();
    await skipPhotos();
    await userEvent.click(await screen.findByRole("button", { name: /valorar actividades/i }));

    const [lunch] = screen.getAllByRole("radiogroup");
    await userEvent.click(within(lunch).getByRole("radio", { name: /1 estrella/i }));
    await userEvent.click(screen.getByRole("button", { name: /guardar valoraciones/i }));

    expect(await screen.findByText(/no pasó la moderación/i)).toBeInTheDocument();
  });

  it("skipping the activities still reports the saved feedback", async () => {
    const { onSubmitted, onDismiss } = setup();
    await sendFeedback();
    await skipPhotos();
    await userEvent.click(await screen.findByRole("button", { name: /valorar actividades/i }));

    await userEvent.click(screen.getByRole("button", { name: /omitir/i }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(FEEDBACK));
    expect(onDismiss).not.toHaveBeenCalled();
    expect(createRating).not.toHaveBeenCalled();
  });
});
