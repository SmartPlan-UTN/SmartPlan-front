import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getContentReport,
  getContentReportCounts,
  listContentReports,
  resolveContentReport,
} from "@/lib/api";
import type { ContentReportsResult, ContentReportSummary } from "@/types";

import { AdminReportsView } from "./AdminReportsView";

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getContentReport: vi.fn(),
  getContentReportCounts: vi.fn(),
  listContentReports: vi.fn(),
  resolveContentReport: vi.fn(),
}));

vi.mock("@/components/media", () => ({
  AuthenticatedImage: () => <span data-testid="photo" />,
  MediaGallery: () => null,
  MediaLightbox: ({ resourceName }: { resourceName: string }) => (
    <div role="dialog" aria-label={resourceName} />
  ),
}));

function summary(overrides: Partial<ContentReportSummary> = {}): ContentReportSummary {
  return {
    contentType: "rating",
    contentId: 31,
    reportCount: 2,
    firstReportedAt: "2026-10-10T10:00:00.000Z",
    lastReportedAt: "2026-10-11T10:00:00.000Z",
    previouslyKept: false,
    content: {
      type: "rating",
      id: 31,
      status: "under_review",
      text: "Son todos unos idiotas.",
      score: 1,
      imageUrl: null,
      createdAt: "2026-10-09T10:00:00.000Z",
      author: { id: 8, name: "Martina", lastName: "García" },
      context: { kind: "activity", id: 12, title: "Bodega Catena Zapata" },
    },
    ...overrides,
  };
}

function result(data: ContentReportSummary[] = [summary()]): ContentReportsResult {
  return { data, pagination: { page: 1, limit: 20, total: data.length, totalPages: 1 } };
}

describe("AdminReportsView (#156)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listContentReports).mockResolvedValue(result());
    vi.mocked(resolveContentReport).mockResolvedValue(undefined);
    vi.mocked(getContentReportCounts).mockResolvedValue({
      all: 3,
      rating: 1,
      experience_comment: 1,
      experience_photo: 1,
      plan: 0,
    });
  });

  it("shows the reported content, its author and how often it was reported", async () => {
    render(<AdminReportsView />);

    const card = await screen.findByRole("article", { name: "Valoración denunciada" });
    expect(within(card).getByText("Martina García")).toBeInTheDocument();
    expect(within(card).getByText("Son todos unos idiotas.")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /Bodega Catena Zapata/ })).toHaveAttribute(
      "href",
      "/explore/12",
    );
    expect(within(card).getByText("2 denuncias")).toBeInTheDocument();
    expect(within(card).queryByText(/revisado antes/i)).not.toBeInTheDocument();
    expect(listContentReports).toHaveBeenCalledWith({
      sortBy: "firstReportedAt",
      direction: "asc",
      page: 1,
      limit: 20,
    });
  });

  it("filters by content type", async () => {
    const user = userEvent.setup();
    render(<AdminReportsView />);
    await screen.findByText("Martina García");

    await user.click(screen.getByRole("tab", { name: /fotos/i }));

    await waitFor(() =>
      expect(listContentReports).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "experience_photo", page: 1 }),
      ),
    );
  });

  it("shows a reported plan, which stays published while it waits", async () => {
    const user = userEvent.setup();
    vi.mocked(listContentReports).mockResolvedValue(
      result([
        summary({
          contentType: "plan",
          contentId: 7,
          content: {
            type: "plan",
            id: 7,
            status: "published",
            text: "Gratis, escribime al WhatsApp.",
            score: null,
            imageUrl: null,
            createdAt: "2026-10-09T10:00:00.000Z",
            author: { id: 8, name: "Martina", lastName: "García" },
            context: { kind: "plan", id: 7, title: "Tarde de vinos" },
          },
        }),
      ]),
    );
    render(<AdminReportsView />);

    const card = await screen.findByRole("article", { name: "Plan denunciada" });
    expect(within(card).getByRole("link", { name: /Tarde de vinos/ })).toHaveAttribute(
      "href",
      "/plans/7",
    );
    expect(within(card).getByText("Gratis, escribime al WhatsApp.")).toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: "Eliminar: plan de Martina García" }));
    expect(
      screen.getByText(/su autor ya no puede volver a publicarlo/i),
    ).toBeInTheDocument();
  });

  it("filters reported plans", async () => {
    const user = userEvent.setup();
    render(<AdminReportsView />);
    await screen.findByText("Martina García");

    await user.click(screen.getByRole("tab", { name: /planes/i }));

    await waitFor(() =>
      expect(listContentReports).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "plan", page: 1 }),
      ),
    );
  });

  it("marks content kept before and reported again", async () => {
    vi.mocked(listContentReports).mockResolvedValue(result([summary({ previouslyKept: true })]));
    render(<AdminReportsView />);

    expect(await screen.findByText("Revisado antes · sigue visible")).toBeInTheDocument();
  });

  it("lists every report with its reason once opened", async () => {
    vi.mocked(getContentReport).mockResolvedValue({
      ...summary(),
      reports: [
        {
          id: 1,
          reason: "harassment",
          detail: "Insulta a todos.",
          createdAt: "2026-10-10T10:00:00.000Z",
          system: false,
          reporter: { id: 4, name: "Diego", lastName: "Ruiz" },
        },
        {
          id: 2,
          reason: "other",
          detail: "Marcada por la moderación automática anterior",
          createdAt: "2026-10-11T10:00:00.000Z",
          system: true,
          reporter: null,
        },
        {
          id: 3,
          reason: "spam",
          detail: null,
          createdAt: "2026-10-12T10:00:00.000Z",
          system: false,
          reporter: null,
        },
      ],
    });
    const user = userEvent.setup();
    render(<AdminReportsView />);

    await user.click(await screen.findByRole("button", { name: "Ver denuncias" }));

    const reports = await screen.findByRole("list", { name: "Denuncias recibidas" });
    expect(within(reports).getByText("Acoso o insulto")).toBeInTheDocument();
    expect(within(reports).getByText("Insulta a todos.")).toBeInTheDocument();
    expect(within(reports).getByText(/Diego Ruiz/)).toBeInTheDocument();
    expect(within(reports).getByText(/Moderación automática anterior/)).toBeInTheDocument();
    // A deleted account's report is not mistaken for the system's.
    expect(within(reports).getByText(/Cuenta eliminada/)).toBeInTheDocument();
    expect(getContentReport).toHaveBeenCalledWith("rating", 31);
  });

  it("keeps the content after confirming", async () => {
    const user = userEvent.setup();
    render(<AdminReportsView />);

    await user.click(
      await screen.findByRole("button", { name: "Dejar publicado: valoración de Martina García" }),
    );
    await user.click(
      within(screen.getByRole("alertdialog", { name: "Dejar publicado" })).getByRole("button", {
        name: "Dejar",
      }),
    );

    expect(resolveContentReport).toHaveBeenCalledWith("rating", 31, { decision: "keep" });
    await waitFor(() => expect(listContentReports).toHaveBeenCalledTimes(2));
  });

  it("removes the content only with a reason for its author", async () => {
    const user = userEvent.setup();
    render(<AdminReportsView />);

    await user.click(
      await screen.findByRole("button", { name: "Eliminar: valoración de Martina García" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Eliminar contenido" });
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Ingresá el motivo para el autor.");
    expect(resolveContentReport).not.toHaveBeenCalled();

    await user.type(
      within(dialog).getByRole("textbox", { name: /motivo para el autor/i }),
      "Insulta a otros usuarios.",
    );
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(resolveContentReport).toHaveBeenCalledWith("rating", 31, {
      decision: "remove",
      reason: "Insulta a otros usuarios.",
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Eliminar contenido" })).not.toBeInTheDocument(),
    );
  });

  it("only closes the reports of content its author deleted", async () => {
    vi.mocked(listContentReports).mockResolvedValue(result([summary({ content: null })]));
    render(<AdminReportsView />);

    expect(await screen.findByText("Contenido eliminado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Eliminar/ })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cerrar denuncias de contenido eliminado" }),
    ).toBeInTheDocument();
  });
});
