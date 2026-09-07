import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionStatus } from "@/lib/auth";

import { LandingScreen } from "./LandingScreen";

const useSession = vi.hoisted(() => vi.fn());
const usePlanRequestPolling = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/auth")>()),
  useSession,
}));

vi.mock("@/hooks", async (importActual) => ({
  ...(await importActual<typeof import("@/hooks")>()),
  usePlanRequestPolling,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

// The rest of the landing is noise for this test: it only checks which
// component fills the recommendations/showcase slot.
vi.mock("./LandingHero", () => ({
  HERO_COMPOSER_ID: "plan-composer",
  LandingHero: () => <div data-testid="hero" />,
}));
vi.mock("./InspirationGallery", () => ({ InspirationGallery: () => null }));
vi.mock("./ImmersiveStory", () => ({ ImmersiveStory: () => null }));
vi.mock("./HowItWorks", () => ({ HowItWorks: () => null }));
vi.mock("./ManualExplore", () => ({
  ManualExplore: () => <div data-testid="manual-explore" />,
}));
vi.mock("./PlanShowcase", () => ({
  PlanShowcase: () => <div data-testid="showcase" />,
}));
vi.mock("@/components/home", async (importActual) => ({
  ...(await importActual<typeof import("@/components/home")>()),
  RecommendedPlans: () => <div data-testid="recommended" />,
}));
vi.mock("@/components/layout", () => ({
  SiteFooter: () => <footer data-testid="site-footer" />,
}));

function session(status: SessionStatus) {
  useSession.mockReturnValue({
    status,
    authenticated: status === "authenticated",
  });
}

beforeEach(() => {
  usePlanRequestPolling.mockReturnValue({ phase: "idle", lastSubmission: null });
  session("anonymous");
});

describe("LandingScreen recommendations slot (CU20)", () => {
  it("shows the illustrative showcase to an anonymous visitor", async () => {
    session("anonymous");
    render(<LandingScreen />);
    // The below-the-fold sections are `next/dynamic`, so the slot resolves
    // on a microtask rather than synchronously.
    expect(await screen.findByTestId("showcase")).toBeInTheDocument();
    expect(screen.queryByTestId("recommended")).toBeNull();
  });

  it("shows real recommendations to a signed-in visitor", () => {
    session("authenticated");
    render(<LandingScreen />);
    expect(screen.getByTestId("recommended")).toBeInTheDocument();
    expect(screen.queryByTestId("showcase")).toBeNull();
  });

  it("shows neither while the session is still resolving", () => {
    session("loading");
    render(<LandingScreen />);
    expect(screen.queryByTestId("showcase")).toBeNull();
    expect(screen.queryByTestId("recommended")).toBeNull();
  });

  it("keeps the hero mounted in every session state (CU17/CU19 preserved)", () => {
    for (const status of ["anonymous", "authenticated", "loading"] as const) {
      session(status);
      const { unmount } = render(<LandingScreen />);
      expect(screen.getByTestId("hero")).toBeInTheDocument();
      unmount();
    }
  });

  it("ends with Manual Explore followed directly by the footer", async () => {
    render(<LandingScreen />);

    const manual = await screen.findByTestId("manual-explore");
    const footer = screen.getByTestId("site-footer");
    expect(manual.compareDocumentPosition(footer)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.queryByText("Cuando tengas una idea…")).toBeNull();
    expect(screen.queryByText("Escribir una idea")).toBeNull();
  });
});
