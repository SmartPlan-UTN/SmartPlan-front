import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { CommunityExperience, CommunityCreator, CommunityPlan, PaginatedResult } from "@/types";
import { CreatorProfileScreen } from "./CreatorProfileScreen";

const getCommunityCreator = vi.hoisted(() => vi.fn());
const getCreatorExperiences = vi.hoisted(() => vi.fn());
const getCreatorPlans = vi.hoisted(() => vi.fn());
const getCreatorInspired = vi.hoisted(() => vi.fn());
const getProfile = vi.hoisted(() => vi.fn());
const session = vi.hoisted(() => ({
  status: "anonymous" as "loading" | "anonymous" | "authenticated",
}));
const push = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getCommunityCreator,
  getCreatorExperiences,
  getCreatorPlans,
  getCreatorInspired,
  getProfile,
}));

vi.mock("@/context", () => ({
  useFavorites: () => ({ isPlanSaved: () => false, toggleSavePlan: vi.fn() }),
}));

vi.mock("@/lib/auth", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/auth")>()),
  useSession: () => ({ status: session.status, user: null }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const creator: CommunityCreator = {
  username: "lucia",
  bio: "Salgo a conocer lugares nuevos.",
  avatarUrl: null,
  planCount: 0,
  experienceCount: 0,
};

const emptyPage: PaginatedResult<never> = {
  data: [],
  pagination: { page: 1, limit: 30, total: 0, totalPages: 0 },
};

const adaptation: CommunityPlan = {
  id: 9,
  title: "Lo mismo, en bici",
  description: null,
  estimatedTotalCost: 0,
  estimatedTotalCostMax: 0,
  priceCompleteness: "EXACT",
  estimatedTotalDuration: 90,
  imageUrl: null,
  authorUsername: "mateo",
  inspiredBy: { id: 4, title: "Una tarde sin apuro", creatorUsername: "lucia" },
};

describe("CreatorProfileScreen", () => {
  beforeEach(() => {
    session.status = "anonymous";
    getCommunityCreator.mockResolvedValue(creator);
    getCreatorExperiences.mockResolvedValue(emptyPage);
    getCreatorPlans.mockResolvedValue(emptyPage);
    getCreatorInspired.mockResolvedValue(emptyPage);
  });
  afterEach(() => vi.clearAllMocks());

  it("waits until the initial session has been restored", async () => {
    session.status = "loading";
    const view = render(<CreatorProfileScreen username="lucia" />);
    expect(getCommunityCreator).not.toHaveBeenCalled();
    session.status = "anonymous";
    view.rerender(<CreatorProfileScreen username="lucia" />);
    await screen.findByRole("tab", { name: /^Experiencias/ });
    expect(getCommunityCreator).toHaveBeenCalledOnce();
  });

  it("retries a failed profile request and distinguishes a missing profile", async () => {
    const user = userEvent.setup();
    getCommunityCreator.mockRejectedValueOnce(new Error("offline"));
    render(<CreatorProfileScreen username="lucia" />);
    await screen.findByRole("heading", { name: "No pudimos cargar este perfil" });
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByRole("tab", { name: /^Experiencias/ });
  });

  it("does not offer retry for a profile confirmed missing by the server", async () => {
    getCommunityCreator.mockRejectedValueOnce(new ApiError({ type: "HTTP", status: 404, message: "gone" }));
    render(<CreatorProfileScreen username="lucia" />);
    await screen.findByRole("heading", { name: "No encontramos este perfil" });
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });

  it.each(["experiences", "plans", "inspired"] as const)("retries the failed next page of %s without losing loaded items", async (tab) => {
    const user = userEvent.setup();
    const publication = (id: number): CommunityPlan => ({ ...adaptation, id, title: `Versión ${id}` });
    const story = (id: number): CommunityExperience => ({
      id, rating: 5, tags: [], comment: `Salida ${id}`, isOwn: false, completedAt: null,
      author: { alias: "Lucia", username: "lucia", avatarUrl: null }, photos: [],
    });
    const request = tab === "experiences" ? getCreatorExperiences : tab === "plans" ? getCreatorPlans : getCreatorInspired;
    const page = (number: number) => ({
      data: [tab === "experiences" ? story(number) : publication(number)],
      pagination: {page: number, limit: 12, total: 4, totalPages: 4},
    });
    request.mockResolvedValueOnce(page(1)).mockResolvedValueOnce(page(2))
      .mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(page(3));
    render(<CreatorProfileScreen username="lucia" />);
    await screen.findByRole("tab", { name: /^Experiencias/ });
    const label = tab === "experiences" ? /^Experiencias/ : tab === "plans" ? /^Planes/ : /^Inspiró/;
    await user.click(screen.getByRole("tab", { name: label }));
    await user.click(screen.getByRole("button", { name: "Ver más publicaciones" }));
    const title = (id: number) => tab === "experiences" ? `Salida ${id}` : `Versión ${id}`;
    await screen.findByText(title(2));
    await user.click(screen.getByRole("button", { name: "Ver más publicaciones" }));
    await user.click(await screen.findByRole("button", { name: "Reintentar" }));
    await screen.findByText(title(3));
    expect(screen.getByText(title(1))).toBeInTheDocument();
    expect(screen.getByText(title(2))).toBeInTheDocument();
    expect(request).toHaveBeenLastCalledWith("lucia", {page: 3, limit: 12});
  });

  it("supports arrow and Home/End keyboard navigation between profile tabs", async () => {
    getCreatorInspired.mockResolvedValue({ ...emptyPage, data: [adaptation] });

    const user = userEvent.setup();
    render(<CreatorProfileScreen username="lucia" />);

    const experiencesTab = await screen.findByRole("tab", {
      name: /^Experiencias/,
    });
    const plansTab = screen.getByRole("tab", { name: /^Planes/ });
    const inspiredTab = screen.getByRole("tab", { name: /^Inspiró/ });
    expect(inspiredTab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("heading", {
        name: "Versiones creadas a partir de sus planes",
      }),
    ).toBeInTheDocument();
    experiencesTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(plansTab).toHaveAttribute("aria-selected", "true");
    expect(plansTab).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveAttribute(
      "aria-labelledby",
      plansTab.id,
    );

    await user.keyboard("{End}");
    expect(inspiredTab).toHaveAttribute("aria-selected", "true");
    expect(inspiredTab).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(experiencesTab).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(inspiredTab).toHaveFocus();

    await user.keyboard("{Home}");
    expect(experiencesTab).toHaveAttribute("aria-selected", "true");
    expect(experiencesTab).toHaveFocus();
  });

  it("shows the Inspiró tab only when other people adapted something, keeping the credit", async () => {
    const user = userEvent.setup();
    render(<CreatorProfileScreen username="lucia" />);
    await screen.findByRole("tab", { name: /^Experiencias/ });
    expect(screen.queryByRole("tab", { name: /^Inspiró/ })).toBeNull();

    getCreatorInspired.mockResolvedValue({ ...emptyPage, data: [adaptation] });
    render(<CreatorProfileScreen username="lucia" />);
    const tabs = await screen.findAllByRole("tab", { name: /^Inspiró/ });
    await user.click(tabs[0]);

    expect(
      screen.getByRole("heading", {
        name: "Versiones creadas a partir de sus planes",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Inspirado en.*Una tarde sin apuro/ }),
    ).toBeInTheDocument();
  });

  it("does not claim anything for a person with nothing public yet", async () => {
    render(<CreatorProfileScreen username="lucia" />);

    expect(
      await screen.findByText("@lucia todavía no compartió ninguna experiencia."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Así te ve la comunidad")).toBeNull();
    expect(screen.queryByRole("link", { name: /Editar mi perfil/ })).toBeNull();
    expect(screen.queryByText(/plan publicado|experiencia$/)).toBeNull();
  });

  it("recognizes the person's own profile and offers what only they can do", async () => {
    session.status = "authenticated";
    getProfile.mockResolvedValue({ id: 7, username: "Lucia" });

    render(<CreatorProfileScreen username="lucia" />);

    expect(
      await screen.findByText("Así te ve la comunidad"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Editar mi perfil" }),
    ).toHaveAttribute("href", "/profile");
    expect(
      await screen.findByText(/Todavía no compartiste ninguna experiencia/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ir a Mis salidas" }),
    ).toBeInTheDocument();
  });

  it("is someone else's page for a signed-in person looking at another profile", async () => {
    session.status = "authenticated";
    getProfile.mockResolvedValue({ id: 7, username: "otra_persona" });

    render(<CreatorProfileScreen username="lucia" />);

    expect(
      await screen.findByText("@lucia todavía no compartió ninguna experiencia."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Así te ve la comunidad")).toBeNull();
  });
});
