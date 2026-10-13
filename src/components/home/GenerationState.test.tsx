import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GenerationState } from "./GenerationState";

function renderState(
  phase: "submitting" | "pending" | "processing" | "timedOut" | "failed",
  extra: { canRetry?: boolean } = {},
) {
  const onKeepWaiting = vi.fn();
  const onRetry = vi.fn();
  const onDiscard = vi.fn();
  render(
    <GenerationState
      phase={phase}
      failure={phase === "failed" ? { code: "EXTERNAL_SERVICE_ERROR", message: "El servicio no respondió." } : null}
      onKeepWaiting={onKeepWaiting}
      onRetry={onRetry}
      onDiscard={onDiscard}
      {...extra}
    />,
  );
  return { onKeepWaiting, onRetry, onDiscard };
}

/**
 * CU17 asks for a waiting state while the backend works asynchronously,
 * and for timeout and external-service failure to both be handled. The
 * two are different situations and these assert they behave differently.
 */
describe("GenerationState (CU17)", () => {
  it("puts the backend-confirmed stage in the main status line", () => {
    render(
      <GenerationState
        phase="processing"
        failure={null}
        progressStage="searching"
        onKeepWaiting={vi.fn()}
        onRetry={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Buscando actividades" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText(/transcurridos|en esta etapa|estimamos/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Entendiendo tu idea")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Etapa confirmada")).toHaveTextContent("Buscando actividades");
  });

  it("reflects the backend processing state when detailed stages are unavailable", () => {
    renderState("processing");

    expect(screen.getByRole("heading", { name: "Estamos convirtiendo tu idea en una salida" })).toBeInTheDocument();
  });

  it("announces the wait to assistive technology while queued", () => {
    renderState("pending");

    const card = screen.getByText(/ya recibimos tu búsqueda/i).closest("div");
    expect(card).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("progressbar", { name: /generación en curso/i })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Etapas confirmadas" })).not.toBeInTheDocument();
  });

  it("keeps waiting on a display timeout without discarding the request", async () => {
    const user = userEvent.setup();
    const { onKeepWaiting, onDiscard } = renderState("timedOut");

    expect(screen.getByText(/está tardando más de lo esperado/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /seguir esperando/i }));

    expect(onKeepWaiting).toHaveBeenCalledOnce();
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it("keeps the queued heading when the delay notice appears", () => {
    renderState("timedOut");
    expect(screen.getByRole("heading", { name: "Ya recibimos tu búsqueda" })).toBeInTheDocument();
  });

  it.each(["auto", "surprise"] as const)("does not announce acceptance during a delayed %s submission", async (mode) => {
    const onKeepWaiting = vi.fn();
    render(<GenerationState phase="submissionDelayed" mode={mode} failure={null}
      onKeepWaiting={onKeepWaiting} onRetry={vi.fn()} onDiscard={vi.fn()} />);
    expect(screen.getByRole("heading", { name: mode === "auto" ? "Enviando tu búsqueda" : "Preparando tu sorpresa" })).toBeInTheDocument();
    expect(screen.queryByText("Ya recibimos tu búsqueda")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Etapa confirmada")).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Seguir esperando" }));
    expect(onKeepWaiting).toHaveBeenCalledOnce();
  });

  it.each([true, false])("offers timeout recovery matching retry availability (%s)", (canRetry) => {
    render(<GenerationState phase="failed" failure={{ code: "GENERATION_TIMEOUT", message: "ignored" }}
      canRetry={canRetry} onKeepWaiting={vi.fn()} onRetry={vi.fn()} onDiscard={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(canRetry ? "Podés volver a intentarlo" : "Volvé al buscador para hacer una nueva búsqueda");
    expect(Boolean(screen.queryByRole("button", { name: "Reintentar" }))).toBe(canRetry);
  });

  it("surfaces the service failure and retries the same request", async () => {
    const user = userEvent.setup();
    const { onRetry, onDiscard } = renderState("failed");

    expect(screen.getByRole("alert")).toHaveTextContent(/no pudimos generar tu plan/i);
    expect(screen.getByText("El servicio no respondió.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reintentar/i }));

    // Retrying must not be a disguised reset — that was the old behaviour.
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it("falls back to leaving when there is nothing to retry", () => {
    renderState("failed", { canRetry: false });

    expect(screen.queryByRole("button", { name: /reintentar/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /volver al buscador/i })).toBeInTheDocument();
  });
});

describe("GenerationState (CU19 surprise)", () => {
  it("waits with its own copy and a non-intrusive note", () => {
    render(
      <GenerationState
        phase="pending"
        failure={null}
        mode="surprise"
        note="Aún no tenés preferencias guardadas, así que te sorprendemos con algo completamente nuevo."
        onKeepWaiting={vi.fn()}
        onRetry={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByText(/estamos eligiendo algo para vos/i)).toBeInTheDocument();
    expect(
      screen.getByText(/te sorprendemos con algo completamente nuevo/i),
    ).toBeInTheDocument();
  });

  it("maps a NO_VALID_COMBINATIONS failure to the spec copy", () => {
    render(
      <GenerationState
        phase="failed"
        failure={{ code: "NO_VALID_COMBINATIONS", message: "ignored" }}
        mode="surprise"
        onKeepWaiting={vi.fn()}
        onRetry={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/no encontramos suficientes actividades cerca/i),
    ).toBeInTheDocument();
  });
});
