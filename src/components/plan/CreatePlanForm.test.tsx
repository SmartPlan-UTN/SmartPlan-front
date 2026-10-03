import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createPlanFromComposer,
  getActivity,
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
import { PlanComposer } from "./PlanComposer";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/explore", () => ({
  CategoryChips: ({ onToggle }: { onToggle: (id: number) => void }) => (
    <button type="button" onClick={() => onToggle(1)}>
      Bodegas
    </button>
  ),
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    createPlanFromComposer: vi.fn(),
    updatePlanFromComposer: vi.fn(),
    searchActivities: vi.fn(),
    suggestActivities: vi.fn(),
    getActivity: vi.fn(),
  };
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
      async ({ page = 1, limit = 12 }) => {
        const all = Array.from({ length: 15 }, (_, index) =>
          activity(index + 1),
        );
        return {
          data: all.slice((page - 1) * limit, page * limit),
          pagination: { page, limit, total: 15, totalPages: 2 },
        };
      },
    );
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

  it("waits until Recorrido to load the catalog and focuses its heading", async () => {
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
        screen.getByRole("heading", { name: "Armemos el recorrido" }),
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

  it("expands beyond five results and paginates to the fifteenth activity", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await reachActivities(user);
    await screen.findByText("Actividad 1");
    expect(screen.queryByText("Actividad 6")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Ver más resultados/ }),
    );
    expect(await screen.findByText("Actividad 12")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("Actividad 15")).toBeInTheDocument();
    expect(searchActivities).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, limit: 12 }),
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
      expect.objectContaining({ search: "ab", page: 1, limit: 12 }),
    );
  });

  it("applies catalog category, price, and sort filters to the paginated search", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);
    await reachActivities(user);
    await screen.findByText("Actividad 1");

    await user.click(screen.getByRole("button", { name: "Bodegas" }));
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
          limit: 12,
        }),
      ),
    );
  });

  it("adds a backend activity suggestion to the itinerary", async () => {
    const user = userEvent.setup();
    vi.mocked(suggestActivities).mockResolvedValueOnce({
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

    await user.click(screen.getByRole("button", { name: "Recomendar actividades" }));
    await screen.findByText("Degustación sugerida");
    expect(suggestActivities).toHaveBeenCalledWith({
      title: "Sábado entre viñas",
      description: undefined,
      excludeActivityIds: [],
    });

    await user.click(screen.getByRole("button", { name: "Agregar Degustación sugerida" }));
    expect(screen.getByText("Degustación sugerida")).toBeInTheDocument();
    expect(screen.getByText("1 parada")).toBeInTheDocument();
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
    await user.click(
      screen.getByRole("button", {
        name: /Actividad 1 ya está en el recorrido/,
      }),
    );

    const stopList = screen.getByRole("list", { name: "Paradas en orden" });
    expect(within(stopList).getAllByText("Actividad 1")).toHaveLength(1);
    expect(within(stopList).getAllByRole("listitem")).toHaveLength(2);

    await user.click(
      screen.getByRole("button", { name: "Mover Actividad 2 arriba" }),
    );
    expect(within(stopList).getAllByRole("listitem")[0]).toHaveTextContent(
      "Actividad 2",
    );
    expect(screen.getByLabelText("Estimación del recorrido")).toHaveTextContent(
      /\$\s?3\.000/,
    );
    expect(screen.getByLabelText("Estimación del recorrido")).toHaveTextContent(
      "30m",
    );

    await user.click(
      screen.getByRole("button", { name: "Quitar Actividad 1" }),
    );
    expect(within(stopList).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByLabelText("Estimación del recorrido")).toHaveTextContent(
      /\$\s?2\.000/,
    );
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
    expect(screen.queryByText("Un último vistazo")).not.toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: /Crear plan/ }));
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
    await user.click(screen.getByRole("button", { name: /Paso 1: Idea/ }));
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

describe("PlanComposer edit flow", () => {
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
      pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
    });
    vi.mocked(updatePlanFromComposer).mockResolvedValue(plan);
    render(<PlanComposer mode="edit" plan={plan} />);
    const userPlanName = screen.getByLabelText(/Nombre del plan/);
    expect(userPlanName).toHaveValue("Sábado entre viñas");
    await user.click(
      screen.getByRole("button", { name: /Elegir actividades/ }),
    );
    expect(screen.getByText(/20\.000/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Mover Bodega B arriba" }),
    );
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
