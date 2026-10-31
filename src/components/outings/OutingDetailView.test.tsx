import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { outingCreation, outingDetail } from "@/test/fixtures/outings";

import { OutingDetailView } from "./OutingDetailView";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));

const getOuting = vi.hoisted(() => vi.fn());
const completeOuting = vi.hoisted(() => vi.fn());
const cancelOuting = vi.hoisted(() => vi.fn());
const repeatOuting = vi.hoisted(() => vi.fn());
const setOutingPreparation = vi.hoisted(() => vi.fn());
const updateFeedback = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getOuting,
  completeOuting,
  cancelOuting,
  repeatOuting,
  setOutingPreparation,
  updateFeedback,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OutingDetailView (#130, CU22, CU23)", () => {
  it("shows the frozen itinerary and where it came from", async () => {
    getOuting.mockResolvedValue(outingDetail());
    render(<OutingDetailView outingId={40} />);

    expect(
      await screen.findByRole("heading", { name: "Día de viñedos", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bodega boutique → Almuerzo de campo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "«Día de viñedos»" })).toHaveAttribute(
      "href",
      "/plans/7",
    );
  });

  it("says when the original plan is no longer available", async () => {
    getOuting.mockResolvedValue(
      outingDetail({
        source: { id: 7, kind: "authored", title: "x", available: false, hasCommunity: false },
      }),
    );
    render(<OutingDetailView outingId={40} />);

    expect(
      await screen.findByText("El plan original ya no está disponible"),
    ).toBeInTheDocument();
  });

  it("marks it as done and opens the feedback right away", async () => {
    getOuting.mockResolvedValue(outingDetail());
    completeOuting.mockResolvedValue(
      outingDetail({
        status: "completed",
        completedAt: "2026-09-30T12:00:00.000Z",
        feedbackState: "available",
      }),
    );
    const user = userEvent.setup();
    render(<OutingDetailView outingId={40} />);

    await user.click(
      await screen.findByRole("button", { name: /marcar como realizada/i }),
    );

    expect(completeOuting).toHaveBeenCalledWith(40);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Ahora no" }));
    // Still answerable later, from the page itself.
    expect(await screen.findByText("Contanos tu experiencia")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /volver a hacer este plan/i }),
    ).toBeInTheDocument();
  });

  it("cancels only after confirming, then goes back to Mis salidas", async () => {
    getOuting.mockResolvedValue(outingDetail());
    cancelOuting.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<OutingDetailView outingId={40} />);

    await user.click(await screen.findByRole("button", { name: /cancelar salida/i }));
    expect(cancelOuting).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /sí, cancelar salida/i }));

    expect(cancelOuting).toHaveBeenCalledWith(40);
    expect(push).toHaveBeenCalledWith("/outings");
  });

  it("does it again as a new outing and opens it", async () => {
    getOuting.mockResolvedValue(
      outingDetail({
        status: "completed",
        completedAt: "2026-09-30T12:00:00.000Z",
        feedbackState: "submitted",
        feedback: {
          rating: 5,
          tags: [],
          comment: null,
          actualCost: null,
          actualDuration: null,
          shared: false,
          commentHidden: false,
          createdAt: "2026-09-30T13:00:00.000Z",
        },
      }),
    );
    repeatOuting.mockResolvedValue(outingCreation({ id: 41 }));
    const user = userEvent.setup();
    render(<OutingDetailView outingId={40} />);

    await user.click(
      await screen.findByRole("button", { name: /volver a hacer este plan/i }),
    );

    expect(repeatOuting).toHaveBeenCalledWith(40);
    expect(push).toHaveBeenCalledWith("/outings/41");
  });

  it("keeps the sharing switch of a shared experience once the plan is unpublished", async () => {
    const feedback = {
      id: 3,
      rating: 4,
      tags: [],
      comment: null,
      actualCost: null,
      actualDuration: null,
      shared: true,
      commentHidden: false,
      images: [],
      createdAt: "2026-09-30T12:00:00.000Z",
    };
    const unpublished = { id: 7, kind: "authored" as const, title: "Día de viñedos", available: false, hasCommunity: false };
    getOuting.mockResolvedValue(
      outingDetail({
        status: "completed",
        completedAt: "2026-09-30T12:00:00.000Z",
        feedbackState: "submitted",
        feedback,
        source: unpublished,
      }),
    );
    const { unmount } = render(<OutingDetailView outingId={40} />);

    expect(await screen.findByRole("switch", { name: "Compartir con la comunidad" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByText("El plan original ya no está disponible")).toBeInTheDocument();
    unmount();

    // A completed outing stays shareable on its own, even when its source is private.
    getOuting.mockResolvedValue(
      outingDetail({
        status: "completed",
        completedAt: "2026-09-30T12:00:00.000Z",
        feedbackState: "submitted",
        feedback: { ...feedback, shared: false },
        source: unpublished,
      }),
    );
    render(<OutingDetailView outingId={40} />);
    expect(await screen.findByText("Tu experiencia")).toBeInTheDocument();
    expect(await screen.findByRole("switch", { name: "Compartir con la comunidad" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("explains a missing outing", async () => {
    const { ApiError } = await import("@/lib/api");
    getOuting.mockRejectedValue(
      new ApiError({ message: "x", type: "HTTP", status: 404 }),
    );
    render(<OutingDetailView outingId={40} />);

    expect(
      await screen.findByText("No encontramos esta salida"),
    ).toBeInTheDocument();
  });

  describe("readiness mutations", () => {
    const task = (detailId: number, status: "PENDING" | "CONFIRMED" = "PENDING") => ({
      detailId,
      kind: "TICKET" as const,
      required: true,
      label: `Entradas ${detailId}`,
      status,
      confirmedAt: null,
      actionUrl: null,
      actionLabel: null,
    });
    const readiness = (tasks: ReturnType<typeof task>[]) => ({
      stage: "PREPARATION_REQUIRED" as const,
      label: "Falta preparar",
      summary: "Falta confirmar entradas.",
      ready: false,
      verifiedStops: 2,
      totalStops: 2,
      tasks,
    });

    it("blocks every other change while one is saving, so a stale snapshot cannot win", async () => {
      getOuting.mockResolvedValue(outingDetail({ readiness: readiness([task(1), task(2)]) }));
      let resolve!: (value: unknown) => void;
      setOutingPreparation.mockReturnValue(new Promise((r) => (resolve = r)));
      const user = userEvent.setup();
      render(<OutingDetailView outingId={40} />);

      const buttons = await screen.findAllByRole("button", { name: "Ya lo resolví" });
      await user.click(buttons[0]);

      expect(screen.getByRole("button", { name: "Marcar como realizada" })).toBeDisabled();
      for (const button of screen.getAllByRole("button", { name: /Ya lo resolví|Deshacer/ })) {
        expect(button).toBeDisabled();
      }
      await user.click(buttons[1]);
      expect(setOutingPreparation).toHaveBeenCalledTimes(1);

      resolve(outingDetail({ readiness: readiness([task(1, "CONFIRMED"), task(2)]) }));
      expect(await screen.findByRole("button", { name: "Deshacer" })).toBeEnabled();
    });

    it("shows an error and keeps the task pending when saving fails", async () => {
      getOuting.mockResolvedValue(outingDetail({ readiness: readiness([task(1)]) }));
      setOutingPreparation.mockRejectedValue(new Error("boom"));
      const user = userEvent.setup();
      render(<OutingDetailView outingId={40} />);
      await user.click(await screen.findByRole("button", { name: "Ya lo resolví" }));
      expect(await screen.findByText(/No pudimos guardar el cambio/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ya lo resolví" })).toBeEnabled();
    });
  });
});


it("edits a completed outing directly from its detail stars", async () => {
  const user = userEvent.setup();
  const feedback = { id: 3, rating: 4, tags: [], comment: "Antes", actualCost: 2000, actualDuration: null, shared: false, commentHidden: false, createdAt: "2026-10-19T12:00:00Z" };
  getOuting.mockResolvedValue(outingDetail({ status: "completed", feedbackState: "submitted", feedback }));
  updateFeedback.mockResolvedValue({ ...feedback, rating: 5, comment: "Excelente" });
  render(<OutingDetailView outingId={40} />);
  await user.click(await screen.findByRole("button", { name: "Editar tu valoración" }));
  const dialog = screen.getByRole("dialog");
  const comment = within(dialog).getByRole("textbox", { name: "Tu comentario" });
  expect(comment).toHaveValue("Antes");
  await user.click(within(dialog).getAllByRole("radio")[4]);
  await user.clear(comment);
  await user.type(comment, "Excelente");
  await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByText("“Excelente”")).toBeInTheDocument();
  expect(updateFeedback).toHaveBeenCalledWith(40, { rating: 5, comment: "Excelente" });
});
