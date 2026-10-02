import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAdminExperienceCounts,
  listAdminExperiences,
  moderateAdminExperienceComment,
  moderateAdminExperiencePhoto,
} from "@/lib/api";
import type { AdminExperience, AdminExperiencesResult } from "@/types";

import { AdminExperiencesView } from "./AdminExperiencesView";

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  getAdminExperienceCounts: vi.fn(),
  listAdminExperiences: vi.fn(),
  moderateAdminExperienceComment: vi.fn(),
  moderateAdminExperiencePhoto: vi.fn(),
}));

vi.mock("@/components/media", () => ({
  AuthenticatedImage: () => <span data-testid="photo" />,
  MediaLightbox: () => null,
}));

function experience(overrides: Partial<AdminExperience> = {}): AdminExperience {
  return {
    id: 5,
    rating: 2,
    tags: [],
    comment: "No vayan, horrible",
    commentStatus: "unreviewed",
    commentModerationReason: null,
    shared: true,
    sharedAt: "2026-10-01T10:00:00.000Z",
    completedAt: "2026-09-30T10:00:00.000Z",
    outingId: 40,
    plan: { id: 7, title: "Bodegas de Maipú" },
    author: { id: 8, name: "Martina", lastName: "García" },
    photos: [
      {
        id: 61,
        url: "/api/media/plan/61",
        isPrimary: true,
        displayOrder: 0,
        createdAt: "2026-10-01T10:00:00.000Z",
        communityStatus: "unreviewed",
        communityReason: null,
      },
    ],
    ...overrides,
  };
}

function result(data: AdminExperience[] = [experience()]): AdminExperiencesResult {
  return { data, pagination: { page: 1, limit: 20, total: data.length, totalPages: 1 } };
}

describe("AdminExperiencesView (#106)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listAdminExperiences).mockResolvedValue(result());
    vi.mocked(getAdminExperienceCounts).mockResolvedValue({ unreviewed: 4, rejected: 1 });
    vi.mocked(moderateAdminExperienceComment).mockResolvedValue(experience());
    vi.mocked(moderateAdminExperiencePhoto).mockResolvedValue(experience());
  });

  it("opens on what is already public and unreviewed", async () => {
    render(<AdminExperiencesView />);

    expect(await screen.findByText("Martina García")).toBeInTheDocument();
    expect(screen.getByText("Bodegas de Maipú")).toBeInTheDocument();
    expect(screen.getByText("No vayan, horrible")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Sin revisar/ })).toHaveTextContent("4");
    expect(listAdminExperiences).toHaveBeenCalledWith({ status: "unreviewed", page: 1, limit: 20 });
  });

  it("confirms a comment without taking it down", async () => {
    const user = userEvent.setup();
    render(<AdminExperiencesView />);

    await user.click(
      await screen.findByRole("button", { name: "Confirmar el comentario de Martina García" }),
    );
    expect(moderateAdminExperienceComment).toHaveBeenCalledWith(5, { status: "approved" });
    await waitFor(() => expect(listAdminExperiences).toHaveBeenCalledTimes(2));
  });

  it("takes a photo down with the reason the author is told", async () => {
    const user = userEvent.setup();
    render(<AdminExperiencesView />);

    await user.click(await screen.findByRole("button", { name: "Quitar la foto 1 de Martina García" }));
    const dialog = screen.getByRole("dialog", { name: "Quitar foto" });
    await user.type(within(dialog).getByRole("textbox"), "Contenido inapropiado");
    await user.click(within(dialog).getByRole("button", { name: "Rechazar" }));

    expect(moderateAdminExperiencePhoto).toHaveBeenCalledWith(5, 61, {
      status: "rejected",
      reason: "Contenido inapropiado",
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("can publish again what was taken down", async () => {
    const user = userEvent.setup();
    vi.mocked(listAdminExperiences).mockResolvedValue(
      result([
        experience({
          commentStatus: "rejected",
          commentModerationReason: "Agresivo",
          shared: false,
        }),
      ]),
    );
    render(<AdminExperiencesView />);

    expect(await screen.findByText("Ahora privada")).toBeInTheDocument();
    expect(screen.getByText("Agresivo")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Quitar el comentario de Martina García" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Volver a publicar el comentario de Martina García" }),
    );
    expect(moderateAdminExperienceComment).toHaveBeenCalledWith(5, { status: "approved" });
  });
});
