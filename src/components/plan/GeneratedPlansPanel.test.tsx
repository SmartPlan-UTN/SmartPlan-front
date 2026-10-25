import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { copyGeneratedPlan, listGeneratedPlans } from "@/lib/api";
import { generatedPlansRoute, planDetailRoute } from "@/lib/routes";
import type { GeneratedPlanSummary, OwnPlanDetail } from "@/types";

import { GeneratedPlansPanel } from "./GeneratedPlansPanel";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  listGeneratedPlans: vi.fn(),
  copyGeneratedPlan: vi.fn(),
}));

const result: GeneratedPlanSummary = {
  id: 10,
  title: "Tarde en Mendoza",
  description: "Una idea guardada",
  visibility: "private",
  removedByModeration: false,
  estimatedTotalCost: 12000,
  estimatedTotalDuration: 90,
  peopleCount: 2,
  estimatedCostPerPerson: 6000,
  activityCount: 2,
  status: { key: "generated", name: "Generado" },
  createdAt: "2026-10-10T15:00:00Z",
  updatedAt: "2026-10-10T15:00:00Z",
  planRequestId: 7,
  editablePlanId: null,
};
function resolveWith(data: GeneratedPlanSummary[] = [result], totalPages = 3) {
  vi.mocked(listGeneratedPlans).mockResolvedValue({
    data,
    pagination: { page: 1, limit: 12, total: 25, totalPages },
  });
}

describe("Generated plan history (CU17, CU25, CU29)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveWith();
  });

  it("reopens saved results with their history page as the return destination", async () => {
    render(<GeneratedPlansPanel page={2} onPageChange={vi.fn()} />);
    expect(
      await screen.findByRole("link", { name: result.title }),
    ).toHaveAttribute("href", planDetailRoute(10, generatedPlansRoute(2)));
    expect(
      screen.getByRole("link", { name: "Volver a abrir" }),
    ).toHaveAttribute("href", planDetailRoute(10, generatedPlansRoute(2)));
    expect(listGeneratedPlans).toHaveBeenCalledWith({
      page: 2,
      limit: 12,
      sortBy: "createdAt",
      direction: "desc",
    });
    expect(screen.getByText("2 actividades")).toBeInTheDocument();
  });

  it("paginates beyond the five recent searches", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<GeneratedPlansPanel page={2} onPageChange={onPageChange} />);
    await screen.findByText(result.title);
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole("button", { name: "Página anterior" }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it("creates an editable copy and opens it in the existing editor", async () => {
    const user = userEvent.setup();
    vi.mocked(copyGeneratedPlan).mockResolvedValue({ id: 20 } as OwnPlanDetail);
    render(<GeneratedPlansPanel page={1} onPageChange={vi.fn()} />);
    await user.click(
      await screen.findByRole("button", {
        name: `Editar una copia de ${result.title}`,
      }),
    );
    expect(copyGeneratedPlan).toHaveBeenCalledWith(10);
    expect(push).toHaveBeenCalledWith("/plans/20/edit");
    expect(screen.getByRole("link", { name: "Ver mi copia" })).toHaveAttribute(
      "href",
      planDetailRoute(20, generatedPlansRoute()),
    );
  });

  it("offers the existing copy and rechecks it on the server before resuming", async () => {
    const user = userEvent.setup();
    resolveWith([{ ...result, editablePlanId: 20 }]);
    vi.mocked(copyGeneratedPlan).mockResolvedValue({ id: 20 } as OwnPlanDetail);
    render(<GeneratedPlansPanel page={1} onPageChange={vi.fn()} />);
    await user.click(
      await screen.findByRole("button", {
        name: `Continuar editando ${result.title}`,
      }),
    );
    expect(copyGeneratedPlan).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/plans/20/edit");
  });

  it("blocks duplicate clicks while a copy is being created", async () => {
    const user = userEvent.setup();
    let finish!: (value: OwnPlanDetail) => void;
    vi.mocked(copyGeneratedPlan).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(<GeneratedPlansPanel page={1} onPageChange={vi.fn()} />);
    const edit = await screen.findByRole("button", {
      name: `Editar una copia de ${result.title}`,
    });
    await user.dblClick(edit);
    expect(copyGeneratedPlan).toHaveBeenCalledTimes(1);
    expect(edit).toBeDisabled();
    finish({ id: 20 } as OwnPlanDetail);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/plans/20/edit"));
  });

  it("keeps the original accessible when copying fails and allows retry", async () => {
    const user = userEvent.setup();
    vi.mocked(copyGeneratedPlan)
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValueOnce({ id: 20 } as OwnPlanDetail);
    render(<GeneratedPlansPanel page={1} onPageChange={vi.fn()} />);
    const edit = await screen.findByRole("button", {
      name: `Editar una copia de ${result.title}`,
    });
    await user.click(edit);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "tu plan original sigue guardado",
    );
    expect(
      screen.getByRole("link", { name: "Volver a abrir" }),
    ).toBeInTheDocument();
    await user.click(edit);
    expect(push).toHaveBeenCalledWith("/plans/20/edit");
  });

  it("shows loading, error and recovery states", async () => {
    const user = userEvent.setup();
    vi.mocked(listGeneratedPlans).mockRejectedValueOnce(
      new Error("Unavailable"),
    );
    render(<GeneratedPlansPanel page={1} onPageChange={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Cargando planes generados",
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos cargar tu historial",
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText(result.title)).toBeInTheDocument();
  });

  it("invites the user to generate their first plan when history is empty", async () => {
    resolveWith([], 0);
    render(<GeneratedPlansPanel page={1} onPageChange={vi.fn()} />);
    expect(
      await screen.findByText(/Todavía no generaste ningún plan/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Generar un plan" }),
    ).toHaveAttribute("href", "/");
  });

  it("lets the user recover from an empty out-of-range page", async () => {
    resolveWith([], 0);
    render(<GeneratedPlansPanel page={99} onPageChange={vi.fn()} />);
    expect(
      await screen.findByRole("link", {
        name: "Volver al inicio del historial",
      }),
    ).toHaveAttribute("href", generatedPlansRoute());
  });
});
