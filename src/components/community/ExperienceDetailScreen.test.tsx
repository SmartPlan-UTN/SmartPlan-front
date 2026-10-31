import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { CommunityExperience } from "@/types";
import { ExperienceDetailScreen } from "./ExperienceDetailScreen";
import { StoryCard } from "./cards";

const getCommunityExperience = vi.hoisted(() => vi.fn());
const addCommunityExperienceVisit = vi.hoisted(() => vi.fn());
const session = vi.hoisted(() => ({ status: "anonymous", user: null as { id: number } | null }));
const downloadMedia = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/media", () => ({ downloadMedia }));

vi.mock("@/context", () => ({
  useFavorites: () => ({ isPlanSaved: () => false, toggleSavePlan: vi.fn() }),
}));
const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  usePathname: () => "/community/experiences/3",
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/auth", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/auth")>()),
  useSession: () => session,
}));

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getCommunityExperience,
  addCommunityExperienceVisit,
}));

const experience: CommunityExperience = {
  id: 3,
  rating: 5,
  tags: ["would_recommend"],
  comment: "El museo casi sin gente.",
  isOwn: false,
  completedAt: "2026-10-01T12:00:00.000Z",
  author: { alias: "Viajero/a", username: "lucia", avatarUrl: null },
  plan: { id: 148, title: "Versión de Lucía", creatorUsername: "lucia" },
  inspiredBy: { id: 43, title: "Una tarde sin apuro", creatorUsername: "ana" },
  photos: [],
};

describe("ExperienceDetailScreen", () => {
  afterEach(() => {
    vi.clearAllMocks();
    session.status = "anonymous";
    session.user = null;
    vi.unstubAllGlobals();
  });

  it("names the plan, keeps the credit chain and prioritizes viewing it", async () => {
    getCommunityExperience.mockResolvedValue(experience);

    render(<ExperienceDetailScreen id={3} />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Versión de Lucía",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Inspirado en.*Una tarde sin apuro/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver plan" })).toHaveAttribute(
      "href",
      "/plans/148?from=%2Fcommunity",
    );
    expect(screen.getByRole("link", { name: "Hacer una versión" })).toHaveAttribute(
      "href",
      "/plans/create?inspiredBy=148",
    );
    expect(
      screen.getByRole("button", { name: "Guardar Versión de Lucía" }),
    ).toBeInTheDocument();
  });

  it("explains the missing origin without inventing one", async () => {
    getCommunityExperience.mockResolvedValue({
      ...experience,
      plan: null,
      inspiredBy: null,
    });

    render(<ExperienceDetailScreen id={3} />);

    expect(
      await screen.findByText(/El plan de origen ya no es público/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Ver plan" }),
    ).toBeNull();
  });

  it("offers a way back when the experience is gone", async () => {
    getCommunityExperience.mockRejectedValue(new ApiError({ message: "gone", type: "HTTP", status: 404 }));

    render(<ExperienceDetailScreen id={9} />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Esta experiencia ya no está disponible",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Volver a la comunidad" }),
    ).toHaveAttribute("href", "/community");
  });

  it("retries a network failure without claiming the experience was removed", async () => {
    getCommunityExperience.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(experience);
    render(<ExperienceDetailScreen id={3} />);
    await screen.findByRole("heading", { name: "No pudimos cargar esta experiencia" });
    expect(screen.queryByText(/su autor la haya hecho privada/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByRole("heading", { name: "Versión de Lucía" });
  });

  it("waits for session restoration and reloads viewer data when the user changes", async () => {
    session.status = "loading";
    getCommunityExperience.mockResolvedValue(experience);
    const view = render(<ExperienceDetailScreen id={3} />);
    expect(getCommunityExperience).not.toHaveBeenCalled();
    session.status = "authenticated";
    session.user = { id: 7 };
    getCommunityExperience.mockResolvedValue({ ...experience, isOwn: true });
    view.rerender(<ExperienceDetailScreen id={3} />);
    await screen.findByRole("button", { name: "Sumar otra salida completada" });
    session.user = { id: 8 };
    getCommunityExperience.mockResolvedValue({ ...experience, likedByViewer: true });
    view.rerender(<ExperienceDetailScreen id={3} />);
    await screen.findByRole("button", { name: /^Quitar me gusta:/ });
    expect(screen.queryByRole("button", { name: "Sumar otra salida completada" })).toBeNull();
    expect(getCommunityExperience).toHaveBeenCalledTimes(2);
  });

  it("adds a completed visit even when the source plan is no longer public", async () => {
    getCommunityExperience.mockResolvedValue({ ...experience, isOwn: true, plan: null, inspiredBy: null, visitCount: 1 });
    addCommunityExperienceVisit.mockResolvedValue({ visitCount: 2 });
    render(<ExperienceDetailScreen id={3} />);
    fireEvent.click(await screen.findByRole("button", { name: "Sumar otra salida completada" }));
    await waitFor(() => expect(screen.getByText("Salidas registradas: 2 de 100")).toBeInTheDocument());
    expect(addCommunityExperienceVisit).toHaveBeenCalledWith(3);
    expect(screen.queryByRole("link", { name: "Ver plan" })).toBeNull();
  });

  it("removes failed gallery photos while keeping other photos and the lightbox usable", async () => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: () => "blob:local-photo",
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    downloadMedia.mockImplementation((url: string) =>
      url === "/broken"
        ? Promise.reject(new Error("404"))
        : Promise.resolve({
            blob: new Blob(["photo"], { type: "image/jpeg" }),
            attribution: null,
          }),
    );
    getCommunityExperience.mockResolvedValue({
      ...experience,
      photos: [
        { id: 11, url: "/broken" },
        { id: 12, url: "/available" },
      ],
    });
    render(<ExperienceDetailScreen id={3} />);

    expect(
      await screen.findByText(
        "Algunas fotos no están disponibles. Podés ver las demás.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ver foto 2 de 2" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ver foto 1 de 1" }));
    expect(
      screen.getByRole("dialog", { name: /Experiencia de/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the review readable without empty gallery slots when all photos fail", async () => {
    downloadMedia.mockRejectedValue(new Error("404"));
    getCommunityExperience.mockResolvedValue({
      ...experience,
      photos: [{ id: 11, url: "/broken" }],
    });
    render(<ExperienceDetailScreen id={3} />);

    expect(
      await screen.findByText(
        "Las fotos no están disponibles en este momento.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ver foto/ })).toBeNull();
    expect(screen.getByText(`“${experience.comment}”`)).toBeInTheDocument();
  });

  it("gives a failed feed photo a compact route into its experience", async () => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(private readonly callback: IntersectionObserverCallback) {}
        observe(target: Element) {
          queueMicrotask(() =>
            this.callback(
              [
                {
                  target,
                  isIntersecting: true,
                  intersectionRatio: 1,
                } as IntersectionObserverEntry,
              ],
              this as unknown as IntersectionObserver,
            ),
          );
        }
        unobserve() {}
        disconnect() {}
      },
    );
    downloadMedia.mockRejectedValue(new Error("404"));
    render(
      <StoryCard
        story={{
          ...experience,
          photos: [
            {
              id: 11,
              url: "/broken",
              isPrimary: true,
              displayOrder: 0,
              createdAt: "2026-10-01T12:00:00.000Z",
            },
          ],
        }}
      />,
    );
    expect(
      await screen.findByText("Esta foto no está disponible. Ver la experiencia"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver las fotos de @lucia" }),
    ).toHaveAttribute("href", "/community/experiences/3");
  });
});
