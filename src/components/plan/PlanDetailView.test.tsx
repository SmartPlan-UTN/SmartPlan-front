import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { outingCreation } from "@/test/fixtures/outings";
import type {
  OwnPlanDetail,
  PlanDetailResult,
  PlanStatusKey,
  ViewerPlanState,
} from "@/types";

import { PlanDetailView } from "./PlanDetailView";

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace, refresh: vi.fn() }),
}));

const useSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/auth")>()),
  useSession,
}));

const mockToggleSavePlan = vi.hoisted(() => vi.fn());
const mockIsPlanSaved = vi.hoisted(() => vi.fn());

vi.mock("@/context", () => ({
  useFavorites: () => ({
    isPlanSaved: mockIsPlanSaved,
    toggleSavePlan: mockToggleSavePlan,
    savedPlanIds: new Set(),
    loading: false,
  }),
}));

const getPlan = vi.hoisted(() => vi.fn());
const getOwnPlan = vi.hoisted(() => vi.fn());
const createOuting = vi.hoisted(() => vi.fn());
const setOwnPlanVisibility = vi.hoisted(() => vi.fn());
const getPlanExperiences = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getPlan,
  getOwnPlan,
  createOuting,
  setOwnPlanVisibility,
  getPlanExperiences,
}));

function ownPlan(overrides: Partial<OwnPlanDetail> = {}): OwnPlanDetail {
  return {
    id: 7,
    title: "Tarde de vinos",
    description: null,
    estimatedTotalCost: 8500,
    estimatedTotalDuration: 240,
    peopleCount: 2,
    estimatedCostPerPerson: 4250,
    activityCount: 1,
    status: { key: "confirmed", name: "Confirmado" },
    visibility: "private",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
    details: [],
    ...overrides,
  };
}

function plan(overrides: Partial<PlanDetailResult> = {}): PlanDetailResult {
  return {
    id: 7,
    title: "Tarde de vinos",
    description: "Una copa con vista",
    estimatedTotalCost: 8500,
    estimatedTotalDuration: 240,
    activityCount: 1,
    averageRating: 4.6,
    distanceKm: null,
    categories: [{ id: 1, name: "Bodegas" }],
    activityNames: ["Bodega"],
    status: { key: "confirmed", name: "Confirmado" },
    viewerPlanState: "selectable",
    activeOutingId: null,
    kind: "authored",
    visibility: "public",
    ownedByViewer: false,
    details: [
      {
        id: 1,
        order: 1,
        estimatedCost: 8500,
        estimatedDuration: 240,
        activity: {
          id: 11,
          name: "Bodega",
          description: "",
          estimatedCost: 8500,
          estimatedDuration: 240,
          type: null,
          averageRating: 4.6,
          ratingCount: 3,
          categories: [],
          locations: [],
        },
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useSession.mockReturnValue({ status: "authenticated", authenticated: true });
  getOwnPlan.mockResolvedValue(ownPlan());
  createOuting.mockResolvedValue(outingCreation({ id: 40 }));
  getPlanExperiences.mockResolvedValue({
    data: [],
    pagination: { page: 1, limit: 6, total: 0, totalPages: 0 },
    summary: { averageRating: 0, experienceCount: 0, photoCount: 0, photos: [] },
  });
});

async function renderDetail(
  viewerPlanState: ViewerPlanState,
  overrides: Partial<PlanDetailResult> = {},
  statusKey: PlanStatusKey = "confirmed",
) {
  getPlan.mockResolvedValue(
    plan({ viewerPlanState, status: { key: statusKey, name: "x" }, ...overrides }),
  );
  render(<PlanDetailView planId={7} />);
  await screen.findByRole("heading", { name: "Tarde de vinos", level: 1 });
}

const intendButton = { name: /^lo voy a hacer$/i } as const;

describe("PlanDetailView — Lo voy a hacer (CU22, PAN 17, #130)", () => {
  it("offers 'Lo voy a hacer' when the viewer can choose the plan", async () => {
    await renderDetail("selectable");

    expect(screen.getByRole("button", intendButton)).toBeEnabled();
  });

  it("adds the plan to Mis salidas once and links to the new outing", async () => {
    const user = userEvent.setup();
    await renderDetail("selectable");

    await user.click(screen.getByRole("button", intendButton));

    expect(await screen.findByText("Agregado a Mis salidas")).toBeInTheDocument();
    expect(createOuting).toHaveBeenCalledOnce();
    expect(createOuting).toHaveBeenCalledWith(7);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ver en mis salidas/i }),
    ).toHaveAttribute("href", "/outings/40");
    expect(screen.queryByRole("button", intendButton)).not.toBeInTheDocument();
  });

  it("shows a plan already chosen as added, with no undo", async () => {
    await renderDetail("selected", { activeOutingId: 55 });

    expect(screen.getByText("Agregado a Mis salidas")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ver en mis salidas/i }),
    ).toHaveAttribute("href", "/outings/55");
    expect(screen.queryByText(/ya no lo voy a hacer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/lo hice/i)).not.toBeInTheDocument();
  });

  it("shows only the domain status for a view-only viewer — no CTA", async () => {
    await renderDetail("view-only");

    expect(screen.getByText("Confirmado")).toBeInTheDocument();
    expect(screen.queryByRole("button", intendButton)).not.toBeInTheDocument();
  });

  it("reconciles from the server when the plan cannot be chosen anymore (409)", async () => {
    createOuting.mockRejectedValue(
      new ApiError({
        message: "x",
        type: "HTTP",
        status: 409,
        code: "PLAN_NOT_ACTIONABLE",
      }),
    );
    const user = userEvent.setup();
    await renderDetail("selectable");
    getPlan.mockResolvedValue(plan({ viewerPlanState: "view-only" }));

    await user.click(screen.getByRole("button", intendButton));

    await waitFor(() => expect(getPlan).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/cambió de estado/i)).toBeInTheDocument();
  });

  it("reports a network error and leaves the button as it was", async () => {
    createOuting.mockRejectedValue(
      new ApiError({ message: "sin red", type: "NETWORK" }),
    );
    const user = userEvent.setup();
    await renderDetail("selectable");

    await user.click(screen.getByRole("button", intendButton));

    expect(
      await screen.findByText(/no pudimos agregarlo a mis salidas/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", intendButton)).toBeEnabled();
  });

  it("sends the owner of an outing to its page in Mis salidas", async () => {
    await renderDetail("view-only", {
      kind: "outing",
      ownedByViewer: true,
      visibility: "private",
    });

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/outings/7"));
  });
});

describe("PlanDetailView — the author's plan (#130)", () => {
  it("shows the author its visibility and lets it publish the plan", async () => {
    setOwnPlanVisibility.mockResolvedValue(ownPlan({ visibility: "public" }));
    const user = userEvent.setup();
    await renderDetail("selectable", {
      ownedByViewer: true,
      visibility: "private",
    });

    expect(screen.getByText("Privado")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Publicar Tarde de vinos" }),
    );
    await user.click(screen.getByRole("button", { name: "Sí, publicar" }));

    expect(setOwnPlanVisibility).toHaveBeenCalledWith(7, "public");
    expect(await screen.findByText("Público")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /editar plan/i })).toBeInTheDocument();
  });

  it("shows the per-person cost from the author's own projection", async () => {
    await renderDetail("selectable", { ownedByViewer: true });

    expect(await screen.findByText(/costo por persona/i)).toBeInTheDocument();
  });

  it("never offers publishing to someone who did not author the plan", async () => {
    await renderDetail("selectable");

    expect(screen.queryByText("Público")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /publicar|hacer privado/i }),
    ).not.toBeInTheDocument();
    expect(getOwnPlan).not.toHaveBeenCalled();
  });

  it("never offers publishing a generated result, not even to its requester", async () => {
    await renderDetail("selectable", {
      kind: "generated",
      ownedByViewer: true,
      visibility: "private",
    });

    expect(
      screen.queryByRole("button", { name: /publicar/i }),
    ).not.toBeInTheDocument();
  });
});

describe("PlanDetailView — favorites (CU43 / CU42)", () => {
  it("toggles favorite plan when clicking the save button", async () => {
    mockIsPlanSaved.mockReturnValue(false);
    mockToggleSavePlan.mockResolvedValue(true);
    getPlan.mockResolvedValue(plan({ id: 1 }));

    render(<PlanDetailView planId={1} />);

    const saveBtn = await screen.findByRole("button", { name: "Guardar plan" });
    expect(saveBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(saveBtn);

    expect(mockToggleSavePlan).toHaveBeenCalledWith(1);
  });

  it("shows saved state when plan is saved", async () => {
    mockIsPlanSaved.mockReturnValue(true);
    getPlan.mockResolvedValue(plan({ id: 1 }));

    render(<PlanDetailView planId={1} />);

    const saveBtn = await screen.findByRole("button", {
      name: "Quitar de guardados",
    });
    expect(saveBtn).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Guardado")).toBeInTheDocument();
  });
});

describe("PlanDetailView — community experiences (#106)", () => {
  it("shows what people who did a published plan shared", async () => {
    await renderDetail("selectable");

    expect(
      await screen.findByRole("region", { name: "Cómo les fue a quienes lo hicieron" }),
    ).toBeInTheDocument();
    expect(getPlanExperiences).toHaveBeenCalledWith(7, { page: 1, limit: 6 });
  });

  it("has no community section on a private plan", async () => {
    await renderDetail("selectable", { visibility: "private", ownedByViewer: true });

    expect(
      screen.queryByRole("region", { name: "Cómo les fue a quienes lo hicieron" }),
    ).not.toBeInTheDocument();
    expect(getPlanExperiences).not.toHaveBeenCalled();
  });
});
