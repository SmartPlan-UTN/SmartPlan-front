import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { PlanDetailResult, PlanStatusKey, ViewerPlanState } from "@/types";

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
const selectPlan = vi.hoisted(() => vi.fn());
const deselectPlan = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getPlan,
  selectPlan,
  deselectPlan,
}));

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
