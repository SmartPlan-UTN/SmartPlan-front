import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { outingCreation, outingDetail } from "@/test/fixtures/outings";
import type {
  OutingStatus,
  OutingSummary,
  PaginatedResult,
  PlanFeedback,
} from "@/types";

import { OutingsView } from "./OutingsView";


const listOutings = vi.hoisted(() => vi.fn());
const completeOuting = vi.hoisted(() => vi.fn());
const cancelOuting = vi.hoisted(() => vi.fn());
const repeatOuting = vi.hoisted(() => vi.fn());
const submitFeedback = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  listOutings,
  completeOuting,
  cancelOuting,
  repeatOuting,
  submitFeedback,
}));

function toDo(overrides: Partial<OutingSummary> = {}): OutingSummary {
  return outingDetail({ id: 1, title: "Tarde de vinos en Luján", ...overrides });
}

function done(overrides: Partial<OutingSummary> = {}): OutingSummary {
  return outingDetail({
    id: 2,
    title: "Cena en el centro",
    status: "completed",
    completedAt: "2026-08-12T00:00:00.000Z",
    feedbackState: "available",
    ...overrides,
  });
}

function page(data: OutingSummary[]): PaginatedResult<OutingSummary> {
  return {
    data,
    pagination: { page: 1, limit: 12, total: data.length, totalPages: 1 },
  };
}

/** Serves each tab from its own list, like the backend does. */
function serve(lists: Record<OutingStatus, OutingSummary[]>) {
  listOutings.mockImplementation(({ status }: { status: OutingStatus }) =>
    Promise.resolve(page(lists[status])),
  );
}

const FEEDBACK: PlanFeedback = {
  rating: 4,
  tags: ["would_recommend"],
  comment: null,
  actualCost: null,
  actualDuration: null,
  createdAt: "2026-08-14T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  submitFeedback.mockResolvedValue(FEEDBACK);
});

describe("OutingsView — Mis salidas (#130, CU22, CU23)", () => {
  it("separates Por hacer from Realizadas", async () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    serve({ to_do: [toDo()], completed: [done()] });
    const user = userEvent.setup();
    render(<OutingsView />);

    expect(
      screen.getByRole("heading", { name: /mis salidas/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Por hacer" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await screen.findByText("Tarde de vinos en Luján")).toBeInTheDocument();
    expect(screen.queryByText("Cena en el centro")).not.toBeInTheDocument();
    expect(listOutings).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "to_do" }),
    );

    await user.click(screen.getByRole("tab", { name: "Realizadas" }));

    expect(await screen.findByText("Cena en el centro")).toBeInTheDocument();
    expect(screen.queryByText("Tarde de vinos en Luján")).not.toBeInTheDocument();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/outings?tab=completed");
  });

  it("makes the outing summary itself the link to its detail", async () => {
    serve({ to_do: [toDo()], completed: [] });
    render(<OutingsView />);

    const detailLink = await screen.findByRole("link", {
      name: "Ver Tarde de vinos en Luján",
    });
    expect(detailLink).toHaveAttribute("href", "/outings/1");
    expect(detailLink).toContainElement(
      screen.getByRole("heading", { name: "Tarde de vinos en Luján" }),
    );
  });

  it("opens on Realizadas when asked to, and follows a later link to a tab", async () => {
    serve({ to_do: [toDo()], completed: [done()] });
    const { rerender } = render(<OutingsView initialTab="completed" />);

    expect(await screen.findByText("Cena en el centro")).toBeInTheDocument();

    rerender(<OutingsView initialTab="to-do" />);
    expect(await screen.findByText("Tarde de vinos en Luján")).toBeInTheDocument();
  });

  it("marks an outing as done, moves to Realizadas, and offers feedback at once", async () => {
    const lists = { to_do: [toDo()], completed: [] as OutingSummary[] };
    serve(lists);
    completeOuting.mockImplementation(() => {
      const completed = outingDetail({
        id: 1,
        title: "Tarde de vinos en Luján",
        status: "completed",
        completedAt: "2026-09-30T12:00:00.000Z",
        feedbackState: "available",
      });
      lists.to_do = [];
      lists.completed = [completed];
      return Promise.resolve(completed);
    });
    const user = userEvent.setup();
    render(<OutingsView />);

    await user.click(
      await screen.findByRole("button", { name: /marcar como realizada/i }),
    );

    expect(completeOuting).toHaveBeenCalledWith(1);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/cómo estuvo/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Realizadas" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // "Ahora no" closes it; the invite stays on the card for later.
    await user.click(within(dialog).getByRole("button", { name: "Ahora no" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Tarde de vinos en Luján")).toBeInTheDocument();
    expect(screen.getByText("Contanos tu experiencia")).toBeInTheDocument();
  });

  it("cancels an outing to do only after confirming", async () => {
    const lists = { to_do: [toDo()], completed: [] as OutingSummary[] };
    serve(lists);
    cancelOuting.mockImplementation(() => {
      lists.to_do = [];
      return Promise.resolve(undefined);
    });
    const user = userEvent.setup();
    render(<OutingsView />);

    await user.click(
      await screen.findByRole("button", { name: /cancelar salida/i }),
    );
    expect(cancelOuting).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");

    await user.click(
      within(dialog).getByRole("button", { name: /sí, cancelar salida/i }),
    );

    expect(cancelOuting).toHaveBeenCalledWith(1);
    expect(await screen.findByText(/cancelamos/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText("Tarde de vinos en Luján")).not.toBeInTheDocument(),
    );
  });

  it("never offers cancelling or completing a done outing", async () => {
    serve({ to_do: [], completed: [done()] });
    render(<OutingsView initialTab="completed" />);

    await screen.findByText("Cena en el centro");
    expect(
      screen.queryByRole("button", { name: /cancelar salida/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /marcar como realizada/i }),
    ).not.toBeInTheDocument();
  });

  it("does a done plan again as a new outing to do, keeping the done one", async () => {
    const earlier = done({ feedbackState: "submitted", feedback: FEEDBACK });
    const lists = { to_do: [] as OutingSummary[], completed: [earlier] };
    serve(lists);
    repeatOuting.mockImplementation(() => {
      const again = outingCreation({ id: 3, title: "Cena en el centro" });
      lists.to_do = [again.outing];
      return Promise.resolve(again);
    });
    const user = userEvent.setup();
    render(<OutingsView initialTab="completed" />);

    await user.click(
      await screen.findByRole("button", { name: /volver a hacer este plan/i }),
    );

    expect(repeatOuting).toHaveBeenCalledWith(2);
    expect(await screen.findByText(/de nuevo/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Por hacer" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await screen.findByText("Cena en el centro")).toBeInTheDocument();
    // The done one is still there, with its feedback.
    expect(lists.completed).toEqual([earlier]);
  });

  it("shows the experience once feedback was sent", async () => {
    serve({
      to_do: [],
      completed: [done({ feedbackState: "submitted", feedback: FEEDBACK })],
    });
    render(<OutingsView initialTab="completed" />);

    expect(await screen.findByText("Muy bueno")).toBeInTheDocument();
    expect(screen.queryByText("Contanos tu experiencia")).not.toBeInTheDocument();
  });

  it("brings back the comment left on a done outing (#134)", async () => {
    serve({
      to_do: [],
      completed: [
        done({
          feedbackState: "submitted",
          feedback: { ...FEEDBACK, comment: "  Una tarde hermosa  " },
        }),
      ],
    });
    render(<OutingsView initialTab="completed" />);

    expect(await screen.findByText("“Una tarde hermosa”")).toBeInTheDocument();
  });

  it("summarizes when, how long and for how many at a glance (#134)", async () => {
    serve({ to_do: [toDo({ peopleCount: 1 })], completed: [] });
    render(<OutingsView />);

    const card = (await screen.findByText("Tarde de vinos en Luján")).closest(
      "article",
    ) as HTMLElement;
    expect(within(card).getByText(/^Elegida el/)).toBeInTheDocument();
    expect(within(card).getByText("2h 30m")).toBeInTheDocument();
    expect(within(card).getByText("1 persona")).toBeInTheDocument();
    expect(
      within(card).getByText("Bodega boutique → Almuerzo de campo"),
    ).toBeInTheDocument();
  });

  it("describes each empty tab and points to planning an outing", async () => {
    serve({ to_do: [], completed: [] });
    const user = userEvent.setup();
    render(<OutingsView />);

    expect(
      await screen.findByText(/todavía no elegiste ninguna salida/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /planificar una salida/i }),
    ).toHaveAttribute("href", "/?startComposer=1");

    await user.click(screen.getByRole("tab", { name: "Realizadas" }));
    expect(
      await screen.findByText(/cuando marques una salida como realizada/i),
    ).toBeInTheDocument();
  });

  it("recovers from a load error with retry", async () => {
    listOutings.mockRejectedValueOnce(
      new ApiError({ message: "boom", type: "NETWORK" }),
    );
    listOutings.mockResolvedValue(page([toDo()]));
    const user = userEvent.setup();
    render(<OutingsView />);

    await user.click(await screen.findByRole("button", { name: /reintentar/i }));

    expect(await screen.findByText("Tarde de vinos en Luján")).toBeInTheDocument();
  });
  it("files the outings of a page under their month (#134)", async () => {
    serve({
      to_do: [
        toDo({ id: 1, title: "Vinos", createdAt: "2026-09-20T15:00:00.000Z" }),
        toDo({ id: 3, title: "Museos", createdAt: "2026-09-02T15:00:00.000Z" }),
        toDo({ id: 4, title: "Picnic", createdAt: "2026-08-15T15:00:00.000Z" }),
      ],
      completed: [],
    });
    render(<OutingsView />);

    const september = await screen.findByRole("region", {
      name: /septiembre 2026/i,
    });
    expect(within(september).getAllByRole("article")).toHaveLength(2);
    const august = screen.getByRole("region", { name: /agosto 2026/i });
    expect(within(august).getByText("Picnic")).toBeInTheDocument();
  });

  it("pages through the outings with numbered pages (#134)", async () => {
    listOutings.mockImplementation(({ page: current }: { page: number }) =>
      Promise.resolve({
        data: [toDo({ id: current, title: `Salida de la página ${current}` })],
        pagination: { page: current, limit: 6, total: 9, totalPages: 2 },
      }),
    );
    const user = userEvent.setup();
    render(<OutingsView />);

    const nav = await screen.findByRole("navigation", {
      name: /paginación de tus salidas/i,
    });
    expect(within(nav).getByText("Mostrando 1–6 de 9 salidas")).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Página 1" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await user.click(within(nav).getByRole("button", { name: "Página 2" }));

    expect(
      await screen.findByText("Salida de la página 2"),
    ).toBeInTheDocument();
    expect(listOutings).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, limit: 6 }),
    );
  });
  it("searches and filters through the API, and clears back to everything (#134)", async () => {
    serve({ to_do: [toDo()], completed: [done()] });
    const user = userEvent.setup();
    render(<OutingsView />);
    await screen.findByText("Tarde de vinos en Luján");

    listOutings.mockResolvedValue(page([]));
    await user.type(
      screen.getByRole("searchbox", { name: /buscar por nombre o actividad/i }),
      "bodega",
    );
    await waitFor(() =>
      expect(listOutings).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "to_do", search: "bodega", page: 1 }),
      ),
    );
    expect(
      await screen.findByText("No encontramos salidas con esos filtros."),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Desde"), "2026-09-01");
    await user.click(screen.getByRole("button", { name: "Ordenar" }));
    await user.click(screen.getByRole("option", { name: "Mayor costo" }));
    await waitFor(() =>
      expect(listOutings).toHaveBeenLastCalledWith(
        expect.objectContaining({ from: "2026-09-01", sort: "cost_desc" }),
      ),
    );
    // Feedback is a filter only for done outings.
    expect(screen.queryByRole("radiogroup", { name: "Experiencia" })).not.toBeInTheDocument();

    serve({ to_do: [toDo()], completed: [done()] });
    await user.click(
      within(screen.getByRole("tabpanel")).getByRole("button", { name: "Limpiar filtros" }),
    );
    expect(await screen.findByText("Tarde de vinos en Luján")).toBeInTheDocument();
    expect(listOutings).toHaveBeenLastCalledWith({ status: "to_do", page: 1, limit: 6 });
  });

  it("filters done outings by whether their experience was told (#134)", async () => {
    serve({ to_do: [], completed: [done()] });
    const user = userEvent.setup();
    render(<OutingsView initialTab="completed" />);
    await screen.findByText("Cena en el centro");

    const experience = screen.getByRole("radiogroup", { name: "Experiencia" });
    await user.click(within(experience).getByRole("radio", { name: "Sin contar" }));

    await waitFor(() =>
      expect(listOutings).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "completed", rated: false }),
      ),
    );
  });
});
