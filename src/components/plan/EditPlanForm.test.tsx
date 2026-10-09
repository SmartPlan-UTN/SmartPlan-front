import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  assistantImprove,
  assistantSearch,
  assistantSuggest,
  getActivity,
  getOwnPlan,
  listCategories,
  searchActivities,
  suggestActivities,
} from "@/lib/api";
import type { OwnPlanDetail } from "@/types";

import { EditPlanForm } from "./EditPlanForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getOwnPlan: vi.fn(),
    getActivity: vi.fn(),
    assistantSearch: vi.fn(),
    assistantSuggest: vi.fn(),
    assistantImprove: vi.fn(),
    searchActivities: vi.fn(),
    listCategories: vi.fn(),
    suggestActivities: vi.fn(),
  };
});

const plan: OwnPlanDetail = {
  id: 12,
  title: "Domingo entre viñas",
  description: "Un recorrido familiar",
  visibility: "public",
  peopleCount: 4,
  estimatedTotalCost: 18000,
  estimatedCostPerPerson: 4500,
  estimatedTotalDuration: 120,
  activityCount: 1,
  status: { key: "confirmed", name: "Confirmado" },
  completedAt: null,
  feedbackState: "not_available",
  feedback: null,
  createdAt: "2026-08-25T12:00:00.000Z",
  updatedAt: "2026-08-25T12:00:00.000Z",
  details: [{
    id: 101,
    order: 1,
    estimatedCost: 18000,
    estimatedDuration: 120,
    activity: { id: 42, name: "Bodega", description: "", estimatedCost: 25000, estimatedDuration: 180, type: "Bodega" },
  }],
};

describe("EditPlanForm entry point", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOwnPlan).mockResolvedValue(plan);
    vi.mocked(getActivity).mockRejectedValue(new Error("offline"));
    vi.mocked(assistantSearch).mockRejectedValue(new Error("off"));
    vi.mocked(assistantSuggest).mockRejectedValue(new Error("off"));
    vi.mocked(assistantImprove).mockRejectedValue(new Error("off"));
    vi.mocked(searchActivities).mockResolvedValue({ data: [], pagination: { page: 1, limit: 8, total: 0, totalPages: 0 } });
    vi.mocked(listCategories).mockResolvedValue({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } });
    vi.mocked(suggestActivities).mockResolvedValue({ data: [] });
  });

  it("loads existing metadata, visibility, and snapshot values into the shared composer", async () => {
    const user = userEvent.setup();
    render(<EditPlanForm planId={12} />);
    expect(await screen.findByLabelText(/Nombre del plan/)).toHaveValue("Domingo entre viñas");
    await user.click(screen.getByRole("button", { name: /Elegir actividades/ }));
    expect(screen.getByRole("list", { name: "Paradas en orden" })).toHaveTextContent("Bodega");
    await user.click(screen.getByRole("button", { name: /Revisar plan/ }));
    expect(screen.getByLabelText("Público")).toBeChecked();
    expect(getOwnPlan).toHaveBeenCalledWith(12);
  });

  it("keeps cancelled plans outside the composer", async () => {
    vi.mocked(getOwnPlan).mockResolvedValueOnce({ ...plan, status: { key: "cancelled", name: "Cancelado" } });
    render(<EditPlanForm planId={12} />);
    expect(await screen.findByText("El plan se encuentra cancelado")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nombre del plan/)).not.toBeInTheDocument();
  });
});
