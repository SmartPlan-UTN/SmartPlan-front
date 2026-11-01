import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { outingCreation, outingDetail } from "@/test/fixtures/outings";
import type {
  OwnPlanDetail,
  PlanDetailResult,
  PlanStatusKey,
  ViewerPlanState,
} from "@/types";

import { PlanDetailView } from "./PlanDetailView";

const replace = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, refresh: vi.fn() }),
  usePathname: () => "/plans/7",
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
const copyGeneratedPlan = vi.hoisted(() => vi.fn());
const getOwnPlan = vi.hoisted(() => vi.fn());
const createOuting = vi.hoisted(() => vi.fn());
const setOwnPlanVisibility = vi.hoisted(() => vi.fn());
const getPlanExperiences = vi.hoisted(() => vi.fn());
const reportContent = vi.hoisted(() => vi.fn());
const listOutings = vi.hoisted(() => vi.fn());
const updateFeedback = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getPlan,
  copyGeneratedPlan,
  getOwnPlan,
  createOuting,
  setOwnPlanVisibility,
  getPlanExperiences,
  reportContent,
  listOutings,
  updateFeedback,
}));

function ownPlan(overrides: Partial<OwnPlanDetail> = {}): OwnPlanDetail {
  return {
    id: 7,
    title: "Tarde de vinos",
    description: null,
    visibility: "private",
    removedByModeration: false,
    estimatedTotalCost: 8500,
    estimatedTotalDuration: 240,
    peopleCount: 2,
    estimatedCostPerPerson: 4250,
    activityCount: 1,
    status: { key: "confirmed", name: "Confirmado" },

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
  listOutings.mockResolvedValue({
    data: [],
    pagination: { page: 1, total: 0, totalPages: 0 },
  });
  createOuting.mockResolvedValue(outingCreation({ id: 40 }));
  getPlanExperiences.mockResolvedValue({
    data: [],
    pagination: { page: 1, limit: 6, total: 0, totalPages: 0 },
    summary: {
      averageRating: 0,
      experienceCount: 0,
      photoCount: 0,
      photos: [],
    },
  });
});

describe("sharing by WhatsApp", () => {
  it("drops an owner's private detail after session revocation", async () => {
    getPlan.mockResolvedValue(
      plan({ visibility: "private", ownedByViewer: true }),
    );
    const view = render(<PlanDetailView planId={7} />);
    await screen.findByRole("heading", { name: "Tarde de vinos", level: 1 });
    getPlan.mockRejectedValue(
      new ApiError({ message: "Plan not found", type: "HTTP", status: 404 }),
    );
    useSession.mockReturnValue({ status: "anonymous", authenticated: false });
    view.rerender(<PlanDetailView planId={7} />);
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Tarde de vinos", level: 1 }),
      ).not.toBeInTheDocument(),
    );
  });

  it("reloads personal plan state when the authenticated account changes", async () => {
    useSession.mockReturnValue({ status: "authenticated", user: { id: 1 } });
    getPlan.mockResolvedValueOnce(
      plan({ viewerPlanState: "selected", activeOutingId: 40 }),
    );
    const view = render(<PlanDetailView planId={7} />);
    await screen.findByRole("heading", { name: "Tarde de vinos", level: 1 });
    getPlan.mockResolvedValueOnce(
      plan({ viewerPlanState: "selectable", activeOutingId: null }),
    );
    useSession.mockReturnValue({ status: "authenticated", user: { id: 2 } });
    view.rerender(<PlanDetailView planId={7} />);
    await waitFor(() => expect(getPlan).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole("button", { name: "Lo voy a hacer" }),
    ).toBeEnabled();
  });

  it("opens WhatsApp with the plan link for a published plan", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    getPlan.mockResolvedValue(plan());
    render(<PlanDetailView planId={7} />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Compartir por WhatsApp" }),
    );

    const [url] = open.mock.calls[0];
    expect(String(url)).toMatch(/^https:\/\/api\.whatsapp\.com\/send\?text=/);
    expect(decodeURIComponent(String(url))).toContain(
      `${window.location.origin}/plans/7`,
    );
    // Emojis travel percent-encoded, intact (✨ is E2 9C A8).
    expect(String(url)).toContain("%E2%9C%A8");
    open.mockRestore();
  });

  it("is not offered for a private plan", async () => {
    getPlan.mockResolvedValue(plan({ visibility: "private" }));
    render(<PlanDetailView planId={7} />);

    await screen.findByText("Tarde de vinos", { selector: "h1" });
    expect(
      screen.queryByRole("button", { name: "Compartir por WhatsApp" }),
    ).not.toBeInTheDocument();
  });
});

describe("reporting a plan (#156)", () => {
  it("reports someone else's published plan and keeps showing it", async () => {
    const user = userEvent.setup();
    reportContent.mockResolvedValue(undefined);
    getPlan.mockResolvedValue(plan());
    render(<PlanDetailView planId={7} />);

    await user.click(
      await screen.findByRole("button", { name: "Denunciar Tarde de vinos" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Denunciar plan" });
    await user.click(
      within(dialog).getByRole("radio", { name: "Spam o publicidad" }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Denunciar" }));

    expect(reportContent).toHaveBeenCalledWith({
      contentType: "plan",
      contentId: 7,
      reason: "spam",
    });
    expect(
      await screen.findByText("Gracias, lo vamos a revisar."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Plan denunciado" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("heading", { name: "Tarde de vinos", level: 1 }),
    ).toBeInTheDocument();
  });

  it("sends an anonymous visitor to sign in first", async () => {
    const user = userEvent.setup();
    useSession.mockReturnValue({ status: "anonymous", authenticated: false });
    getPlan.mockResolvedValue(plan());
    render(<PlanDetailView planId={7} />);

    await user.click(
      await screen.findByRole("button", { name: "Denunciar Tarde de vinos" }),
    );

    expect(push).toHaveBeenCalledWith(expect.stringContaining("/login"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is not offered to its author nor for a private plan", async () => {
    getPlan.mockResolvedValue(plan({ ownedByViewer: true }));
    const view = render(<PlanDetailView planId={7} />);
    await screen.findByRole("heading", { name: "Tarde de vinos", level: 1 });
    expect(
      screen.queryByRole("button", { name: /^Denunciar/ }),
    ).not.toBeInTheDocument();
    view.unmount();

    getPlan.mockResolvedValue(plan({ visibility: "private" }));
    render(<PlanDetailView planId={7} />);
    await screen.findByRole("heading", { name: "Tarde de vinos", level: 1 });
    expect(
      screen.queryByRole("button", { name: /^Denunciar/ }),
    ).not.toBeInTheDocument();
  });

  it("tells the author a removed plan cannot be published", async () => {
    getPlan.mockResolvedValue(
      plan({ visibility: "private", ownedByViewer: true }),
    );
    getOwnPlan.mockResolvedValue(
      ownPlan({ visibility: "private", removedByModeration: true }),
    );
    render(<PlanDetailView planId={7} />);

    expect(await screen.findByText("Dado de baja")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Publicar/ }),
    ).not.toBeInTheDocument();
  });
});

it("shows unrated plans and itinerary stops without fabricated zero scores", async () => {
  const unrated = plan({ averageRating: 0 });
  if (!unrated.details[0].activity)
    throw new Error("The fixture needs an activity");
  unrated.details[0].activity.averageRating = 0;
  unrated.details[0].activity.ratingCount = 0;
  getPlan.mockResolvedValue(unrated);
  render(<PlanDetailView planId={7} />);
  expect(await screen.findAllByText("Sin reseñas")).toHaveLength(2);
  expect(screen.queryByText("0.0")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("img", { name: "0 de 5 estrellas" }),
  ).not.toBeInTheDocument();
});

it("labels stale prices on public community plans and hides their old total", async () => {
  const communityPlan = plan();
  communityPlan.details[0].price = {
    kind: "FIXED",
    min: 8500,
    max: 8500,
    unit: "PER_PERSON",
    currency: "ARS",
    source: "CURATED",
    sourceRef: "https://example.test/old-price",
    verifiedAt: "2026-01-05T00:00:00.000Z",
    confidence: "HIGH",
    stale: true,
  };
  getPlan.mockResolvedValue(communityPlan);
  render(<PlanDetailView planId={7} />);

  expect(await screen.findByText("Precios a confirmar")).toBeInTheDocument();
  expect(screen.getByText("Valores a confirmar")).toBeInTheDocument();
  expect(
    screen.getByText(/Precio de referencia de enero de 2026/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/conserva los valores registrados al compartirlo/),
  ).toBeInTheDocument();
});

async function renderDetail(
  viewerPlanState: ViewerPlanState,
  overrides: Partial<PlanDetailResult> = {},
  statusKey: PlanStatusKey = "confirmed",
) {
  getPlan.mockResolvedValue(
    plan({
      viewerPlanState,
      status: { key: statusKey, name: "x" },
      ...overrides,
    }),
  );
  render(<PlanDetailView planId={7} />);
  await screen.findByRole("heading", { name: "Tarde de vinos", level: 1 });
}

const intendButton = { name: /^lo voy a hacer$/i } as const;

it("keeps incomplete experiences and unconfirmed costs visible on direct detail visits", async () => {
  await renderDetail("selectable", {
    insight: {
      role: "BEST",
      roleLabel: "La mejor opción",
      why: "Cena",
      difference: null,
      uncertainties: [
        "Falta planificar cine con información suficiente",
        "Precio sin confirmar",
      ],
      budgetStatus: "UNKNOWN",
      travelMinutes: null,
      travelKm: null,
      stops: [],
    },
  });
  expect(
    screen.getByRole("region", { name: "Antes de elegir este plan" }),
  ).toHaveTextContent("Falta planificar cine");
  expect(screen.getByText("Precio sin confirmar")).toBeVisible();
});

describe("PlanDetailView — Lo voy a hacer (CU22, PAN 17, #130)", () => {
  it("offers 'Lo voy a hacer' when the viewer can choose the plan", async () => {
    await renderDetail("selectable");

    expect(screen.getByRole("button", intendButton)).toBeEnabled();
  });

  it("sends someone without a session to log in before choosing the plan", async () => {
    useSession.mockReturnValue({ status: "anonymous", authenticated: false });
    const user = userEvent.setup();
    await renderDetail("selectable");

    await user.click(screen.getByRole("button", intendButton));

    expect(push).toHaveBeenCalledWith("/login?redirect=%2Fplans%2F7");
    expect(createOuting).not.toHaveBeenCalled();
  });

  it("adds the plan to Mis salidas once and links to the new outing", async () => {
    const user = userEvent.setup();
    await renderDetail("selectable");

    await user.click(screen.getByRole("button", intendButton));

    expect(
      await screen.findByText("Agregado a Mis salidas"),
    ).toBeInTheDocument();
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
    expect(
      screen.getByRole("link", { name: /editar plan/i }),
    ).toBeInTheDocument();
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

  it("prepares a private editable copy before the owner may publish a generated result", async () => {
    copyGeneratedPlan.mockResolvedValue(
      ownPlan({ id: 9, visibility: "private" }),
    );
    await renderDetail("selectable", {
      kind: "generated",
      ownedByViewer: true,
      visibility: "private",
    });

    expect(
      screen.queryByRole("button", { name: /publicar/i }),
    ).not.toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Preparar para compartir" }));
    await waitFor(() => expect(copyGeneratedPlan).toHaveBeenCalledWith(7));
    expect(push).toHaveBeenCalledWith("/plans/9?from=%2Fplans");
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
      await screen.findByRole("region", {
        name: "Cómo les fue a quienes lo hicieron",
      }),
    ).toBeInTheDocument();
    expect(getPlanExperiences).toHaveBeenCalledWith(7, { page: 1, limit: 6 });
  });

  it("has no community section on a private plan", async () => {
    await renderDetail("selectable", {
      visibility: "private",
      ownedByViewer: true,
    });

    expect(
      screen.queryByRole("region", {
        name: "Cómo les fue a quienes lo hicieron",
      }),
    ).not.toBeInTheDocument();
    expect(getPlanExperiences).not.toHaveBeenCalled();
  });

  it("has no community section on a cancelled plan", async () => {
    await renderDetail("view-only", {}, "cancelled");

    expect(
      screen.queryByRole("region", {
        name: "Cómo les fue a quienes lo hicieron",
      }),
    ).not.toBeInTheDocument();
    expect(getPlanExperiences).not.toHaveBeenCalled();
  });
});

it.each(["/", "/explore", "/plans", "/favorites", "/plan-requests/42"])(
  "returns to its explicit origin %s",
  async (returnTo) => {
    getPlan.mockResolvedValue(plan());
    render(<PlanDetailView planId={7} returnTo={returnTo} />);
    const label = returnTo.startsWith("/plan-requests/")
      ? "Volver a los resultados"
      : "Volver";
    expect(await screen.findByRole("link", { name: label })).toHaveAttribute(
      "href",
      returnTo,
    );
  },
);

it("returns direct visitors to Explore", async () => {
  getPlan.mockResolvedValue(plan());
  render(<PlanDetailView planId={7} />);
  expect(await screen.findByRole("link", { name: "Volver" })).toHaveAttribute(
    "href",
    "/explore",
  );
});

it("keeps the results destination when the plan no longer exists", async () => {
  getPlan.mockRejectedValue(
    new ApiError({ type: "HTTP", status: 404, message: "Missing" }),
  );
  render(<PlanDetailView planId={7} returnTo="/plan-requests/42" />);
  expect(
    await screen.findByRole("link", { name: "Volver a los resultados" }),
  ).toHaveAttribute("href", "/plan-requests/42");
});

it("shares the canonical plan URL without navigation context", async () => {
  const user = userEvent.setup();
  const writeText = vi
    .spyOn(navigator.clipboard, "writeText")
    .mockResolvedValue();
  window.history.replaceState(null, "", "/plans/7?from=%2Fplan-requests%2F42");
  getPlan.mockResolvedValue(plan());
  render(<PlanDetailView planId={7} returnTo="/plan-requests/42" />);
  await user.click(await screen.findByRole("button", { name: "Compartir" }));
  expect(writeText).toHaveBeenCalledWith(
    new URL("/plans/7", window.location.origin).href,
  );
  window.history.replaceState(null, "", "/");
});

it("edits a shared experience on the original plan and refreshes the public summary", async () => {
  const user = userEvent.setup();
  const feedback = {
    id: 3,
    rating: 4,
    tags: [],
    comment: "Antes",
    actualCost: null,
    actualDuration: null,
    shared: true,
    commentHidden: false,
    createdAt: "2026-10-19T12:00:00Z",
  };
  listOutings.mockResolvedValue({
    data: [outingDetail({ feedback })],
    pagination: { page: 1, totalPages: 1, total: 1 },
  });
  updateFeedback.mockResolvedValue({
    ...feedback,
    rating: 5,
    comment: "Excelente",
  });
  await renderDetail("selectable", { visibility: "public" });
  await user.click(
    await screen.findByRole("button", { name: "Editar tu valoración" }),
  );
  const dialog = screen.getByRole("dialog");
  const comment = within(dialog).getByRole("textbox", {
    name: "Tu comentario",
  });
  await user.clear(comment);
  await user.type(comment, "Excelente");
  await user.click(within(dialog).getAllByRole("radio")[4]);
  getPlan.mockResolvedValue(plan({ visibility: "public", averageRating: 5 }));
  await user.click(
    within(dialog).getByRole("button", { name: "Guardar cambios" }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(await screen.findByText("“Excelente”")).toBeInTheDocument();
  expect(await screen.findByText("5.0")).toBeInTheDocument();
  expect(updateFeedback).toHaveBeenCalledWith(40, {
    rating: 5,
    comment: "Excelente",
  });
  expect(getPlanExperiences.mock.calls.length).toBeGreaterThan(1);
});


it("uses home preparation copy in the generated plan detail", async () => {
  const home = plan({ readiness: { stage: "READY", ready: true, label: "Listo", summary: "Listo", verifiedStops: 1, totalStops: 1, tasks: [] } });
  const activity = home.details[0].activity;
  if (!activity) throw new Error("Expected the activity fixture");
  activity.locations = [{ id: 1, atHome: true, latitude: null, longitude: null, notes: null,
    place: { id: 1, name: "Hogar", kind: "home", description: null, address: "", department: null } }];
  getPlan.mockResolvedValue(home);
  render(<PlanDetailView planId={7} />);
  expect(await screen.findByRole("heading", { name: "Todo listo para empezar" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Antes de salir" })).not.toBeInTheDocument();
});
