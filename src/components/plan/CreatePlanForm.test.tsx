import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
  updatePlanFromComposer,
} from "@/lib/api";
import { activityDetailRoute, ROUTES } from "@/lib/routes";
import type {
  ActivityDetailResult,
  ActivitySearchResult,
  OwnPlanDetail,
} from "@/types";

import { CreatePlanForm } from "./CreatePlanForm";
import { clearAssistantCache } from "./composer/useAssistant";
import { PlanComposer } from "./PlanComposer";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    createPlanFromComposer: vi.fn(),
    updatePlanFromComposer: vi.fn(),
    searchActivities: vi.fn(),
    listCategories: vi.fn(),
    suggestActivities: vi.fn(),
    getActivity: vi.fn(),
    assistantSearch: vi.fn(),
    assistantSuggest: vi.fn(),
    assistantImprove: vi.fn(),
  };
});

/** The assistant is off unless a test turns it on: the composer must work without it. */
function assistantUnavailable() {
  const error = new ApiError({
    message: "unavailable",
    type: "HTTP",
    status: 503,
    code: "ASSISTANT_UNAVAILABLE",
  });
  vi.mocked(assistantSearch).mockRejectedValue(error);
  vi.mocked(assistantSuggest).mockRejectedValue(error);
  vi.mocked(assistantImprove).mockRejectedValue(error);
}

beforeEach(() => {
  assistantUnavailable();
  clearAssistantCache();
});

function activity(id: number): ActivitySearchResult {
  return {
    id,
    name: `Actividad ${id}`,
    description: `Descripción ${id}`,
    estimatedCost: id * 1000,
    estimatedDuration: id * 10,
    type: "Experiencia",
    averageRating: 4.5,
    ratingCount: 3,
    distanceKm: null,
    categories: [{ id: 1, name: "Bodega" }],
  };
}

function canonicalPlan(): OwnPlanDetail {
  return {
    id: 7,
    title: "Sábado entre viñas",
    description: null,
    visibility: "private",
    peopleCount: 2,
    estimatedTotalCost: 15000,
    estimatedCostPerPerson: 7500,
    estimatedTotalDuration: 150,
    activityCount: 1,
    status: { key: "confirmed", name: "Confirmado" },
    completedAt: null,
    feedbackState: "not_available",
    feedback: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    details: [
      {
        id: 501,
        order: 1,
        estimatedCost: 15000,
        estimatedDuration: 150,
        activity: {
          id: 15,
          name: "Actividad 15",
          description: "",
          estimatedCost: 15000,
          estimatedDuration: 150,
          type: "Experiencia",
        },
      },
    ],
  };
}

async function chooseFromMenu(
  user: ReturnType<typeof userEvent.setup>,
  activityName: string,
  item: RegExp | string,
) {
  await user.click(
    screen.getByRole("button", { name: `Opciones de ${activityName}` }),
  );
  await user.click(screen.getByRole("menuitem", { name: item }));
}

async function reachActivities(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText(/Nombre del plan/),
    "Sábado entre viñas",
  );
  await user.click(screen.getByRole("button", { name: /Elegir actividades/ }));
}

describe("PlanComposer creation flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchActivities).mockImplementation(
      async ({ page = 1, limit = 8 }) => {
        const all = Array.from({ length: 15 }, (_, index) =>
          activity(index + 1),
        );
        return {
          data: all.slice((page - 1) * limit, page * limit),
          pagination: { page, limit, total: 15, totalPages: 2 },
        };
      },
    );
    vi.mocked(listCategories).mockResolvedValue({
      data: [{ id: 1, name: "Bodegas", description: null }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });
    vi.mocked(suggestActivities).mockResolvedValue({ data: [] });
    vi.mocked(createPlanFromComposer).mockResolvedValue(canonicalPlan());
    vi.mocked(updatePlanFromComposer).mockResolvedValue(canonicalPlan());
    vi.mocked(getActivity).mockResolvedValue({
      ...activity(42),
      locations: [],
    } satisfies ActivityDetailResult);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits until Recorrido to load the catalog and focuses its headline", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    expect(searchActivities).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/Nombre del plan/), "Viaje");
    await user.click(
      screen.getByRole("button", { name: /Elegir actividades/ }),
    );
    expect(await screen.findByText("Actividad 1")).toBeInTheDocument();
    expect(searchActivities).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Viaje", level: 2 }),
      ).toHaveFocus(),
    );
  });

  it("validates idea fields before continuing", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await user.click(
      screen.getByRole("button", { name: /Elegir actividades/ }),
    );
    expect(
      await screen.findByText("Escribí un nombre para el plan."),
    ).toBeInTheDocument();
    expect(createPlanFromComposer).not.toHaveBeenCalled();
  });

  it("validates the people count before opening the catalog", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await user.type(screen.getByLabelText(/Nombre del plan/), "Viaje");
    const peopleCount = screen.getByLabelText(/personas/);
    await user.clear(peopleCount);
    await user.type(peopleCount, "1001");
    await user.click(
      screen.getByRole("button", { name: /Elegir actividades/ }),
    );

    expect(
      await screen.findByText(/debe estar entre 1 y 1\.000/),
    ).toBeInTheDocument();
    expect(searchActivities).not.toHaveBeenCalled();
  });

  it("keeps the draft local until final confirmation, then saves all stops together", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await reachActivities(user);
    await screen.findByText("Actividad 1");
    await user.click(
      screen.getByRole("button", { name: "Agregar Actividad 1" }),
    );
    expect(createPlanFromComposer).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Revisar plan/ }));
    expect(screen.getByText("Actividad 1")).toBeInTheDocument();
    expect(createPlanFromComposer).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Crear plan/ }));

    await waitFor(() => expect(createPlanFromComposer).toHaveBeenCalledOnce());
    const payload = vi.mocked(createPlanFromComposer).mock.calls[0][0];
    expect(payload).toMatchObject({
      title: "Sábado entre viñas",
      description: null,
      peopleCount: 2,
      visibility: "private",
      stops: [{ activityId: 1 }],
    });
    expect(payload.requestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(push).toHaveBeenCalledWith(`${ROUTES.plans}/7`);
  });

  it("paginates eight results at a time up to the fifteenth activity", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await reachActivities(user);
    expect(await screen.findByText("Actividad 8")).toBeInTheDocument();
    expect(screen.queryByText("Actividad 9")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("Actividad 15")).toBeInTheDocument();
    expect(searchActivities).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, limit: 8 }),
      expect.anything(),
    );
  });

  it("requires two search characters and waits for the debounce", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await reachActivities(user);
    await screen.findByText("Actividad 1");
    vi.mocked(searchActivities).mockClear();

    const searchBox = screen.getByRole("searchbox", {
      name: "Buscar actividades",
    });
    await user.type(searchBox, "a");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    expect(searchActivities).not.toHaveBeenCalled();
    expect(
      screen.getByText("La búsqueda empieza con dos letras"),
    ).toBeInTheDocument();

    await user.type(searchBox, "b");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    expect(searchActivities).toHaveBeenCalledOnce();
    expect(searchActivities).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "ab", page: 1, limit: 8 }),
      expect.anything(),
    );
  });

  it("applies catalog category, price, and sort filters to the paginated search", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await reachActivities(user);
    await screen.findByText("Actividad 1");

    await user.click(await screen.findByRole("button", { name: "Bodegas" }));
    expect(screen.queryByPlaceholderText("$ mín.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Filtros/ }));
    await user.type(screen.getByPlaceholderText("$ mín."), "2000");
    await user.type(screen.getByPlaceholderText("$ máx."), "9000");
    await user.click(
      screen.getByRole("button", { name: "Ordenar actividades" }),
    );
    await user.click(screen.getByRole("option", { name: "Precio" }));

    await waitFor(() =>
      expect(searchActivities).toHaveBeenLastCalledWith(
        expect.objectContaining({
          categoryIds: [1],
          minPrice: 2000,
          maxPrice: 9000,
          sortBy: "price",
          page: 1,
          limit: 8,
        }),
        expect.anything(),
      ),
    );
  });

  it("offers catalog suggestions on its own and only adds one when asked", async () => {
    const user = userEvent.setup();
    vi.mocked(suggestActivities).mockResolvedValue({
      data: [
        {
          id: 42,
          name: "Degustación sugerida",
          description: "Una experiencia entre viñas",
          estimatedCost: 5000,
          estimatedDuration: 90,
          type: "Gastronomía",
          categories: ["Bodegas"],
        },
      ],
    });
    render(<CreatePlanForm />);
    await reachActivities(user);

    expect(
      await screen.findByRole("heading", { name: "Ideas para tu plan" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Degustación sugerida")).toBeInTheDocument();
    expect(suggestActivities).toHaveBeenCalledWith({
      title: "Sábado entre viñas",
      description: undefined,
      excludeActivityIds: [],
    });
    const stopListBefore = screen.queryByRole("list", {
      name: "Paradas en orden",
    });
    expect(stopListBefore).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Agregar Degustación sugerida" }),
    );
    const stopList = screen.getByRole("list", { name: "Paradas en orden" });
    expect(within(stopList).getByText("Degustación sugerida")).toBeInTheDocument();
    // It moved from the ideas to the route: it is no longer offered again.
    expect(
      screen.queryByRole("button", { name: "Agregar Degustación sugerida" }),
    ).not.toBeInTheDocument();
  });

  it("hides suggestions while searching and uses the route as context", async () => {
    const user = userEvent.setup();
    vi.mocked(suggestActivities).mockResolvedValue({
      data: [
        {
          id: 42,
          name: "Degustación sugerida",
          description: "",
          estimatedCost: 5000,
          estimatedDuration: 90,
          type: null,
          categories: [],
        },
      ],
    });
    render(<CreatePlanForm />);
    await reachActivities(user);
    await screen.findByText("Degustación sugerida");

    await user.click(
      await screen.findByRole("button", { name: "Agregar Actividad 1" }),
    );
    await waitFor(() =>
      expect(suggestActivities).toHaveBeenLastCalledWith({
        title: "Sábado entre viñas",
        description: "Actividad 1",
        excludeActivityIds: [1],
      }),
    );

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar actividades" }),
      "vi",
    );
    expect(
      screen.queryByRole("heading", {
        name: /Ideas para tu plan|Para completar tu recorrido/,
      }),
    ).not.toBeInTheDocument();
  });

  it("takes a stop out from its own catalog row, with undo", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await reachActivities(user);
    await user.click(
      await screen.findByRole("button", { name: "Agregar Actividad 1" }),
    );
    const stopList = screen.getByRole("list", { name: "Paradas en orden" });
    expect(within(stopList).getAllByRole("listitem")).toHaveLength(1);

    await user.click(
      screen.getByRole("button", { name: "Quitar Actividad 1 del recorrido" }),
    );
    expect(
      screen.queryByRole("list", { name: "Paradas en orden" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Agregar Actividad 1" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(
      within(screen.getByRole("list", { name: "Paradas en orden" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(1);
  });

  it("prevents duplicates, reorders stops, and recalculates totals as stops change", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await reachActivities(user);
    await screen.findByText("Actividad 1");
    await user.click(
      screen.getByRole("button", { name: "Agregar Actividad 1" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Agregar Actividad 2" }),
    );
    // A stop is never added twice: its row now offers to take it out.
    expect(
      screen.queryByRole("button", { name: "Agregar Actividad 1" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Quitar Actividad 1 del recorrido" }),
    ).toBeInTheDocument();

    const stopList = screen.getByRole("list", { name: "Paradas en orden" });
    expect(within(stopList).getAllByText("Actividad 1")).toHaveLength(1);
    expect(within(stopList).getAllByRole("listitem")).toHaveLength(2);

    await chooseFromMenu(user, "Actividad 2", "Subir");
    expect(within(stopList).getAllByRole("listitem")[0]).toHaveTextContent(
      "Actividad 2",
    );
    expect(screen.getByText(/^\$\s?3\.000$/, { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByLabelText("Estimación del recorrido")).toHaveTextContent(
      "30m",
    );

    await chooseFromMenu(user, "Actividad 1", /Quitar del recorrido/);
    expect(within(stopList).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText(/^\$\s?2\.000$/, { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByLabelText("Estimación del recorrido")).toHaveTextContent(
      "20m",
    );
  });

  it("shows catalog errors with a working retry and handles an empty result", async () => {
    vi.mocked(searchActivities)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
      });
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await reachActivities(user);

    expect(
      await screen.findByText(
        "No pudimos completar la búsqueda. Intentá de nuevo.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(
      await screen.findByText("No encontramos actividades con esos criterios"),
    ).toBeInTheDocument();
  });

  it("does not advance an empty itinerary to review", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await reachActivities(user);
    await user.click(screen.getByRole("button", { name: /Revisar plan/ }));
    expect(
      screen.queryByRole("button", { name: /Crear plan/ }),
    ).not.toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sumá al menos una actividad",
    );
  });

  it("switches the mobile catalog and itinerary tabs with arrow keys", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await reachActivities(user);
    const itineraryTab = screen.getByRole("tab", { name: /Recorrido 0/ });
    await user.click(itineraryTab);
    expect(itineraryTab).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Catálogo" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("keeps keyboard focus on the moved stop's controls", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await reachActivities(user);
    await user.click(
      await screen.findByRole("button", { name: "Agregar Actividad 1" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Agregar Actividad 2" }),
    );

    await chooseFromMenu(user, "Actividad 2", "Subir");
    // The row moved: focus stays with its menu instead of being dropped.
    expect(
      screen.getByRole("button", { name: "Opciones de Actividad 2" }),
    ).toHaveFocus();
  });

  it("moves between the search shortcuts with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await reachActivities(user);
    await screen.findByRole("button", { name: "Bodegas" });

    screen.getByRole("button", { name: /Cerca mío/ }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Bodegas" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: /Cerca mío/ })).toHaveFocus();
  });

  it("preserves the draft and reuses a stable request id after a failed save", async () => {
    vi.mocked(createPlanFromComposer)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(canonicalPlan());
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await reachActivities(user);
    await screen.findByText("Actividad 1");
    await user.click(
      screen.getByRole("button", { name: "Agregar Actividad 1" }),
    );
    await user.click(screen.getByRole("button", { name: /Revisar plan/ }));
    await user.click(screen.getByRole("button", { name: /Crear plan/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tu borrador sigue acá",
    );
    expect(screen.getByText("Actividad 1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() =>
      expect(createPlanFromComposer).toHaveBeenCalledTimes(2),
    );
    expect(vi.mocked(createPlanFromComposer).mock.calls[0][0].requestId).toBe(
      vi.mocked(createPlanFromComposer).mock.calls[1][0].requestId,
    );
  });

  it("asks only when explicitly leaving a dirty draft", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await user.type(screen.getByLabelText(/Nombre del plan/), "Viaje");
    await user.click(screen.getByRole("button", { name: "Salir" }));
    expect(
      screen.getByRole("alertdialog", { name: "¿Salir sin guardar?" }),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("returns to the source activity after creating a prefilled plan", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm initialActivityId={42} returnToActivity />);
    expect(await screen.findByText("Actividad 42")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Paso 1: Plan/ }));
    await user.type(
      screen.getByLabelText(/Nombre del plan/),
      "Salida desde actividad",
    );
    await user.click(
      screen.getByRole("button", { name: /Elegir actividades/ }),
    );
    await user.click(screen.getByRole("button", { name: /Revisar plan/ }));
    await user.click(screen.getByRole("button", { name: /Crear plan/ }));

    await waitFor(() => expect(createPlanFromComposer).toHaveBeenCalledOnce());
    expect(createPlanFromComposer).toHaveBeenCalledWith(
      expect.objectContaining({ stops: [{ activityId: 42 }] }),
    );
    expect(push).toHaveBeenCalledWith(activityDetailRoute(42));
  });
});

describe("PlanComposer review and visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchActivities).mockImplementation(
      async ({ page = 1, limit = 8 }) => ({
        data: [activity(1), activity(2)],
        pagination: { page, limit, total: 2, totalPages: 1 },
      }),
    );
    vi.mocked(listCategories).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });
    vi.mocked(suggestActivities).mockResolvedValue({ data: [] });
    vi.mocked(createPlanFromComposer).mockResolvedValue(canonicalPlan());
  });

  it("does not ask about visibility until the review, where it can be changed", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    expect(screen.queryByLabelText("Público")).not.toBeInTheDocument();
    await reachActivities(user);
    await user.click(
      await screen.findByRole("button", { name: "Agregar Actividad 1" }),
    );
    await user.click(screen.getByRole("button", { name: /Revisar plan/ }));

    expect(screen.getByLabelText("Solo yo")).toBeChecked();
    await user.click(screen.getByLabelText("Público"));
    await user.click(screen.getByRole("button", { name: /Crear plan/ }));

    await waitFor(() => expect(createPlanFromComposer).toHaveBeenCalledOnce());
    expect(createPlanFromComposer).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: "public" }),
    );
  });

  it("keeps the draft when going back to edit a section from the review", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await reachActivities(user);
    await user.click(
      await screen.findByRole("button", { name: "Agregar Actividad 2" }),
    );
    await user.click(screen.getByRole("button", { name: /Revisar plan/ }));
    await user.click(
      screen.getByRole("button", { name: /Editar nombre, nota y personas/ }),
    );
    expect(screen.getByLabelText(/Nombre del plan/)).toHaveValue(
      "Sábado entre viñas",
    );
    await user.click(
      screen.getByRole("button", { name: /Elegir actividades/ }),
    );
    expect(
      within(screen.getByRole("list", { name: "Paradas en orden" })).getByText(
        "Actividad 2",
      ),
    ).toBeInTheDocument();
    expect(createPlanFromComposer).not.toHaveBeenCalled();
  });
});

describe("PlanComposer nearby discovery", () => {
  const getCurrentPosition = vi.fn();

  function located(
    name: string,
    latitude: number | null,
    longitude: number | null,
  ): ActivityDetailResult {
    return {
      ...activity(1),
      name,
      images: [],
      locations: [
        {
          id: 1,
          latitude,
          longitude,
          notes: null,
          place: {} as never,
        },
      ],
    } as unknown as ActivityDetailResult;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition },
      configurable: true,
    });
    vi.mocked(searchActivities).mockImplementation(
      async ({ page = 1, limit = 8 }) => ({
        data: [activity(1), activity(2)],
        pagination: { page, limit, total: 2, totalPages: 1 },
      }),
    );
    vi.mocked(listCategories).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });
    vi.mocked(suggestActivities).mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "geolocation");
  });

  it("never asks for the device position until the person presses Cerca mío", async () => {
    const user = userEvent.setup();
    getCurrentPosition.mockImplementation((success: PositionCallback) =>
      success({
        coords: { latitude: -32.89, longitude: -68.84 },
      } as GeolocationPosition),
    );
    render(<CreatePlanForm />);
    await reachActivities(user);
    await screen.findByText("Actividad 1");
    expect(getCurrentPosition).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Cerca mío/ }));
    expect(getCurrentPosition).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(searchActivities).toHaveBeenLastCalledWith(
        expect.objectContaining({
          latitude: -32.89,
          longitude: -68.84,
          maxDistanceKm: 25,
          sortBy: "distance",
        }),
        expect.anything(),
      ),
    );
    expect(
      screen.getByText(/A menos de 25 km de tu ubicación/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Cerca mío/ }));
    await waitFor(() =>
      expect(searchActivities).toHaveBeenLastCalledWith(
        expect.not.objectContaining({ latitude: expect.anything() }),
        expect.anything(),
      ),
    );
  });

  it("explains a denied permission and keeps searching without a location", async () => {
    const user = userEvent.setup();
    getCurrentPosition.mockImplementation(
      (_success: PositionCallback, failure: PositionErrorCallback) =>
        failure({ code: 1 } as GeolocationPositionError),
    );
    render(<CreatePlanForm />);
    await reachActivities(user);
    await screen.findByText("Actividad 1");

    await user.click(screen.getByRole("button", { name: /Cerca mío/ }));
    expect(
      await screen.findByText(/No pudimos usar tu ubicación/),
    ).toBeInTheDocument();
    expect(screen.getByText("Actividad 1")).toBeInTheDocument();
    expect(searchActivities).not.toHaveBeenCalledWith(
      expect.objectContaining({ latitude: expect.anything() }),
    );
  });

  it("measures from the last stop once the route has one", async () => {
    const user = userEvent.setup();
    vi.mocked(getActivity).mockResolvedValue(
      located("Actividad 2", -32.9, -68.8),
    );
    render(<CreatePlanForm />);
    await reachActivities(user);
    await user.click(
      await screen.findByRole("button", { name: "Agregar Actividad 2" }),
    );

    await user.click(
      screen.getByRole("button", { name: /Cerca de Actividad 2/ }),
    );
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(getActivity).toHaveBeenCalledWith(2);
    await waitFor(() =>
      expect(searchActivities).toHaveBeenLastCalledWith(
        expect.objectContaining({
          latitude: -32.9,
          longitude: -68.8,
          maxDistanceKm: 25,
        }),
        expect.anything(),
      ),
    );
    expect(
      screen.getByText(/A menos de 25 km de Actividad 2/),
    ).toBeInTheDocument();
  });

  it("says so, instead of guessing, when the last stop has no coordinates", async () => {
    const user = userEvent.setup();
    vi.mocked(getActivity).mockResolvedValue(located("Actividad 2", null, null));
    render(<CreatePlanForm />);
    await reachActivities(user);
    await user.click(
      await screen.findByRole("button", { name: "Agregar Actividad 2" }),
    );
    await user.click(
      screen.getByRole("button", { name: /Cerca de Actividad 2/ }),
    );
    expect(
      await screen.findByText(/No tenemos la ubicación de Actividad 2/),
    ).toBeInTheDocument();
    expect(searchActivities).not.toHaveBeenCalledWith(
      expect.objectContaining({ latitude: expect.anything() }),
    );
  });
});

describe("PlanComposer edit flow", () => {
  beforeEach(() => {
    vi.mocked(getActivity).mockResolvedValue({
      ...activity(1),
      locations: [],
    } satisfies ActivityDetailResult);
  });

  it("reorders with keyboard controls and submits retained PlanDetail identities", async () => {
    const user = userEvent.setup();
    const plan = {
      ...canonicalPlan(),
      details: [
        {
          id: 601,
          order: 1,
          estimatedCost: 20000,
          estimatedDuration: 120,
          activity: {
            id: 1,
            name: "Bodega A",
            description: "",
            estimatedCost: 30000,
            estimatedDuration: 240,
            type: "Bodega",
          },
        },
        {
          id: 602,
          order: 2,
          estimatedCost: 8000,
          estimatedDuration: 60,
          activity: {
            id: 2,
            name: "Bodega B",
            description: "",
            estimatedCost: 9000,
            estimatedDuration: 90,
            type: "Bodega",
          },
        },
      ],
    } as OwnPlanDetail;
    vi.mocked(searchActivities).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 8, total: 0, totalPages: 0 },
    });
    vi.mocked(listCategories).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });
    vi.mocked(suggestActivities).mockResolvedValue({ data: [] });
    vi.mocked(updatePlanFromComposer).mockResolvedValue(plan);
    render(<PlanComposer mode="edit" plan={plan} />);
    const userPlanName = screen.getByLabelText(/Nombre del plan/);
    expect(userPlanName).toHaveValue("Sábado entre viñas");
    await user.click(
      screen.getByRole("button", { name: /Elegir actividades/ }),
    );
    expect(screen.getByText(/20\.000/)).toBeInTheDocument();
    await chooseFromMenu(user, "Bodega B", "Subir");
    await user.click(screen.getByRole("button", { name: /Revisar plan/ }));
    await user.click(screen.getByRole("button", { name: /Guardar cambios/ }));

    await waitFor(() => expect(updatePlanFromComposer).toHaveBeenCalledOnce());
    expect(updatePlanFromComposer).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        stops: [
          { activityId: 2, detailId: 602 },
          { activityId: 1, detailId: 601 },
        ],
      }),
    );
    expect(push).toHaveBeenCalledWith(`${ROUTES.plans}/7`);
  });
});

describe("PlanComposer boundaries and safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchActivities).mockImplementation(
      async ({ page = 1, limit = 8 }) => ({
        data: [activity(1), activity(2)],
        pagination: { page, limit, total: 2, totalPages: 1 },
      }),
    );
    vi.mocked(listCategories).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });
    vi.mocked(suggestActivities).mockResolvedValue({ data: [] });
    vi.mocked(createPlanFromComposer).mockResolvedValue(canonicalPlan());
    vi.mocked(getActivity).mockResolvedValue({
      ...activity(1),
      locations: [],
    } satisfies ActivityDetailResult);
  });

  async function fillName(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/Nombre del plan/), "Viaje");
  }

  it.each([
    ["0", false],
    ["1", true],
    ["1000", true],
    ["1001", false],
    ["-2", false],
    ["2.5", false],
    ["", false],
  ])("people count %j advances: %s", async (value, advances) => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await fillName(user);
    fireEvent.change(screen.getByLabelText(/personas/), {
      target: { value },
    });
    await user.click(
      screen.getByRole("button", { name: /Elegir actividades/ }),
    );

    if (advances) {
      expect(
        await screen.findByRole("tab", { name: /Recorrido/ }),
      ).toBeInTheDocument();
    } else {
      expect(
        await screen.findByText(/debe estar entre 1 y 1\.000/),
      ).toBeInTheDocument();
      expect(searchActivities).not.toHaveBeenCalled();
    }
  });

  it("accepts a 150-character name and rejects 151, even past the input's own limit", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<CreatePlanForm />);
    fireEvent.change(screen.getByLabelText(/Nombre del plan/), {
      target: { value: "a".repeat(150) },
    });
    await user.click(
      screen.getByRole("button", { name: /Elegir actividades/ }),
    );
    expect(
      await screen.findByRole("tab", { name: /Recorrido/ }),
    ).toBeInTheDocument();
    unmount();

    render(<CreatePlanForm />);
    fireEvent.change(screen.getByLabelText(/Nombre del plan/), {
      target: { value: "a".repeat(151) },
    });
    await user.click(
      screen.getByRole("button", { name: /Elegir actividades/ }),
    );
    expect(await screen.findByText(/hasta 150 caracteres/)).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Recorrido/ })).toBeNull();
  });

  it("treats a name of only spaces as empty", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    fireEvent.change(screen.getByLabelText(/Nombre del plan/), {
      target: { value: "     " },
    });
    await user.click(
      screen.getByRole("button", { name: /Elegir actividades/ }),
    );
    expect(
      await screen.findByText("Escribí un nombre para el plan."),
    ).toBeInTheDocument();
  });

  it("accepts a 2000-character note and rejects 2001", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await fillName(user);
    await user.click(screen.getByRole("button", { name: /Agregar una nota/ }));
    const note = screen.getByLabelText(/Nota/);

    fireEvent.change(note, { target: { value: "a".repeat(2001) } });
    await user.click(
      screen.getByRole("button", { name: /Elegir actividades/ }),
    );
    expect(
      await screen.findByText(/hasta 2\.000 caracteres/),
    ).toBeInTheDocument();
    expect(searchActivities).not.toHaveBeenCalled();

    fireEvent.change(note, { target: { value: "a".repeat(2000) } });
    expect(screen.queryByText(/hasta 2\.000 caracteres/)).toBeNull();
    await user.click(
      screen.getByRole("button", { name: /Elegir actividades/ }),
    );
    expect(
      await screen.findByRole("tab", { name: /Recorrido/ }),
    ).toBeInTheDocument();
  });

  it("never saves a plan with no stops, even after emptying the route from the review", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await fillName(user);
    await user.click(
      screen.getByRole("button", { name: /Elegir actividades/ }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Agregar Actividad 1" }),
    );
    await user.click(screen.getByRole("button", { name: /Revisar plan/ }));
    await user.click(
      screen.getByRole("button", { name: /Volver al recorrido/ }),
    );
    await chooseFromMenu(user, "Actividad 1", /Quitar del recorrido/);

    expect(screen.getByRole("button", { name: /Paso 3/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Revisar plan/ }));
    expect(
      screen.queryByRole("button", { name: /Crear plan/ }),
    ).not.toBeInTheDocument();
    expect(createPlanFromComposer).not.toHaveBeenCalled();
  });

  it("takes a removed stop back where it was with Deshacer", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await fillName(user);
    await user.click(
      screen.getByRole("button", { name: /Elegir actividades/ }),
    );
    for (const id of [1, 2]) {
      await user.click(
        await screen.findByRole("button", { name: `Agregar Actividad ${id}` }),
      );
    }

    await chooseFromMenu(user, "Actividad 1", /Quitar del recorrido/);
    const stopList = screen.getByRole("list", { name: "Paradas en orden" });
    expect(within(stopList).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Quitaste Actividad 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Deshacer/ }));
    const items = within(
      screen.getByRole("list", { name: "Paradas en orden" }),
    ).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Actividad 1");
    expect(screen.queryByText("Quitaste Actividad 1")).toBeNull();
  });

  it("does not search while the price range is inverted and says why", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await fillName(user);
    await user.click(
      screen.getByRole("button", { name: /Elegir actividades/ }),
    );
    await screen.findByText("Actividad 1");
    await user.click(screen.getByRole("button", { name: /Filtros/ }));
    vi.mocked(searchActivities).mockClear();
    await user.type(screen.getByPlaceholderText("$ mín."), "5000");
    await user.type(screen.getByPlaceholderText("$ máx."), "1000");

    expect(
      screen.getByText("El precio mínimo no puede superar al máximo."),
    ).toBeInTheDocument();
    expect(searchActivities).not.toHaveBeenLastCalledWith(
      expect.objectContaining({ minPrice: 5000, maxPrice: 1000 }),
    );
  });

  it("sends the person to the field the server rejected", async () => {
    vi.mocked(createPlanFromComposer).mockRejectedValueOnce(
      new ApiError({ message: "bad", type: "HTTP", status: 400 }),
    );
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await fillName(user);
    await user.click(
      screen.getByRole("button", { name: /Elegir actividades/ }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Agregar Actividad 1" }),
    );
    await user.click(screen.getByRole("button", { name: /Revisar plan/ }));
    await user.click(screen.getByRole("button", { name: /Crear plan/ }));

    expect(await screen.findByLabelText(/Nombre del plan/)).toHaveValue(
      "Viaje",
    );
  });
});

describe("PlanComposer duration guidance (never a rule)", () => {
  // Minutes by activity id: 4h, 4h, 1h, 10h, 6h, 20m × 12 (ids 7–18).
  const MINUTES: Record<number, number> = {
    1: 240,
    2: 240,
    3: 60,
    4: 600,
    5: 360,
    ...Object.fromEntries(
      Array.from({ length: 12 }, (_, index) => [index + 7, 20]),
    ),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const all = Object.keys(MINUTES).map((id) => ({
      ...activity(Number(id)),
      estimatedDuration: MINUTES[Number(id)],
    }));
    vi.mocked(searchActivities).mockImplementation(
      async ({ page = 1, limit = 8 }) => ({
        data: all.slice((page - 1) * limit, page * limit),
        pagination: {
          page,
          limit,
          total: all.length,
          totalPages: Math.ceil(all.length / limit),
        },
      }),
    );
    vi.mocked(listCategories).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });
    vi.mocked(suggestActivities).mockResolvedValue({ data: [] });
    vi.mocked(createPlanFromComposer).mockResolvedValue(canonicalPlan());
    vi.mocked(getActivity).mockResolvedValue({
      ...activity(1),
      locations: [],
    } satisfies ActivityDetailResult);
  });

  async function start(user: ReturnType<typeof userEvent.setup>) {
    render(<CreatePlanForm />);
    await reachActivities(user);
    await screen.findByText("Actividad 1");
  }

  // The catalog is paged: go forward until the activity is on screen.
  async function add(user: ReturnType<typeof userEvent.setup>, id: number) {
    const name = `Agregar Actividad ${id}`;
    for (let page = 0; page < 5; page++) {
      const button = screen.queryByRole("button", { name });
      if (button) {
        await user.click(button);
        return;
      }
      const next = screen.getByRole("button", { name: "Siguiente" });
      if (next.hasAttribute("disabled")) break;
      await user.click(next);
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled(),
      );
    }
    await user.click(await screen.findByRole("button", { name }));
  }

  const reviewButton = () =>
    screen.getByRole("button", { name: /Revisar plan|Revisar igual/ });

  it("says nothing while the day is comfortable", async () => {
    const user = userEvent.setup();
    await start(user);
    await add(user, 1);
    await add(user, 2); // exactly 8 h: still normal

    expect(screen.queryByText("Va a ser un día intenso")).toBeNull();
    expect(screen.queryByText(/supera un día completo/)).toBeNull();
    expect(reviewButton()).toHaveTextContent("Revisar plan");
  });

  it("warns, without blocking, when the day gets long", async () => {
    const user = userEvent.setup();
    await start(user);
    for (const id of [1, 2, 3]) await add(user, id); // 9 h

    expect(screen.getByText("Va a ser un día intenso")).toBeInTheDocument();
    expect(screen.getByText(/ya suma 9h/)).toBeInTheDocument();
    expect(reviewButton()).toBeEnabled();
    expect(reviewButton()).toHaveTextContent("Revisar plan");
    await user.click(reviewButton());
    expect(
      await screen.findByRole("button", { name: /Crear plan/ }),
    ).toBeEnabled();
  });

  it("flags a route longer than a day strongly, but lets the person go on deliberately", async () => {
    const user = userEvent.setup();
    await start(user);
    for (const id of [1, 2, 3, 4]) await add(user, id); // 19 h
    expect(reviewButton()).toHaveTextContent("Revisar plan");

    await add(user, 5); // 25 h

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Este recorrido supera un día completo");
    expect(alert).toHaveTextContent("25h");
    expect(alert).toHaveTextContent(/viaje de varios días/);
    // One dominant message, and a button that no longer pretends it is normal.
    expect(screen.queryByText("Va a ser un día intenso")).toBeNull();
    expect(reviewButton()).toHaveTextContent("Revisar igual");
    expect(reviewButton()).toBeEnabled();

    // It is guidance, not a rule: the person can review and save it.
    await user.click(reviewButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Este recorrido supera un día completo",
    );
    await user.click(screen.getByRole("button", { name: /Crear plan/ }));
    await waitFor(() => expect(createPlanFromComposer).toHaveBeenCalledOnce());
    expect(vi.mocked(createPlanFromComposer).mock.calls[0][0].stops).toHaveLength(
      5,
    );
  });

  it("follows the total as stops are removed and added back", async () => {
    const user = userEvent.setup();
    await start(user);
    for (const id of [1, 2, 3, 4, 5]) await add(user, id); // 25 h
    expect(reviewButton()).toHaveTextContent("Revisar igual");

    // Dropping 1 h makes exactly 24 h, which is a long day, not beyond one.
    await chooseFromMenu(user, "Actividad 3", /Quitar del recorrido/);
    expect(screen.queryByText(/supera un día completo/)).toBeNull();
    expect(screen.getByText("Va a ser un día intenso")).toBeInTheDocument();
    expect(reviewButton()).toHaveTextContent("Revisar plan");

    // Undoing the removal crosses the line again.
    await user.click(screen.getByRole("button", { name: /Deshacer/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "supera un día completo",
    );
    expect(reviewButton()).toHaveTextContent("Revisar igual");
  });

  it("judges the total duration, never the number of stops", async () => {
    const user = userEvent.setup();
    await start(user);
    for (let id = 7; id <= 18; id++) await add(user, id); // 12 × 20 min

    const stops = screen.getByRole("list", { name: "Paradas en orden" });
    expect(within(stops).getAllByRole("listitem")).toHaveLength(12);
    expect(screen.queryByText(/supera un día completo/)).toBeNull();
    expect(screen.queryByText("Va a ser un día intenso")).toBeNull();
    expect(reviewButton()).toHaveTextContent("Revisar plan");
  });
});

describe("PlanComposer assistant (the person stays the author)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assistantUnavailable();
    vi.mocked(searchActivities).mockImplementation(
      async ({ page = 1, limit = 8 }) => ({
        data: [activity(1), activity(2), activity(3)],
        pagination: { page, limit, total: 3, totalPages: 1 },
      }),
    );
    vi.mocked(listCategories).mockResolvedValue({
      data: [{ id: 1, name: "Bodegas", description: null }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });
    vi.mocked(suggestActivities).mockResolvedValue({ data: [] });
    vi.mocked(createPlanFromComposer).mockResolvedValue(canonicalPlan());
    vi.mocked(getActivity).mockResolvedValue({
      ...activity(1),
      locations: [],
    } satisfies ActivityDetailResult);
  });

  const SENTENCE = "algo para comer cerca del museo, barato y tranquilo";

  async function start(user: ReturnType<typeof userEvent.setup>) {
    render(<CreatePlanForm />);
    await reachActivities(user);
    await screen.findByText("Actividad 1");
  }

  const searchBox = () =>
    screen.getByRole("searchbox", { name: "Buscar actividades" });

  it("offers to understand a sentence, not a keyword, and answers with real results and why", async () => {
    vi.mocked(assistantSearch).mockResolvedValue({
      interpretation: {
        chips: ["Cerca de Actividad 9", "Tranquilo"],
        nearName: "Actividad 9",
      },
      results: [
        {
          activity: { ...activity(3), distanceKm: 0.3 },
          reason: "Económico y tranquilo",
        },
      ],
    });
    const user = userEvent.setup();
    await start(user);

    await user.type(searchBox(), "vino");
    expect(screen.queryByRole("button", { name: /Entender/ })).toBeNull();
    await user.clear(searchBox());

    await user.type(searchBox(), SENTENCE);
    expect(
      screen.getByRole("button", { name: /Entender/ }),
    ).toBeInTheDocument();
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText("Económico y tranquilo"),
    ).toBeInTheDocument();
    expect(assistantSearch).toHaveBeenCalledWith(
      { query: SENTENCE, stopActivityIds: [] },
      expect.anything(),
    );
    // The chips say what was understood, and the regular catalog stays quiet.
    expect(screen.getByText("Tranquilo")).toBeInTheDocument();
    expect(searchActivities).not.toHaveBeenLastCalledWith(
      expect.objectContaining({ search: expect.stringContaining("museo") }),
      expect.anything(),
    );
    // Nothing reached the route until the person pressed Sumar.
    expect(screen.queryByRole("list", { name: "Paradas en orden" })).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Agregar Actividad 3" }),
    );
    expect(
      within(screen.getByRole("list", { name: "Paradas en orden" })).getByText(
        "Actividad 3",
      ),
    ).toBeInTheDocument();
  });

  it("sends the current route as context, never changes it", async () => {
    vi.mocked(assistantSearch).mockResolvedValue({
      interpretation: { chips: [], nearName: null },
      results: [],
    });
    const user = userEvent.setup();
    await start(user);
    await user.click(
      screen.getByRole("button", { name: "Agregar Actividad 1" }),
    );
    await user.type(searchBox(), SENTENCE);
    await user.click(screen.getByRole("button", { name: /Entender/ }));

    await waitFor(() =>
      expect(assistantSearch).toHaveBeenCalledWith(
        { query: SENTENCE, stopActivityIds: [1] },
        expect.anything(),
      ),
    );
    expect(
      await screen.findByText("No encontré nada así en el catálogo"),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("list", { name: "Paradas en orden" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(1);
  });

  it("falls back to the regular search, with a note, when the assistant is unavailable", async () => {
    const user = userEvent.setup();
    await start(user);
    await user.type(searchBox(), SENTENCE);
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText(/No pude interpretar esa frase ahora/),
    ).toBeInTheDocument();
    expect(await screen.findByText("Actividad 2")).toBeInTheDocument();
  });

  it("goes back to the whole catalog and clears the sentence", async () => {
    vi.mocked(assistantSearch).mockResolvedValue({
      interpretation: { chips: ["Tranquilo"], nearName: null },
      results: [{ activity: activity(3), reason: "Calmo" }],
    });
    const user = userEvent.setup();
    await start(user);
    await user.type(searchBox(), SENTENCE);
    await user.keyboard("{Enter}");
    await screen.findByText("Calmo");

    await user.click(
      screen.getByRole("button", { name: "Ver todo el catálogo" }),
    );
    expect(searchBox()).toHaveValue("");
    expect(await screen.findByText("Actividad 1")).toBeInTheDocument();
    expect(screen.queryByText("Calmo")).toBeNull();
  });

  it("suggests with the reason and the missing kind of activity, and only adds on request", async () => {
    vi.mocked(assistantSuggest).mockResolvedValue({
      suggestions: [{ activity: activity(2), reason: "Para almorzar después" }],
      gap: { categoryName: "Bodegas", message: "Te falta algo para comer." },
    });
    const user = userEvent.setup();
    await start(user);

    expect(
      await screen.findByText("Para almorzar después"),
    ).toBeInTheDocument();
    expect(screen.getByText("Te falta algo para comer.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Paradas en orden" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Ver Bodegas" }));
    await waitFor(() =>
      expect(searchActivities).toHaveBeenLastCalledWith(
        expect.objectContaining({ categoryIds: [1] }),
        expect.anything(),
      ),
    );
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
    const names = () =>
      within(screen.getByRole("list", { name: "Paradas en orden" }))
        .getAllByRole("listitem")
        .map((item) => item.querySelector("strong")?.textContent);

    it("is only offered for a route of two or more stops", async () => {
      const user = userEvent.setup();
      await start(user);
      await user.click(
        screen.getByRole("button", { name: "Agregar Actividad 1" }),
      );
      expect(screen.queryByRole("button", { name: "Mejorar" })).toBeNull();
      await user.click(
        screen.getByRole("button", { name: "Agregar Actividad 2" }),
      );
      expect(
        screen.getByRole("button", { name: "Mejorar" }),
      ).toBeInTheDocument();
    });

    it("shows proposals with their computed effect first, and changes nothing until applied", async () => {
      vi.mocked(assistantImprove).mockResolvedValue({
        proposals: [
          {
            kind: "reorder",
            reason: "La cena va al final",
            orderedActivityIds: [2, 1],
            effect: { minutes: 0, cost: 0, km: -3.4 },
          },
        ],
      });
      const user = userEvent.setup();
      await withTwoStops(user);
      await user.click(screen.getByRole("button", { name: "Mejorar" }));

      expect(
        await screen.findByText("La cena va al final"),
      ).toBeInTheDocument();
      expect(screen.getByText(/−3,4 km/)).toBeInTheDocument();
      expect(assistantImprove).toHaveBeenCalledWith(
        { title: "Sábado entre viñas", stopActivityIds: [1, 2] },
        expect.anything(),
      );
      expect(names()).toEqual(["Actividad 1", "Actividad 2"]);

      await user.click(screen.getByRole("button", { name: "Reordenar" }));
      expect(names()).toEqual(["Actividad 2", "Actividad 1"]);
      await user.click(screen.getByRole("button", { name: /Deshacer/ }));
      expect(names()).toEqual(["Actividad 1", "Actividad 2"]);
    });

    it("adds a proposed activity only when asked, where it was proposed, with undo", async () => {
      vi.mocked(assistantImprove).mockResolvedValue({
        proposals: [
          {
            kind: "add",
            reason: "Cierra el día",
            activity: activity(3),
            position: 1,
            effect: { minutes: 30, cost: 3000, km: null },
          },
        ],
      });
      const user = userEvent.setup();
      await withTwoStops(user);
      await user.click(screen.getByRole("button", { name: "Mejorar" }));
      await screen.findByText("Cierra el día");
      expect(names()).toHaveLength(2);

      const proposals = screen.getByRole("region", {
        name: /Ideas para mejorar/,
      });
      await user.click(within(proposals).getByRole("button", { name: "Sumar" }));
      expect(names()).toEqual(["Actividad 1", "Actividad 3", "Actividad 2"]);
      await user.click(screen.getByRole("button", { name: /Deshacer/ }));
      expect(names()).toEqual(["Actividad 1", "Actividad 2"]);
    });

    it("drops stale proposals as soon as the route changes", async () => {
      vi.mocked(assistantImprove).mockResolvedValue({
        proposals: [
          {
            kind: "remove",
            reason: "Es redundante",
            activityId: 2,
            effect: { minutes: -20, cost: -2000, km: null },
          },
        ],
      });
      const user = userEvent.setup();
      await withTwoStops(user);
      await user.click(screen.getByRole("button", { name: "Mejorar" }));
      await screen.findByText("Es redundante");

      await user.click(
        screen.getByRole("button", { name: "Agregar Actividad 3" }),
      );
      expect(screen.queryByText("Es redundante")).toBeNull();
    });

    it("says so, and keeps the route, when the assistant cannot review it", async () => {
      const user = userEvent.setup();
      await withTwoStops(user);
      await user.click(screen.getByRole("button", { name: "Mejorar" }));
      expect(
        await screen.findByText(/No pude revisar el recorrido ahora/),
      ).toBeInTheDocument();
      expect(names()).toEqual(["Actividad 1", "Actividad 2"]);
    });

    it("says the route is fine when there is nothing to propose", async () => {
      vi.mocked(assistantImprove).mockResolvedValue({ proposals: [] });
      const user = userEvent.setup();
      await withTwoStops(user);
      await user.click(screen.getByRole("button", { name: "Mejorar" }));
      expect(await screen.findByText(/está bien armado/)).toBeInTheDocument();
    });
  });
});
