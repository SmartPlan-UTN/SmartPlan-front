import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { OwnPlanSummary, PaginatedResult, PlanFeedback } from "@/types";

import { HistoryView } from "./HistoryView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const getMyPlans = vi.hoisted(() => vi.fn());
const submitFeedback = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getMyPlans,
  submitFeedback,
}));

function plan(overrides: Partial<OwnPlanSummary> = {}): OwnPlanSummary {
  return {
    id: 1,
    title: "Tarde de vinos en Luján",
    description: null,
    estimatedTotalCost: 25000,
    estimatedTotalDuration: 180,
    peopleCount: 2,
    estimatedCostPerPerson: 12500,
    activityCount: 3,
    status: { key: "completed", name: "Realizado" },
    completedAt: "2026-08-12T00:00:00.000Z",
    feedbackState: "not_available",
    feedback: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
    ...overrides,
  };
}

function page(data: OwnPlanSummary[]): PaginatedResult<OwnPlanSummary> {
  return {
    data,
    pagination: { page: 1, limit: 12, total: data.length, totalPages: 1 },
  };
}

const FEEDBACK: PlanFeedback = {
  rating: 4,
  tags: ["would_recommend"],
  comment: null,
  actualCost: 28400,
  actualDuration: null,
  createdAt: "2026-08-14T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HistoryView (CU23 · PAN 13)", () => {
  it("shows the empty state when there are no plans", async () => {
    getMyPlans.mockResolvedValue(page([]));
    render(<HistoryView />);
    expect(
      await screen.findByText(/tus planes guardados aparecerán acá/i)
    ).toBeInTheDocument();
  });

  it("recovers from a load error with retry", async () => {
    getMyPlans.mockRejectedValueOnce(
      new ApiError({ message: "boom", type: "NETWORK" })
    );
    getMyPlans.mockResolvedValueOnce(page([plan()]));
    render(<HistoryView />);

    await userEvent.click(await screen.findByRole("button", { name: /reintentar/i }));
    expect(
      await screen.findByRole("heading", { name: /tarde de vinos/i })
    ).toBeInTheDocument();
  });

  it("offers the feedback invite only when feedback is available", async () => {
    getMyPlans.mockResolvedValue(
      page([
        plan({ id: 1, feedbackState: "available" }),
        plan({ id: 2, title: "Museo", feedbackState: "not_available" }),
        plan({
          id: 3,
          title: "Cena",
          status: { key: "cancelled", name: "Cancelado" },
          feedbackState: "not_available",
        }),
      ])
    );
    render(<HistoryView />);

    await screen.findByRole("heading", { name: /tarde de vinos/i });
    const cards = screen.getAllByRole("article");
    expect(within(cards[0]).getByText(/contanos tu experiencia/i)).toBeInTheDocument();
    expect(
      within(cards[1]).queryByText(/contanos tu experiencia/i)
    ).not.toBeInTheDocument();
    expect(
      within(cards[2]).queryByText(/contanos tu experiencia/i)
    ).not.toBeInTheDocument();
  });

  it("shows the rated line for a submitted plan", async () => {
    getMyPlans.mockResolvedValue(
      page([plan({ feedbackState: "submitted", feedback: FEEDBACK })])
    );
    render(<HistoryView />);

    expect(await screen.findByText(/muy bueno/i)).toBeInTheDocument();
    expect(screen.getByText(/gastados/i)).toHaveTextContent(/28\.400.*gastados/);
    expect(
      screen.queryByText(/contanos tu experiencia/i)
    ).not.toBeInTheDocument();
  });

  it("hides the invite after 'Ahora no' and flips to rated after submitting", async () => {
    getMyPlans.mockResolvedValue(
      page([plan({ id: 9, feedbackState: "available" })])
    );
    submitFeedback.mockResolvedValue(FEEDBACK);
    render(<HistoryView />);

    await screen.findByRole("heading", { name: /tarde de vinos/i });

    // Open the dialog from the invite's mini stars, submit a rating.
    const inviteStars = screen.getAllByRole("radio").slice(0, 5);
    await userEvent.click(inviteStars[3]);
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: /enviar opinión/i })
    );

    await waitFor(
      () => expect(screen.getByText(/muy bueno/i)).toBeInTheDocument(),
      { timeout: 2500 }
    );
    expect(
      screen.queryByText(/contanos tu experiencia/i)
    ).not.toBeInTheDocument();
  });

  it("reconciles the card when the feedback was already submitted", async () => {
    getMyPlans
      .mockResolvedValueOnce(page([plan({ feedbackState: "available" })]))
      .mockResolvedValueOnce(
        page([plan({ feedbackState: "submitted", feedback: FEEDBACK })])
      );
    submitFeedback.mockRejectedValue(
      new ApiError({
        message: "already submitted",
        type: "HTTP",
        status: 409,
        code: "FEEDBACK_ALREADY_SUBMITTED",
      })
    );
    const user = userEvent.setup();
    render(<HistoryView />);

    const inviteStars = await screen.findAllByRole("radio");
    await user.click(inviteStars[3]);
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: /enviar opini/i,
      })
    );

    await waitFor(() => expect(getMyPlans).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/muy bueno/i)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
