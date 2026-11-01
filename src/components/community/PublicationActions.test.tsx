import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LikeExperienceButton,
  SavePlanButton,
  SharePublicationButton,
} from "./PublicationActions";

const toggleSavePlan = vi.hoisted(() => vi.fn());
const likeExperience = vi.hoisted(() => vi.fn());
const unlikeExperience = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
const session = vi.hoisted(() => ({ status: "authenticated" as string }));
vi.mock("@/context", () => ({
  useFavorites: () => ({ isPlanSaved: () => false, toggleSavePlan }),
}));
vi.mock("@/lib/auth", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/auth")>()),
  useSession: () => ({ status: session.status, user: null }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  likeCommunityExperience: likeExperience,
  unlikeCommunityExperience: unlikeExperience,
}));
afterEach(() => {
  vi.clearAllMocks();
  session.status = "authenticated";
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: undefined,
  });
});

describe("Publication actions", () => {
  it("handles a failed save and lets the person retry without leaving the publication", async () => {
    toggleSavePlan
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(true);
    const user = userEvent.setup();
    render(<SavePlanButton id={8} title="Museo y café" />);
    await user.click(
      screen.getByRole("button", { name: "Guardar Museo y café" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos guardarlo",
    );
    await user.click(
      screen.getByRole("button", { name: "Guardar Museo y café" }),
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(toggleSavePlan).toHaveBeenCalledTimes(2);
  });

  it("offers a selectable link when clipboard permission is denied", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("denied"),
    );
    render(
      <SharePublicationButton
        path="/community/experiences/3"
        title="Una buena salida"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Compartir" }));
    expect(
      await screen.findByRole("textbox", { name: "Enlace para compartir" }),
    ).toHaveValue(`${window.location.origin}/community/experiences/3`);
  });

  it("treats cancelling native sharing as a normal dismissal", async () => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi
        .fn()
        .mockRejectedValue(new DOMException("cancelled", "AbortError")),
    });
    const user = userEvent.setup();
    render(<SharePublicationButton path="/plans/8" title="Museo y café" />);
    await user.click(screen.getByRole("button", { name: "Compartir" }));
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Compartir" })).toBeEnabled();
  });

  it("redirects anonymous visitors to login and preserves their current page", async () => {
    session.status = "anonymous";
    const user = userEvent.setup();
    render(
      <LikeExperienceButton
        id={3}
        title="Una salida"
        initialCount={2}
        initiallyLiked={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Me gusta/ }));

    expect(push).toHaveBeenCalledWith(
      `/login?redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`,
    );
    expect(likeExperience).not.toHaveBeenCalled();
  });

  it("updates a like optimistically and rolls it back when the request fails", async () => {
    likeExperience
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ liked: true, likeCount: 3 });
    const user = userEvent.setup();
    render(
      <LikeExperienceButton
        id={3}
        title="Una salida"
        initialCount={2}
        initiallyLiked={false}
      />,
    );

    const like = screen.getByRole("button", { name: /Me gusta: Una salida/ });
    await user.click(like);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos guardar tu me gusta",
    );
    expect(like).toHaveAttribute("aria-pressed", "false");
    expect(like).toHaveTextContent("2");

    await user.click(like);
    await waitFor(() => expect(likeExperience).toHaveBeenCalledTimes(2));
    expect(like).toHaveAttribute("aria-pressed", "true");
    expect(like).toHaveTextContent("3");
  });
});


it("updates the viewer's like when refreshed publication data changes", async () => {
  const user = userEvent.setup();
  unlikeExperience.mockResolvedValue({ liked: false, likeCount: 6 });
  const view = render(<LikeExperienceButton id={3} title="Una salida" initialCount={7} initiallyLiked={false} />);
  view.rerender(<LikeExperienceButton id={3} title="Una salida" initialCount={7} initiallyLiked={true} />);
  const button = screen.getByRole("button", {name: /^Quitar me gusta:/});
  expect(button).toHaveAttribute("aria-pressed", "true");
  await user.click(button);
  expect(unlikeExperience).toHaveBeenCalledWith(3);
  expect(likeExperience).not.toHaveBeenCalled();
});
