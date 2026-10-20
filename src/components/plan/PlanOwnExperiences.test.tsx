import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { outingDetail } from "@/test/fixtures/outings";

import { PlanOwnExperiences } from "./PlanOwnExperiences";

const { listOutings, updateFeedback, useSession } = vi.hoisted(() => ({
  listOutings: vi.fn(), updateFeedback: vi.fn(), useSession: vi.fn(),
}));
vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()), listOutings, updateFeedback,
}));
vi.mock("@/lib/auth", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/auth")>()), useSession,
}));
const feedback = {
  id: 3, rating: 4, tags: [], comment: "Mi opinión privada", actualCost: 2000,
  actualDuration: null, shared: false, commentHidden: false, createdAt: "2026-10-19T12:00:00Z",
};
function page(data: ReturnType<typeof outingDetail>[], pageNumber = 1, totalPages = 1) {
  return { data, pagination: { page: pageNumber, totalPages, total: data.length, limit: 100 } };
}
beforeEach(() => {
  vi.clearAllMocks();
  useSession.mockReturnValue({ status: "authenticated", user: { id: 1 } });
});

it("edits private feedback from the original plan using the outing id", async () => {
  const user = userEvent.setup();
  listOutings.mockResolvedValue(page([outingDetail({ status: "completed", feedback })]));
  updateFeedback.mockResolvedValue({ ...feedback, rating: 5, comment: "Ahora excelente" });
  const onChanged = vi.fn();
  render(<PlanOwnExperiences planId={7} onChanged={onChanged} />);
  await user.click(await screen.findByRole("button", { name: "Editar tu valoración" }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getAllByRole("radio")[3]).toHaveAttribute("aria-checked", "true");
  const comment = within(dialog).getByRole("textbox", { name: "Tu comentario" });
  expect(comment).toHaveValue("Mi opinión privada");
  await user.click(within(dialog).getAllByRole("radio")[4]);
  await user.clear(comment);
  await user.type(comment, "Ahora excelente");
  await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));
  await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
  expect(updateFeedback).toHaveBeenCalledWith(40, { rating: 5, comment: "Ahora excelente" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("“Ahora excelente”")).toBeInTheDocument();
  expect(listOutings).toHaveBeenCalledWith({ sourcePlanId: 7, status: "completed", rated: true, page: 1, limit: 100 });
});

it("loads every matching page and keeps repeat outings independently editable", async () => {
  listOutings.mockResolvedValueOnce(page([outingDetail({ id: 40, feedback })], 1, 2))
    .mockResolvedValueOnce(page([outingDetail({ id: 41, feedback: { ...feedback, id: 4, comment: "Otra salida" } })], 2, 2));
  render(<PlanOwnExperiences planId={7} onChanged={vi.fn()} />);
  expect(await screen.findByText("“Otra salida”")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Editar tu valoración" })).toHaveLength(2);
});

it("does not load or expose personal experiences without a session", () => {
  useSession.mockReturnValue({ status: "anonymous", user: null });
  render(<PlanOwnExperiences planId={7} onChanged={vi.fn()} />);
  expect(listOutings).not.toHaveBeenCalled();
  expect(screen.queryByText("Tu experiencia")).not.toBeInTheDocument();
});

it("lets the user retry a failed lookup", async () => {
  listOutings.mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(page([outingDetail({ feedback })]));
  const user = userEvent.setup();
  render(<PlanOwnExperiences planId={7} onChanged={vi.fn()} />);
  await user.click(await screen.findByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("“Mi opinión privada”")).toBeInTheDocument();
});
