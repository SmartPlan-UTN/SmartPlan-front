import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type {
  OwnPlanDetail,
  PlanDetailResult,
  PlanFeedback,
  PlanStatusKey,
  ViewerPlanState,
} from "@/types";

import { PlanDetailView } from "./PlanDetailView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const useSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/auth")>()),
  useSession,
}));

const getPlan = vi.hoisted(() => vi.fn());
const getOwnPlan = vi.hoisted(() => vi.fn());
const selectPlan = vi.hoisted(() => vi.fn());
const deselectPlan = vi.hoisted(() => vi.fn());
const submitFeedback = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getPlan,
  getOwnPlan,
  selectPlan,
  deselectPlan,
  submitFeedback,
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
    status: { key: "completed", name: "Realizado" },
    completedAt: "2026-08-12T00:00:00.000Z",
    feedbackState: "not_available",
    feedback: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
    details: [],
    ...overrides,
  };
}

const OWN_FEEDBACK: PlanFeedback = {
  rating: 4,
  tags: ["would_recommend"],
  comment: "La segunda bodega quedaba lejos.",
  actualCost: 9200,
  actualDuration: null,
  createdAt: "2026-08-14T00:00:00.000Z",
};

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
    status: { key: "generated", name: "Generado" },
    viewerPlanState: "selectable",
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
  // Default: caller is not the owner → no feedback section.
  getOwnPlan.mockRejectedValue(
    new ApiError({ message: "x", type: "HTTP", status: 403 }),
  );
  submitFeedback.mockResolvedValue(OWN_FEEDBACK);
  selectPlan.mockResolvedValue({
    id: 7,
    planRequestId: 3,
    status: { key: "selected", name: "Elegido" },
  });
  deselectPlan.mockResolvedValue({
    id: 7,
    planRequestId: 3,
    status: { key: "generated", name: "Generado" },
  });
});

async function renderDetail(
  viewerPlanState: ViewerPlanState,
  statusKey: PlanStatusKey = "generated",
) {
  getPlan.mockResolvedValue(
    plan({ viewerPlanState, status: { key: statusKey, name: "x" } }),
  );
  render(<PlanDetailView planId={7} />);
  await screen.findByRole("heading", { name: "Tarde de vinos", level: 1 });
}

// One toggle, one label in both states — `aria-pressed` tells them apart.
const intendButton = { name: /^lo voy a hacer$/i } as const;

describe("PlanDetailView — plan intent (CU22, PAN 17)", () => {
  it("offers the intent toggle when the viewer can act, and shows no status pill", async () => {
    await renderDetail("selectable");

    expect(screen.getByRole("button", intendButton)).toBeInTheDocument();
    // `generated`/`selected` carry no pill — a stranger must not see intent.
    expect(screen.queryByText("Propuesta")).not.toBeInTheDocument();
    expect(screen.queryByText("Elegido")).not.toBeInTheDocument();
  });

  it("keeps the label and marks the toggle pressed once resolved", async () => {
    await renderDetail("selected", "selected");

    const toggle = screen.getByRole("button", intendButton);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText(/tu plan elegido/i)).not.toBeInTheDocument();
  });

  it("shows only the domain status for a view-only viewer — no CTA", async () => {
    await renderDetail("view-only", "confirmed");

    expect(screen.getByText("Confirmado")).toBeInTheDocument();
    expect(screen.queryByRole("button", intendButton)).not.toBeInTheDocument();
  });

  it("shows a personal record for a completed plan the viewer marked — no toggle", async () => {
    await renderDetail("selected", "completed");

    expect(screen.getByText("Hiciste este plan")).toBeInTheDocument();
    expect(screen.queryByRole("button", intendButton)).not.toBeInTheDocument();
  });

  it("toggles the save control between its two states without breaking", async () => {
    const user = userEvent.setup();
    await renderDetail("selectable");

    await user.click(screen.getByRole("button", { name: /guardar plan/i }));
    expect(
      screen.getByRole("button", { name: /^guardado$/i }),
    ).toBeInTheDocument();
  });

  it("marks the plan with one direct PATCH — no modal", async () => {
    const user = userEvent.setup();
    await renderDetail("selectable");

    await user.click(screen.getByRole("button", intendButton));

    await waitFor(() =>
      expect(screen.getByRole("button", intendButton)).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(selectPlan).toHaveBeenCalledOnce();
    expect(selectPlan).toHaveBeenCalledWith(7);
  });

  it("un-marks the plan by clicking the toggle again — one direct DELETE", async () => {
    const user = userEvent.setup();
    await renderDetail("selected", "selected");

    await user.click(screen.getByRole("button", intendButton));

    await waitFor(() =>
      expect(screen.getByRole("button", intendButton)).toHaveAttribute(
        "aria-pressed",
        "false",
      ),
    );
    expect(deselectPlan).toHaveBeenCalledOnce();
    expect(deselectPlan).toHaveBeenCalledWith(7);
  });

  it("reconciles from the server when the request already advanced (409)", async () => {
    selectPlan.mockRejectedValue(
      new ApiError({
        message: "x",
        type: "HTTP",
        status: 409,
        code: "PLAN_REQUEST_ALREADY_ADVANCED",
      }),
    );
    getPlan
      .mockResolvedValueOnce(plan({ viewerPlanState: "selectable" }))
      .mockResolvedValueOnce(
        plan({
          viewerPlanState: "view-only",
          status: { key: "confirmed", name: "Confirmado" },
        }),
      );
    const user = userEvent.setup();
    render(<PlanDetailView planId={7} />);
    await screen.findByRole("button", intendButton);

    await user.click(screen.getByRole("button", intendButton));

    await waitFor(() =>
      expect(screen.getByText("Confirmado")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", intendButton)).not.toBeInTheDocument();
    expect(getPlan).toHaveBeenCalledTimes(2);
  });

  it("reports a network error and leaves the toggle as it was", async () => {
    selectPlan.mockRejectedValue(
      new ApiError({ message: "sin red", type: "NETWORK" }),
    );
    const user = userEvent.setup();
    await renderDetail("selectable");

    await user.click(screen.getByRole("button", intendButton));

    await waitFor(() =>
      expect(
        screen.getByText(/no pudimos guardar el cambio/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", intendButton)).toBeInTheDocument();
    expect(getPlan).toHaveBeenCalledTimes(1);
  });
});

describe("PlanDetailView — feedback (CU23, PAN 17)", () => {
  it("shows the feedback invite when the owner can rate a finished plan", async () => {
    getPlan.mockResolvedValue(
      plan({ status: { key: "completed", name: "Realizado" } }),
    );
    getOwnPlan.mockResolvedValue(ownPlan({ feedbackState: "available" }));
    render(<PlanDetailView planId={7} />);

    expect(
      await screen.findByText(/contanos tu experiencia/i),
    ).toBeInTheDocument();
  });

  it("renders the read-only experience once feedback exists", async () => {
    getPlan.mockResolvedValue(
      plan({ status: { key: "completed", name: "Realizado" } }),
    );
    getOwnPlan.mockResolvedValue(
      ownPlan({ feedbackState: "submitted", feedback: OWN_FEEDBACK }),
    );
    render(<PlanDetailView planId={7} />);

    expect(await screen.findByText(/tu experiencia/i)).toBeInTheDocument();
    expect(screen.getByText(/muy bueno/i)).toBeInTheDocument();
    expect(
      screen.getByText(/la segunda bodega quedaba lejos/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/contanos tu experiencia/i),
    ).not.toBeInTheDocument();
  });

  it("shows nothing feedback-related when the plan is not yet available", async () => {
    getPlan.mockResolvedValue(
      plan({ status: { key: "completed", name: "Realizado" } }),
    );
    getOwnPlan.mockResolvedValue(ownPlan({ feedbackState: "not_available" }));
    render(<PlanDetailView planId={7} />);

    await screen.findByRole("heading", { name: "Tarde de vinos", level: 1 });
    expect(
      screen.queryByText(/contanos tu experiencia/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/tu experiencia/i)).not.toBeInTheDocument();
  });

  it("flips to the read-only experience after submitting", async () => {
    getPlan.mockResolvedValue(
      plan({ status: { key: "completed", name: "Realizado" } }),
    );
    getOwnPlan.mockResolvedValue(ownPlan({ feedbackState: "available" }));
    const user = userEvent.setup();
    render(<PlanDetailView planId={7} />);

    const stars = await screen.findAllByRole("radio");
    await user.click(stars[3]);
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: /enviar opinión/i }),
    );

    await waitFor(
      () => expect(screen.getByText(/tu experiencia/i)).toBeInTheDocument(),
      { timeout: 2500 },
    );
    expect(submitFeedback).toHaveBeenCalledWith(7, { rating: 4 });
  });

  it("reconciles the owner surface when feedback already exists", async () => {
    getPlan.mockResolvedValue(
      plan({ status: { key: "completed", name: "Realizado" } }),
    );
    getOwnPlan
      .mockResolvedValueOnce(ownPlan({ feedbackState: "available" }))
      .mockResolvedValueOnce(
        ownPlan({ feedbackState: "submitted", feedback: OWN_FEEDBACK }),
      );
    submitFeedback.mockRejectedValue(
      new ApiError({
        message: "already submitted",
        type: "HTTP",
        status: 409,
        code: "FEEDBACK_ALREADY_SUBMITTED",
      }),
    );
    const user = userEvent.setup();
    render(<PlanDetailView planId={7} />);

    const stars = await screen.findAllByRole("radio");
    await user.click(stars[3]);
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: /enviar opini/i,
      }),
    );

    await waitFor(() => expect(getOwnPlan).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/tu experiencia/i)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
