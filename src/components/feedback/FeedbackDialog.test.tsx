import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { PlanFeedback } from "@/types";

import { FeedbackDialog } from "./FeedbackDialog";

const submitFeedback = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  submitFeedback,
}));

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
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(FEEDBACK), {
      timeout: 2500,
    });
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
