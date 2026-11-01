import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  assistantImprove,
  assistantSearch,
  assistantSuggest,
  createPlanFromComposer,
  getActivity,
  listCategories,
  searchActivities,
  suggestActivities,
} from "@/lib/api";
import type {
  ActivityDetailResult,
  ActivitySearchResult,
  AssistantImproveResponse,
  AssistantSearchResponse,
  AssistantSuggestResponse,
} from "@/types";

import { CreatePlanForm } from "./CreatePlanForm";
import {
  ASSISTANT_CLIENT_TIMEOUT_MS,
  clearAssistantCache,
} from "./composer/useAssistant";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    createPlanFromComposer: vi.fn(),
    searchActivities: vi.fn(),
    listCategories: vi.fn(),
    suggestActivities: vi.fn(),
    getActivity: vi.fn(),
    assistantSearch: vi.fn(),
    assistantSuggest: vi.fn(),
    assistantImprove: vi.fn(),
  };
});

function activity(id: number, categories = ["Culture"]): ActivitySearchResult {
  return {
    id,
    name: `Actividad ${id}`,
    description: "",
    estimatedCost: id * 1000,
    estimatedDuration: id * 10,
    type: "culture",
    averageRating: 0,
    ratingCount: 0,
    distanceKm: null,
    categories: categories.map((name, index) => ({ id: index + 1, name })),
  };
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const searchAnswer = (...ids: number[]): AssistantSearchResponse => ({
  interpretation: { chips: ["Tranquilo"], nearName: null },
  results: ids.map((id) => ({
    activity: activity(id),
    reason: `Razón ${id}`,
  })),
});

const signalOf = (mock: unknown, call: number): AbortSignal =>
  (
    (mock as { mock: { calls: Array<[unknown, { signal: AbortSignal }]> } })
      .mock.calls[call][1]
  ).signal;

const SENTENCE_A = "algo para comer cerca del museo";
const SENTENCE_B = "una actividad tranquila para la tarde";

async function start(user: ReturnType<typeof userEvent.setup>) {
  render(<CreatePlanForm />);
  await user.type(screen.getByLabelText(/Nombre del plan/), "Mi plan");
  await user.click(screen.getByRole("button", { name: /Elegir actividades/ }));
  await screen.findByText("Actividad 1");
}

const searchBox = () =>
  screen.getByRole("searchbox", { name: "Buscar actividades" });
const stopNames = () =>
  within(screen.getByRole("list", { name: "Paradas en orden" }))
    .getAllByRole("listitem")
    .map((item) => item.querySelector("strong")?.textContent);

describe("assistant: races, cancellation and failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAssistantCache();
    vi.mocked(searchActivities).mockImplementation(
      async ({ page = 1, limit = 8 }) => ({
        data: [activity(1), activity(2), activity(3)],
        pagination: { page, limit, total: 3, totalPages: 1 },
      }),
    );
    vi.mocked(listCategories).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });
    vi.mocked(suggestActivities).mockResolvedValue({ data: [] });
    vi.mocked(createPlanFromComposer).mockResolvedValue({} as never);
    vi.mocked(getActivity).mockResolvedValue({
      ...activity(1),
      locations: [],
    } satisfies ActivityDetailResult);
    vi.mocked(assistantSuggest).mockRejectedValue(new Error("off"));
    vi.mocked(assistantImprove).mockRejectedValue(new Error("off"));
    vi.mocked(assistantSearch).mockRejectedValue(new Error("off"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("natural-language search", () => {
    it("shows only the newest of two overlapping searches, and cancels the older one", async () => {
      const first = deferred<AssistantSearchResponse>();
      const second = deferred<AssistantSearchResponse>();
      vi.mocked(assistantSearch)
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      const user = userEvent.setup();
      await start(user);

      await user.type(searchBox(), SENTENCE_A);
      await user.keyboard("{Enter}");
      await waitFor(() => expect(assistantSearch).toHaveBeenCalledTimes(1));

      await user.clear(searchBox());
      await user.type(searchBox(), SENTENCE_B);
      await user.keyboard("{Enter}");
      await waitFor(() => expect(assistantSearch).toHaveBeenCalledTimes(2));
      expect(signalOf(assistantSearch, 0).aborted).toBe(true);
      expect(signalOf(assistantSearch, 1).aborted).toBe(false);

      // The newer answer arrives first, the older one later: it must not win.
      await act(async () => second.resolve(searchAnswer(2)));
      expect(await screen.findByText("Razón 2")).toBeInTheDocument();
      await act(async () => first.resolve(searchAnswer(1)));
      expect(screen.queryByText("Razón 1")).toBeNull();
      expect(screen.getByText("Razón 2")).toBeInTheDocument();
    });

    it("ignores an answer that arrives after the sentence was edited away", async () => {
      const pending = deferred<AssistantSearchResponse>();
      vi.mocked(assistantSearch).mockReturnValueOnce(pending.promise);
      const user = userEvent.setup();
      await start(user);
      await user.type(searchBox(), SENTENCE_A);
      await user.keyboard("{Enter}");
      await waitFor(() => expect(assistantSearch).toHaveBeenCalledOnce());

      await user.type(searchBox(), " y barato");
      expect(signalOf(assistantSearch, 0).aborted).toBe(true);
      await act(async () => pending.resolve(searchAnswer(3)));
      expect(screen.queryByText("Razón 3")).toBeNull();
      expect(screen.queryByText(/^Entendí/)).toBeNull();
    });

    it("asks once when Enter is pressed again while the first is in flight", async () => {
      const pending = deferred<AssistantSearchResponse>();
      vi.mocked(assistantSearch).mockReturnValue(pending.promise);
      const user = userEvent.setup();
      await start(user);
      await user.type(searchBox(), SENTENCE_A);
      await user.keyboard("{Enter}{Enter}{Enter}");
      expect(assistantSearch).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByRole("button", { name: /Entender/ }),
      ).not.toBeInTheDocument();
    });

    it("drops the request when the person leaves, and nothing updates afterwards", async () => {
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      const pending = deferred<AssistantSearchResponse>();
      vi.mocked(assistantSearch).mockReturnValueOnce(pending.promise);
      const user = userEvent.setup();
      const { unmount } = render(<CreatePlanForm />);
      await user.type(screen.getByLabelText(/Nombre del plan/), "Mi plan");
      await user.click(
        screen.getByRole("button", { name: /Elegir actividades/ }),
      );
      await screen.findByText("Actividad 1");
      await user.type(searchBox(), SENTENCE_A);
      await user.keyboard("{Enter}");
      await waitFor(() => expect(assistantSearch).toHaveBeenCalledOnce());

      unmount();
      expect(signalOf(assistantSearch, 0).aborted).toBe(true);
      await act(async () => pending.resolve(searchAnswer(1)));
      expect(errors).not.toHaveBeenCalled();
    });

    it("gives up after the client deadline and falls back to the regular search", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(assistantSearch).mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await start(user);
      await user.type(searchBox(), SENTENCE_A);
      await user.keyboard("{Enter}");
      expect(await screen.findByText(/Entendiendo lo que buscás/)).toBeVisible();

      await act(async () => {
        vi.advanceTimersByTime(ASSISTANT_CLIENT_TIMEOUT_MS + 50);
      });
      expect(
        await screen.findByText(/No pude interpretar esa frase ahora/),
      ).toBeInTheDocument();
      expect(signalOf(assistantSearch, 0).aborted).toBe(true);
      expect(await screen.findByText("Actividad 2")).toBeInTheDocument();
    });

    it.each([
      ["rate limited (429)", new ApiError({ message: "x", type: "HTTP", status: 429, code: "ASSISTANT_RATE_LIMITED" })],
      ["unavailable (503)", new ApiError({ message: "x", type: "HTTP", status: 503, code: "ASSISTANT_UNAVAILABLE" })],
      ["a network failure", new ApiError({ message: "x", type: "NETWORK" })],
    ])("falls back to the regular search when the assistant is %s", async (_label, error) => {
      vi.mocked(assistantSearch).mockRejectedValue(error);
      const user = userEvent.setup();
      await start(user);
      await user.type(searchBox(), SENTENCE_A);
      await user.keyboard("{Enter}");
      expect(
        await screen.findByText(/No pude interpretar esa frase ahora/),
      ).toBeInTheDocument();
      expect(await screen.findByText("Actividad 3")).toBeInTheDocument();
      // The sentence is not sent word for word to the keyword search (it would
      // match nothing): the person gets the catalog.
      await waitFor(() =>
        expect(searchActivities).toHaveBeenLastCalledWith(
          expect.not.objectContaining({ search: expect.anything() }),
          expect.anything(),
        ),
      );
      // Manual creation is untouched: the person can still add and keep going.
      await user.click(
        screen.getByRole("button", { name: "Agregar Actividad 3" }),
      );
      expect(stopNames()).toEqual(["Actividad 3"]);
    });

    it("treats an answer of the wrong shape as unavailable instead of crashing", async () => {
      vi.mocked(assistantSearch).mockResolvedValue({} as never);
      const user = userEvent.setup();
      await start(user);
      await user.type(searchBox(), SENTENCE_A);
      await user.keyboard("{Enter}");
      expect(
        await screen.findByText(/No pude interpretar esa frase ahora/),
      ).toBeInTheDocument();
    });
  });

  describe("suggestions while the route changes", () => {
    const suggestion = (id: number): AssistantSuggestResponse => ({
      suggestions: [{ activity: activity(id), reason: `Sugerencia ${id}` }],
      gap: null,
    });

    it("cancels the request for the old route and ignores its late answer", async () => {
      const forEmpty = deferred<AssistantSuggestResponse>();
      const forOne = deferred<AssistantSuggestResponse>();
      vi.mocked(assistantSuggest)
        .mockReturnValueOnce(forEmpty.promise)
        .mockReturnValueOnce(forOne.promise);
      const user = userEvent.setup();
      await start(user);
      await waitFor(() => expect(assistantSuggest).toHaveBeenCalledTimes(1));

      await user.click(
        screen.getByRole("button", { name: "Agregar Actividad 1" }),
      );
      await waitFor(() => expect(assistantSuggest).toHaveBeenCalledTimes(2));
      expect(signalOf(assistantSuggest, 0).aborted).toBe(true);

      await act(async () => forOne.resolve(suggestion(3)));
      expect(await screen.findByText("Sugerencia 3")).toBeInTheDocument();
      await act(async () => forEmpty.resolve(suggestion(2)));
      expect(screen.queryByText("Sugerencia 2")).toBeNull();
      expect(screen.getByText("Sugerencia 3")).toBeInTheDocument();
      // And nothing was ever added for the person.
      expect(stopNames()).toEqual(["Actividad 1"]);
    });

    it("never offers an activity that is already on the route", async () => {
      vi.mocked(assistantSuggest).mockResolvedValue({
        suggestions: [
          { activity: activity(1), reason: "Ya está" },
          { activity: activity(2), reason: "Falta" },
        ],
        gap: null,
      });
      const user = userEvent.setup();
      await start(user);
      await screen.findByText("Falta");
      // It is offered by the suggestions and also listed in the catalog.
      const [, inCatalog] = screen.getAllByRole("button", {
        name: "Agregar Actividad 1",
      });
      await user.click(inCatalog);
      expect(screen.queryByText("Ya está")).toBeNull();
      expect(screen.getByText("Falta")).toBeInTheDocument();
    });

    it("does not ask again for a route it already answered (undo)", async () => {
      vi.mocked(assistantSuggest).mockImplementation(async (params) =>
        suggestion(params.stopActivityIds.length === 0 ? 2 : 3),
      );
      const user = userEvent.setup();
      await start(user);
      await screen.findByText("Sugerencia 2");
      expect(assistantSuggest).toHaveBeenCalledTimes(1);

      await user.click(
        screen.getByRole("button", { name: "Agregar Actividad 1" }),
      );
      await screen.findByText("Sugerencia 3");
      expect(assistantSuggest).toHaveBeenCalledTimes(2);

      await user.click(
        screen.getByRole("button", { name: "Opciones de Actividad 1" }),
      );
      await user.click(
        screen.getByRole("menuitem", { name: /Quitar del recorrido/ }),
      );
      expect(await screen.findByText("Sugerencia 2")).toBeInTheDocument();
      // Back to the empty route: answered from memory, no third request.
      expect(assistantSuggest).toHaveBeenCalledTimes(2);
    });
  });

  describe("Mejorar recorrido", () => {
    async function withTwoStops(user: ReturnType<typeof userEvent.setup>) {
      await start(user);
      await user.click(
        screen.getByRole("button", { name: "Agregar Actividad 1" }),
      );
      await user.click(
        screen.getByRole("button", { name: "Agregar Actividad 2" }),
      );
    }

    const reorder: AssistantImproveResponse = {
      proposals: [
        {
          kind: "reorder",
          reason: "Mejor orden",
          orderedActivityIds: [2, 1],
          effect: { minutes: 0, cost: 0, km: -1 },
        },
      ],
    };

    it("ignores an answer that arrives after the route changed, and cancels the request", async () => {
      const pending = deferred<AssistantImproveResponse>();
      vi.mocked(assistantImprove).mockReturnValueOnce(pending.promise);
      const user = userEvent.setup();
      await withTwoStops(user);
      await user.click(screen.getByRole("button", { name: "Mejorar" }));
      await waitFor(() => expect(assistantImprove).toHaveBeenCalledOnce());

      await user.click(
        screen.getByRole("button", { name: "Agregar Actividad 3" }),
      );
      expect(signalOf(assistantImprove, 0).aborted).toBe(true);
      await act(async () => pending.resolve(reorder));
      expect(screen.queryByText("Mejor orden")).toBeNull();
      expect(
        screen.queryByRole("region", { name: /Ideas para mejorar/ }),
      ).toBeNull();
      expect(stopNames()).toEqual(["Actividad 1", "Actividad 2", "Actividad 3"]);
    });

    it("sends one request however many times the button is pressed while it is in flight", async () => {
      vi.mocked(assistantImprove).mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      await withTwoStops(user);
      await user.dblClick(screen.getByRole("button", { name: "Mejorar" }));
      await user.keyboard("{Enter}");
      expect(assistantImprove).toHaveBeenCalledTimes(1);
    });

    it("applies a proposal once however fast it is pressed, and one undo restores the route", async () => {
      vi.mocked(assistantImprove).mockResolvedValue(reorder);
      const user = userEvent.setup();
      await withTwoStops(user);
      await user.click(screen.getByRole("button", { name: "Mejorar" }));
      const apply = await screen.findByRole("button", { name: "Reordenar" });

      await user.dblClick(apply);
      expect(stopNames()).toEqual(["Actividad 2", "Actividad 1"]);
      expect(
        screen.queryByRole("button", { name: "Reordenar" }),
      ).not.toBeInTheDocument();
      expect(screen.getAllByText("Reordenaste el recorrido")).toHaveLength(1);

      await user.click(screen.getByRole("button", { name: /Deshacer/ }));
      expect(stopNames()).toEqual(["Actividad 1", "Actividad 2"]);
    });

    it("undoes an accepted removal and an accepted addition", async () => {
      vi.mocked(assistantImprove).mockResolvedValueOnce({
        proposals: [
          {
            kind: "remove",
            reason: "Sobra",
            activityId: 2,
            effect: { minutes: -20, cost: -2000, km: null },
          },
        ],
      });
      const user = userEvent.setup();
      await withTwoStops(user);
      await user.click(screen.getByRole("button", { name: "Mejorar" }));
      await user.click(await screen.findByRole("button", { name: "Quitar" }));
      expect(stopNames()).toEqual(["Actividad 1"]);
      await user.click(screen.getByRole("button", { name: /Deshacer/ }));
      expect(stopNames()).toEqual(["Actividad 1", "Actividad 2"]);

      vi.mocked(assistantImprove).mockResolvedValueOnce({
        proposals: [
          {
            kind: "add",
            reason: "Falta",
            activity: activity(3),
            position: 0,
            effect: { minutes: 30, cost: 3000, km: null },
          },
        ],
      });
      await user.click(screen.getByRole("button", { name: "Mejorar" }));
      const proposals = await screen.findByRole("region", {
        name: /Ideas para mejorar/,
      });
      await user.click(within(proposals).getByRole("button", { name: "Sumar" }));
      expect(stopNames()).toEqual(["Actividad 3", "Actividad 1", "Actividad 2"]);
      await user.click(screen.getByRole("button", { name: /Deshacer/ }));
      expect(stopNames()).toEqual(["Actividad 1", "Actividad 2"]);
    });

    it("keeps manual editing alive when the assistant fails", async () => {
      const user = userEvent.setup();
      await withTwoStops(user);
      await user.click(screen.getByRole("button", { name: "Mejorar" }));
      expect(
        await screen.findByText(/No pude revisar el recorrido ahora/),
      ).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: "Agregar Actividad 3" }),
      );
      expect(stopNames()).toEqual(["Actividad 1", "Actividad 2", "Actividad 3"]);
      await user.click(screen.getByRole("button", { name: /Revisar plan/ }));
      expect(
        await screen.findByRole("button", { name: /Crear plan/ }),
      ).toBeEnabled();
    });
  });

  describe("catalog labels", () => {
    it("never prints a raw English category in the composer", async () => {
      vi.mocked(searchActivities).mockImplementation(async () => ({
        data: [activity(1, ["Gastronomy"]), activity(2, ["Live music"])],
        pagination: { page: 1, limit: 8, total: 2, totalPages: 1 },
      }));
      vi.mocked(listCategories).mockResolvedValue({
        data: [
          { id: 1, name: "Gastronomy", description: null },
          { id: 2, name: "Short trips", description: null },
        ],
        pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
      });
      vi.mocked(assistantSuggest).mockResolvedValue({
        suggestions: [
          {
            activity: activity(3, ["Outdoors"]),
            reason: "Aporta Outdoors a tu día",
          },
        ],
        gap: {
          categoryName: "Gastronomy",
          message: "Te falta Gastronomy para comer.",
        },
      });
      const user = userEvent.setup();
      await start(user);
      await user.click(
        screen.getByRole("button", { name: "Agregar Actividad 1" }),
      );
      await screen.findByText(/Aporta Aire libre a tu día/);

      const text = document.body.textContent ?? "";
      for (const raw of [
        "Gastronomy",
        "Live music",
        "Short trips",
        "Outdoors",
        "Culture",
      ]) {
        expect(text).not.toContain(raw);
      }
      expect(screen.getByRole("button", { name: "Escapadas" })).toBeVisible();
      expect(screen.getByText("Música en vivo")).toBeVisible();
      expect(screen.getByText(/Te falta Gastronomía para comer/)).toBeVisible();
    });
  });
});
