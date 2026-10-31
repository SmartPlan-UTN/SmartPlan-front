import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  approveCatalogCandidate,
  bulkApproveCatalogCandidates,
  discardCatalogCandidate,
  getCatalogCandidate,
  getCatalogCandidateCounts,
  listCatalogCandidates,
  listCities,
  listDepartments,
  updateCatalogCandidate,
} from "@/lib/api";
import type { CatalogCandidateDetail, CatalogCandidateSummary } from "@/types";

import { AdminCatalogCandidatesView } from "./AdminCatalogCandidatesView";

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  approveCatalogCandidate: vi.fn(),
  bulkApproveCatalogCandidates: vi.fn(),
  discardCatalogCandidate: vi.fn(),
  getCatalogCandidate: vi.fn(),
  getCatalogCandidateCounts: vi.fn(),
  listCatalogCandidates: vi.fn(),
  listCities: vi.fn(),
  listDepartments: vi.fn(),
  listAdminPlaces: vi.fn(),
  updateCatalogCandidate: vi.fn(),
}));

const session = vi.hoisted(() => ({ permissions: ["catalog.review"] as string[] }));
vi.mock("@/lib/auth", () => ({
  useSession: () => ({
    status: "authenticated",
    authenticated: true,
    user: {
      id: 1,
      name: "Admin",
      lastName: "SmartPlan",
      email: "admin@example.com",
      role: { key: "admin", name: "Administrador" },
      permissions: session.permissions,
    },
  }),
}));

function candidate(overrides: Partial<CatalogCandidateSummary> = {}): CatalogCandidateSummary {
  return {
    id: 7,
    entityType: "activity",
    status: "pending",
    origin: "initial_load",
    name: "Cata de tres vinos en Bodega X",
    description: "Degustación guiada en la cava.",
    place: { id: 4, slug: "bodega-x", name: "Bodega X", kind: "winery", departmentName: "Maipú" },
    price: {
      kind: "FROM",
      min: 15000,
      max: null,
      unit: "PER_PERSON",
      source: "OFFICIAL",
      sourceRef: "https://bodegax.test/tarifas",
      verifiedAt: "2026-10-01T00:00:00.000Z",
    },
    occasions: ["romantic", "friends", "quiet"],
    durationMinutes: 90,
    minPeople: 2,
    maxPeople: 12,
    notes: ["source_unverified", "possible_duplicate_of:bodega-x-degustacion"],
    sourceRefs: [{ url: "https://bodegax.test/experiencias", checkedAt: "2026-10-01" }],
    createdAt: "2026-10-20T10:00:00.000Z",
    reviewedAt: null,
    discardReason: null,
    appliedEntityId: null,
    ...overrides,
  };
}

function detail(base = candidate()): CatalogCandidateDetail {
  return {
    ...base,
    payload: { ...base, minAge: 18 },
    originalPayload: { ...base },
    changedFields: ["occasions"],
    existingActivities: [{ id: 3, slug: "bodega-x-visita", name: "Visita a Bodega X", type: "winery_tour", occasions: [] }],
    model: "agent:claude",
  };
}

function page(data: CatalogCandidateSummary[]) {
  return { data, pagination: { page: 1, limit: 20, total: data.length, totalPages: 1 } };
}

describe("AdminCatalogCandidatesView (RF44, CU50)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.permissions = ["catalog.review"];
    vi.mocked(listCatalogCandidates).mockResolvedValue(page([candidate()]));
    vi.mocked(getCatalogCandidateCounts).mockResolvedValue({
      byStatus: { pending: 5, approved: 2, discarded: 1 },
      pendingByOrigin: { initial_load: 4, monthly_refresh: 1, manual: 0 },
    });
    vi.mocked(listCities).mockResolvedValue({ data: [{ id: 1, name: "Mendoza" }], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } });
    vi.mocked(listDepartments).mockResolvedValue({ data: [{ id: 6, name: "Maipú" }], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } });
  });

  it("shows each proposal with its place, price source, occasions and warnings", async () => {
    render(<AdminCatalogCandidatesView />);

    const card = await screen.findByRole("article", { name: "Candidato: Cata de tres vinos en Bodega X" });
    expect(within(card).getByText(/Bodega X · Maipú/)).toBeInTheDocument();
    expect(within(card).getByText(/Desde \$\s?15\.000 por persona/)).toBeInTheDocument();
    expect(within(card).getByText(/fuente oficial · verificado el 1\/10\/2026/)).toBeInTheDocument();
    expect(within(card).getByText("2 a 12 personas")).toBeInTheDocument();
    expect(within(card).getByRole("list", { name: /Ideal para: En pareja, Con amigos, Tranquilo/ })).toBeInTheDocument();
    expect(within(card).getByText("Fuente sin verificar")).toBeInTheDocument();
    expect(within(card).getByText("Posible duplicado de bodega-x-degustacion")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Pendientes\s*5/ })).toHaveAttribute("aria-selected", "true");
  });

  it("asks only for pending candidates and filters by origin", async () => {
    const user = userEvent.setup();
    render(<AdminCatalogCandidatesView />);
    await screen.findByRole("article", { name: /Candidato:/ });
    expect(listCatalogCandidates).toHaveBeenLastCalledWith(expect.objectContaining({ status: "pending", page: 1 }));

    await user.click(screen.getByRole("button", { name: "Origen" }));
    await user.click(screen.getByRole("option", { name: "Proceso mensual" }));
    await waitFor(() =>
      expect(listCatalogCandidates).toHaveBeenLastCalledWith(expect.objectContaining({ origin: "monthly_refresh" })),
    );
  });

  it("approves a candidate and reloads the counts", async () => {
    const user = userEvent.setup();
    vi.mocked(approveCatalogCandidate).mockResolvedValue({ id: 7, appliedEntityId: 90 });
    render(<AdminCatalogCandidatesView />);
    await user.click(await screen.findByRole("button", { name: "Aprobar Cata de tres vinos en Bodega X" }));

    expect(approveCatalogCandidate).toHaveBeenCalledWith(7, false);
    await waitFor(() => expect(getCatalogCandidateCounts).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Aprobado: Cata de tres vinos en Bodega X.")).toBeInTheDocument();
  });

  it("offers to approve anyway on a possible duplicate", async () => {
    const user = userEvent.setup();
    vi.mocked(approveCatalogCandidate)
      .mockRejectedValueOnce(
        new ApiError({
          message: "duplicate",
          type: "HTTP",
          status: 409,
          code: "CANDIDATE_POSSIBLE_DUPLICATE",
          data: { duplicates: ["bodega-x-degustacion"] },
        }),
      )
      .mockResolvedValueOnce({ id: 7, appliedEntityId: 90 });
    render(<AdminCatalogCandidatesView />);
    await user.click(await screen.findByRole("button", { name: "Aprobar Cata de tres vinos en Bodega X" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("bodega-x-degustacion");
    await user.click(within(dialog).getByRole("button", { name: "Aprobar igual" }));
    expect(approveCatalogCandidate).toHaveBeenLastCalledWith(7, true);
  });

  it("requires a reason to discard", async () => {
    const user = userEvent.setup();
    vi.mocked(discardCatalogCandidate).mockResolvedValue(undefined);
    render(<AdminCatalogCandidatesView />);
    await user.click(await screen.findByRole("button", { name: "Descartar Cata de tres vinos en Bodega X" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Descartar" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Ingresá el motivo del descarte.");
    expect(discardCatalogCandidate).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(/Motivo del descarte/), "El lugar no ofrece catas");
    await user.click(within(dialog).getByRole("button", { name: "Descartar" }));
    expect(discardCatalogCandidate).toHaveBeenCalledWith(7, "El lugar no ofrece catas");
  });

  it("approves several candidates of the same place together", async () => {
    const user = userEvent.setup();
    const second = candidate({ id: 8, name: "Almuerzo en Bodega X" });
    const elsewhere = candidate({
      id: 9,
      name: "Paseo en el parque",
      place: { id: 5, slug: "parque", name: "Parque", kind: "park", departmentName: "Ciudad de Mendoza" },
    });
    vi.mocked(listCatalogCandidates).mockResolvedValue(page([candidate(), second, elsewhere]));
    vi.mocked(bulkApproveCatalogCandidates).mockResolvedValue({
      results: [
        { id: 7, status: "approved", appliedEntityId: 90 },
        { id: 8, status: "possible_duplicate" },
      ],
    });
    render(<AdminCatalogCandidatesView />);

    await user.click(await screen.findByRole("checkbox", { name: "Seleccionar Cata de tres vinos en Bodega X" }));
    expect(screen.getByRole("checkbox", { name: "Seleccionar Paseo en el parque" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Seleccionar Almuerzo en Bodega X" }));
    await user.click(screen.getByRole("button", { name: "Aprobar seleccionados" }));

    expect(bulkApproveCatalogCandidates).toHaveBeenCalledWith([7, 8]);
    expect(await screen.findByText(/1 aprobados, 1 posibles duplicados/)).toBeInTheDocument();
  });

  it("shows field errors from the backend in the edit form", async () => {
    const user = userEvent.setup();
    vi.mocked(getCatalogCandidate).mockResolvedValue(detail());
    vi.mocked(updateCatalogCandidate).mockRejectedValue(
      new ApiError({
        message: "invalid",
        type: "HTTP",
        status: 400,
        code: "VALIDATION_FAILED",
        data: { errors: [{ field: "durationMinutes", messages: ["invalid_duration"] }] },
      }),
    );
    render(<AdminCatalogCandidatesView />);
    await user.click(await screen.findByRole("button", { name: "Editar Cata de tres vinos en Bodega X" }));

    const dialog = await screen.findByRole("dialog", { name: "Editar candidato" });
    await user.click(within(dialog).getByRole("button", { name: "Tranquilo" }));
    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    expect(updateCatalogCandidate).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ occasions: ["romantic", "friends"], minAge: 18 }),
    );
    expect(await within(dialog).findByText("La duración tiene que ser un número entero de minutos.")).toBeInTheDocument();
  });

  it("shows what the place already offers and what review changed", async () => {
    const user = userEvent.setup();
    vi.mocked(getCatalogCandidate).mockResolvedValue(detail());
    render(<AdminCatalogCandidatesView />);
    await user.click(await screen.findByRole("button", { name: /Ver detalle/ }));

    expect(await screen.findByText(/ocasiones/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Visita a Bodega X" })).toBeInTheDocument();
  });

  it("offers a retry when the queue cannot load", async () => {
    const user = userEvent.setup();
    vi.mocked(listCatalogCandidates).mockRejectedValueOnce(new Error("down"));
    render(<AdminCatalogCandidatesView />);

    expect(await screen.findByText("No pudimos cargar los candidatos")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("article", { name: /Candidato:/ })).toBeInTheDocument();
  });

  it("is closed to administrators without catalog.review", () => {
    session.permissions = [];
    render(<AdminCatalogCandidatesView />);
    expect(screen.getByText("Sin acceso a la cola")).toBeInTheDocument();
    expect(listCatalogCandidates).not.toHaveBeenCalled();
  });
});
