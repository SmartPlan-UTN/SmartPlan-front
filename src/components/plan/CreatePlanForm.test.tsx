import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  addPlanActivity,
  createPlan,
  searchActivities,
} from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import type { ActivitySearchResult, Plan } from "@/types";

import { CreatePlanForm } from "./CreatePlanForm";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    createPlan: vi.fn(),
    addPlanActivity: vi.fn(),
    searchActivities: vi.fn(),
  };
});

function mockActivity(
  overrides: Partial<ActivitySearchResult> = {},
): ActivitySearchResult {
  return {
    id: 42,
    name: "Degustación en Bodega",
    description: "Degustación de vinos",
    estimatedCost: 15000,
    estimatedDuration: 180,
    type: "Bodega",
    averageRating: 4.7,
    ratingCount: 30,
    distanceKm: null,
    categories: [{ id: 1, name: "Bodega" }],
    locations: [],
    ...overrides,
  } as ActivitySearchResult;
}

function mockCreatedPlan(): Plan {
  return { id: 7 } as Plan;
}

/** Types into the activity box and waits for the debounced search. */
async function searchActivity(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText("Buscar Actividad"),
    "degustación",
  );
  return screen.findByRole(
    "button",
    { name: "+ Agregar" },
    { timeout: 2000 },
  );
}

describe("CreatePlanForm (CU24)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchActivities).mockResolvedValue({
      data: [mockActivity()],
      pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
    });
    vi.mocked(createPlan).mockResolvedValue(mockCreatedPlan());
    vi.mocked(addPlanActivity).mockResolvedValue(
      {} as Awaited<ReturnType<typeof addPlanActivity>>,
    );
  });

  it("refuses to submit without a title", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);

    await user.click(screen.getByRole("button", { name: "Guardar Plan" }));

    expect(
      await screen.findByText("El nombre del plan es obligatorio"),
    ).toBeInTheDocument();
    expect(createPlan).not.toHaveBeenCalled();
  });

  it("refuses to submit with fewer than one person", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);

    await user.type(screen.getByLabelText("Nombre del plan"), "Domingo");
    await user.clear(screen.getByLabelText("Cantidad de personas"));
    await user.type(screen.getByLabelText("Cantidad de personas"), "0");
    await user.click(screen.getByRole("button", { name: "Guardar Plan" }));

    expect(
      await screen.findByText("La cantidad de personas debe ser al menos 1"),
    ).toBeInTheDocument();
    expect(createPlan).not.toHaveBeenCalled();
  });

  it("creates the plan, posts each stop and redirects to its detail", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);

    await user.type(screen.getByLabelText("Nombre del plan"), "Domingo de bodegas");
    await user.type(screen.getByLabelText("Descripción"), "Recorrido por viñedos");

    const addButton = await searchActivity(user);
    await user.click(addButton);

    await user.click(screen.getByRole("button", { name: "Guardar Plan" }));

    await waitFor(() => {
      expect(createPlan).toHaveBeenCalledWith({
        title: "Domingo de bodegas",
        description: "Recorrido por viñedos",
        peopleCount: 1,
      });
    });
    await waitFor(() => {
      expect(addPlanActivity).toHaveBeenCalledWith(7, 42);
    });
    await waitFor(
      () => {
        expect(push).toHaveBeenCalledWith(`${ROUTES.plans}/7`);
      },
      { timeout: 3000 },
    );
  });

  it("drops an added activity from the suggestions so it can't be added twice", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);

    const addButton = await searchActivity(user);
    await user.click(addButton);

    // It moves into the itinerary, and the suggestion goes away with it.
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "+ Agregar" }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText("Degustación en Bodega")).toBeInTheDocument();
  });

  it("resumes instead of creating a second plan when a stop fails", async () => {
    vi.mocked(addPlanActivity).mockRejectedValueOnce(
      new ApiError({
        message: "La actividad no está disponible",
        type: "HTTP",
        status: 409,
      }),
    );

    const user = userEvent.setup();
    render(<CreatePlanForm />);

    await user.type(screen.getByLabelText("Nombre del plan"), "Domingo de bodegas");
    const addButton = await searchActivity(user);
    await user.click(addButton);

    await user.click(screen.getByRole("button", { name: "Guardar Plan" }));
    expect(
      await screen.findByText("La actividad no está disponible"),
    ).toBeInTheDocument();
    expect(createPlan).toHaveBeenCalledTimes(1);

    // Retrying must reuse the plan the first attempt already created.
    vi.mocked(addPlanActivity).mockResolvedValue(
      {} as Awaited<ReturnType<typeof addPlanActivity>>,
    );
    await user.click(screen.getByRole("button", { name: "Guardar Plan" }));

    await waitFor(() => {
      expect(addPlanActivity).toHaveBeenCalledTimes(2);
    });
    expect(createPlan).toHaveBeenCalledTimes(1);
  });

  it("warns before discarding a form with data in it", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);

    await user.type(screen.getByLabelText("Nombre del plan"), "Domingo");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Descartar cambios")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("leaves straight away when the form is untouched", async () => {
    const user = userEvent.setup();
    render(<CreatePlanForm />);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(push).toHaveBeenCalledWith(ROUTES.explore);
  });
});
